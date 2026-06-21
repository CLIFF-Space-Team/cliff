"""ISS (International Space Station) Türkiye gece geçişleri — SGP4 yerel hesap.

NASA Spot the Station Türkiye XML yayını sınırlı (5 büyük şehir → 404).
Yerine: CelesTrak'tan ISS TLE çek, sgp4 paketi ile lokal lat/lng üzerinden
geçişleri kendimiz hesapla. Hiç dış API key gerekmez.

Algoritma:
  1. ISS TLE indir (CelesTrak — günde bir kez yeterli, 24h cache)
  2. Şehir listesi için 48 saatlik 30 saniyelik tarama
  3. Görünür geçiş şartları:
     - Uydunun yüksekliği > 10° (horizon üstü)
     - Güneş yüksekliği < -6° (gözlemci için alacakaranlık veya gece)
     - Uydu güneş tarafından aydınlatılıyor (umbra dışında)
  4. Geçiş başlangıç/bitiş + maksimum yükseklik + yön
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

import httpx
from sgp4.api import Satrec, jday

from app.core.logging import get_logger
from app.nasa import cache

log = get_logger(__name__)

CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 saat
TLE_CACHE_TTL = 24 * 60 * 60  # 24 saat
HTTP_TIMEOUT = 12.0
TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE"

# Türkiye'nin 5 büyük şehri (ISS pass predictor için yeterli kapsama)
TURKISH_CITIES = [
    ("İstanbul", 41.0082, 28.9784),
    ("Ankara", 39.9334, 32.8597),
    ("İzmir", 38.4192, 27.1287),
    ("Bursa", 40.1828, 29.0665),
    ("Antalya", 36.8841, 30.7056),
]


@dataclass
class IssPass:
    city: str
    starts_at: str  # ISO 8601 UTC
    duration_min: int
    max_elevation_deg: int
    appears_dir: str
    disappears_dir: str

    def to_dict(self) -> dict:
        return {
            "city": self.city,
            "starts_at": self.starts_at,
            "duration_min": self.duration_min,
            "max_elevation_deg": self.max_elevation_deg,
            "appears_dir": self.appears_dir,
            "disappears_dir": self.disappears_dir,
        }


async def _fetch_tle() -> Optional[Tuple[str, str]]:
    """CelesTrak'tan ISS TLE çek, (line1, line2) döndür. 24h cache."""
    cached = await cache.get_or_fetch(
        "iss:tle",
        TLE_CACHE_TTL,
        _tle_loader,
    )
    if isinstance(cached, list) and len(cached) == 2:
        return cached[0], cached[1]
    return None


async def _tle_loader() -> Optional[List[str]]:
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            response = await client.get(
                TLE_URL,
                headers={"User-Agent": "CLIFF/2.0 (+https://notcome.app)"},
            )
            response.raise_for_status()
        text = response.text.strip()
        lines = [ln for ln in text.splitlines() if ln.strip()]
        # CelesTrak: name, line1, line2 (3 satır)
        if len(lines) >= 3:
            return [lines[1], lines[2]]
        if len(lines) == 2:
            return lines
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        log.warning("iss.tle.failed", error=str(exc))
    return None


def _ecef_to_geodetic(x: float, y: float, z: float) -> Tuple[float, float, float]:
    """ECI-ish (TEME) → geodetic — basit küresel Dünya yaklaşımı.

    Yeterli hassasiyet (~1km) — pass predictor için kabul edilir.
    """
    a = 6378.137  # km, WGS84 ekvator yarıçapı
    f = 1 / 298.257223563
    b = a * (1 - f)
    e2 = 1 - (b * b) / (a * a)

    lon = math.atan2(y, x)
    p = math.sqrt(x * x + y * y)
    lat = math.atan2(z, p * (1 - e2))
    # 1 iter (yeterli)
    sin_lat = math.sin(lat)
    n = a / math.sqrt(1 - e2 * sin_lat * sin_lat)
    alt = p / math.cos(lat) - n
    lat = math.atan2(z, p * (1 - e2 * n / (n + alt)))
    return math.degrees(lat), math.degrees(lon), alt


def _eci_to_topocentric(
    sat_xyz: Tuple[float, float, float],
    obs_lat_deg: float,
    obs_lng_deg: float,
    jd_ut1: float,
) -> Tuple[float, float, float]:
    """Uydunun TEME ECI konumunu observer için (azimuth, elevation, range_km) döndür.

    Greenwich Sidereal Time → ECEF rotation → topocentric ENU.
    """
    # GMST (Meeus, basit)
    t = (jd_ut1 - 2451545.0) / 36525.0
    gmst_deg = (280.46061837 + 360.98564736629 * (jd_ut1 - 2451545.0) + 0.000387933 * t * t - (t * t * t) / 38710000.0) % 360.0
    gmst_rad = math.radians(gmst_deg)

    # ECI → ECEF (Z ekseni etrafında -GMST rotasyonu)
    cos_g = math.cos(gmst_rad)
    sin_g = math.sin(gmst_rad)
    x_e = sat_xyz[0] * cos_g + sat_xyz[1] * sin_g
    y_e = -sat_xyz[0] * sin_g + sat_xyz[1] * cos_g
    z_e = sat_xyz[2]

    # Observer ECEF
    obs_lat = math.radians(obs_lat_deg)
    obs_lng = math.radians(obs_lng_deg)
    a = 6378.137
    f = 1 / 298.257223563
    e2 = 2 * f - f * f
    n_radius = a / math.sqrt(1 - e2 * math.sin(obs_lat) ** 2)
    obs_x = n_radius * math.cos(obs_lat) * math.cos(obs_lng)
    obs_y = n_radius * math.cos(obs_lat) * math.sin(obs_lng)
    obs_z = (n_radius * (1 - e2)) * math.sin(obs_lat)

    # Range vector (ECEF)
    rx = x_e - obs_x
    ry = y_e - obs_y
    rz = z_e - obs_z

    # ECEF → ENU (East-North-Up)
    sin_lat = math.sin(obs_lat)
    cos_lat = math.cos(obs_lat)
    sin_lng = math.sin(obs_lng)
    cos_lng = math.cos(obs_lng)
    east = -sin_lng * rx + cos_lng * ry
    north = -sin_lat * cos_lng * rx - sin_lat * sin_lng * ry + cos_lat * rz
    up = cos_lat * cos_lng * rx + cos_lat * sin_lng * ry + sin_lat * rz

    range_km = math.sqrt(rx * rx + ry * ry + rz * rz)
    elevation = math.degrees(math.asin(up / range_km)) if range_km > 0 else 0.0
    azimuth = (math.degrees(math.atan2(east, north)) + 360.0) % 360.0
    return azimuth, elevation, range_km


def _sun_elevation(obs_lat_deg: float, obs_lng_deg: float, jd: float) -> float:
    """Güneşin observer için yüksekliği (yaklaşık, ±0.5°)."""
    n = jd - 2451545.0
    L = math.radians((280.460 + 0.9856474 * n) % 360.0)
    g = math.radians((357.528 + 0.9856003 * n) % 360.0)
    lam = L + math.radians(1.915) * math.sin(g) + math.radians(0.020) * math.sin(2 * g)
    eps = math.radians(23.439 - 0.0000004 * n)
    ra = math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam))
    dec = math.asin(math.sin(eps) * math.sin(lam))
    # GMST
    t = n / 36525.0
    gmst = (280.46061837 + 360.98564736629 * n + 0.000387933 * t * t) % 360.0
    lst = math.radians((gmst + obs_lng_deg) % 360.0)
    h = lst - ra
    obs_lat = math.radians(obs_lat_deg)
    elev = math.asin(math.sin(obs_lat) * math.sin(dec) + math.cos(obs_lat) * math.cos(dec) * math.cos(h))
    return math.degrees(elev)


def _is_satellite_illuminated(
    sat_xyz: Tuple[float, float, float],
    jd: float,
) -> bool:
    """Uydu Dünya umbrası dışında mı (Güneş ışığında mı)? Basit yaklaşım."""
    # Sun ECI vector (yaklaşık)
    n = jd - 2451545.0
    L = math.radians((280.460 + 0.9856474 * n) % 360.0)
    g = math.radians((357.528 + 0.9856003 * n) % 360.0)
    lam = L + math.radians(1.915) * math.sin(g) + math.radians(0.020) * math.sin(2 * g)
    R_au = 1.00014 - 0.01671 * math.cos(g) - 0.00014 * math.cos(2 * g)
    sun_dist_km = R_au * 149_597_870.7
    sun_x = sun_dist_km * math.cos(lam)
    sun_y = sun_dist_km * math.sin(lam) * math.cos(math.radians(23.439))
    sun_z = sun_dist_km * math.sin(lam) * math.sin(math.radians(23.439))

    # Uydunun Güneş'e açısı
    sat_dot_sun = sat_xyz[0] * sun_x + sat_xyz[1] * sun_y + sat_xyz[2] * sun_z
    sat_mag = math.sqrt(sum(s * s for s in sat_xyz))
    cos_angle = sat_dot_sun / (sat_mag * sun_dist_km)
    angle = math.degrees(math.acos(max(-1.0, min(1.0, cos_angle))))
    # Earth radius / sat altitude → umbra cone yarı-açısı ≈ 18° (basit yaklaşım)
    # Sat-Sun açısı > 100° → umbra olası
    return angle < 102.0


def _bearing_to_compass(deg: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    return dirs[int(((deg + 22.5) % 360) // 45)]


def _compute_passes_for_city(
    line1: str,
    line2: str,
    city: str,
    lat: float,
    lng: float,
    hours_ahead: int = 48,
    step_seconds: int = 30,
) -> List[IssPass]:
    sat = Satrec.twoline2rv(line1, line2)
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=hours_ahead)

    passes: List[IssPass] = []
    in_pass = False
    pass_start: Optional[datetime] = None
    pass_max_el = 0.0
    pass_start_az = 0.0
    pass_end_az = 0.0

    t = now
    while t < end:
        jd, fr = jday(t.year, t.month, t.day, t.hour, t.minute, t.second + t.microsecond / 1e6)
        e, r, _ = sat.sgp4(jd, fr)
        if e == 0:
            jd_full = jd + fr
            az, el, _rng = _eci_to_topocentric((r[0], r[1], r[2]), lat, lng, jd_full)
            sun_el = _sun_elevation(lat, lng, jd_full)
            illuminated = _is_satellite_illuminated((r[0], r[1], r[2]), jd_full)
            visible = el > 10.0 and sun_el < -6.0 and illuminated

            if visible and not in_pass:
                in_pass = True
                pass_start = t
                pass_max_el = el
                pass_start_az = az
                pass_end_az = az
            elif visible and in_pass:
                if el > pass_max_el:
                    pass_max_el = el
                pass_end_az = az
            elif not visible and in_pass:
                in_pass = False
                if pass_start and pass_max_el >= 15:
                    duration_s = (t - pass_start).total_seconds()
                    if duration_s >= 60:  # min 1 dk
                        passes.append(
                            IssPass(
                                city=city,
                                starts_at=pass_start.isoformat(),
                                duration_min=int(round(duration_s / 60)),
                                max_elevation_deg=int(round(pass_max_el)),
                                appears_dir=_bearing_to_compass(pass_start_az),
                                disappears_dir=_bearing_to_compass(pass_end_az),
                            )
                        )

        t += timedelta(seconds=step_seconds)

    return passes


async def get_passes(limit: int = 10) -> List[dict]:
    """Tüm Türk şehirleri için 48 saatlik geçiş taraması (lokal SGP4 hesap)."""
    cache_key = f"iss:tr-passes:sgp4:{limit}"

    async def loader() -> List[dict]:
        log.info("iss.sgp4.start", cities=len(TURKISH_CITIES))
        tle = await _fetch_tle()
        if not tle:
            log.warning("iss.tle.unavailable")
            return []
        line1, line2 = tle

        # Hesap CPU-bound; thread pool'da yapacak değiliz, basit serial.
        all_passes: List[IssPass] = []
        for city, lat, lng in TURKISH_CITIES:
            try:
                ps = _compute_passes_for_city(line1, line2, city, lat, lng)
                all_passes.extend(ps)
            except Exception as exc:
                log.warning("iss.sgp4.city_failed", city=city, error=str(exc))

        all_passes.sort(key=lambda p: p.starts_at)
        log.info("iss.sgp4.done", passes=len(all_passes))
        return [p.to_dict() for p in all_passes[:limit]]

    raw = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    return raw if isinstance(raw, list) else []

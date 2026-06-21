"""JPL Horizons spacecraft telemetry client.

Fetches the current geocentric distance + heliocentric distance + range-rate
for a list of active asteroid-mission spacecraft. Each spacecraft is a NAIF
negative integer ID (Horizons convention).

Editorial metadata (name, agency, launch date, target, description) is baked
into `MISSION_REGISTRY` — these facts don't change. Telemetry is fetched live
and overlaid; if Horizons is unreachable for a spacecraft we still return the
mission with `telemetry_available=False` so the UI can degrade gracefully.

Reference: https://ssd.jpl.nasa.gov/api/horizons.api
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.domain.mission import Mission
from app.nasa import cache, http

log = get_logger(__name__)

KM_PER_AU = 149_597_870.7

# Editorial metadata for active asteroid missions. NAIF IDs are JPL Horizons
# spacecraft designators. Updated 2026 — DART removed (impacted 2022-09-26),
# OSIRIS-REx renamed to OSIRIS-APEX (extended mission to Apophis 2029).
MISSION_REGISTRY: List[Dict[str, Any]] = [
    {
        "id": "osiris-apex",
        "name": "OSIRIS-APEX",
        "agency": "NASA",
        "naif_id": "-64",
        "target": "99942 Apophis",
        "status": "cruise",
        "launch_date": "2016-09-08",
        "description_tr": (
            "OSIRIS-REx misyonunun Bennu örnek dönüşü sonrası uzatılması. "
            "2029 Nisan Apophis yakın geçişinde rendezvous, 18 ay yörünge."
        ),
        "description_en": (
            "Extended OSIRIS-REx mission after Bennu sample return. Will "
            "rendezvous with Apophis during the April 2029 close approach "
            "and orbit for 18 months."
        ),
    },
    {
        "id": "lucy",
        "name": "Lucy",
        "agency": "NASA",
        "naif_id": "-49",
        "target": "Jüpiter Trojan asteroidleri",
        "status": "cruise",
        "launch_date": "2021-10-16",
        "description_tr": "12 yıllık görev, 8 farklı Trojan asteroid uçuş geçişi.",
        "description_en": "12-year tour, 8 separate Trojan asteroid flybys.",
    },
    {
        "id": "psyche",
        "name": "Psyche",
        "agency": "NASA",
        "naif_id": "-255",
        "target": "16 Psyche (M-tipi metalik)",
        "status": "cruise",
        "launch_date": "2023-10-13",
        "description_tr": "2029 yörünge girişi — bilinen en büyük metalik cisimde 26 ay.",
        "description_en": "2029 orbit insertion — 26 months at the largest known M-type body.",
    },
    {
        "id": "hera",
        "name": "Hera",
        "agency": "ESA",
        "naif_id": "-91900",
        "target": "Didymos / Dimorphos",
        "status": "cruise",
        "launch_date": "2024-10-07",
        "description_tr": ("DART çarpma sonrası Didymos sisteminin karakterizasyonu. " "2026 sonu rendezvous."),
        "description_en": ("Post-DART characterization of the Didymos system. " "Rendezvous late 2026."),
    },
    {
        "id": "hayabusa2-shuten",
        "name": "Hayabusa2 (uzatma)",
        "agency": "JAXA",
        "naif_id": "-37",
        "target": "1998 KY26",
        "status": "extended",
        "launch_date": "2014-12-03",
        "description_tr": ("Ryugu örnek dönüşünden sonra uzatma misyonu. 2031'de 1998 KY26 ile rendezvous."),
        "description_en": ("Extended mission after Ryugu sample return. Rendezvous with 1998 KY26 in 2031."),
    },
]


def _spacecraft_params(
    naif_id: str,
    start: datetime,
    stop: datetime,
    center: str = "500@399",
) -> Dict[str, str]:
    """Horizons params for a spacecraft state-vector query.

    Spacecraft IDs are bare negative integers — no DES= prefix. We request a
    single observer-mode row covering 'now' so we get the most recent ephemeris
    point. `center` selects the observer body:
      - "500@399" (geocentric Earth) → QUANTITY 20 delta = distance from Earth
      - "500@10"  (heliocentric Sun) → QUANTITY 20 delta = distance from Sun
    Same parser works for both since the range column layout is identical.
    """
    return {
        "format": "json",
        "COMMAND": f"'{naif_id}'",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": f"'{center}'",
        "START_TIME": start.strftime("'%Y-%m-%d %H:%M'"),
        "STOP_TIME": stop.strftime("'%Y-%m-%d %H:%M'"),
        "STEP_SIZE": "'1h'",
        # 20 = observer range; range-rate (deldot) comes for free in this packet.
        "QUANTITIES": "'20'",
        "REF_SYSTEM": "ICRF",
        "TIME_DIGITS": "MINUTES",
        "EXTRA_PREC": "YES",
        "CSV_FORMAT": "YES",
    }


def _parse_first_row(payload: Dict[str, Any]) -> Optional[Dict[str, float]]:
    """Pull the first numeric (delta_au, deldot_kms) tuple out of a Horizons response."""
    raw = payload.get("result")
    if not isinstance(raw, str) or "$$SOE" not in raw:
        return None
    in_table = False
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped == "$$SOE":
            in_table = True
            continue
        if stripped == "$$EOE":
            break
        if not in_table or not stripped:
            continue
        parts = [p.strip() for p in stripped.split(",")]
        while parts and parts[-1] == "":
            parts.pop()
        # With QUANTITIES='20', columns are: date, ..., delta, deldot
        # Try end-relative parse: deldot at -1, delta at -2, scan back if needed.
        for di, dotsi in ((-2, -1), (-3, -2)):
            try:
                d = float(parts[di])
                v = float(parts[dotsi])
            except (IndexError, ValueError):
                continue
            # Sanity: spacecraft delta_au can range from ~0 to ~6 (Lucy at Jupiter)
            if 0.0 <= d <= 50 and abs(v) < 200:
                return {"delta_au": d, "deldot_kms": v}
    return None


async def _fetch_range(naif_id: str, center: str, tag: str) -> Optional[Dict[str, float]]:
    """Fetch one spacecraft's current range + range-rate from `center`.

    `center` is a Horizons observer code ("500@399" Earth, "500@10" Sun); the
    returned `delta_au` is the distance from that body. Cached 5 min per
    (naif_id, center). Returns None on any failure (Horizons unreachable, no
    ephemeris for this NAIF id, parse error).
    """
    now = datetime.now(timezone.utc).replace(microsecond=0, second=0, minute=0)
    key = f"horizons:spacecraft:{tag}:{naif_id}:{now.isoformat()}"

    async def loader() -> Dict[str, Any]:
        log.info("horizons.spacecraft.fetch", naif_id=naif_id, frame=tag)
        try:
            payload = await http.request_json(
                "GET",
                settings.NASA_HORIZONS_URL,
                params=_spacecraft_params(naif_id, now, now + timedelta(hours=2), center=center),
                upstream_label=f"jpl.horizons.spacecraft.{tag}",
                max_retries=1,
            )
        except Exception as exc:
            log.warning("horizons.spacecraft.failed", naif_id=naif_id, frame=tag, error=str(exc))
            return {"_unavailable": True}
        parsed = _parse_first_row(payload)
        if parsed is None:
            return {"_unavailable": True}
        return parsed

    payload = await cache.get_or_fetch(key, 300, loader)
    if not isinstance(payload, dict) or payload.get("_unavailable"):
        return None
    return {"delta_au": payload["delta_au"], "deldot_kms": payload["deldot_kms"]}


async def _fetch_telemetry(naif_id: str) -> Optional[Dict[str, float]]:
    """Geocentric distance + range-rate (distance from Earth)."""
    return await _fetch_range(naif_id, "500@399", "geo")


async def _fetch_heliocentric(naif_id: str) -> Optional[Dict[str, float]]:
    """Heliocentric distance (distance from the Sun) — `delta_au` is sun range."""
    return await _fetch_range(naif_id, "500@10", "helio")


async def get_active_missions() -> List[Mission]:
    """Return every registered mission with live Horizons telemetry overlaid.

    Telemetry fetches run in parallel; one failed spacecraft never blocks the
    others.
    """
    now = datetime.now(timezone.utc)

    # Geocentric (Earth distance + range-rate) and heliocentric (Sun distance)
    # fetched in parallel; one failed spacecraft/frame never blocks the others.
    geo_results, helio_results = await asyncio.gather(
        asyncio.gather(
            *[_fetch_telemetry(m["naif_id"]) for m in MISSION_REGISTRY],
            return_exceptions=True,
        ),
        asyncio.gather(
            *[_fetch_heliocentric(m["naif_id"]) for m in MISSION_REGISTRY],
            return_exceptions=True,
        ),
    )

    missions: List[Mission] = []
    for meta, telemetry, helio in zip(MISSION_REGISTRY, geo_results, helio_results):
        mission_kwargs: Dict[str, Any] = {
            "id": meta["id"],
            "name": meta["name"],
            "agency": meta["agency"],
            "naif_id": meta["naif_id"],
            "target": meta["target"],
            "status": meta["status"],
            "launch_date": meta["launch_date"],
            "description_tr": meta["description_tr"],
            "description_en": meta["description_en"],
        }
        if isinstance(telemetry, dict):
            delta_au = telemetry["delta_au"]
            mission_kwargs["earth_distance_km"] = delta_au * KM_PER_AU
            mission_kwargs["velocity_kms"] = telemetry["deldot_kms"]
            mission_kwargs["last_updated"] = now
            mission_kwargs["telemetry_available"] = True
        # Heliocentric distance is independent — set it whenever available even
        # if the geocentric packet failed.
        if isinstance(helio, dict):
            mission_kwargs["sun_distance_au"] = helio["delta_au"]
            mission_kwargs["last_updated"] = now
            mission_kwargs["telemetry_available"] = True
        missions.append(Mission(**mission_kwargs))
    return missions

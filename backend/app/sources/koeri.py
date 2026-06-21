"""Boğaziçi Üniversitesi Kandilli Rasathanesi (KOERI) deprem feed.

Endpoint: http://www.koeri.boun.edu.tr/scripts/lst0.asp
Format: HTML sayfa içinde `<pre>` bloğu, fixed-width metin (windows-1254).
Son 500 deprem listelenir; auth gerekmez. AFAD'a paralel **ikinci ulusal kaynak**
olarak konuşlanmıştır — ikisinin birleşimi tek nokta arızasını ortadan kaldırır.

Veri normalize edildiğinde AFAD ile aynı şemayı paylaşır, böylece frontend
TurkeyLiveBand iki kaynağı tek liste olarak gösterebilir.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.core.logging import get_logger
from app.nasa import cache

log = get_logger(__name__)

KOERI_URL = "http://www.koeri.boun.edu.tr/scripts/lst0.asp"
CACHE_TTL_SECONDS = 2 * 60  # 2 dakika — AFAD'tan daha agresif (KOERI yavaş güncellenir)
HTTP_TIMEOUT = 15.0
TURKEY_TZ = timezone(timedelta(hours=3))

# Header'dan sonraki satırların formatı (fixed-width). Türkçe yer adları
# boşluk içerir, sondaki "Çözüm Niteliği" sütunu tek kelime.
#
#   YYYY.MM.DD HH:MM:SS  LAT      LON      DEPTH    MD    ML    Mw    PLACE...      QUALITY
_LINE_RE = re.compile(
    r"^(?P<date>\d{4}\.\d{2}\.\d{2})\s+"
    r"(?P<time>\d{2}:\d{2}:\d{2})\s+"
    r"(?P<lat>-?\d+\.\d+)\s+"
    r"(?P<lon>-?\d+\.\d+)\s+"
    r"(?P<depth>\d+\.\d+)\s+"
    r"(?P<md>[-.\d]+)\s+"
    r"(?P<ml>[-.\d]+)\s+"
    r"(?P<mw>[-.\d]+)\s+"
    r"(?P<rest>.+)$"
)

_PRE_RE = re.compile(r"<pre[^>]*>(.*?)</pre>", re.IGNORECASE | re.DOTALL)


def _maybe_float(value: str) -> Optional[float]:
    """KOERI uses '-.-' for missing magnitude readings."""
    if not value or value.strip() in {"-.-", "--", "-"}:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _pick_magnitude(md: str, ml: str, mw: str) -> Optional[float]:
    """Prefer Mw (moment) > ML (local) > MD (duration). Return None if all blank."""
    for raw in (mw, ml, md):
        v = _maybe_float(raw)
        if v is not None and v > 0:
            return v
    return None


def _parse_block(block: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    for raw_line in block.splitlines():
        line = raw_line.rstrip()
        if not line or line.startswith("-") or line.startswith("Tarih") or line.startswith("."):
            continue
        m = _LINE_RE.match(line)
        if not m:
            continue
        mag = _pick_magnitude(m.group("md"), m.group("ml"), m.group("mw"))
        if mag is None:
            continue
        try:
            dt_local = datetime.strptime(
                f"{m.group('date')} {m.group('time')}",
                "%Y.%m.%d %H:%M:%S",
            ).replace(tzinfo=TURKEY_TZ)
        except ValueError:
            continue
        try:
            lat = float(m.group("lat"))
            lon = float(m.group("lon"))
            depth = float(m.group("depth"))
        except ValueError:
            continue

        # KOERI son sütun: place + quality. Quality tek kelime — son kelimeyi al.
        # Revize edilmiş depremler "REVIZE01" + "(YYYY.MM.DD" gibi ekstra sütun
        # taşır; bu paraziti place'tan ayır, quality'i normalize et.
        rest = m.group("rest").strip()
        revize_match = re.search(
            r"\s+(REVIZE\d*)\s*\((\d{4}\.\d{2}\.\d{2}[^)]*)\)?\s*$",
            rest,
        )
        if revize_match:
            place = rest[: revize_match.start()].strip()
            quality = "Revize"
        else:
            parts = rest.rsplit(None, 1)
            if len(parts) == 2 and parts[1].lower() in {"i̇lksel", "ilksel", "revize", "kesin"}:
                place, quality_raw = parts
                quality = {
                    "ilksel": "İlksel",
                    "i̇lksel": "İlksel",
                    "revize": "Revize",
                    "kesin": "Kesin",
                }.get(quality_raw.lower(), quality_raw)
            else:
                place, quality = rest, "İlksel"

        ts_ms = int(dt_local.astimezone(timezone.utc).timestamp() * 1000)
        items.append(
            {
                # Stable id: KOERI yayın id vermez; saat + lokasyon yeterince benzersiz.
                "id": f"koeri-{ts_ms}-{lat:.3f}-{lon:.3f}",
                "magnitude": mag,
                "place": place.strip(),
                "time": ts_ms,
                "lat": lat,
                "lon": lon,
                "depth_km": depth,
                "url": KOERI_URL,
                "source": "koeri.boun.edu.tr",
                "country": "Türkiye",
                "type": "earthquake",
                "quality": quality.strip() or None,
            }
        )
    return items


def parse_koeri_html(html: str) -> List[Dict[str, Any]]:
    """KOERI HTML sayfasından deprem listesini çıkar."""
    pre_match = _PRE_RE.search(html)
    if not pre_match:
        return []
    return _parse_block(pre_match.group(1))


async def _fetch_html() -> str:
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        response = await client.get(
            KOERI_URL,
            headers={
                "User-Agent": "CLIFF/2.0 (asteroit izleme; +https://notcome.app)",
                "Accept": "text/html,*/*",
            },
        )
        response.raise_for_status()
        return response.content.decode("windows-1254", errors="replace")


async def get_recent_earthquakes(
    min_magnitude: float = 2.0,
    hours: int = 24,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """KOERI son 500 depremden filtrelenmiş alt küme.

    Her satır AFAD ile aynı şemada normalize edilir; frontend TurkeyLiveBand
    iki kaynağı `id` ile dedupe ederek birleştirir.
    """
    cache_key = f"koeri:eq:{min_magnitude}:{hours}"

    async def loader() -> List[Dict[str, Any]]:
        log.info("koeri.eq.fetch", min_mag=min_magnitude, hours=hours)
        try:
            html = await _fetch_html()
        except Exception as exc:
            log.warning("koeri.fetch.failed", error=str(exc))
            return []
        return parse_koeri_html(html)

    raw = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    if not isinstance(raw, list):
        return []

    cutoff_ms = int((datetime.now(timezone.utc) - timedelta(hours=hours)).timestamp() * 1000)
    out = [
        ev
        for ev in raw
        if isinstance(ev.get("magnitude"), (int, float))
        and ev["magnitude"] >= min_magnitude
        and (ev.get("time") or 0) >= cutoff_ms
    ]
    out.sort(key=lambda x: x.get("time") or 0, reverse=True)
    return out[:limit]

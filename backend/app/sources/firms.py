"""NASA FIRMS (Fire Information for Resource Management System) client.

Endpoint: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{KEY}/{SRC}/{AREA}/{DAYS}

Returns active wildfire hotspot detections from MODIS / VIIRS satellites.
Free API but requires a MAP_KEY. If `settings.FIRMS_API_KEY` is empty the
endpoint raises `MissingConfigError` so the FastAPI handler can return
HTTP 503 with code FIRMS_NOT_CONFIGURED (mirrors the AI endpoint behavior).
"""

from __future__ import annotations

import csv
from datetime import datetime, timezone
from io import StringIO
from typing import Any, Dict, List

import httpx

from app.core.config import settings
from app.core.exceptions import ApiError
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)

FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
DEFAULT_SOURCE = "VIIRS_SNPP_NRT"
CACHE_TTL_SECONDS = 15 * 60

# FIRMS' `area` endpoint stopped accepting ISO country codes in 2025; only
# bbox tuples (west,south,east,north) or the literal "world" are valid.
# We keep the `country` argument in our public API for ergonomics and translate
# it to a sensible national bbox here. Add more entries as needed.
COUNTRY_BBOX: Dict[str, str] = {
    "TUR": "26,36,45,42",  # Türkiye
    "USA": "-125,24,-66,49",  # USA lower-48
    "BRA": "-74,-34,-34,5",  # Brazil
    "AUS": "112,-44,154,-10",  # Australia
    "RUS": "20,41,180,82",  # Russia
    "CAN": "-141,42,-52,84",  # Canada
    "GRC": "19,34,30,42",  # Greece
    "ITA": "6,36,19,47",  # Italy
    "ESP": "-10,35,5,44",  # Spain
    "FRA": "-5,41,10,51",  # France
    "DEU": "5,47,16,55",  # Germany
    "WLD": "world",
    "WORLD": "world",
}


class MissingConfigError(ApiError):
    def __init__(self) -> None:
        super().__init__(
            "NASA FIRMS API key not configured",
            status_code=503,
            code="FIRMS_NOT_CONFIGURED",
        )


async def _request_text(url: str) -> str:
    """FIRMS returns CSV (text/plain) — bypass the JSON helper."""
    client = await http.get_client()
    resp = await client.get(url, timeout=httpx.Timeout(60.0))
    if resp.status_code == 401 or resp.status_code == 403:
        raise MissingConfigError()
    resp.raise_for_status()
    return resp.text


async def get_active_fires(
    country: str = "TUR",
    days: int = 1,
    source: str = DEFAULT_SOURCE,
    limit: int = 500,
) -> List[Dict[str, Any]]:
    """Return active fire detections for `country` (ISO-3) over the last `days`.

    Each row: {lat, lon, brightness, frp (fire radiative power), confidence,
    acq_at (epoch ms), source, satellite, daynight}.

    Note: FIRMS now requires a bbox (west,south,east,north) or "world", so
    `country` is mapped to a per-country bbox via COUNTRY_BBOX; unknown codes
    fall through to the "world" feed.
    """
    if not settings.FIRMS_API_KEY:
        raise MissingConfigError()

    days = max(1, min(10, days))
    area = COUNTRY_BBOX.get(country.upper(), "world")
    cache_key = f"firms:{source}:{area}:{days}"

    async def loader() -> List[Dict[str, Any]]:
        url = f"{FIRMS_BASE}/{settings.FIRMS_API_KEY}/{source}/{area}/{days}"
        log.info("firms.fetch", country=country, area=area, days=days, source=source)
        try:
            text = await _request_text(url)
        except MissingConfigError:
            raise
        except Exception as exc:
            log.warning("firms.fetch.failed", error=str(exc))
            return []
        return _parse_csv(text, source)

    rows = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    if not isinstance(rows, list):
        return []
    rows.sort(key=lambda r: r.get("acq_at") or 0, reverse=True)
    return rows[:limit]


def _parse_csv(text: str, source: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not text or "Invalid" in text[:200]:
        return out
    reader = csv.DictReader(StringIO(text))
    for row in reader:
        try:
            lat = float(row.get("latitude") or 0)
            lon = float(row.get("longitude") or 0)
        except (TypeError, ValueError):
            continue
        # MODIS uses 'brightness'; VIIRS uses 'bright_ti4'
        brightness_raw = row.get("brightness") or row.get("bright_ti4") or "0"
        try:
            brightness = float(brightness_raw)
        except ValueError:
            brightness = 0.0
        try:
            frp = float(row.get("frp") or 0)
        except ValueError:
            frp = 0.0

        acq_date = row.get("acq_date") or ""
        acq_time = row.get("acq_time") or "0000"
        # acq_time is e.g. "1234" → 12:34 UTC
        time_padded = str(acq_time).zfill(4)
        epoch_ms = 0
        try:
            dt = datetime.strptime(
                f"{acq_date} {time_padded[:2]}:{time_padded[2:4]}",
                "%Y-%m-%d %H:%M",
            ).replace(tzinfo=timezone.utc)
            epoch_ms = int(dt.timestamp() * 1000)
        except ValueError:
            pass

        out.append(
            {
                "lat": lat,
                "lon": lon,
                "brightness_k": brightness,
                "frp": frp,
                "confidence": row.get("confidence") or "",
                "acq_at": epoch_ms,
                "satellite": row.get("satellite") or "",
                "instrument": row.get("instrument") or "",
                "daynight": row.get("daynight") or "",
                "source": source,
            }
        )
    return out

"""AFAD (Türkiye Afet ve Acil Durum Başkanlığı) earthquake feed.

Endpoint: https://deprem.afad.gov.tr/apiv2/event/filter

Returns earthquakes within a time window above a magnitude floor. No auth
required; AFAD's public API is open. The default window is the last 24 hours
which matches what the dashboard ticker needs.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)

AFAD_BASE = "https://deprem.afad.gov.tr/apiv2/event/filter"
CACHE_TTL_SECONDS = 5 * 60


def _format_for_afad(dt: datetime) -> str:
    """AFAD wants 'YYYY-MM-DD HH:MM:SS' (URL-encoded by httpx)."""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


async def get_recent_earthquakes(
    min_magnitude: float = 2.0,
    hours: int = 24,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """Return AFAD earthquakes within the last `hours` above `min_magnitude`.

    Each row is normalised to the same shape as the USGS feed so the frontend
    earthquake row component can render either source without branching:
        {id, magnitude, place, time (epoch ms), lat, lon, depth_km, source, url}
    """
    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=hours)
    cache_key = f"afad:eq:{int(start.timestamp())}:{int(end.timestamp())}:{min_magnitude}"

    async def loader() -> List[Dict[str, Any]]:
        log.info("afad.eq.fetch", min_mag=min_magnitude, hours=hours)
        params = {
            "start": _format_for_afad(start),
            "end": _format_for_afad(end),
            "minmag": str(min_magnitude),
        }
        try:
            payload = await http.request_json("GET", AFAD_BASE, params=params, upstream_label="afad", max_retries=1)
        except Exception as exc:
            log.warning("afad.fetch.failed", error=str(exc))
            return []
        if not isinstance(payload, list):
            return []
        return payload

    raw = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    if not isinstance(raw, list):
        return []

    out: List[Dict[str, Any]] = []
    for ev in raw:
        try:
            mag = float(ev.get("magnitude") or 0)
        except (TypeError, ValueError):
            continue
        if mag < min_magnitude:
            continue

        date_str = ev.get("date") or ""
        time_ms = _parse_afad_date(date_str)

        place_parts = [
            ev.get("location") or "",
            ev.get("province") or ev.get("district") or "",
        ]
        place = " · ".join(p for p in place_parts if p)

        try:
            lat = float(ev.get("latitude") or 0) or None
            lon = float(ev.get("longitude") or 0) or None
            depth = float(ev.get("depth") or 0) or None
        except (TypeError, ValueError):
            lat = lon = depth = None

        out.append(
            {
                "id": str(ev.get("eventID") or ev.get("id") or ""),
                "magnitude": mag,
                "place": place or "Türkiye",
                "time": time_ms,
                "lat": lat,
                "lon": lon,
                "depth_km": depth,
                "url": "",
                "source": "afad.gov.tr",
                "country": ev.get("country") or "Türkiye",
                "type": ev.get("type") or "ML",
            }
        )

    out.sort(key=lambda x: x.get("time") or 0, reverse=True)
    return out[:limit]


def _parse_afad_date(value: str) -> int:
    """AFAD returns 'YYYY-MM-DDTHH:MM:SS' (Türkiye local time, UTC+3).

    Convert to epoch ms in UTC. AFAD does not always include timezone info
    in the string, so we treat naive datetimes as Turkey time (+03:00).
    """
    if not value:
        return 0
    try:
        # Try ISO with explicit tz first.
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone(timedelta(hours=3)))
        return int(dt.astimezone(timezone.utc).timestamp() * 1000)
    except ValueError:
        return 0

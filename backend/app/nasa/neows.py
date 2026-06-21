"""NASA NeoWs (Near-Earth Object Web Service) client.

https://api.nasa.gov/  → NeoWs
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


def _api_key_param() -> Dict[str, str]:
    return {"api_key": settings.NASA_API_KEY}


async def get_feed(start: date, end: date) -> Dict[str, Any]:
    """Daily-grouped NEOs in [start, end] (max 7 days per NASA docs)."""
    if (end - start).days > 7:
        raise ValueError("NeoWs feed window cannot exceed 7 days")

    key = f"neows:feed:{start.isoformat()}:{end.isoformat()}"

    async def loader() -> Dict[str, Any]:
        params = {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            **_api_key_param(),
        }
        log.info("neows.feed.fetch", start=start.isoformat(), end=end.isoformat())
        return await http.request_json(
            "GET",
            f"{settings.NASA_NEOWS_URL}/feed",
            params=params,
            upstream_label="nasa.neows",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS, loader)


async def get_feed_today(days: int = 7) -> Dict[str, Any]:
    today = date.today()
    return await get_feed(today, today + timedelta(days=days))


async def get_feed_window(days: int = 30) -> list[Dict[str, Any]]:
    """Pull `days` of NeoWs feed in 7-day chunks (NeoWs hard limit per call).

    Returns a list of feed payloads, one per 7-day window. Used at scheduler
    boot to seed a longer horizon than a single 7-day call would allow.
    """
    today = date.today()
    chunks: list[Dict[str, Any]] = []
    cursor = today
    target = today + timedelta(days=days)
    while cursor < target:
        end = min(cursor + timedelta(days=7), target)
        try:
            chunks.append(await get_feed(cursor, end))
        except Exception as exc:
            log.warning("neows.feed_window_chunk_failed", start=cursor.isoformat(), error=str(exc))
        cursor = end
    return chunks


async def get_lookup(neo_id: str) -> Dict[str, Any]:
    """Detailed orbital + physical data for a single NEO."""
    key = f"neows:lookup:{neo_id}"

    async def loader() -> Dict[str, Any]:
        log.info("neows.lookup.fetch", neo_id=neo_id)
        return await http.request_json(
            "GET",
            f"{settings.NASA_NEOWS_URL}/neo/{neo_id}",
            params=_api_key_param(),
            upstream_label="nasa.neows",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS * 2, loader)


async def get_browse(page: int = 0, size: int = 20) -> Dict[str, Any]:
    """Paginated browse of all known NEOs."""
    key = f"neows:browse:{page}:{size}"

    async def loader() -> Dict[str, Any]:
        log.info("neows.browse.fetch", page=page, size=size)
        return await http.request_json(
            "GET",
            f"{settings.NASA_NEOWS_URL}/neo/browse",
            params={"page": page, "size": size, **_api_key_param()},
            upstream_label="nasa.neows",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS * 4, loader)


def iter_neos_from_feed(feed: Dict[str, Any]) -> list[Dict[str, Any]]:
    """Flatten the date-bucketed NEO feed into a single list."""
    near_earth: Dict[str, Any] = feed.get("near_earth_objects") or {}
    out: list[Dict[str, Any]] = []
    for _date, neos in near_earth.items():
        if isinstance(neos, list):
            out.extend(neos)
    return out


# Optional convenience for callers that just want fully-populated lookup results
async def get_neo(neo_id: str) -> Optional[Dict[str, Any]]:
    try:
        return await get_lookup(neo_id)
    except Exception as exc:
        log.warning("neows.lookup_failed", neo_id=neo_id, error=str(exc))
        return None

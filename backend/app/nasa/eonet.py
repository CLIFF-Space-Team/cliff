"""NASA EONET (Earth Observatory Natural Event Tracker) client.

https://eonet.gsfc.nasa.gov/api/v3

EONET is occasionally slow from non-US regions (15+ s per request). To keep
the dashboard snappy we:
  - cap retries at 1 (so worst case is ~2 × http_timeout)
  - cache for a long TTL (10 min) once we do get data
  - degrade gracefully on persistent failure (empty events array, no exception)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.exceptions import UpstreamError
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


_EMPTY_EVENTS: Dict[str, Any] = {
    "title": "EONET",
    "description": "EONET temporarily unavailable",
    "link": "https://eonet.gsfc.nasa.gov/api/v3/events",
    "events": [],
    "_unavailable": True,
}


async def get_events(
    days: int = 30,
    status: str = "open",
    categories: Optional[List[str]] = None,
    limit: int = 100,
) -> Dict[str, Any]:
    cat_str = ",".join(categories) if categories else ""
    key = f"eonet:events:days={days}:status={status}:cats={cat_str}:limit={limit}"

    async def loader() -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "days": days,
            "status": status,
            "limit": limit,
        }
        if categories:
            params["category"] = cat_str
        log.info("eonet.fetch", days=days, status=status, categories=categories)
        try:
            return await http.request_json(
                "GET",
                f"{settings.NASA_EONET_URL}/events",
                params=params,
                upstream_label="nasa.eonet",
                max_retries=1,
            )
        except UpstreamError as exc:
            log.warning("eonet.unavailable", error=str(exc))
            return _EMPTY_EVENTS

    return await cache.get_or_fetch(key, settings.CACHE_TTL_EONET, loader)


async def get_categories() -> Dict[str, Any]:
    key = "eonet:categories"

    async def loader() -> Dict[str, Any]:
        try:
            return await http.request_json(
                "GET",
                f"{settings.NASA_EONET_URL}/categories",
                upstream_label="nasa.eonet",
                max_retries=1,
            )
        except UpstreamError:
            return {"categories": [], "_unavailable": True}

    return await cache.get_or_fetch(key, 86400, loader)

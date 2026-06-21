"""JPL Sentry impact-risk client.

https://ssd-api.jpl.nasa.gov/sentry.api
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


async def get_objects(removed: bool = False) -> Dict[str, Any]:
    """Full Sentry impact-risk list. Returns ~1500 entries."""
    key = f"sentry:objects:removed={int(removed)}"

    async def loader() -> Dict[str, Any]:
        log.info("sentry.objects.fetch", removed=removed)
        params: Dict[str, Any] = {}
        if removed:
            params["removed"] = "1"
        return await http.request_json(
            "GET",
            f"{settings.NASA_SSD_BASE_URL}/sentry.api",
            params=params,
            upstream_label="jpl.sentry",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_SENTRY, loader)


async def get_object_detail(des: str) -> Optional[Dict[str, Any]]:
    """Detailed virtual-impactor table for a single object (designation `des`)."""
    key = f"sentry:detail:{des}"

    async def loader() -> Dict[str, Any]:
        log.info("sentry.detail.fetch", des=des)
        return await http.request_json(
            "GET",
            f"{settings.NASA_SSD_BASE_URL}/sentry.api",
            params={"des": des},
            upstream_label="jpl.sentry",
        )

    try:
        return await cache.get_or_fetch(key, settings.CACHE_TTL_SENTRY, loader)
    except Exception as exc:
        log.warning("sentry.detail_failed", des=des, error=str(exc))
        return None


def extract_designations(payload: Dict[str, Any]) -> List[str]:
    """Pull the list of `des` from the Sentry summary payload."""
    rows = payload.get("data") or []
    out: List[str] = []
    for row in rows:
        if isinstance(row, dict):
            des = row.get("des")
            if isinstance(des, str) and des:
                out.append(des)
    return out

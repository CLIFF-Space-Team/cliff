"""JPL Close Approach Data (CAD) client.

https://ssd-api.jpl.nasa.gov/cad.api
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


async def get_close_approaches(
    start: Optional[date] = None,
    end: Optional[date] = None,
    dist_max_au: float = 0.05,
    body: str = "Earth",
    sort: str = "date",
) -> Dict[str, Any]:
    """Close-approach events for `body` in [start, end] within `dist_max_au` AU."""
    start = start or date.today()
    end = end or (start + timedelta(days=90))

    key = f"cad:{body}:{start.isoformat()}:{end.isoformat()}:{dist_max_au}:{sort}"

    async def loader() -> Dict[str, Any]:
        log.info("cad.fetch", start=start.isoformat(), end=end.isoformat(), body=body)
        return await http.request_json(
            "GET",
            f"{settings.NASA_SSD_BASE_URL}/cad.api",
            params={
                "date-min": start.isoformat(),
                "date-max": end.isoformat(),
                "dist-max": str(dist_max_au),
                "body": body,
                "sort": sort,
                "fullname": "true",
            },
            upstream_label="jpl.cad",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS, loader)

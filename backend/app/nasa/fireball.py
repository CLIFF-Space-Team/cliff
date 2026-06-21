"""JPL Fireball atmospheric impact event client.

https://ssd-api.jpl.nasa.gov/fireball.api
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


async def get_fireballs(
    limit: int = 200,
    min_energy_kt: Optional[float] = None,
    date_min: Optional[str] = None,
    days_back: Optional[int] = None,
) -> Dict[str, Any]:
    """Historical atmospheric fireball events recorded by US sensors.

    Filters:
        date_min   – ISO date string (e.g. '2026-01-01'). Wins over `days_back`.
        days_back  – Number of days back from today. Convenience for "recent".
    """
    if date_min is None and days_back:
        date_min = (date.today() - timedelta(days=days_back)).isoformat()

    key = f"fireball:limit={limit}:minE={min_energy_kt or 0}:dmin={date_min or 'any'}"

    async def loader() -> Dict[str, Any]:
        # JPL Fireball API (https://ssd-api.jpl.nasa.gov/doc/fireball.html):
        #   - `limit`        : max rows
        #   - `req-loc`      : require location columns
        #   - `req-alt`      : require altitude column
        #   - `req-vel`      : require velocity column
        #   - `energy-min`   : NOT `min-energy` — JPL is strict on the dash order
        #   - `date-min`     : earliest date filter (ISO, inclusive)
        params: Dict[str, Any] = {
            "limit": limit,
            "req-loc": "true",
            "req-alt": "true",
            "req-vel": "true",
        }
        if min_energy_kt is not None:
            params["energy-min"] = min_energy_kt
        if date_min:
            params["date-min"] = date_min
        log.info(
            "fireball.fetch",
            limit=limit,
            min_energy_kt=min_energy_kt,
            date_min=date_min,
        )
        return await http.request_json(
            "GET",
            f"{settings.NASA_SSD_BASE_URL}/fireball.api",
            params=params,
            upstream_label="jpl.fireball",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS * 4, loader)

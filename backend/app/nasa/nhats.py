"""JPL NHATS — Near-Earth Object Human Space Flight Accessible Targets.

https://ssd-api.jpl.nasa.gov/nhats.api
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)


async def get_targets(
    dv: int = 12,
    dur: int = 450,
    stay: int = 8,
    launch: Optional[str] = None,
) -> Dict[str, Any]:
    """Crewed-mission accessible NEOs at given Δv / duration constraints.

    JPL NHATS rejects most launch range strings (`launch=2025-2050` returns
    400). Omit by default and let JPL return the full historical-window set.
    """
    key = f"nhats:{dv}:{dur}:{stay}:{launch or 'any'}"

    async def loader() -> Dict[str, Any]:
        params: Dict[str, Any] = {"dv": dv, "dur": dur, "stay": stay}
        if launch:
            params["launch"] = launch
        log.info("nhats.fetch", **params)
        return await http.request_json(
            "GET",
            f"{settings.NASA_SSD_BASE_URL}/nhats.api",
            params=params,
            upstream_label="jpl.nhats",
        )

    return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS * 6, loader)


async def get_target_detail(des: str) -> Optional[Dict[str, Any]]:
    """Trajectory options for a single NHATS-accessible NEO."""
    key = f"nhats:detail:{des}"

    async def loader() -> Dict[str, Any]:
        log.info("nhats.detail.fetch", des=des)
        return await http.request_json(
            "GET",
            f"{settings.NASA_SSD_BASE_URL}/nhats.api",
            params={"des": des, "plot": "0"},
            upstream_label="jpl.nhats",
        )

    try:
        return await cache.get_or_fetch(key, settings.CACHE_TTL_NEOWS * 4, loader)
    except Exception as exc:
        log.warning("nhats.detail_failed", des=des, error=str(exc))
        return None

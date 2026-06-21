"""Active asteroid mission tracker endpoint.

Returns the registered mission catalog with live JPL Horizons telemetry
overlaid (Earth-distance, range-rate). Editorial metadata is curated; live
fields degrade to None if Horizons is unreachable for a given spacecraft.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.domain.mission import MissionListResponse
from app.nasa import spacecraft

router = APIRouter()


@router.get("", response_model=MissionListResponse)
async def list_missions() -> MissionListResponse:
    items = await spacecraft.get_active_missions()
    return MissionListResponse(
        items=items,
        total=len(items),
        fetched_at=datetime.now(timezone.utc),
    )

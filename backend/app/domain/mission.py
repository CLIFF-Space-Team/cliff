"""Active asteroid-mission domain model.

Each `Mission` carries editorial metadata (name, agency, target, launch date,
description — facts that don't change) plus a live telemetry overlay that the
spacecraft client populates from JPL Horizons. If Horizons is unavailable, the
telemetry fields stay None and the UI degrades gracefully.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

MissionStatus = Literal["cruise", "rendezvous", "extended", "completed", "returning", "lost"]


class Mission(BaseModel):
    id: str
    name: str
    agency: str
    naif_id: str
    target: str
    status: MissionStatus
    launch_date: str
    description_tr: str
    description_en: str

    # Live telemetry overlay (None when Horizons unreachable)
    earth_distance_km: Optional[float] = Field(default=None, ge=0)
    sun_distance_au: Optional[float] = Field(default=None, ge=0)
    velocity_kms: Optional[float] = Field(default=None)
    last_updated: Optional[datetime] = None
    telemetry_source: str = "JPL Horizons"
    telemetry_available: bool = False


class MissionListResponse(BaseModel):
    items: list[Mission]
    total: int
    fetched_at: datetime
    source: str = "JPL Horizons (DE441)"

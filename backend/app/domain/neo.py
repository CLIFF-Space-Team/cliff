"""Near-Earth Object domain model."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NormalizedNeo(BaseModel):
    """Canonical NEO shape used by the pipeline.

    Built from NeoWs feed/lookup payloads via `pipeline.normalizer`.
    """

    neo_id: str
    designation: Optional[str] = None
    name: str
    is_potentially_hazardous: bool = False
    sentry_listed: bool = False

    # Physical
    diameter_min_km: Optional[float] = Field(default=None, ge=0)
    diameter_max_km: Optional[float] = Field(default=None, ge=0)
    absolute_magnitude_h: Optional[float] = None

    # Closest known approach
    next_approach_at: Optional[datetime] = None
    miss_distance_km: Optional[float] = Field(default=None, ge=0)
    relative_velocity_kms: Optional[float] = Field(default=None, ge=0)
    orbiting_body: str = "Earth"

    # Source metadata
    nasa_jpl_url: Optional[str] = None
    last_observed_at: Optional[datetime] = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.utcnow())

    @property
    def diameter_avg_km(self) -> Optional[float]:
        if self.diameter_min_km is None or self.diameter_max_km is None:
            return None
        return (self.diameter_min_km + self.diameter_max_km) / 2.0

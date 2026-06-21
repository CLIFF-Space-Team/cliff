"""Risk record domain model.

`RiskRecord` is the unit of state in the autonomous pipeline. Each NEO that has
ever been ingested produces one record in Redis (keyed by `neo_id`). The
hybrid_engine recomputes them on a schedule; the WebSocket layer broadcasts
deltas to connected clients.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class RiskClass(str, Enum):
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


RISK_LABELS: List[str] = [c.value for c in RiskClass]
RISK_RANK: dict = {c.value: idx for idx, c in enumerate(RiskClass)}


class MCSummary(BaseModel):
    samples: int
    mean_km: float
    std_km: float
    p1_km: float
    p50_km: float
    p99_km: float
    closest_p1_km: float


class HybridAnalysis(BaseModel):
    neo_id: str
    days_ahead: int
    nominal_min_distance_km: Optional[float] = None
    nominal_velocity_kms: Optional[float] = None
    sigma_km: float = 0.0
    monte_carlo: Optional[MCSummary] = None
    ml_class: RiskClass = RiskClass.MINIMAL
    ml_confidence: float = 0.0
    hybrid_score: float = 0.0  # 0..1, higher = more dangerous
    computed_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    rows_count: int = 0
    notes: List[str] = Field(default_factory=list)


class RiskRecord(BaseModel):
    neo_id: str
    designation: Optional[str] = None
    name: str
    risk_class: RiskClass
    hybrid_score: float
    ml_confidence: float = 0.0

    # Snapshots for the panel UI
    diameter_max_km: Optional[float] = None
    next_approach_at: Optional[datetime] = None
    miss_distance_km: Optional[float] = None
    relative_velocity_kms: Optional[float] = None
    is_potentially_hazardous: bool = False
    sentry_listed: bool = False

    # MC
    monte_carlo: Optional[MCSummary] = None

    # Live heliocentric position (AU, ecliptic). Filled by the scheduler when
    # the NEO has resolvable orbital elements. Lets the dashboard place the
    # asteroid in its real spatial location relative to the Sun and Earth.
    helio_position_au: Optional[List[float]] = None
    geo_distance_au: Optional[float] = None

    # Lifecycle
    computed_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    fetched_at: datetime = Field(default_factory=lambda: datetime.utcnow())

    @property
    def severity_rank(self) -> int:
        return RISK_RANK.get(self.risk_class.value, 0)


class RiskDelta(BaseModel):
    neo_id: str
    name: str
    previous_class: Optional[RiskClass] = None
    new_class: RiskClass
    previous_score: Optional[float] = None
    new_score: float
    direction: Literal["up", "down", "new", "same"] = "new"
    computed_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class RiskSnapshot(BaseModel):
    """Top-N response for the dashboard."""

    items: List[RiskRecord]
    total: int
    computed_at: datetime = Field(default_factory=lambda: datetime.utcnow())

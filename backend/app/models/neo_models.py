from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
RiskLevel = Literal["critical", "high", "medium", "low", "none"]
class Neo(BaseModel):
    neo_id: str = Field(..., description="NASA NeoWs id veya Sentry des")
    name: str
    absolute_magnitude_h: Optional[float] = None
    diameter_min_km: Optional[float] = None
    diameter_max_km: Optional[float] = None
    is_potentially_hazardous: bool = False
    sentry_id: Optional[str] = None
    neows_id: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
class CloseApproach(BaseModel):
    neo_id: str
    timestamp: datetime
    distance_au: Optional[float] = None
    distance_ld: Optional[float] = None
    relative_velocity_kms: Optional[float] = None
    orbiting_body: str = "Earth"
class RiskAssessment(BaseModel):
    neo_id: str
    source: Literal["sentry", "derived"] = "sentry"
    torino: Optional[float] = None
    palermo: Optional[float] = None
    impact_probability: Optional[float] = None
    energy_mt: Optional[float] = None
    risk_level: RiskLevel = "none"
    updated_at: datetime = Field(default_factory=datetime.utcnow)
class Overview(BaseModel):
    updated_at: datetime
    counters: dict[RiskLevel, int]

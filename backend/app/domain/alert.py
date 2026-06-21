"""Threat alert domain model.

Alerts are emitted when a NEO crosses into a higher risk class (e.g.
moderate → critical). They flow through the WebSocket `threat_alerts` channel
and a short Redis log keyed `cliff:alerts:recent`.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.domain.risk import RiskClass


class ThreatAlert(BaseModel):
    alert_id: str
    neo_id: str
    name: str
    severity: RiskClass
    title: str
    description: str
    previous_class: Optional[RiskClass] = None
    miss_distance_km: Optional[float] = None
    next_approach_at: Optional[datetime] = None
    actions: List[str] = Field(default_factory=list)
    issued_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    expires_at: Optional[datetime] = None

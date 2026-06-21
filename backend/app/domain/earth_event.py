"""Unified Earth-event domain model.

One `EarthEvent` represents a single observable natural phenomenon —
wildfires, volcanoes, severe storms, sea ice, or earthquakes. Sources are
normalized into this single shape by `app/pipeline/earth_normalizer.py` so
the dashboard can render every category through the same component path.

Mirrors `RiskRecord`'s lifecycle role for the asteroid pipeline: each
event has one record in Redis (keyed by `id`), the scheduler refreshes it
periodically, and the WebSocket layer broadcasts deltas downstream.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

EventSource = Literal["eonet", "afad", "usgs"]
EventStatus = Literal["open", "closed"]


class EventSeverity(str, Enum):
    INFO = "info"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


SEVERITY_RANK: Dict[str, int] = {
    EventSeverity.INFO.value: 0,
    EventSeverity.LOW.value: 1,
    EventSeverity.MODERATE.value: 2,
    EventSeverity.HIGH.value: 3,
    EventSeverity.CRITICAL.value: 4,
}


class EarthEventGeometry(BaseModel):
    """One sample point (or polygon vertex chain) on the event timeline.

    Multiple geometries → trail. Coordinates are GeoJSON convention:
    Point = [lon, lat], Polygon = [[lon, lat], ...]
    """

    date: datetime
    type: Literal["Point", "Polygon"] = "Point"
    coordinates: Union[List[float], List[List[float]]]
    magnitude_value: Optional[float] = None
    magnitude_unit: Optional[str] = None  # "kts", "Mw", "km^2", "vei", ...


class EarthEventSourceLink(BaseModel):
    """Citation/reference link surfaced in the detail panel."""

    id: str  # e.g. "InciWeb", "AFAD", "GDACS"
    url: str


class EarthEventMetric(BaseModel):
    """Headline metric shown in the detail panel — single number with unit
    that summarises the event's intensity (e.g. wildfire area, quake Mw)."""

    value: float
    unit: str
    label_tr: str  # "Büyüklük (Mw)", "Alan (km²)", "Rüzgâr (knot)"


class EarthEvent(BaseModel):
    id: str  # globally unique: "EONET_EONET_12345" / "AFAD_2024_001234"
    source: EventSource
    category: str  # `earth_categories.EARTH_CATEGORIES` key
    title: str
    description: Optional[str] = None
    geometries: List[EarthEventGeometry] = Field(default_factory=list)
    started_at: datetime
    updated_at: datetime
    closed_at: Optional[datetime] = None
    status: EventStatus = "open"
    severity: EventSeverity = EventSeverity.INFO
    severity_score: float = 0.0  # [0,1] for sort order
    primary_metric: Optional[EarthEventMetric] = None
    sources: List[EarthEventSourceLink] = Field(default_factory=list)
    raw_categories: List[str] = Field(default_factory=list)
    # Lifecycle bookkeeping
    fetched_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    extras: Dict[str, Any] = Field(default_factory=dict)

    @property
    def severity_rank(self) -> int:
        return SEVERITY_RANK.get(self.severity.value, 0)

    @property
    def latest_point(self) -> Optional[List[float]]:
        """Most recent Point geometry — used by 3D/2D markers. Returns
        [lon, lat] or None."""
        for geo in reversed(self.geometries):
            if geo.type == "Point" and isinstance(geo.coordinates, list):
                if len(geo.coordinates) >= 2:
                    return [float(geo.coordinates[0]), float(geo.coordinates[1])]
        return None


class EarthEventDelta(BaseModel):
    """What changed when an event was upserted. Drives WS push + cache merge."""

    event_id: str
    category: str
    title: str
    direction: Literal["new", "updated", "closed", "escalated", "deescalated"]
    previous_severity: Optional[EventSeverity] = None
    new_severity: EventSeverity
    previous_score: Optional[float] = None
    new_score: float
    started_at: datetime
    updated_at: datetime
    point: Optional[List[float]] = None  # [lon, lat] convenience
    computed_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class EarthEventAlert(BaseModel):
    """Severity ≥ HIGH event broadcast on the `earth_alerts` channel."""

    alert_id: str
    event_id: str
    category: str
    title: str
    severity: EventSeverity
    point: Optional[List[float]] = None
    started_at: datetime
    description: Optional[str] = None
    sources: List[EarthEventSourceLink] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())


class EarthEventSummary(BaseModel):
    """Aggregate counters for the KPI bar."""

    total_open: int = 0
    by_category: Dict[str, int] = Field(default_factory=dict)
    by_severity: Dict[str, int] = Field(default_factory=dict)
    last_24h: int = 0
    last_7d: int = 0
    top_active: List[EarthEvent] = Field(default_factory=list)
    fetched_at: datetime = Field(default_factory=lambda: datetime.utcnow())


__all__ = [
    "EarthEvent",
    "EarthEventDelta",
    "EarthEventAlert",
    "EarthEventGeometry",
    "EarthEventMetric",
    "EarthEventSourceLink",
    "EarthEventSummary",
    "EventSeverity",
    "EventSource",
    "EventStatus",
    "SEVERITY_RANK",
]

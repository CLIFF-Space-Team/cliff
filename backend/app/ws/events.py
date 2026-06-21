"""Typed server → client event envelopes.

Every outbound message is a discriminated union; clients can switch on `type`.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field

from app.domain.alert import ThreatAlert
from app.domain.earth_event import EarthEventAlert, EarthEventDelta
from app.domain.risk import RiskDelta


class _BaseEvent(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.utcnow())


class HelloEvent(_BaseEvent):
    type: Literal["hello"] = "hello"
    client_id: str
    channels: List[str]
    server_version: str


class SubscribedEvent(_BaseEvent):
    type: Literal["subscribed"] = "subscribed"
    channel: str


class UnsubscribedEvent(_BaseEvent):
    type: Literal["unsubscribed"] = "unsubscribed"
    channel: str


class HeartbeatEvent(_BaseEvent):
    type: Literal["heartbeat"] = "heartbeat"


class RiskUpdateEvent(_BaseEvent):
    type: Literal["risk_update"] = "risk_update"
    deltas: List[RiskDelta]


class ThreatAlertEvent(_BaseEvent):
    type: Literal["threat_alert"] = "threat_alert"
    alert: ThreatAlert


class SystemStatusEvent(_BaseEvent):
    type: Literal["system_status"] = "system_status"
    status: Literal["healthy", "degraded", "offline"]
    cycle_count: int = 0
    last_cycle_at: Optional[datetime] = None
    redis_ok: bool = True
    nasa_ok: bool = True


class ErrorEvent(_BaseEvent):
    type: Literal["error"] = "error"
    code: str
    message: str


class LiveCountEvent(_BaseEvent):
    """Broadcast on the `analytics_updates` channel every ~30 s with the
    number of currently connected WebSocket clients. Powers the admin
    panel's real-time "online now" tile."""

    type: Literal["live_count"] = "live_count"
    count: int


class EarthEventUpdateEvent(_BaseEvent):
    """Earth pipeline pushed one or more deltas. Frontend merges these
    into the React Query cache so the markers/list update without a
    refetch."""

    type: Literal["earth_update"] = "earth_update"
    deltas: List[EarthEventDelta]


class EarthEventAlertEvent(_BaseEvent):
    """A high-severity earth event surfaced. Triggers a toast on the
    dashboard and prepends to the alert ticker."""

    type: Literal["earth_alert"] = "earth_alert"
    alert: EarthEventAlert


ServerEvent = Union[
    HelloEvent,
    SubscribedEvent,
    UnsubscribedEvent,
    HeartbeatEvent,
    RiskUpdateEvent,
    ThreatAlertEvent,
    SystemStatusEvent,
    ErrorEvent,
    LiveCountEvent,
    EarthEventUpdateEvent,
    EarthEventAlertEvent,
]


# Channel names — single source of truth
CHANNELS = (
    "risk_updates",
    "threat_alerts",
    "system_status",
    "data_updates",
    # Live admin-panel feed: scheduler broadcasts a {type:"live_count",count:N}
    # event every ~30 s so the admin dashboard's "online now" tile updates
    # without polling.
    "analytics_updates",
    # Unified Earth-event pipeline: every upsert delta + every high-severity
    # alert is broadcast here so the /earth dashboard updates without polling.
    "earth_updates",
    "earth_alerts",
)


class ClientCommand(BaseModel):
    """Inbound message from the browser."""

    action: Literal["subscribe", "unsubscribe", "ping", "echo"]
    channel: Optional[str] = None
    request_id: Optional[str] = None
    payload: Optional[dict] = None

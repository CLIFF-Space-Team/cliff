"""Redis-backed `EarthEvent` store.

Mirrors `risk_store.py` for the asteroid pipeline: each event has one
JSON record keyed by `id`, plus secondary indexes (ZSET by start time
and severity, SET by category and source, an open-event bucket, and an
alerts list). Upserts emit deltas — the scheduler turns those into WS
broadcasts.

Key schema (prefix `cliff:earth:`):
    event:{event_id}              JSON  — full EarthEvent
    by_started                    ZSET  — score=unix_ts, member=event_id
    by_severity                   ZSET  — score=severity_score [0,1], member=event_id
    by_category:{cat_key}         SET   — member=event_id
    by_source:{src}               SET   — member=event_id
    open                          SET   — member=event_id (status=open only)
    alerts:recent                 LIST  — JSON EarthEventAlert (capped 50)

Records are removed from open + secondary indexes when an event closes.
A periodic prune drops events older than `EVENT_TTL_DAYS` from every
index regardless of source so the dashboard stays bounded.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence

from app.core import redis_client
from app.core.logging import get_logger
from app.domain.earth_event import (
    EarthEvent,
    EarthEventAlert,
    EarthEventDelta,
    EarthEventSummary,
)

log = get_logger(__name__)

_PREFIX = "cliff:earth"
_EVENT_KEY = f"{_PREFIX}:event"
_BY_STARTED = f"{_PREFIX}:by_started"
_BY_SEVERITY = f"{_PREFIX}:by_severity"
_BY_CATEGORY = f"{_PREFIX}:by_category"
_BY_SOURCE = f"{_PREFIX}:by_source"
_OPEN_SET = f"{_PREFIX}:open"
_ALERT_LIST = f"{_PREFIX}:alerts:recent"
_ALERT_MAX = 50

EVENT_TTL_DAYS = 60


def _event_key(event_id: str) -> str:
    return f"{_EVENT_KEY}:{event_id}"


def _category_key(category: str) -> str:
    return f"{_BY_CATEGORY}:{category}"


def _source_key(source: str) -> str:
    return f"{_BY_SOURCE}:{source}"


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------


async def get(event_id: str) -> Optional[EarthEvent]:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return None
    raw = await client.get(_event_key(event_id))
    if raw is None:
        return None
    try:
        return EarthEvent.model_validate_json(raw)
    except Exception as exc:  # noqa: BLE001
        log.warning("earth_store.parse_failed", event_id=event_id, error=str(exc))
        return None


async def total_open() -> int:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return 0
    return int(await client.scard(_OPEN_SET))


async def list_ids_by_recent(limit: int = 100, offset: int = 0) -> List[str]:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return []
    return await client.zrevrange(_BY_STARTED, offset, offset + limit - 1)


async def list_ids_by_severity(limit: int = 100, offset: int = 0) -> List[str]:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return []
    return await client.zrevrange(_BY_SEVERITY, offset, offset + limit - 1)


async def fetch_many(event_ids: Sequence[str]) -> List[EarthEvent]:
    if not event_ids:
        return []
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return []
    keys = [_event_key(eid) for eid in event_ids]
    raws = await client.mget(*keys)
    out: List[EarthEvent] = []
    for raw in raws:
        if not raw:
            continue
        try:
            out.append(EarthEvent.model_validate_json(raw))
        except Exception:
            continue
    return out


async def query(
    *,
    categories: Optional[Iterable[str]] = None,
    sources: Optional[Iterable[str]] = None,
    status: str = "all",  # "open" | "closed" | "all"
    severity_min: Optional[str] = None,  # severity name
    days: Optional[int] = None,
    sort_by: str = "recent",  # "recent" | "severity"
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    """Server-side filtered + sorted + paginated query. Returns
    `{items, total}` where `total` is the count after filtering but
    before pagination."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return {"items": [], "total": 0}

    # Start with the full id set from whichever index applies.
    primary_index = _BY_SEVERITY if sort_by == "severity" else _BY_STARTED
    raw_ids: List[str] = await client.zrevrange(primary_index, 0, -1)
    candidate_ids: List[str] = list(raw_ids)

    # Filter by category / source membership using the secondary SETs.
    if categories:
        cat_list = [c for c in categories if c]
        if cat_list:
            allowed: set[str] = set()
            for cat in cat_list:
                members = await client.smembers(_category_key(cat))
                allowed.update(members)
            candidate_ids = [eid for eid in candidate_ids if eid in allowed]

    if sources:
        src_list = [s for s in sources if s]
        if src_list:
            allowed_src: set[str] = set()
            for src in src_list:
                members = await client.smembers(_source_key(src))
                allowed_src.update(members)
            candidate_ids = [eid for eid in candidate_ids if eid in allowed_src]

    if status in ("open", "closed"):
        open_members: set[str] = set(await client.smembers(_OPEN_SET))
        if status == "open":
            candidate_ids = [eid for eid in candidate_ids if eid in open_members]
        else:
            candidate_ids = [eid for eid in candidate_ids if eid not in open_members]

    # Hydrate then filter on severity / time. We pull in chunks so the
    # mget round-trip stays bounded even when the index is huge.
    items: List[EarthEvent] = []
    severity_floor: Optional[int] = None
    if severity_min:
        from app.domain.earth_event import SEVERITY_RANK

        severity_floor = SEVERITY_RANK.get(severity_min, 0)

    cutoff: Optional[datetime] = None
    if days is not None and days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    page_size = 200
    for start in range(0, len(candidate_ids), page_size):
        chunk = candidate_ids[start : start + page_size]
        events = await fetch_many(chunk)
        for ev in events:
            if severity_floor is not None and ev.severity_rank < severity_floor:
                continue
            if cutoff is not None and ev.updated_at < cutoff and ev.started_at < cutoff:
                continue
            items.append(ev)

    total = len(items)
    if sort_by == "severity":
        items.sort(key=lambda e: (e.severity_score, e.updated_at), reverse=True)
    else:
        items.sort(key=lambda e: e.updated_at, reverse=True)

    page = items[offset : offset + limit]
    return {"items": page, "total": total}


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------


async def upsert(event: EarthEvent) -> Optional[EarthEventDelta]:
    """Persist an event. Returns a delta when meaningful change occurred
    (new event, severity tier transition, or status flip)."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return None

    previous = await get(event.id)
    payload = event.model_dump_json()
    started_at = event.started_at if event.started_at.tzinfo else event.started_at.replace(tzinfo=timezone.utc)
    started_score = started_at.timestamp()

    pipe = client.pipeline()
    pipe.set(_event_key(event.id), payload)
    pipe.zadd(_BY_STARTED, {event.id: started_score})
    pipe.zadd(_BY_SEVERITY, {event.id: float(event.severity_score)})
    pipe.sadd(_category_key(event.category), event.id)
    pipe.sadd(_source_key(event.source), event.id)
    if event.status == "open":
        pipe.sadd(_OPEN_SET, event.id)
    else:
        pipe.srem(_OPEN_SET, event.id)
    await pipe.execute()

    return _build_delta(previous, event)


async def upsert_many(events: Iterable[EarthEvent]) -> List[EarthEventDelta]:
    deltas: List[EarthEventDelta] = []
    for event in events:
        delta = await upsert(event)
        if delta is not None:
            deltas.append(delta)
    return deltas


async def remove(event_id: str) -> None:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return
    record = await get(event_id)
    pipe = client.pipeline()
    pipe.delete(_event_key(event_id))
    pipe.zrem(_BY_STARTED, event_id)
    pipe.zrem(_BY_SEVERITY, event_id)
    pipe.srem(_OPEN_SET, event_id)
    if record is not None:
        pipe.srem(_category_key(record.category), event_id)
        pipe.srem(_source_key(record.source), event_id)
    await pipe.execute()


async def push_alert(alert: EarthEventAlert) -> None:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return
    pipe = client.pipeline()
    pipe.lpush(_ALERT_LIST, alert.model_dump_json())
    pipe.ltrim(_ALERT_LIST, 0, _ALERT_MAX - 1)
    await pipe.execute()


async def recent_alerts(limit: int = 25) -> List[EarthEventAlert]:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return []
    raws = await client.lrange(_ALERT_LIST, 0, limit - 1)
    out: List[EarthEventAlert] = []
    for raw in raws:
        try:
            out.append(EarthEventAlert.model_validate_json(raw))
        except Exception:
            continue
    return out


# ---------------------------------------------------------------------------
# Aggregates
# ---------------------------------------------------------------------------


async def summary(top_n: int = 5) -> EarthEventSummary:
    """Stats for the dashboard KPI bar.

    Counts are exact — the open-set / category-set scards are O(1) — and
    `top_active` is the highest-severity-score open events."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return EarthEventSummary()

    total = int(await client.scard(_OPEN_SET))

    # Per-category counts (open-only).
    by_category: Dict[str, int] = {}
    cat_keys = await client.keys(f"{_BY_CATEGORY}:*")
    open_members = set(await client.smembers(_OPEN_SET))
    for ck in cat_keys:
        members = await client.smembers(ck)
        cat_open = len(members & open_members)
        if cat_open > 0:
            label = ck.rsplit(":", 1)[-1]
            by_category[label] = cat_open

    # Per-severity counts (full open-set hydration).
    by_severity: Dict[str, int] = {}
    open_events = await fetch_many(list(open_members))
    for ev in open_events:
        key = ev.severity.value
        by_severity[key] = by_severity.get(key, 0) + 1

    now = datetime.now(timezone.utc)
    cutoff_24 = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)
    last_24h = sum(1 for ev in open_events if ev.updated_at >= cutoff_24)
    last_7d = sum(1 for ev in open_events if ev.updated_at >= cutoff_7d)

    top_ids = await client.zrevrange(_BY_SEVERITY, 0, top_n * 4 - 1)
    top_open: List[EarthEvent] = []
    for ev in await fetch_many(top_ids):
        if ev.status == "open":
            top_open.append(ev)
        if len(top_open) >= top_n:
            break

    return EarthEventSummary(
        total_open=total,
        by_category=by_category,
        by_severity=by_severity,
        last_24h=last_24h,
        last_7d=last_7d,
        top_active=top_open,
    )


async def prune_stale(days: int = EVENT_TTL_DAYS) -> int:
    """Drop events older than `days` from every index. Returns count."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return 0
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).timestamp()
    stale_ids = await client.zrangebyscore(_BY_STARTED, "-inf", cutoff)
    for eid in stale_ids:
        await remove(eid)
    return len(stale_ids)


async def clear_all() -> int:
    """Wipe every earth-event key. Returns deleted count. Operator-only."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return 0
    deleted = 0
    pattern = f"{_PREFIX}:*"
    async for key in client.scan_iter(match=pattern, count=200):
        await client.delete(key)
        deleted += 1
    return deleted


# ---------------------------------------------------------------------------
# Delta + alert builders
# ---------------------------------------------------------------------------


def _build_delta(previous: Optional[EarthEvent], new: EarthEvent) -> Optional[EarthEventDelta]:
    point = new.latest_point
    if previous is None:
        return EarthEventDelta(
            event_id=new.id,
            category=new.category,
            title=new.title,
            direction="new",
            previous_severity=None,
            new_severity=new.severity,
            previous_score=None,
            new_score=new.severity_score,
            started_at=new.started_at,
            updated_at=new.updated_at,
            point=point,
        )

    prev_rank = previous.severity_rank
    new_rank = new.severity_rank
    direction: str

    if previous.status == "open" and new.status == "closed":
        direction = "closed"
    elif new_rank > prev_rank:
        direction = "escalated"
    elif new_rank < prev_rank:
        direction = "deescalated"
    elif new.updated_at != previous.updated_at:
        direction = "updated"
    elif abs(previous.severity_score - new.severity_score) < 0.005:
        return None
    else:
        direction = "updated"

    return EarthEventDelta(
        event_id=new.id,
        category=new.category,
        title=new.title,
        direction=direction,  # type: ignore[arg-type]
        previous_severity=previous.severity,
        new_severity=new.severity,
        previous_score=previous.severity_score,
        new_score=new.severity_score,
        started_at=new.started_at,
        updated_at=new.updated_at,
        point=point,
    )


def build_alert_for_delta(event: EarthEvent, delta: EarthEventDelta) -> Optional[EarthEventAlert]:
    """Emit an alert when an event reaches HIGH/CRITICAL on a new or
    escalating delta. De-escalations and routine updates do not page."""
    if delta.direction not in ("new", "escalated"):
        return None
    if event.severity_rank < 3:  # < HIGH
        return None
    return EarthEventAlert(
        alert_id=str(uuid.uuid4()),
        event_id=event.id,
        category=event.category,
        title=event.title,
        severity=event.severity,
        point=event.latest_point,
        started_at=event.started_at,
        description=event.description,
        sources=event.sources,
    )


__all__ = [
    "get",
    "total_open",
    "list_ids_by_recent",
    "list_ids_by_severity",
    "fetch_many",
    "query",
    "upsert",
    "upsert_many",
    "remove",
    "push_alert",
    "recent_alerts",
    "summary",
    "prune_stale",
    "clear_all",
    "build_alert_for_delta",
]

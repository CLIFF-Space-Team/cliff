"""Redis-backed RiskRecord store.

Key schema:
  cliff:risk:{neo_id}            HASH  → JSON serialized RiskRecord
  cliff:risk:by_score            ZSET  → score=hybrid_score, member=neo_id
  cliff:risk:by_recompute        ZSET  → score=computed_at_unix, member=neo_id
  cliff:alerts:recent            LIST  → JSON serialized ThreatAlert (capped)
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Iterable, List, Optional

from app.core import redis_client
from app.core.logging import get_logger
from app.domain.alert import ThreatAlert
from app.domain.risk import RiskClass, RiskDelta, RiskRecord

log = get_logger(__name__)

_PREFIX = "cliff:risk"
_RECORD_KEY = f"{_PREFIX}:record"
_BY_SCORE_KEY = f"{_PREFIX}:by_score"
_BY_RECOMPUTE_KEY = f"{_PREFIX}:by_recompute"
_ALERT_LIST_KEY = "cliff:alerts:recent"
_ALERT_MAX = 100


def _record_key(neo_id: str) -> str:
    return f"{_RECORD_KEY}:{neo_id}"


async def get(neo_id: str) -> Optional[RiskRecord]:
    raw = await redis_client.get_client().get(_record_key(neo_id))
    if raw is None:
        return None
    try:
        return RiskRecord.model_validate_json(raw)
    except Exception as exc:
        log.warning("risk_store.parse_failed", neo_id=neo_id, error=str(exc))
        return None


async def upsert(record: RiskRecord) -> Optional[RiskDelta]:
    """Persist `record` and return a RiskDelta if class/score changed."""
    client = redis_client.get_client()
    previous = await get(record.neo_id)

    payload = record.model_dump_json()
    pipe = client.pipeline()
    pipe.set(_record_key(record.neo_id), payload)
    pipe.zadd(_BY_SCORE_KEY, {record.neo_id: float(record.hybrid_score)})
    pipe.zadd(_BY_RECOMPUTE_KEY, {record.neo_id: time.time()})
    await pipe.execute()

    return _build_delta(previous, record)


async def upsert_many(records: Iterable[RiskRecord]) -> List[RiskDelta]:
    deltas: List[RiskDelta] = []
    for record in records:
        delta = await upsert(record)
        if delta is not None:
            deltas.append(delta)
    return deltas


async def remove(neo_id: str) -> None:
    client = redis_client.get_client()
    pipe = client.pipeline()
    pipe.delete(_record_key(neo_id))
    pipe.zrem(_BY_SCORE_KEY, neo_id)
    pipe.zrem(_BY_RECOMPUTE_KEY, neo_id)
    await pipe.execute()


async def top_n_by_score(n: int = 50) -> List[RiskRecord]:
    client = redis_client.get_client()
    neo_ids = await client.zrevrange(_BY_SCORE_KEY, 0, n - 1)
    if not neo_ids:
        return []
    keys = [_record_key(nid) for nid in neo_ids]
    raws = await client.mget(*keys)
    out: List[RiskRecord] = []
    for raw in raws:
        if raw is None:
            continue
        try:
            out.append(RiskRecord.model_validate_json(raw))
        except Exception:
            continue
    return out


async def stale_neo_ids(older_than_seconds: int, limit: int = 100) -> List[str]:
    """Return neo_ids whose last recompute is older than the cutoff."""
    client = redis_client.get_client()
    cutoff = time.time() - older_than_seconds
    return await client.zrangebyscore(_BY_RECOMPUTE_KEY, "-inf", cutoff, start=0, num=limit)


async def total() -> int:
    client = redis_client.get_client()
    return int(await client.zcard(_BY_SCORE_KEY))


async def push_alert(alert: ThreatAlert) -> None:
    client = redis_client.get_client()
    pipe = client.pipeline()
    pipe.lpush(_ALERT_LIST_KEY, alert.model_dump_json())
    pipe.ltrim(_ALERT_LIST_KEY, 0, _ALERT_MAX - 1)
    await pipe.execute()


async def recent_alerts(limit: int = 50) -> List[ThreatAlert]:
    client = redis_client.get_client()
    raws = await client.lrange(_ALERT_LIST_KEY, 0, limit - 1)
    out: List[ThreatAlert] = []
    for raw in raws:
        try:
            out.append(ThreatAlert.model_validate_json(raw))
        except Exception:
            continue
    return out


def _build_delta(previous: Optional[RiskRecord], new: RiskRecord) -> Optional[RiskDelta]:
    if previous is None:
        return RiskDelta(
            neo_id=new.neo_id,
            name=new.name,
            previous_class=None,
            new_class=new.risk_class,
            previous_score=None,
            new_score=new.hybrid_score,
            direction="new",
            computed_at=datetime.utcnow(),
        )

    if previous.risk_class == new.risk_class and abs(previous.hybrid_score - new.hybrid_score) < 0.02:
        return None

    if new.severity_rank > previous.severity_rank:
        direction = "up"
    elif new.severity_rank < previous.severity_rank:
        direction = "down"
    else:
        direction = "same"

    return RiskDelta(
        neo_id=new.neo_id,
        name=new.name,
        previous_class=previous.risk_class,
        new_class=new.risk_class,
        previous_score=previous.hybrid_score,
        new_score=new.hybrid_score,
        direction=direction,
        computed_at=datetime.utcnow(),
    )


def build_alert_for_delta(record: RiskRecord, delta: RiskDelta) -> Optional[ThreatAlert]:
    """Emit an alert when class crossed into HIGH or CRITICAL."""
    if delta.direction != "up":
        return None
    if record.risk_class not in (RiskClass.HIGH, RiskClass.CRITICAL):
        return None

    title = f"{record.name} → {record.risk_class.value.upper()}"
    description = (
        f"NEO {record.name} risk class {delta.previous_class.value if delta.previous_class else 'new'}"
        f" → {record.risk_class.value}. Hybrid score {record.hybrid_score:.2f}."
    )
    actions = ["review", "broadcast"]
    if record.risk_class == RiskClass.CRITICAL:
        actions.append("escalate")

    return ThreatAlert(
        alert_id=str(uuid.uuid4()),
        neo_id=record.neo_id,
        name=record.name,
        severity=record.risk_class,
        title=title,
        description=description,
        previous_class=delta.previous_class,
        miss_distance_km=record.miss_distance_km,
        next_approach_at=record.next_approach_at,
        actions=actions,
    )

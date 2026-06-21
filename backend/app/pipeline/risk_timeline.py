"""Persistent risk-score time series.

Each scheduler cycle, after recomputing a NEO's risk, we append a row to a
Redis sorted set keyed by `cliff:risk:timeline:{neo_id}` with score = unix
timestamp and member = JSON snapshot of the entry. This gives us a cheap
TimescaleDB-equivalent for ~30-day retention without a new database.

Why Redis (not TimescaleDB)?
  - We already require Redis for the risk store; no new infra.
  - Retention window is short (≤30 days) so an in-memory ZSET is fine.
  - Sub-millisecond range queries via ZRANGEBYSCORE.
  - For longer retention or heavy analytics, swap this module for an
    asyncpg+Timescale implementation — same interface.
"""

from __future__ import annotations

import time
from typing import List, Optional

from pydantic import BaseModel, Field

from app.core import redis_client
from app.core.logging import get_logger
from app.domain.risk import RiskClass, RiskRecord

log = get_logger(__name__)

_PREFIX = "cliff:risk:timeline"
_DEFAULT_RETENTION_SECONDS = 30 * 24 * 3600  # 30 days


class TimelineSample(BaseModel):
    ts: float = Field(..., description="Unix timestamp (UTC seconds).")
    risk_class: RiskClass
    hybrid_score: float
    ml_confidence: float = 0.0
    miss_distance_km: Optional[float] = None
    geo_distance_au: Optional[float] = None


class TimelineSeries(BaseModel):
    neo_id: str
    samples: List[TimelineSample]


def _key(neo_id: str) -> str:
    return f"{_PREFIX}:{neo_id}"


async def append(record: RiskRecord, retention_seconds: int = _DEFAULT_RETENTION_SECONDS) -> None:
    """Append a sample of `record` to its NEO's timeline + trim old entries."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return

    sample = TimelineSample(
        ts=time.time(),
        risk_class=record.risk_class,
        hybrid_score=record.hybrid_score,
        ml_confidence=record.ml_confidence,
        miss_distance_km=record.miss_distance_km,
        geo_distance_au=record.geo_distance_au,
    )
    payload = sample.model_dump_json()

    cutoff = time.time() - retention_seconds
    pipe = client.pipeline()
    pipe.zadd(_key(record.neo_id), {payload: sample.ts})
    pipe.zremrangebyscore(_key(record.neo_id), "-inf", cutoff)
    try:
        await pipe.execute()
    except Exception as exc:
        log.warning("timeline.append_failed", neo_id=record.neo_id, error=str(exc))


async def fetch(neo_id: str, days: int = 30, limit: int = 720) -> TimelineSeries:
    """Fetch up to `limit` samples for `neo_id` over the last `days`.

    Samples are returned chronologically (oldest first).
    """
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return TimelineSeries(neo_id=neo_id, samples=[])

    cutoff = time.time() - days * 24 * 3600
    try:
        raws = await client.zrangebyscore(_key(neo_id), cutoff, "+inf", start=0, num=limit)
    except Exception as exc:
        log.warning("timeline.fetch_failed", neo_id=neo_id, error=str(exc))
        return TimelineSeries(neo_id=neo_id, samples=[])

    samples: List[TimelineSample] = []
    for raw in raws:
        try:
            samples.append(TimelineSample.model_validate_json(raw))
        except Exception:
            continue
    return TimelineSeries(neo_id=neo_id, samples=samples)

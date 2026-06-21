"""earth_event_store integration tests against fakeredis."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import fakeredis.aioredis
import pytest

from app.core import redis_client
from app.domain.earth_event import (
    EarthEvent,
    EarthEventGeometry,
    EarthEventMetric,
    EventSeverity,
)
from app.pipeline import earth_event_store


@pytest.fixture(autouse=True)
async def _fake_redis(monkeypatch):
    """Swap the global Redis client for an in-memory fake. Cleaned up
    automatically after every test so state doesn't leak between cases."""
    fake = fakeredis.aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_client, "_client", fake)
    yield fake
    await fake.flushall()
    monkeypatch.setattr(redis_client, "_client", None)


def _wildfire(id_: str, mag: float, *, status: str = "open") -> EarthEvent:
    now = datetime.now(timezone.utc)
    return EarthEvent(
        id=id_,
        source="eonet",
        category="wildfires",
        title=f"Fire {id_}",
        geometries=[
            EarthEventGeometry(
                date=now,
                type="Point",
                coordinates=[10.0, 40.0],
                magnitude_value=mag,
                magnitude_unit="km^2",
            )
        ],
        started_at=now,
        updated_at=now,
        status=status,  # type: ignore[arg-type]
        severity=EventSeverity.HIGH if mag >= 200 else EventSeverity.LOW,
        severity_score=0.7 if mag >= 200 else 0.2,
        primary_metric=EarthEventMetric(value=mag, unit="km²", label_tr="Alan"),
    )


def _quake(id_: str, mw: float) -> EarthEvent:
    now = datetime.now(timezone.utc)
    return EarthEvent(
        id=id_,
        source="afad",
        category="earthquakes-tr",
        title=f"Quake {id_}",
        geometries=[
            EarthEventGeometry(
                date=now,
                type="Point",
                coordinates=[35.0, 39.0],
                magnitude_value=mw,
                magnitude_unit="Mw",
            )
        ],
        started_at=now,
        updated_at=now,
        severity=EventSeverity.HIGH if mw >= 5.5 else EventSeverity.MODERATE,
        severity_score=0.7 if mw >= 5.5 else 0.45,
        primary_metric=EarthEventMetric(value=mw, unit="Mw", label_tr="Büyüklük"),
    )


@pytest.mark.asyncio
async def test_upsert_returns_new_delta_then_no_change():
    ev = _wildfire("a", 100)
    delta = await earth_event_store.upsert(ev)
    assert delta is not None
    assert delta.direction == "new"

    # Second upsert with identical content → no delta.
    delta_again = await earth_event_store.upsert(ev)
    assert delta_again is None


@pytest.mark.asyncio
async def test_upsert_severity_change_emits_escalated():
    low = _wildfire("a", 50)
    await earth_event_store.upsert(low)
    high = _wildfire("a", 300)
    delta = await earth_event_store.upsert(high)
    assert delta is not None
    assert delta.direction == "escalated"
    assert delta.previous_severity == EventSeverity.LOW
    assert delta.new_severity == EventSeverity.HIGH


@pytest.mark.asyncio
async def test_upsert_status_close_emits_closed_direction():
    ev = _wildfire("a", 100, status="open")
    await earth_event_store.upsert(ev)
    closed = _wildfire("a", 100, status="closed")
    delta = await earth_event_store.upsert(closed)
    assert delta is not None
    assert delta.direction == "closed"


@pytest.mark.asyncio
async def test_query_filters_by_category():
    await earth_event_store.upsert(_wildfire("w1", 100))
    await earth_event_store.upsert(_wildfire("w2", 200))
    await earth_event_store.upsert(_quake("q1", 5.0))

    only_quakes = await earth_event_store.query(categories=["earthquakes-tr"])
    assert only_quakes["total"] == 1
    assert only_quakes["items"][0].id == "q1"

    only_fires = await earth_event_store.query(categories=["wildfires"])
    assert only_fires["total"] == 2


@pytest.mark.asyncio
async def test_query_filters_by_severity_min():
    await earth_event_store.upsert(_wildfire("low", 50))  # LOW
    await earth_event_store.upsert(_wildfire("high", 300))  # HIGH
    res = await earth_event_store.query(severity_min="high")
    assert res["total"] == 1
    assert res["items"][0].id == "high"


@pytest.mark.asyncio
async def test_query_pagination():
    for i in range(5):
        await earth_event_store.upsert(_wildfire(f"w{i}", 100))
    res = await earth_event_store.query(limit=2, offset=0)
    assert len(res["items"]) == 2
    assert res["total"] == 5
    res2 = await earth_event_store.query(limit=2, offset=2)
    assert len(res2["items"]) == 2


@pytest.mark.asyncio
async def test_summary_counts_open_only():
    await earth_event_store.upsert(_wildfire("open", 100, status="open"))
    await earth_event_store.upsert(_wildfire("closed", 100, status="closed"))
    summary = await earth_event_store.summary()
    assert summary.total_open == 1
    assert summary.by_category.get("wildfires") == 1


@pytest.mark.asyncio
async def test_get_then_remove():
    ev = _wildfire("xx", 100)
    await earth_event_store.upsert(ev)
    fetched = await earth_event_store.get("xx")
    assert fetched is not None and fetched.id == "xx"
    await earth_event_store.remove("xx")
    assert await earth_event_store.get("xx") is None


@pytest.mark.asyncio
async def test_alert_pushed_for_high_severity():
    high = _wildfire("alert", 500)
    delta = await earth_event_store.upsert(high)
    assert delta is not None
    alert = earth_event_store.build_alert_for_delta(high, delta)
    assert alert is not None
    assert alert.event_id == "alert"
    await earth_event_store.push_alert(alert)
    recent = await earth_event_store.recent_alerts(limit=10)
    assert len(recent) == 1
    assert recent[0].event_id == "alert"


@pytest.mark.asyncio
async def test_alert_skipped_for_low_severity():
    low = _wildfire("low", 10)
    delta = await earth_event_store.upsert(low)
    assert delta is not None
    alert = earth_event_store.build_alert_for_delta(low, delta)
    assert alert is None


@pytest.mark.asyncio
async def test_prune_drops_old_events():
    # Manually insert an old event by overriding started_at.
    ev = _wildfire("ancient", 100)
    ev.started_at = datetime.now(timezone.utc) - timedelta(days=120)
    await earth_event_store.upsert(ev)
    fresh = _wildfire("fresh", 100)
    await earth_event_store.upsert(fresh)

    deleted = await earth_event_store.prune_stale(days=30)
    assert deleted == 1
    assert await earth_event_store.get("ancient") is None
    assert await earth_event_store.get("fresh") is not None

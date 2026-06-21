"""Threat / risk endpoints — read from the Redis-backed RiskStore."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, Field

from app.ai.service import get_service
from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.core.rate_limit import rate_limit_dep, rate_limit_queue_dep
from app.domain.alert import ThreatAlert
from app.domain.risk import RiskRecord, RiskSnapshot
from app.pipeline import explanation_store, risk_store, risk_timeline
from app.pipeline.risk_timeline import TimelineSeries

router = APIRouter()


# Reuse the same threat-explanation rate-limit budget for the regenerate
# endpoint — calling POST here is exactly as expensive as the original
# /ai/threat-explanation route. Whitelisted IPs continue to bypass.
_explain_minute_dep = rate_limit_queue_dep(
    limit_per_window=settings.AI_EXPLAIN_LIMIT_PER_MINUTE,
    window_seconds=60,
    name="ai_explain_min",
    max_wait_seconds=25.0,
)
_explain_hour_dep = rate_limit_dep(
    limit=settings.AI_EXPLAIN_LIMIT_PER_HOUR,
    window_seconds=3600,
    name="ai_explain_hour",
)


class CachedExplanation(BaseModel):
    """Shape returned by the shared-cache endpoints."""

    neo_id: str
    text: str
    citations: List[dict] = Field(default_factory=list)
    language: str
    model: str
    searched: bool = False
    fallback: bool = False
    generated_at: int  # unix seconds
    cached: bool  # True when read from store, False when freshly generated


class GenerateExplanationRequest(BaseModel):
    language: str = Field("tr", pattern="^(tr|en)$")
    with_search: bool = True


@router.get("/risk/snapshot", response_model=RiskSnapshot)
async def risk_snapshot(limit: int = Query(200, ge=1, le=500)) -> RiskSnapshot:
    items = await risk_store.top_n_by_score(limit)
    total = await risk_store.total()
    return RiskSnapshot(items=items, total=total, computed_at=datetime.utcnow())


@router.get("/featured-today")
async def featured_today() -> dict:
    """Return *the* NEO of the day — top-1 by hybrid score, with the next-
    closest approach. Powers the dashboard's hero card.

    Falls back gracefully (empty payload) when the store is still warming up.
    """
    items = await risk_store.top_n_by_score(50)
    if not items:
        return {"available": False}

    # Prefer items with a *future* next-approach so the hero feels timely.
    now = datetime.utcnow()
    upcoming = [r for r in items if r.next_approach_at is not None and r.next_approach_at >= now]
    pick = upcoming[0] if upcoming else items[0]

    days_until: Optional[int] = None
    if pick.next_approach_at is not None and pick.next_approach_at >= now:
        delta = pick.next_approach_at - now
        days_until = max(0, delta.days)

    return {
        "available": True,
        "neo_id": pick.neo_id,
        "designation": pick.designation,
        "name": pick.name,
        "risk_class": pick.risk_class.value,
        "hybrid_score": pick.hybrid_score,
        "diameter_max_km": pick.diameter_max_km,
        "miss_distance_km": pick.miss_distance_km,
        "relative_velocity_kms": pick.relative_velocity_kms,
        "next_approach_at": pick.next_approach_at.isoformat() if pick.next_approach_at else None,
        "is_potentially_hazardous": pick.is_potentially_hazardous,
        "sentry_listed": pick.sentry_listed,
        "days_until_approach": days_until,
    }


@router.get("/risk/{neo_id}", response_model=RiskRecord)
async def risk_detail(neo_id: str) -> RiskRecord:
    record = await risk_store.get(neo_id)
    if record is None:
        raise NotFoundError(f"No risk record for NEO {neo_id}", details={"neo_id": neo_id})
    return record


@router.get("/alerts/recent", response_model=list[ThreatAlert])
async def recent_alerts(limit: int = Query(50, ge=1, le=200)) -> list[ThreatAlert]:
    return await risk_store.recent_alerts(limit)


@router.get("/risk/{neo_id}/timeline", response_model=TimelineSeries)
async def risk_timeline_endpoint(
    neo_id: str,
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(720, ge=10, le=2000),
) -> TimelineSeries:
    """Return up to `limit` risk-score samples for `neo_id` over the last `days`.

    Sourced from the Redis-backed timeline ZSET that the autonomous scheduler
    appends to on every recompute. Useful for plotting risk-class evolution.
    """
    return await risk_timeline.fetch(neo_id, days=days, limit=limit)


@router.get("/risk/{neo_id}/explanation", response_model=CachedExplanation)
async def get_cached_explanation(neo_id: str) -> CachedExplanation:
    """Return the shared, cached AI explanation for this NEO.

    Every visitor reads back the same text — the first user pays the Grok
    call (via POST), everyone after that hits Redis. Returns 404 when no
    explanation has been generated yet so the UI can offer the "Açıkla"
    button. Records returned here come straight from `explanation_store`,
    keyed only by `neo_id` (language is part of the stored record so the
    UI can detect a Turkish vs English copy)."""
    cached = await explanation_store.get(neo_id)
    if not cached:
        raise NotFoundError(
            f"No cached explanation for NEO {neo_id}",
            details={"neo_id": neo_id},
        )
    return CachedExplanation(**cached, cached=True)


@router.post(
    "/risk/{neo_id}/explanation",
    response_model=CachedExplanation,
    dependencies=[Depends(_explain_minute_dep), Depends(_explain_hour_dep)],
)
async def generate_explanation(
    neo_id: str,
    request: GenerateExplanationRequest,
) -> CachedExplanation:
    """Generate (or regenerate) the cached AI explanation for this NEO.

    Idempotent semantics: writing always overwrites the cached entry, so
    callers can use this both for "first-time generate" and "refresh stale
    text" without separate routes. Rate-limited the same way the legacy
    `/ai/threat-explanation` route was — whitelisted IPs bypass."""
    service = get_service()
    result = await service.explain_threat(
        neo_id,
        language=request.language,
        with_search=request.with_search,
    )
    payload = await explanation_store.put(
        neo_id,
        text=result["text"],
        citations=[
            {"url": c["url"], "title": c.get("title") or c["url"]} for c in result.get("citations", []) if c.get("url")
        ],
        language=request.language,
        model=settings.AI_MODEL,
        searched=result.get("searched", False),
        fallback=result.get("fallback", False),
    )
    return CachedExplanation(**payload, cached=False)


@router.delete("/risk/{neo_id}/explanation")
async def clear_cached_explanation(neo_id: str) -> Response:
    """Drop the cached explanation. Useful for ops / admin tools."""
    await explanation_store.delete(neo_id)
    return Response(status_code=204)


@router.post("/refresh", status_code=202)
async def trigger_refresh() -> dict:
    """Manually trigger one autonomous-loop cycle (fire-and-forget)."""
    import asyncio

    from app.scheduler.autonomous_loop import loop

    asyncio.create_task(loop._safe_cycle())  # type: ignore[attr-defined]
    return {
        "accepted": True,
        "cycle_count": loop.cycle_count,
        "last_cycle_at": loop.last_cycle_at.isoformat() if loop.last_cycle_at else None,
    }

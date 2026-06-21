"""JPL Horizons + hybrid analysis endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query

from app.domain.neo import NormalizedNeo
from app.domain.risk import HybridAnalysis
from app.nasa import horizons, neows
from app.pipeline import hybrid_engine, normalizer

router = APIRouter()


@router.get("/asteroid/{neo_id}/ephemeris")
async def ephemeris(
    neo_id: str,
    days_ahead: int = Query(30, ge=1, le=365),
    step: str = Query("1d"),
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc).replace(microsecond=0, second=0)
    return await horizons.get_ephemeris(
        neo_id,
        start=now,
        stop=now + timedelta(days=days_ahead),
        step=step,
    )


@router.get("/asteroid/{neo_id}/future-positions")
async def future_positions(
    neo_id: str,
    days_ahead: int = Query(30, ge=1, le=365),
    step: str = Query("1d"),
) -> Dict[str, Any]:
    return await horizons.get_future_positions(neo_id, days_ahead=days_ahead, step=step)


@router.get("/asteroid/{neo_id}/hybrid-analysis", response_model=HybridAnalysis)
async def hybrid_analysis(
    neo_id: str,
    days_ahead: int = Query(30, ge=1, le=365),
    step: str = Query("1d"),
) -> HybridAnalysis:
    neo = await _try_normalized_neo(neo_id)
    return await hybrid_engine.analyze_target(
        neo_id=neo_id,
        days_ahead=days_ahead,
        step=step,
        neo=neo,
    )


async def _try_normalized_neo(neo_id: str) -> Optional[NormalizedNeo]:
    raw = await neows.get_neo(neo_id)
    if raw is None:
        return None
    return normalizer.normalize_neows(raw)

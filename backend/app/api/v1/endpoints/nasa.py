"""NASA passthrough proxy — frontend should hit these instead of NASA directly."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query

from app.core.exceptions import ValidationError
from app.nasa import cad, eonet, fireball, neows, nhats, sentry

router = APIRouter()


# ---- NeoWs ----


@router.get("/neo/feed")
async def neo_feed(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    days: int = Query(7, ge=1, le=7),
) -> Dict[str, Any]:
    if start_date is not None:
        end = end_date or (start_date + timedelta(days=days))
        if (end - start_date).days > 7:
            raise ValidationError("NeoWs feed window cannot exceed 7 days")
        return await neows.get_feed(start_date, end)
    return await neows.get_feed_today(days)


@router.get("/neo/{neo_id}")
async def neo_lookup(neo_id: str) -> Dict[str, Any]:
    return await neows.get_lookup(neo_id)


@router.get("/neo/browse/{page}")
async def neo_browse(page: int = 0, size: int = Query(20, ge=1, le=100)) -> Dict[str, Any]:
    return await neows.get_browse(page, size)


# ---- Sentry ----


@router.get("/sentry/objects")
async def sentry_objects(removed: bool = False) -> Dict[str, Any]:
    return await sentry.get_objects(removed=removed)


@router.get("/sentry/{des}")
async def sentry_detail(des: str) -> Dict[str, Any]:
    detail = await sentry.get_object_detail(des)
    return detail or {"des": des, "available": False}


# ---- CAD ----


@router.get("/cad")
async def close_approaches(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    dist_max_au: float = Query(0.05, ge=0.0001, le=0.5),
    body: str = "Earth",
) -> Dict[str, Any]:
    return await cad.get_close_approaches(
        start=start_date,
        end=end_date,
        dist_max_au=dist_max_au,
        body=body,
    )


# ---- EONET ----


@router.get("/eonet/events")
async def eonet_events(
    days: int = Query(30, ge=1, le=365),
    status: str = Query("open", pattern="^(open|closed|all)$"),
    categories: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
) -> Dict[str, Any]:
    cats = [c.strip() for c in categories.split(",")] if categories else None
    return await eonet.get_events(days=days, status=status, categories=cats, limit=limit)


@router.get("/eonet/categories")
async def eonet_categories() -> Dict[str, Any]:
    return await eonet.get_categories()


# ---- Fireballs ----


@router.get("/fireball")
async def fireball_events(
    limit: int = Query(200, ge=1, le=1000),
    min_energy_kt: Optional[float] = Query(None, ge=0, le=1e6),
    days_back: Optional[int] = Query(None, ge=1, le=3650),
    date_min: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}-\d{2}$"),
) -> Dict[str, Any]:
    """Recent fireball events. Pass `days_back=90` to get only the last 3
    months — by default JPL returns the entire archive (1988+)."""
    return await fireball.get_fireballs(
        limit=limit,
        min_energy_kt=min_energy_kt,
        date_min=date_min,
        days_back=days_back,
    )


# ---- NHATS ----


@router.get("/nhats")
async def nhats_targets(
    dv: int = Query(12, ge=4, le=12),
    dur: int = Query(450, ge=60, le=550),
    stay: int = Query(8, ge=8, le=200),
    launch: Optional[str] = Query(None, pattern=r"^\d{4}-\d{4}$"),
) -> Dict[str, Any]:
    return await nhats.get_targets(dv=dv, dur=dur, stay=stay, launch=launch)


@router.get("/nhats/{des}")
async def nhats_detail(des: str) -> Dict[str, Any]:
    detail = await nhats.get_target_detail(des)
    return detail or {"des": des, "available": False}

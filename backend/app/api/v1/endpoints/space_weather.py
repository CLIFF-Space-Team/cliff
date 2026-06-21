"""NOAA Space Weather endpoints — Kp, solar flare X-ray flux, solar wind."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter

from app.nasa import space_weather

router = APIRouter()


@router.get("/kp")
async def kp_index() -> Dict[str, Any]:
    """Latest 1-minute estimated planetary Kp (geomagnetic activity)."""
    return await space_weather.get_kp_index()


@router.get("/xray")
async def xray_flares() -> Dict[str, Any]:
    """Live GOES X-ray flux + strongest flare in the last 24 hours."""
    return await space_weather.get_xray_flares()


@router.get("/solar-wind")
async def solar_wind() -> Dict[str, Any]:
    """DSCOVR/ACE solar wind plasma + IMF Bz at L1."""
    return await space_weather.get_solar_wind()


@router.get("/summary")
async def summary() -> Dict[str, Any]:
    """One-shot bundle: Kp + X-ray + solar wind. Used by the dashboard widget."""
    return await space_weather.get_summary()

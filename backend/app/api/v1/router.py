"""API v1 aggregator."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    admin,
    ai,
    earth,
    health,
    horizons,
    impact,
    iss,
    missions,
    nasa,
    observability,
    orbit,
    space_weather,
    threats,
)

api_v1_router = APIRouter()

api_v1_router.include_router(health.router, tags=["system"])
api_v1_router.include_router(threats.router, prefix="/threats", tags=["threats"])
api_v1_router.include_router(nasa.router, prefix="/nasa", tags=["nasa"])
api_v1_router.include_router(horizons.router, prefix="/horizons", tags=["horizons"])
api_v1_router.include_router(orbit.router, tags=["orbit"])
api_v1_router.include_router(impact.router, prefix="/impact", tags=["impact"])
api_v1_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_v1_router.include_router(earth.router, prefix="/earth", tags=["earth"])
api_v1_router.include_router(missions.router, prefix="/missions", tags=["missions"])
api_v1_router.include_router(space_weather.router, prefix="/space-weather", tags=["space-weather"])
api_v1_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_v1_router.include_router(observability.router, prefix="/observability", tags=["observability"])
api_v1_router.include_router(iss.router, prefix="/iss", tags=["iss"])

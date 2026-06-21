"""Health and diagnostic endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter

from app.core import redis_client
from app.core.config import settings
from app.ws.manager import get_manager

router = APIRouter()


@router.get("/health")
async def health() -> Dict[str, Any]:
    redis_ok = await redis_client.ping()
    return {
        "status": "healthy" if redis_ok else "degraded",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {"redis": "healthy" if redis_ok else "unhealthy"},
    }


@router.get("/health/redis")
async def redis_health() -> Dict[str, Any]:
    ok = await redis_client.ping()
    return {"redis": "healthy" if ok else "unhealthy"}


@router.get("/ws/stats")
async def ws_stats() -> Dict[str, Any]:
    return get_manager().stats()

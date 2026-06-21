"""FastAPI application factory.

Phase 6: autonomous scheduler spawned in lifespan.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_client import make_asgi_app

from app.api.v1.router import api_v1_router
from app.core import redis_client
from app.core.config import settings
from app.core.exceptions import register_handlers
from app.core.logging import configure_logging, get_logger
from app.nasa import http as nasa_http
from app.scheduler.autonomous_loop import loop as autonomous_loop
from app.ws.manager import manager as ws_manager


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    log = get_logger(__name__)
    log.info("app.starting", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
    await redis_client.connect()
    await nasa_http.get_client()
    await autonomous_loop.start()
    log.info("app.started")
    try:
        yield
    finally:
        log.info("app.stopping")
        await autonomous_loop.stop()
        await ws_manager.shutdown()
        await nasa_http.close_client()
        await redis_client.disconnect()
        log.info("app.stopped")


def create_app() -> FastAPI:
    configure_logging()
    log = get_logger(__name__)

    app = FastAPI(
        title=settings.APP_NAME,
        description="Cosmic Level Intelligent Forecast Framework — NASA threat monitoring API",
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    register_handlers(app)
    app.mount("/metrics", make_asgi_app())
    app.include_router(api_v1_router, prefix="/api/v1")

    @app.get("/", tags=["system"])
    async def root() -> Dict[str, str]:
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/docs" if settings.docs_enabled else "disabled",
            "health": "/health",
            "ws": "/ws/cliff",
        }

    @app.get("/health", tags=["system"])
    async def health() -> Dict[str, object]:
        redis_ok = await redis_client.ping()
        return {
            "status": "healthy" if redis_ok else "degraded",
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "components": {
                "redis": "healthy" if redis_ok else "unhealthy",
                "scheduler": {
                    "enabled": settings.SCHEDULER_ENABLED,
                    "cycle_count": autonomous_loop.cycle_count,
                    "last_cycle_at": (autonomous_loop.last_cycle_at.isoformat() if autonomous_loop.last_cycle_at else None),
                },
            },
        }

    @app.get("/healthz", tags=["system"])
    async def healthz() -> Dict[str, object]:
        return await health()

    @app.websocket("/ws/cliff")
    async def cliff_ws(websocket: WebSocket) -> None:
        client_id = await ws_manager.accept(websocket)
        try:
            while True:
                payload = await websocket.receive_text()
                await ws_manager.handle_text(client_id, payload)
        except WebSocketDisconnect:
            pass
        finally:
            await ws_manager.disconnect(client_id)

    log.info("app.factory.ready")
    return app

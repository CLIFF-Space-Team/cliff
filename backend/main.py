import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, Dict
from datetime import datetime
import time

if sys.platform == "win32":
    import codecs
    import io
    import logging.handlers
    
    class SafeStreamHandler(logging.StreamHandler):
        def emit(self, record):
            try:
                super().emit(record)
            except (ValueError, OSError, AttributeError):
                pass
    
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        if isinstance(handler, logging.StreamHandler):
            root_logger.removeHandler(handler)
    
    safe_handler = SafeStreamHandler()
    safe_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    ))
    root_logger.addHandler(safe_handler)
    
    try:
        if (hasattr(sys.stdout, 'buffer') and hasattr(sys.stdout.buffer, 'raw')
            and not getattr(sys.stdout, '_detached', False)):
            original_stdout = sys.stdout
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
            sys.stdout._detached = True
        
        if (hasattr(sys.stderr, 'buffer') and hasattr(sys.stderr.buffer, 'raw')
            and not getattr(sys.stderr, '_detached', False)):
            original_stderr = sys.stderr
            sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
            sys.stderr._detached = True
            
    except (AttributeError, OSError, ValueError, RuntimeError):
        root_logger.handlers.clear()
        root_logger.addHandler(logging.NullHandler())

import uvicorn
from fastapi import FastAPI, HTTPException, Request, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from prometheus_client import make_asgi_app
import structlog

from app.core.config import settings
from app.core.database import initialize_database, disconnect_from_mongo, check_database_health
from app.services.neo_repository import ensure_indexes as ensure_neo_indexes

from app.api.v1.router import api_v1_router
from app.websocket.manager import websocket_manager
from app.websocket.ai_threat_websocket import initialize_ai_websocket_system
from app.services.nasa_services import simplified_nasa_services, nasa_services
from app.services.threat_scheduler import start as start_threat_scheduler, stop as stop_threat_scheduler


logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CLIFF Backend starting up...")
    
    try:
        logger.info("Initializing database...")
        await initialize_database()
        await ensure_neo_indexes()
        
        logger.info("Initializing WebSocket manager...")
        await websocket_manager.initialize()
        
        logger.info("Initializing AI WebSocket system...")
        await initialize_ai_websocket_system()

        await start_threat_scheduler()
        
        logger.info("CLIFF Backend startup complete!")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    
    yield
    
    logger.info("CLIFF Backend shutting down...")
    
    try:
        await websocket_manager.shutdown()
        
        logger.info("Stopping threat scheduler...")
        try:
            await stop_threat_scheduler()
        except Exception as e:
            logger.warning(f"Scheduler stop warning: {str(e)}")

        logger.info("Closing NASA services HTTP client...")
        try:
            await simplified_nasa_services.close_client()
            logger.info("NASA services client closed successfully")
        except Exception as e:
            logger.warning(f"NASA client cleanup warning: {str(e)}")
        
        await disconnect_from_mongo()
        
        logger.info("CLIFF Backend shutdown complete!")
        
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")


app = FastAPI(
    title="CLIFF - Cosmic Level Intelligent Forecast Framework",
    description="AI-powered comprehensive space and Earth threat monitoring platform.",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(
        "HTTP Exception occurred",
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "code": f"HTTP_{exc.status_code}",
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unexpected exception occurred",
        error=str(exc),
        error_type=type(exc).__name__,
        path=request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error occurred",
            "code": "INTERNAL_SERVER_ERROR",
        },
    )


@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    logger.info("Health check requested")
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services": {
            "api": "healthy"
        }
    }


@app.get("/healthz", tags=["System"])
async def healthz() -> Dict[str, Any]:
    return await health_check()


@app.get("/", tags=["System"])
async def root() -> Dict[str, Any]:
    return {
        "message": "CLIFF - Cosmic Level Intelligent Forecast Framework",
        "description": "AI-powered space and Earth threat monitoring platform",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "websocket_url": "/ws"
    }


app.include_router(api_v1_router, prefix="/api/v1")

@app.websocket("/ws/cliff_frontend")
async def websocket_frontend_endpoint(websocket: WebSocket):
    client_id = "cliff_frontend"
    await websocket_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket_manager.handle_client_message(client_id, data)
    except WebSocketDisconnect:
        await websocket_manager.disconnect(client_id)


@app.websocket("/ws/threats")
async def websocket_threats_endpoint(websocket: WebSocket):
    client_id = None
    try:
        client_id = await websocket_manager.connect(websocket)
        
        await websocket_manager.subscribe(client_id, "threat_alerts")
        await websocket_manager.subscribe(client_id, "ai_threat_insights")
        await websocket_manager.subscribe(client_id, "ai_correlations")
        
        logger.info(f"Threat monitoring client connected: {client_id}")
        
        while True:
            try:
                data = await websocket.receive_text()
                await websocket_manager.handle_client_message(client_id, data)
            except Exception as e:
                logger.error(f"Error handling message from {client_id}: {str(e)}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"Threat monitoring client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {str(e)}")
    finally:
        if client_id:
            await websocket_manager.disconnect(client_id)

if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


if __name__ == "__main__":
    logger.info("Starting CLIFF Backend Development Server...")
    
    if sys.platform == "win32":
        import logging
        logging.getLogger("uvicorn").setLevel(logging.CRITICAL)
        logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)
        logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)
        logging.getLogger("uvicorn.asgi").setLevel(logging.CRITICAL)
        logging.getLogger("websockets").setLevel(logging.CRITICAL)
        logging.getLogger("multiprocessing").setLevel(logging.CRITICAL)
    
    if sys.platform == "win32":
        uvicorn.run(
            "main:app",
            host=settings.BACKEND_HOST,
            port=settings.BACKEND_PORT,
            reload=settings.BACKEND_RELOAD and settings.ENVIRONMENT == "development",
            log_level="critical",
            workers=1,
            loop="auto",
            http="auto",
            ws="auto",
            access_log=False,
            use_colors=False,
            log_config=None,
        )
    else:
        uvicorn.run(
            "main:app",
            host=settings.BACKEND_HOST,
            port=settings.BACKEND_PORT,
            reload=settings.BACKEND_RELOAD and settings.ENVIRONMENT == "development",
            log_level=settings.BACKEND_LOG_LEVEL.lower(),
            workers=1 if settings.ENVIRONMENT == "development" else settings.WORKER_PROCESSES,
            loop="auto",
            http="auto",
            ws="auto",
        )

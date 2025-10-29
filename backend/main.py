"""
🌌 CLIFF - Cosmic Level Intelligent Forecast Framework
FastAPI Main Application

This is the main entry point for the CLIFF backend API.
Handles space threat monitoring, AI integration, and real-time data processing.
"""

import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, Dict
from datetime import datetime
import time

# Fix Unicode encoding and multiprocessing buffer issues on Windows
if sys.platform == "win32":
    import codecs
    import io
    import logging.handlers
    
    # Configure logging to use NullHandler for multiprocessing safety
    class SafeStreamHandler(logging.StreamHandler):
        def emit(self, record):
            try:
                super().emit(record)
            except (ValueError, OSError, AttributeError):
                # Silently ignore buffer detach errors in multiprocessing
                pass
    
    # Replace default logging handlers with safe ones
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        if isinstance(handler, logging.StreamHandler):
            root_logger.removeHandler(handler)
    
    # Add safe handler
    safe_handler = SafeStreamHandler()
    safe_handler.setFormatter(logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    ))
    root_logger.addHandler(safe_handler)
    
    # Fix stdout/stderr only if safe to do so
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
        # In multiprocessing child, streams might be already detached
        # Use NullHandler to prevent logging errors
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

# Import configuration and utilities
from app.core.config import settings
from app.core.database import initialize_database, disconnect_from_mongo, check_database_health
from app.services.neo_repository import ensure_indexes as ensure_neo_indexes

# Import API routers
from app.api.v1.router import api_v1_router
from app.websocket.manager import websocket_manager
from app.websocket.ai_threat_websocket import initialize_ai_websocket_system
# Import NASA services for cleanup
from app.services.nasa_services import simplified_nasa_services, nasa_services
from app.services.threat_scheduler import start as start_threat_scheduler, stop as stop_threat_scheduler


# Setup structured logging
logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager - handles startup and shutdown events
    """
    # Startup
    logger.info("CLIFF Backend starting up...")
    
    try:
        # Initialize database
        logger.info("Initializing database...")
        await initialize_database()
        # Ensure MongoDB indexes for NEO collections
        await ensure_neo_indexes()
        
        
        
        # Initialize WebSocket manager
        logger.info("Initializing WebSocket manager...")
        await websocket_manager.initialize()
        
        # Initialize AI WebSocket system
        logger.info("Initializing AI WebSocket system...")
        await initialize_ai_websocket_system()

        # Start threat scheduler
        await start_threat_scheduler()
        
        logger.info("✅ CLIFF Backend startup complete!")
        
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("CLIFF Backend shutting down...")
    
    try:
        # Close WebSocket connections
        await websocket_manager.shutdown()
        
        # Stop scheduler then close clients
        logger.info("Stopping threat scheduler...")
        try:
            await stop_threat_scheduler()
        except Exception as e:
            logger.warning(f"Scheduler stop warning: {str(e)}")

        # Close NASA HTTP client
        logger.info("Closing NASA services HTTP client...")
        try:
            # Close NASA client
            await simplified_nasa_services.close_client()
            logger.info("NASA services client closed successfully")
        except Exception as e:
            logger.warning(f"NASA client cleanup warning: {str(e)}")
        
        # Close DB connection
        await disconnect_from_mongo()
        
        logger.info("✅ CLIFF Backend shutdown complete!")
        
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")


# Create FastAPI application
app = FastAPI(
    title="CLIFF - Cosmic Level Intelligent Forecast Framework",
    description="""
    🌌 **CLIFF** is an AI-powered comprehensive space and Earth threat monitoring platform.
    
    ## Features
    
    * **🛡️ Asteroid Defense System** - Near-Earth Object tracking and impact prediction
    * **🌍 Earth Crisis Monitor** - Natural disasters and climate events
    * **☀️ Space Weather Station** - Solar flares and radiation monitoring
    * **🔭 Exoplanet Explorer** - Habitable planet discovery and analysis
    * **🤖 AI-Powered Intelligence** - Advanced threat analysis and prediction
    * **🎮 3D Visualization** - Interactive space threat visualization
    * **🗣️ Voice Interface** - Natural language interaction with CLIFF AI
    * **📡 Real-time Updates** - WebSocket-powered live data streaming
    
    ## NASA APIs Integration
    
    - **NeoWs** - Near Earth Object Web Service
    - **EONET** - Earth Observatory Natural Event Tracker  
    - **DONKI** - Space Weather Database
    - **EPIC** - Earth Polychromatic Imaging Camera
    - **GIBS** - Global Imagery Browse Services
    - **Exoplanet Archive** - NASA's Exoplanet Database
    - **SSD/CNEOS** - Solar System Dynamics
    
    ## Custom AI Services
    
    - **Custom OpenAI** - Advanced natural language processing
    - **Live Screen Analyzer** - Real-time visual data interpretation
    - **Voice Synthesizer** - AI-generated audio responses
    - **Multimodal Analyzer** - Combined text, image, and audio processing
    """,
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    lifespan=lifespan,
)

# Add middleware
# CORS middleware - Config'den CORS_ORIGINS listesini kullan
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Gzip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Trusted host middleware
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
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
    """Handle unexpected exceptions"""
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


# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for monitoring and load balancers
    """
    logger.info("Health check requested")
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services": {
            "api": "healthy"
        }
    }


# Healthz alias for k8s
@app.get("/healthz", tags=["System"])
async def healthz() -> Dict[str, Any]:
    return await health_check()


# Root endpoint
@app.get("/", tags=["System"])
async def root() -> Dict[str, Any]:
    """
    Root endpoint - Welcome message and API information
    """
    return {
        "message": "🌌 Welcome to CLIFF - Cosmic Level Intelligent Forecast Framework",
        "description": "AI-powered space and Earth threat monitoring platform",
        "version": "1.0.0",
        "docs_url": "/docs",
        "health_url": "/health",
        "websocket_url": "/ws",
        "nasa_apis": [
            "NeoWs - Near Earth Object Web Service",
            "EONET - Earth Observatory Natural Event Tracker",
            "DONKI - Space Weather Database",
            "EPIC - Earth Polychromatic Imaging Camera",
            "GIBS - Global Imagery Browse Services",
            "Exoplanet Archive - NASA's Exoplanet Database",
            "SSD/CNEOS - Solar System Dynamics"
        ],
        "ai_services": [
            "Custom OpenAI - Advanced natural language processing",
            "Live Screen Analyzer - Real-time visual data interpretation",
            "Voice Synthesizer - AI-generated audio responses",
            "Multimodal Analyzer - Combined text, image, and audio processing"
        ]
    }


# Include API routers
app.include_router(api_v1_router, prefix="/api/v1")

# WebSocket endpoints
@app.websocket("/ws/cliff_frontend")
async def websocket_frontend_endpoint(websocket: WebSocket):
    """WebSocket endpoint for CLIFF frontend"""
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
    """WebSocket endpoint for real-time threat alerts"""
    client_id = None
    try:
        client_id = await websocket_manager.connect(websocket)
        
        # Automatically subscribe to threat alerts
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

# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


# Development server
if __name__ == "__main__":
    logger.info("Starting CLIFF Backend Development Server...")
    
    # Completely silence uvicorn internal loggers on Windows to prevent buffer detach errors
    if sys.platform == "win32":
        # Disable all uvicorn loggers
        import logging
        logging.getLogger("uvicorn").setLevel(logging.CRITICAL)
        logging.getLogger("uvicorn.error").setLevel(logging.CRITICAL)
        logging.getLogger("uvicorn.access").setLevel(logging.CRITICAL)
        logging.getLogger("uvicorn.asgi").setLevel(logging.CRITICAL)
        logging.getLogger("websockets").setLevel(logging.CRITICAL)
        logging.getLogger("multiprocessing").setLevel(logging.CRITICAL)
    
    # Windows Python 3.13 logging fix
    if sys.platform == "win32":
        uvicorn.run(
            "main:app",
            host=settings.BACKEND_HOST,
            port=settings.BACKEND_PORT,
            reload=settings.BACKEND_RELOAD and settings.ENVIRONMENT == "development",
            log_level="critical",  # Only critical errors from uvicorn
            workers=1,  # Force single worker on Windows to avoid buffer issues
            loop="auto",
            http="auto",
            ws="auto",
            access_log=False,  # Disable problematic access logging
            use_colors=False,  # Disable colors to prevent buffer issues
            log_config=None,  # Disable log_config to prevent formatter errors
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
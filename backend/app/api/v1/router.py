"""
🌌 CLIFF API v1 Router
Main router that includes all API endpoints
Enhanced with NASA Challenge Winning Educational AI System
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    threats,
    asteroids,
    educational_ai,
    health,
    nasa,
    solar_system,
    asteroid_images,
    asteroid_visual_generator,
    unified_ai,
    image_generation,
    multi_image_generation,
    enhanced_chat,
    ai_threat_analysis,
    eonet_ai_images,
)
from app.websocket.manager import websocket_manager
from app.api.v1.endpoints.health import database_health_check

# Create main API router
api_v1_router = APIRouter()

# Include all endpoint routers
api_v1_router.include_router(
    threats.router,
    prefix="/threats",
    tags=["Threat Assessment"],
)

# 🚀 NASA Challenge Educational AI System
api_v1_router.include_router(
    educational_ai.router,
    prefix="",
    tags=["Educational AI", "NASA Challenge"],
)

# 🌌 NASA Services Integration
api_v1_router.include_router(
    nasa.router,
    prefix="",
    tags=["NASA Services", "Space Data APIs"],
)

# ☄️ Asteroid Threat APIs
api_v1_router.include_router(
    asteroids.router,
    prefix="",
    tags=["Asteroid Threats"],
)

# 🪐 Solar System Simulation
api_v1_router.include_router(
    solar_system.router,
    prefix="/solar-system",
    tags=["Solar System", "Astronomical Data"],
)

# 🎨 Asteroid AI Image Generation
api_v1_router.include_router(
    asteroid_images.router,
    prefix="",
    tags=["Asteroid Images", "AI Generation"],
)

# 🚀 Asteroid Visual Generator
api_v1_router.include_router(
    asteroid_visual_generator.router,
    prefix="",
    tags=["Asteroid Visuals", "AI Generation"],
)

# 🤖 Unified AI System - Cortex + Vertex Fallback
api_v1_router.include_router(
    unified_ai.router,
    prefix="/ai",
    tags=["Unified AI", "Chat Completion", "Cortex AI", "Vertex AI"],
)

# 🚀 Enhanced Cortex Chat - Grok-4-fast-reasoning
api_v1_router.include_router(
    enhanced_chat.router,
    prefix="",
    tags=["Enhanced Chat", "Grok-4-fast-reasoning", "Advanced AI"],
)

# 🧠 AI-Powered Threat Analysis System - Yeni Nesil AI Analiz
api_v1_router.include_router(
    ai_threat_analysis.router,
    prefix="/ai-analysis",
    tags=["AI Threat Analysis", "Master Orchestrator", "Advanced Analytics"],
)

# 💚 System Health Monitoring
api_v1_router.add_api_route(
    "/db/health",
    database_health_check,
    tags=["Health Check", "System Monitoring"],
    summary="Database Health Check",
)

# 🌐 WebSocket Information
@api_v1_router.get("/ws/info", tags=["WebSocket"])
async def get_ws_info():
    """
    Get information and statistics about the WebSocket manager.
    """
    return websocket_manager.get_stats()

api_v1_router.include_router(
    image_generation.router,
    prefix="/image-generation",
    tags=["Image Generation"],
)

# 🎨 Multi-Image Generation System - AI-Powered Professional Visuals
api_v1_router.include_router(
    multi_image_generation.router,
    prefix="/multi-image",
    tags=["Multi-Image Generation", "Professional AI Visuals", "Content Analysis"],
)

# 🌍 EONET AI Image Generation - Natural Disaster Visualization
api_v1_router.include_router(
    eonet_ai_images.router,
    prefix="",
    tags=["EONET AI Images", "Natural Disasters", "Emergency Visualization"],
)

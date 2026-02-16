import structlog
from typing import Dict, Any
from datetime import datetime

logger = structlog.get_logger(__name__)

async def initialize_database():
    logger.info("Database disabled - using direct NASA API calls with in-memory cache")

async def disconnect_from_mongo():
    pass

async def check_database_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "mode": "in-memory-cache",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

def get_database():
    return None

def get_collection(collection_name: str):
    return None

def get_threats_collection():
    return None

def get_asteroids_collection():
    return None

def get_earth_events_collection():
    return None

def get_space_weather_collection():
    return None

def get_exoplanets_collection():
    return None

def get_alerts_collection():
    return None

def get_threat_assessments_collection():
    return None

def get_users_collection():
    return None

async def get_database_stats() -> Dict[str, Any]:
    return {
        "mode": "in-memory-cache",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

def get_connection_status() -> Dict[str, Any]:
    return {
        "is_connected": True,
        "mode": "in-memory-cache",
        "last_check": datetime.utcnow().isoformat() + "Z"
    }

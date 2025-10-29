"""
🗄️ Database Configuration and Connection Management
Handles MongoDB connections with proper error handling and monitoring
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout
import structlog
from datetime import datetime, timedelta
import ssl
import certifi
from app.core.config import settings

# Setup logging
logger = structlog.get_logger(__name__)

# Global database instances
_mongodb_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None

# Database health monitoring
_last_health_check: Optional[datetime] = None
_connection_status: Dict[str, Any] = {
    "is_connected": False,
    "last_check": None,
    "error_count": 0,
    "last_error": None
}

class DatabaseConnectionError(Exception):
    """Custom database connection error"""
    pass


# ==============================================================================
# MONGODB CONNECTION WITH ENHANCED DIAGNOSTICS
# ==============================================================================

async def connect_to_mongo() -> AsyncIOMotorClient:
    """
    Connect to MongoDB with enhanced error handling and SSL diagnostics
    """
    global _mongodb_client, _database, _connection_status
    
    try:
        logger.info("Attempting MongoDB connection with SSL diagnostics...")
        logger.info(f"MongoDB URL: {settings.MONGODB_URL[:50]}...")
        
        # Enhanced connection configuration with SSL timeout fixes
        connection_config = {
            "host": settings.MONGODB_URL,
            "serverSelectionTimeoutMS": 10000,  # 10 seconds timeout
            "connectTimeoutMS": 20000,  # 20 seconds connection timeout  
            "socketTimeoutMS": 30000,   # 30 seconds socket timeout
            "heartbeatFrequencyMS": 10000,  # 10 seconds heartbeat
            "retryWrites": True,
            "w": "majority",
            # SSL Configuration for MongoDB Atlas - simplified
            "tls": True,  # Use tls instead of ssl
            "tlsCAFile": certifi.where(), # Use certifi's certificate bundle
            "tlsInsecure": False,  # Allow invalid certificates if needed
            "maxPoolSize": 10,
            "minPoolSize": 1
        }
        
        logger.info("Connection config applied - SSL timeout fixes enabled")
        
        # Create MongoDB client with enhanced error handling
        _mongodb_client = AsyncIOMotorClient(**connection_config)
        
        # Test connection with diagnostics
        logger.info("Testing MongoDB connection...")
        server_info = await _mongodb_client.server_info()
        logger.info(f"MongoDB connected successfully - Server version: {server_info.get('version', 'unknown')}")
        
        # Initialize database
        _database = _mongodb_client[settings.MONGODB_NAME]
        
        # Test database access
        collections = await _database.list_collection_names()
        logger.info(f"Database '{settings.MONGODB_NAME}' accessible - Collections: {len(collections)}")
        
        # Update connection status
        _connection_status.update({
            "is_connected": True,
            "last_check": datetime.utcnow(),
            "error_count": 0,
            "last_error": None,
            "server_version": server_info.get('version'),
            "collections_count": len(collections)
        })
        
        logger.info("MongoDB connection established successfully with SSL diagnostics")
        return _mongodb_client
        
    except (ConnectionFailure, ServerSelectionTimeoutError, NetworkTimeout) as e:
        error_msg = f"MongoDB SSL connection failed: {str(e)}"
        logger.error(error_msg)
        
        # Update connection status with error details
        _connection_status.update({
            "is_connected": False,
            "last_check": datetime.utcnow(),
            "error_count": _connection_status.get("error_count", 0) + 1,
            "last_error": error_msg,
            "error_type": type(e).__name__
        })
        
        # Log SSL-specific diagnostics
        if "SSL" in str(e) or "ssl" in str(e).lower():
            logger.error("SSL handshake issue detected - applying connection fixes...")
            logger.error(f"SSL Error Details: {str(e)}")
            
        raise DatabaseConnectionError(error_msg)
    
    except Exception as e:
        error_msg = f"Unexpected MongoDB connection error: {str(e)}"
        logger.error(error_msg)
        _connection_status.update({
            "is_connected": False,
            "last_check": datetime.utcnow(),
            "error_count": _connection_status.get("error_count", 0) + 1,
            "last_error": error_msg
        })
        raise DatabaseConnectionError(error_msg)


async def disconnect_from_mongo():
    """
    Safely disconnect from MongoDB
    """
    global _mongodb_client, _database
    
    if _mongodb_client is not None:
        logger.info("Disconnecting from MongoDB...")
        _mongodb_client.close()
        _mongodb_client = None
        _database = None
        _connection_status.update({
            "is_connected": False,
            "last_check": datetime.utcnow()
        })
        logger.info("MongoDB disconnected successfully")


# ==============================================================================
# DATABASE HEALTH MONITORING
# ==============================================================================

async def check_database_health() -> Dict[str, Any]:
    """
    Comprehensive database health check with diagnostics
    """
    global _last_health_check
    
    try:
        if _mongodb_client is None or _database is None:
            logger.warning("Database not initialized - attempting connection...")
            await connect_to_mongo()
        
        # Ping database
        start_time = datetime.utcnow()
        await _mongodb_client.admin.command('ping')
        ping_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # Try to get server status (may fail on MongoDB Atlas)
        server_version = "unknown"
        connections = {}
        try:
            server_status = await _mongodb_client.admin.command("serverStatus")
            connections = server_status.get("connections", {})
            server_version = server_status.get("version", "unknown")
        except Exception as e:
            # MongoDB Atlas doesn't allow serverStatus command
            logger.debug(f"Could not get server status (normal for MongoDB Atlas): {str(e)}")
        
        # Test collection access
        collections = await _database.list_collection_names()
        
        _last_health_check = datetime.utcnow()
        
        health_status = {
            "status": "healthy",
            "ping_time_ms": round(ping_time_ms, 2),
            "server_version": server_version,
            "connections": {
                "current": connections.get("current", 0),
                "available": connections.get("available", 0),
                "total_created": connections.get("totalCreated", 0)
            },
            "collections_count": len(collections),
            "last_check": _last_health_check.isoformat() + "Z",
            "connection_errors": _connection_status.get("error_count", 0)
        }
        
        logger.info(f"Database health check passed - ping: {ping_time_ms:.2f}ms")
        return health_status
        
    except Exception as e:
        error_msg = f"Database health check failed: {str(e)}"
        logger.error(error_msg)
        
        return {
            "status": "unhealthy",
            "error": error_msg,
            "last_check": datetime.utcnow().isoformat() + "Z",
            "connection_errors": _connection_status.get("error_count", 0)
        }


# ==============================================================================
# DATABASE ACCESS FUNCTIONS
# ==============================================================================

def get_database() -> AsyncIOMotorDatabase:
    """
    Get the database instance with connection validation
    """
    if _database is None:
        raise DatabaseConnectionError("Database not initialized. Call connect_to_mongo() first.")
    return _database


def get_collection(collection_name: str) -> AsyncIOMotorCollection:
    """
    Get a specific collection with error handling
    """
    try:
        database = get_database()
        collection = database[collection_name]
        # Spam önlemek için debug log kaldırıldı
        return collection
    except Exception as e:
        logger.error(f"Failed to access collection '{collection_name}': {str(e)}")
        raise


# ==============================================================================
# COLLECTION SHORTCUTS WITH DIAGNOSTICS
# ==============================================================================

def get_threats_collection() -> AsyncIOMotorCollection:
    """Get threats collection"""
    return get_collection("threats")

def get_asteroids_collection() -> AsyncIOMotorCollection:
    """Get asteroids collection"""
    return get_collection("asteroids")

def get_earth_events_collection() -> AsyncIOMotorCollection:
    """Get earth events collection"""
    return get_collection("earth_events")

def get_space_weather_collection() -> AsyncIOMotorCollection:
    """Get space weather collection"""
    return get_collection("space_weather")

def get_exoplanets_collection() -> AsyncIOMotorCollection:
    """Get exoplanets collection"""
    return get_collection("exoplanets")

def get_alerts_collection() -> AsyncIOMotorCollection:
    """Get alerts collection"""
    return get_collection("alerts")

def get_threat_assessments_collection() -> AsyncIOMotorCollection:
    """Get threat assessments collection"""
    return get_collection("threat_assessments")

def get_users_collection() -> AsyncIOMotorCollection:
    """Get users collection"""
    return get_collection("users")


# ==============================================================================
# DATABASE DIAGNOSTICS AND MONITORING
# ==============================================================================

async def get_database_stats() -> Dict[str, Any]:
    """
    Get comprehensive database statistics
    """
    try:
        if _database is None:
            return {"error": "Database not initialized"}
        
        # Get database stats
        db_stats = await _database.command("dbStats")
        
        # Get collections info
        collections = await _database.list_collection_names()
        collection_stats = {}
        
        for collection_name in collections:
            try:
                collection = _database[collection_name]
                count = await collection.count_documents({})
                collection_stats[collection_name] = {"document_count": count}
            except Exception as e:
                collection_stats[collection_name] = {"error": str(e)}
        
        return {
            "database_name": _database.name,
            "collections_count": len(collections),
            "total_size_bytes": db_stats.get("dataSize", 0),
            "storage_size_bytes": db_stats.get("storageSize", 0),
            "index_size_bytes": db_stats.get("indexSize", 0),
            "collections": collection_stats,
            "connection_status": _connection_status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
    except Exception as e:
        logger.error(f"Failed to get database stats: {str(e)}")
        return {
            "error": str(e),
            "connection_status": _connection_status,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }


# ==============================================================================
# INITIALIZATION
# ==============================================================================

async def initialize_database():
    """
    Initialize database connection with full diagnostics
    """
    try:
        logger.info("Initializing CLIFF database system...")
        
        await connect_to_mongo()
        
        # Perform health check
        health = await check_database_health()
        if health["status"] == "healthy":
            logger.info("Database initialization completed successfully")
        else:
            logger.warning(f"Database initialized with warnings: {health.get('error', 'Unknown issue')}")
        
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise


# Export database health status for monitoring
def get_connection_status() -> Dict[str, Any]:
    """Get current database connection status"""
    return _connection_status.copy()

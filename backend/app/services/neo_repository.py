import logging
import structlog
from typing import Any
from datetime import datetime
from app.core.database import get_collection
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel

logger = structlog.get_logger(__name__)

async def ensure_indexes():
    try:
        col = get_collection("asteroids")
        
        indexes = [
            IndexModel([("neo_id", ASCENDING)], unique=True),
            IndexModel([("name", TEXT)]),
            IndexModel([("is_potentially_hazardous", ASCENDING)]),
            IndexModel([("last_updated", DESCENDING)])
        ]
        
        await col.create_indexes(indexes)
        logger.info("Asteroid indexes created")
        
    except Exception as e:
        logger.error("Failed to create indexes", error=str(e))

async def upsert_neo(neo_data: Any):
    if hasattr(neo_data, "model_dump"):
        neo_data = neo_data.model_dump()

    col = get_collection("asteroids")
    neo_id = neo_data.get("neo_id")
    
    if not neo_id:
        return
        
    neo_data["last_updated"] = datetime.utcnow()
    
    await col.update_one(
        {"neo_id": neo_id},
        {"$set": neo_data},
        upsert=True
    )

async def upsert_risk(risk_data: Any):
    if hasattr(risk_data, "model_dump"):
        risk_data = risk_data.model_dump()

    col = get_collection("risk_assessments")
    neo_id = risk_data.get("neo_id")
    
    if not neo_id:
        return
        
    risk_data["last_updated"] = datetime.utcnow()
    
    await col.update_one(
        {"neo_id": neo_id, "source": risk_data.get("source", "sentry")},
        {"$set": risk_data},
        upsert=True
    )

async def insert_close_approaches(approaches: list):
    if not approaches:
        return
        
    col = get_collection("close_approaches")
    # Bulk write optimization could be added here
    for approach in approaches:
        # Create a unique key for idempotency
        key = {
            "neo_id": approach.get("neo_id"),
            "timestamp": approach.get("timestamp")
        }
        await col.update_one(
            key,
            {"$set": approach},
            upsert=True
        )


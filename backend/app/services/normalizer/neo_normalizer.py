from __future__ import annotations
from typing import Dict
import re
import structlog
from motor.motor_asyncio import AsyncIOMotorCollection
from app.core.database import get_collection
logger = structlog.get_logger(__name__)
def _norm_name(name: str) -> str:
    if not name:
        return ""
    s = name.lower().strip()
    s = re.sub(r"[()]+", "", s)
    s = re.sub(r"\s+", " ", s)
    return s
async def normalize_neos() -> Dict[str, int]:
    
    asteroids: AsyncIOMotorCollection = get_collection("asteroids")
    risks: AsyncIOMotorCollection = get_collection("risk_assessments")
    name_to_neows: Dict[str, str] = {}
    async for doc in asteroids.find({"neows_id": {"$exists": True, "$ne": None}}):
        name = _norm_name(doc.get("name") or doc.get("neo_id"))
        neows_id = str(doc.get("neows_id"))
        if name and neows_id:
            name_to_neows[name] = neows_id
    updated = 0
    cursor = risks.find({"source": "sentry"})
    async for r in cursor:
        neo_id = str(r.get("neo_id"))
        name = _norm_name(r.get("name") or neo_id)
        target_neows = name_to_neows.get(name)
        if target_neows and neo_id != target_neows:
            await risks.update_one({"_id": r["_id"]}, {"$set": {"neo_id": target_neows}})
            updated += 1
    logger.info("NEO normalize tamamlandı", updated=updated, known=len(name_to_neows))
    return {"updated": updated, "known": len(name_to_neows)}

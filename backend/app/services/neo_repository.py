"""
NEO Repository
- MongoDB koleksiyon erişimleri ve indekslerin oluşturulması
"""

from __future__ import annotations

from typing import List, Optional
from datetime import datetime
import structlog

from motor.motor_asyncio import AsyncIOMotorCollection

from app.core.database import get_collection
from app.models.neo_models import Neo, CloseApproach, RiskAssessment


logger = structlog.get_logger(__name__)


def _neos() -> AsyncIOMotorCollection:
    return get_collection("asteroids")


def _approaches() -> AsyncIOMotorCollection:
    return get_collection("close_approaches")


def _risks() -> AsyncIOMotorCollection:
    return get_collection("risk_assessments")


async def ensure_indexes() -> None:
    """Gerekli indeksleri oluşturur (idempotent)."""
    # asteroids
    await _neos().create_index("neo_id", unique=True, name="idx_neo_id")
    await _neos().create_index("name", name="idx_name")
    await _neos().create_index("is_potentially_hazardous", name="idx_hazard")

    # close approaches
    await _approaches().create_index([("neo_id", 1), ("timestamp", -1)], name="idx_approach_neo_time")
    await _approaches().create_index("distance_ld", name="idx_distance_ld")

    # risk assessments
    await _risks().create_index([("neo_id", 1), ("updated_at", -1)], name="idx_risk_neo_time")
    await _risks().create_index("risk_level", name="idx_risk_level")


# Basit CRUD yardımcıları
async def upsert_neo(doc: Neo) -> None:
    await _neos().update_one({"neo_id": doc.neo_id}, {"$set": doc.model_dump()}, upsert=True)


async def insert_close_approaches(docs: List[CloseApproach]) -> None:
    if not docs:
        return
    # Hata çıkarsa (duplicate key), tek tek dene
    try:
        await _approaches().insert_many([d.model_dump() for d in docs], ordered=False)
    except Exception as e:
        # Bulk insert başarısız; tek tek upsert dene
        for d in docs:
            try:
                await _approaches().update_one(
                    {"neo_id": d.neo_id, "timestamp": d.timestamp},
                    {"$set": d.model_dump()},
                    upsert=True
                )
            except Exception:
                pass


async def upsert_risk(doc: RiskAssessment) -> None:
    await _risks().update_one(
        {"neo_id": doc.neo_id, "source": doc.source},
        {"$set": doc.model_dump()},
        upsert=True,
    )


async def get_all_risks() -> List[Dict]:
    """Tüm risk kayıtlarını tek seferde al"""
    return [doc async for doc in _risks().find({})]


async def get_all_asteroids() -> List[Dict]:
    """Tüm asteroit kayıtlarını tek seferde al"""
    return [doc async for doc in _neos().find({})]


async def get_all_approaches() -> List[Dict]:
    """Tüm yaklaşma kayıtlarını tek seferde al"""
    return [doc async for doc in _approaches().find({})]



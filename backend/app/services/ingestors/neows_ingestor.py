from __future__ import annotations
from typing import Any, Dict
import structlog

logger = structlog.get_logger(__name__)

async def ingest_neows_feed(days_ahead: int = 7) -> Dict[str, Any]:
    logger.info("Database disabled - NeoWs data fetched directly from NASA API")
    return {"success": True, "message": "Direct API mode - no ingestion needed"}

from __future__ import annotations
from typing import Any, Dict
import structlog

logger = structlog.get_logger(__name__)

async def ingest_sentry_once() -> Dict[str, Any]:
    logger.info("Database disabled - Sentry data fetched directly from NASA API")
    return {"success": True, "message": "Direct API mode - no ingestion needed"}

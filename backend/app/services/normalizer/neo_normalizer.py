from __future__ import annotations
from typing import Dict
import structlog

logger = structlog.get_logger(__name__)

async def normalize_neos() -> Dict[str, int]:
    logger.info("Database disabled - normalization not needed")
    return {"updated": 0, "known": 0}

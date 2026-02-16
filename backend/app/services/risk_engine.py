from __future__ import annotations
from typing import Dict
import structlog

logger = structlog.get_logger(__name__)

async def compute_risk_levels() -> Dict[str, int]:
    logger.info("Database disabled - risk computed on-the-fly from NASA API")
    return {"updated": 0}

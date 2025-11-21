from __future__ import annotations
import asyncio
from typing import Optional
import structlog
from app.core.config import settings
from app.services.ingestors.neows_ingestor import ingest_neows_feed
from app.services.ingestors.sentry_ingestor import ingest_sentry_once
from app.services.normalizer.neo_normalizer import normalize_neos
from app.services.risk_engine import compute_risk_levels
from app.services.alerts import publish as publish_alert
logger = structlog.get_logger(__name__)
_task: Optional[asyncio.Task] = None
_stop_event: Optional[asyncio.Event] = None
async def _run_loop():
    interval = max(300, int(settings.THREAT_REFRESH_SECONDS))
    logger.info("Threat scheduler baþlatýldý", interval_seconds=interval)
    while _stop_event and not _stop_event.is_set():
        try:
            await ingest_neows_feed(7)
            await ingest_sentry_once()
            await normalize_neos()
            res = await compute_risk_levels()
            if (res or {}).get('updated'):
                await publish_alert({
                    'type': 'risk_update',
                    'updated': res['updated'],
                    'timestamp': asyncio.get_event_loop().time()
                })
        except Exception as e:
            logger.error("Threat scheduler döngü hatasý", error=str(e))
        try:
            await asyncio.wait_for(_stop_event.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass
    logger.info("Threat scheduler durduruldu")
async def start():
    global _task, _stop_event
    if not settings.ENABLE_SCHEDULER:
        logger.info("Threat scheduler devre dýþý")
        return
    if _task and not _task.done():
        return
    _stop_event = asyncio.Event()
    _task = asyncio.create_task(_run_loop(), name="threat-scheduler")
async def stop():
    global _task, _stop_event
    if _stop_event:
        _stop_event.set()
    if _task:
        try:
            await asyncio.wait_for(_task, timeout=10)
        except asyncio.TimeoutError:
            _task.cancel()
    _task = None
    _stop_event = None

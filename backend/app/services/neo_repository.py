import structlog

logger = structlog.get_logger(__name__)

async def ensure_indexes():
    logger.info("Database disabled - indexes not needed")

async def upsert_neo(neo_data):
    pass

async def upsert_risk(risk_data):
    pass

async def insert_close_approaches(approaches: list):
    pass

async def get_all_risks():
    return []

async def get_all_asteroids():
    return []

async def get_all_approaches():
    return []

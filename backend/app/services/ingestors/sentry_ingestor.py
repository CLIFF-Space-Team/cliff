from __future__ import annotations
from typing import Any, Dict, List
from datetime import datetime
import structlog
from app.services.nasa_services import NASAServices
from app.services.neo_repository import upsert_neo, upsert_risk
from app.models.neo_models import Neo, RiskAssessment
logger = structlog.get_logger(__name__)
def _get_any(d: Dict[str, Any], *keys: str, default=None):
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return default
def _parse_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        return float(str(value))
    except Exception:
        return None
async def ingest_sentry_once() -> Dict[str, Any]:
    """Sentry listesini bir kez çekip kaydeder; eksik verileri Sentry'den doldurur."""
    service = NASAServices()
    try:
        response = await service.get_sentry_risk_data()
        if not response.get("success"):
            logger.error("Sentry verisi alınamadı", error=response.get("error"))
            return {"success": False, "error": response.get("error")}
        data = response.get("data", {})
        items: List[Dict[str, Any]] = data.get("data", [])
        saved = 0
        for item in items:
            des = _get_any(item, "des", "id", "objectId")
            if not des:
                continue
            diameter_km = _parse_float(_get_any(item, "diameter", "diam"))
            abs_h = _parse_float(_get_any(item, "h", "H", "abs_mag"))
            neo = Neo(
                neo_id=str(des),
                name=str(des),
                absolute_magnitude_h=abs_h,
                diameter_min_km=diameter_km * 0.8 if diameter_km else None,  # ±20% belirsizlik
                diameter_max_km=diameter_km * 1.2 if diameter_km else None,
                is_potentially_hazardous=True,
                sentry_id=str(des),
            )
            await upsert_neo(neo)
            torino = _parse_float(_get_any(item, "torino", "ts"))
            palermo = _parse_float(_get_any(item, "palermo", "ps"))
            impact_probability = _parse_float(_get_any(item, "ip", "impactProbability"))
            energy_mt = None
            if diameter_km and impact_probability:
                volume = (4/3) * 3.14159 * ((diameter_km / 2) ** 3)  # km³
                mass_kg = volume * 2.6e12  # 2.6 g/cm³ = 2.6e12 kg/km³
                energy_joules = 0.5 * mass_kg * (20000 ** 2)  # 20 km/s
                energy_mt = energy_joules / 4.184e15  # 1 MT = 4.184e15 J
            risk = RiskAssessment(
                neo_id=neo.neo_id,
                source="sentry",
                torino=torino,
                palermo=palermo,
                impact_probability=impact_probability,
                energy_mt=energy_mt,
                risk_level="none",
                updated_at=datetime.utcnow(),
            )
            await upsert_risk(risk)
            saved += 1
        logger.info("Sentry ingest tamamlandı", count=saved)
        return {"success": True, "saved": saved}
    finally:
        await service.close_session()

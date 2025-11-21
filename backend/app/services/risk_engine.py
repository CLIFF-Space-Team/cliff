from __future__ import annotations
from typing import Dict, Optional
from datetime import datetime
import structlog
from app.core.database import get_collection
from app.models.neo_models import RiskLevel
logger = structlog.get_logger(__name__)
def _get_latest_approach(neo_id: str) -> Optional[dict]:
    approaches = get_collection("close_approaches")
    return approaches.find_one({"neo_id": neo_id}, sort=[("timestamp", -1)])
def _classify(torino: Optional[float], palermo: Optional[float], diameter_min_km: Optional[float], distance_ld: Optional[float], impact_probability: Optional[float]) -> RiskLevel:
    if torino is not None and torino >= 1:
        return "critical"
    if palermo is not None and palermo > 0:
        return "critical"
    dld = distance_ld if distance_ld is not None else float("inf")
    dkm = diameter_min_km or 0.0
    p = impact_probability or 0.0
    if dld <= 10 and dkm >= 0.05 and p >= 1e-5:
        return "high"
    if dld <= 30 and dkm >= 0.03:
        return "medium"
    return "low"
async def compute_risk_levels() -> Dict[str, int]:
    
    from app.services.neo_repository import get_all_risks, get_all_asteroids, get_all_approaches
    all_risks = await get_all_risks()
    all_asteroids_list = await get_all_asteroids()
    all_approaches_list = await get_all_approaches()
    asteroids_by_id = {a.get("neo_id"): a for a in all_asteroids_list}
    asteroids_by_neows = {a.get("neows_id"): a for a in all_asteroids_list if a.get("neows_id")}
    approaches_by_neo: Dict[str, Dict] = {}
    for ap in all_approaches_list:
        nid = ap.get("neo_id")
        if nid and (nid not in approaches_by_neo or ap.get("timestamp", datetime.min) > approaches_by_neo[nid].get("timestamp", datetime.min)):
            approaches_by_neo[nid] = ap
    updated = 0
    risks_col = get_collection("risk_assessments")
    for r in all_risks:
        neo_id = r.get("neo_id")
        torino = r.get("torino")
        palermo = r.get("palermo")
        ip = r.get("impact_probability")
        asteroid = asteroids_by_neows.get(neo_id) or asteroids_by_id.get(neo_id)
        diameter_min_km = (asteroid or {}).get("diameter_min_km")
        latest_approach = approaches_by_neo.get(neo_id)
        distance_ld = (latest_approach or {}).get("distance_ld")
        level = _classify(torino, palermo, diameter_min_km, distance_ld, ip)
        if r.get("risk_level") != level:
            await risks_col.update_one({"_id": r["_id"]}, {"$set": {"risk_level": level, "updated_at": datetime.utcnow()}})
            updated += 1
    logger.info("Risk seviyeleri güncellendi", updated=updated)
    return {"updated": updated}

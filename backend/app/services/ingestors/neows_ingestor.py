"""
NeoWs Ingestor
- NASA NeoWs feed/browse verisini çekip NEO ve yakın geçiş kayıtlarını işler
"""

from __future__ import annotations

from typing import Any, Dict, List
from datetime import datetime, timedelta
import structlog

from app.services.nasa_services import NASAServices
from app.services.neo_repository import upsert_neo, insert_close_approaches
from app.models.neo_models import Neo, CloseApproach


logger = structlog.get_logger(__name__)


def _safe_float(x: Any) -> float | None:
    try:
        if x is None:
            return None
        if isinstance(x, (int, float)):
            return float(x)
        return float(str(x))
    except Exception:
        return None


async def ingest_neows_feed(days_ahead: int = 7) -> Dict[str, Any]:
    """NEO Feed (maks 7 gün) ingest"""
    service = NASAServices()
    try:
        now = datetime.utcnow().strftime("%Y-%m-%d")
        end = (datetime.utcnow() + timedelta(days=min(days_ahead, 7))).strftime("%Y-%m-%d")
        result = await service.get_neo_feed(start_date=now, end_date=end)

        if not result.get("success"):
            logger.error("NeoWs feed alınamadı", error=result.get("error"))
            return {"success": False, "error": result.get("error")}

        neos_by_day = result.get("near_earth_objects", {})
        neo_count = 0
        approach_docs: List[CloseApproach] = []

        for day, neos in neos_by_day.items():
            for n in neos:
                neo_id = str(n.get("id"))
                diameter = n.get("estimated_diameter", {}).get("kilometers", {})

                neo = Neo(
                    neo_id=neo_id,
                    name=n.get("name", neo_id),
                    absolute_magnitude_h=_safe_float(n.get("absolute_magnitude_h")),
                    diameter_min_km=_safe_float(diameter.get("estimated_diameter_min")),
                    diameter_max_km=_safe_float(diameter.get("estimated_diameter_max")),
                    is_potentially_hazardous=bool(n.get("is_potentially_hazardous_asteroid", False)),
                    neows_id=neo_id,
                )
                await upsert_neo(neo)
                neo_count += 1

                for ca in n.get("close_approach_data", []) or []:
                    ts_str = ca.get("close_approach_date_full") or f"{ca.get('close_approach_date', day)} 00:00"
                    # Robust parse
                    try:
                        ts = datetime.strptime(ts_str, "%Y-%b-%d %H:%M")
                    except Exception:
                        try:
                            ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M")
                        except Exception:
                            ts = datetime.utcnow()

                    distance_ld = _safe_float((ca.get("miss_distance") or {}).get("lunar"))
                    distance_au = _safe_float((ca.get("miss_distance") or {}).get("astronomical"))
                    rel_v = _safe_float((ca.get("relative_velocity") or {}).get("kilometers_per_second"))

                    approach_docs.append(
                        CloseApproach(
                            neo_id=neo_id,
                            timestamp=ts,
                            distance_ld=distance_ld,
                            distance_au=distance_au,
                            relative_velocity_kms=rel_v,
                            orbiting_body=(ca.get("orbiting_body") or "Earth"),
                        )
                    )

        if approach_docs:
            await insert_close_approaches(approach_docs)

        logger.info("NeoWs ingest tamamlandı", neos=neo_count, approaches=len(approach_docs))
        return {"success": True, "neos": neo_count, "approaches": len(approach_docs)}
    finally:
        await service.close_session()



from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, Path
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.encoders import jsonable_encoder
import asyncio
import structlog
from datetime import datetime
from bson import ObjectId
from app.core.database import get_collection
from app.services.alerts import subscribe, unsubscribe
from app.services.ingestors.neows_ingestor import ingest_neows_feed
from app.services.ingestors.sentry_ingestor import ingest_sentry_once
from app.services.normalizer.neo_normalizer import normalize_neos
from app.services.risk_engine import compute_risk_levels
from app.services.nasa_services import get_nasa_services

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/asteroids", tags=["Asteroid Threats"])

def _calculate_nasa_risk(is_hazardous: bool, distance_ld: float, diameter_max_km: float = 0) -> str:
    # Refined Risk Scale to avoid "Everything is NONE"
    
    # 1. CRITICAL: Existential threats
    # Hazardous AND extremely close (inside Moon orbit)
    if is_hazardous and distance_ld < 1.0: return "critical"
    
    # 2. HIGH: Major concern
    # Hazardous AND close (< 20 LD)
    if is_hazardous and distance_ld < 20.0: return "high"
    # Not hazardous but huge (> 1km) AND very close (< 5 LD)
    if not is_hazardous and diameter_max_km > 1.0 and distance_ld < 5.0: return "high"
    
    # 3. MEDIUM: Worth monitoring
    # Hazardous (any distance within reason, usually PHA means it has potential)
    if is_hazardous: return "medium"
    # Not hazardous but Close (< 10 LD)
    if distance_ld < 10.0: return "medium"
    # Not hazardous but Large (> 1km) AND somewhat close (< 50 LD)
    if diameter_max_km > 1.0 and distance_ld < 50.0: return "medium"

    # 4. LOW: Routine observation
    # Any object within a broad "interest" range (< 100 LD)
    if distance_ld < 100.0: return "low"
    # Large objects (> 500m) even if further out (< 200 LD)
    if diameter_max_km > 0.5 and distance_ld < 200.0: return "low"
    
    return "none"

def _map_nasa_neo_to_response(neo: Dict[str, Any]) -> Dict[str, Any]:
    # Find next approach
    approaches = neo.get("close_approach_data", [])
    now_ts = datetime.utcnow().timestamp() * 1000
    
    # Sort by date
    sorted_approaches = sorted(approaches, key=lambda x: x.get("epoch_date_close_approach", 0))
    
    # Find first in future
    next_approach = None
    for app in sorted_approaches:
        if app.get("epoch_date_close_approach", 0) > now_ts:
            next_approach = app
            break
            
    # Fallback to last if no future (shouldn't happen often in browse) or first
    if not next_approach and approaches:
        next_approach = approaches[-1]

    dist_ld = float(next_approach["miss_distance"]["lunar"]) if next_approach else 999.0
    dist_au = float(next_approach["miss_distance"]["astronomical"]) if next_approach else 999.0
    velocity = float(next_approach["relative_velocity"]["kilometers_per_second"]) if next_approach else 0.0
    
    is_hazardous = neo.get("is_potentially_hazardous_asteroid", False)
    diameter_max = neo.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_max", 0)
    
    risk_level = _calculate_nasa_risk(is_hazardous, dist_ld, diameter_max)
    
    diameter_min = neo.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_min", 0)
    diameter_max = neo.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_max", 0)
    
    # Next approach object structure matching DB format
    next_obj = {
        "timestamp": datetime.fromtimestamp(next_approach.get("epoch_date_close_approach", 0)/1000).isoformat() if next_approach else None,
        "distance_ld": dist_ld,
        "distance_au": dist_au,
        "relative_velocity_kms": velocity
    } if next_approach else None

    return {
        "neoId": neo.get("id"),
        "name": neo.get("name"),
        "risk_level": risk_level,
        "impact_probability": 0, # NASA NeoWs doesn't provide this directly in Browse
        "torino": 0,
        "palermo": 0,
        "diameter_min_km": diameter_min,
        "diameter_max_km": diameter_max,
        "next_approach": next_obj
    }

def _clean_mongo_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [_clean_mongo_doc(d) for d in doc]
    if isinstance(doc, dict):
        cleaned = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                cleaned[k] = str(v)
            elif isinstance(v, datetime):
                cleaned[k] = v.isoformat() + "Z"
            elif isinstance(v, dict):
                cleaned[k] = _clean_mongo_doc(v)
            elif isinstance(v, list):
                cleaned[k] = _clean_mongo_doc(v)
            else:
                cleaned[k] = v
        return cleaned
    return doc
@router.get("/detail/{neo_id:path}")
async def detail(neo_id: str) -> JSONResponse:
    try:
        logger.info("Direct NASA Detail Request", neo_id=neo_id)
        
        # 1. Fetch live data from NASA
        nasa = get_nasa_services()
        result = await nasa.get_neo_by_id(neo_id)
        
        if result.get("status") != "success":
            return JSONResponse({"error": "Asteroid not found in NASA database"}, status_code=404)
            
        data = result.get("data", {})
        
        # 2. Map to frontend expected structure
        # Frontend expects: { asteroid: {...}, risk: {...}, approaches: [...] }
        
        # Extract diameters
        est_diameter = data.get("estimated_diameter", {}).get("kilometers", {})
        
        # Extract orbital data
        orbital_data = data.get("orbital_data", {})
        
        # Construct Asteroid Object
        asteroid_obj = {
            "neo_id": data.get("id"),
            "name": data.get("name"),
            "designation": data.get("designation"),
            "absolute_magnitude_h": data.get("absolute_magnitude_h"),
            "diameter_min_km": est_diameter.get("estimated_diameter_min"),
            "diameter_max_km": est_diameter.get("estimated_diameter_max"),
            "is_potentially_hazardous": data.get("is_potentially_hazardous_asteroid"),
            "orbital_data": {
                "orbit_id": orbital_data.get("orbit_id"),
                "orbit_determination_date": orbital_data.get("orbit_determination_date"),
                "first_observation_date": orbital_data.get("first_observation_date"),
                "last_observation_date": orbital_data.get("last_observation_date"),
                "data_arc_in_days": orbital_data.get("data_arc_in_days"),
                "observations_used": orbital_data.get("observations_used"),
                "orbit_uncertainty": orbital_data.get("orbit_uncertainty"),
                "minimum_orbit_intersection": orbital_data.get("minimum_orbit_intersection"),
                "jupiter_tisserand_invariant": orbital_data.get("jupiter_tisserand_invariant"),
                "epoch_osculation": orbital_data.get("epoch_osculation"),
                "eccentricity": orbital_data.get("eccentricity"),
                "semi_major_axis": orbital_data.get("semi_major_axis"),
                "inclination": orbital_data.get("inclination"),
                "ascending_node_longitude": orbital_data.get("ascending_node_longitude"),
                "orbital_period": orbital_data.get("orbital_period"),
                "perihelion_distance": orbital_data.get("perihelion_distance"),
                "perihelion_argument": orbital_data.get("perihelion_argument"),
                "aphelion_distance": orbital_data.get("aphelion_distance"),
                "mean_anomaly": orbital_data.get("mean_anomaly"),
                "mean_motion": orbital_data.get("mean_motion"),
                "equinox": orbital_data.get("equinox"),
                "orbit_class": {
                    "orbit_class_type": orbital_data.get("orbit_class", {}).get("orbit_class_type"),
                    "orbit_class_description": orbital_data.get("orbit_class", {}).get("orbit_class_description"),
                    "orbit_class_range": orbital_data.get("orbit_class", {}).get("orbit_class_range")
                }
            }
        }

        # Construct Close Approaches
        approaches = []
        raw_approaches = data.get("close_approach_data", [])
        base_date = datetime(1970, 1, 1)
        for app in raw_approaches:
            epoch_ms = app.get("epoch_date_close_approach", 0)
            # Fix for Windows [Errno 22] Invalid argument on pre-1970 timestamps
            # Instead of fromtimestamp, use manual calculation
            try:
                dt = base_date + timedelta(milliseconds=epoch_ms)
                ts_iso = dt.isoformat()
            except Exception:
                # Fallback or safe default if overflow occurs
                ts_iso = datetime.utcnow().isoformat()

            approaches.append({
                "timestamp": ts_iso,
                "distance_ld": float(app.get("miss_distance", {}).get("lunar", 0)),
                "distance_au": float(app.get("miss_distance", {}).get("astronomical", 0)),
                "relative_velocity_kms": float(app.get("relative_velocity", {}).get("kilometers_per_second", 0)),
                "orbiting_body": app.get("orbiting_body")
            })
            
        # Determine Threat Level for Risk Object
        # Since we don't have Sentry data here, we calculate a simple threat level based on PH status and distance
        is_hazardous = data.get("is_potentially_hazardous_asteroid", False)
        
        # Find closest future approach for risk calculation
        now_ts = datetime.utcnow().isoformat()
        future_approaches = [a for a in approaches if a["timestamp"] > now_ts]
        closest_dist = 999.0
        if future_approaches:
            closest_dist = min(a["distance_ld"] for a in future_approaches)
            
        risk_level = _calculate_nasa_risk(is_hazardous, closest_dist, est_diameter.get("estimated_diameter_max", 0))
        
        risk_obj = {
            "neo_id": data.get("id"),
            "risk_level": risk_level,
            "impact_probability": 0, # Not available in standard NeoWs lookup
            "torino": 0,
            "palermo": 0
        }

        result_payload = {
            "asteroid": asteroid_obj,
            "risk": risk_obj,
            "approaches": approaches
        }
        
        return JSONResponse(result_payload)
        
    except Exception as e:
        logger.error("Detail hatası", neo_id=neo_id, error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)
@router.get("/overview")
async def overview() -> JSONResponse:
    try:
        # Fetch today's feed from NASA to provide real-time stats
        nasa = get_nasa_services()
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        
        # We only fetch 1 day to be fast
        result = await nasa.get_neo_feed(start_date=today_str, end_date=today_str)
        
        counters = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}
        
        if result.get("status") == "success":
            data = result.get("data", {})
            element_count = data.get("element_count", 0)
            near_earth_objects = data.get("near_earth_objects", {}).get(today_str, [])
            
            for neo in near_earth_objects:
                is_hazardous = neo.get("is_potentially_hazardous_asteroid", False)
                
                # Find closest approach distance for today
                approaches = neo.get("close_approach_data", [])
                min_dist_ld = 999.0
                if approaches:
                    min_dist_ld = min([float(a.get("miss_distance", {}).get("lunar", 999)) for a in approaches])
                
                diameter_max = neo.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_max", 0)
                risk_level = _calculate_nasa_risk(is_hazardous, min_dist_ld, diameter_max)
                counters[risk_level] = counters.get(risk_level, 0) + 1
                
        return JSONResponse({"updatedAt": datetime.utcnow().isoformat() + "Z", "counters": counters})
    except Exception as e:
        logger.error("Overview stats error", error=str(e))
        # Fallback to zeros if NASA fails
        return JSONResponse({"updatedAt": datetime.utcnow().isoformat() + "Z", "counters": {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}})
@router.get("/approaches")
async def approaches(window: str = Query("7d", pattern=r"^\d+[d]$")) -> JSONResponse:
    days = int(window[:-1])
    col = get_collection("close_approaches")
    since = datetime.utcnow() - timedelta(days=days)
    buckets: Dict[str, int] = {}
    async for doc in col.find({"timestamp": {"$gte": since}}):
        key = doc["timestamp"].strftime("%Y-%m-%d")
        buckets[key] = buckets.get(key, 0) + 1
    series = sorted([[k, buckets[k]] for k in buckets.keys()])
    return JSONResponse({"window": window, "series": series})
@router.get("/top")
async def top(limit: int = Query(10, ge=1, le=50)) -> JSONResponse:
    risks = get_collection("risk_assessments")
    weights = {"critical": 4, "high": 3, "medium": 2, "low": 1, "none": 0}
    items: List[Dict[str, Any]] = []
    async for r in risks.find({}):
        score = weights.get(r.get("risk_level", "none"), 0)
        score += float(r.get("impact_probability") or 0) * 10
        items.append({"neoId": r.get("neo_id"), "riskLevel": r.get("risk_level"), "score": score})
    items.sort(key=lambda x: x["score"], reverse=True)
    return JSONResponse({"items": items[:limit]})
@router.get("/events")
async def events():
    async def event_stream():
        q = await subscribe()
        try:
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"data: {data}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {datetime.utcnow().isoformat()}\n\n"
        finally:
            await unsubscribe(q)
    return StreamingResponse(event_stream(), media_type="text/event-stream")
@router.post("/sync")
async def sync_now() -> JSONResponse:
    
    try:
        r1 = await ingest_neows_feed(7)
        r2 = await ingest_sentry_once()
        r3 = await normalize_neos()
        r4 = await compute_risk_levels()
        return JSONResponse({"success": True, "neows": r1, "sentry": r2, "normalize": r3, "risk": r4})
    except Exception as e:
        logger.error("Sync hatası", error=str(e))
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)
def _risk_weight_expr():
    return {
        "$switch": {
            "branches": [
                {"case": {"$eq": ["$risk.risk_level", "critical"]}, "then": 4},
                {"case": {"$eq": ["$risk.risk_level", "high"]}, "then": 3},
                {"case": {"$eq": ["$risk.risk_level", "medium"]}, "then": 2},
                {"case": {"$eq": ["$risk.risk_level", "low"]}, "then": 1},
            ],
            "default": 0,
        }
    }
def _build_search_pipeline(
    q: Optional[str],
    risks: Optional[list],
    min_d_km: Optional[float],
    max_d_km: Optional[float],
    max_ld: Optional[float],
    window_days: int,
    sort: str,
    skip: int,
    limit: int,
):
    now = datetime.utcnow()
    until = now + timedelta(days=max(window_days, 0))
    match_stage = {"$match": {}}
    if q:
        match_stage["$match"]["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"neo_id": {"$regex": f"^{q}$", "$options": "i"}},
        ]
    diameter_filters = []
    if min_d_km is not None:
        diameter_filters.append({"$gte": ["$diameter_max_km", min_d_km]})
    if max_d_km is not None:
        diameter_filters.append({"$lte": ["$diameter_min_km", max_d_km]})
    pipeline = [match_stage]
    pipeline.extend(
        [
            {
                "$lookup": {
                    "from": "risk_assessments",
                    "localField": "neo_id",
                    "foreignField": "neo_id",
                    "as": "risk",
                }
            },
            {"$unwind": {"path": "$risk", "preserveNullAndEmptyArrays": True}},
        ]
    )
    pipeline.extend(
        [
            {
                "$lookup": {
                    "from": "close_approaches",
                    "let": {"nid": "$neo_id"},
                    "pipeline": [
                        {"$match": {"$expr": {"$and": [
                            {"$eq": ["$neo_id", "$$nid"]},
                            {"$gte": ["$timestamp", now]},
                            {"$lte": ["$timestamp", until]},
                        ]}}},
                        {"$sort": {"timestamp": 1}},
                        {"$limit": 1},
                        {"$project": {"_id": 0, "timestamp": 1, "distance_ld": 1, "distance_au": 1, "relative_velocity_kms": 1}},
                    ],
                    "as": "next",
                }
            },
            {"$addFields": {"next": {"$arrayElemAt": ["$next", 0]}}},
        ]
    )
    if risks:
        pipeline.append({"$match": {"risk.risk_level": {"$in": risks}}})
    if diameter_filters:
        pipeline.append({"$match": {"$expr": {"$and": diameter_filters}}})
    if max_ld is not None:
        pipeline.append({"$match": {"next.distance_ld": {"$lte": max_ld}}})
    pipeline.append(
        {
            "$addFields": {
                "risk_weight": _risk_weight_expr(),
            }
        }
    )
    sort_stage = {"$sort": {"risk_weight": -1, "risk.impact_probability": -1}}
    if sort:
        key = sort.lstrip("-")
        direction = -1 if sort.startswith("-") else 1
        if key == "risk":
            sort_stage = {"$sort": {"risk_weight": direction, "risk.impact_probability": direction}}
        elif key == "date":
            sort_stage = {"$sort": {"next.timestamp": direction}}
        elif key == "diameter":
            sort_stage = {"$sort": {"diameter_max_km": direction}}
        elif key == "name":
            sort_stage = {"$sort": {"name": direction}}
    pipeline.append(
        {
            "$facet": {
                "items": [
                    sort_stage,
                    {"$skip": max(skip, 0)},
                    {"$limit": max(limit, 1)},
                    {"$project": {
                        "_id": 0,
                        "neoId": "$neo_id",
                        "name": "$name",
                        "risk_level": "$risk.risk_level",
                        "impact_probability": "$risk.impact_probability",
                        "torino": "$risk.torino",
                        "palermo": "$risk.palermo",
                        "diameter_min_km": "$diameter_min_km",
                        "diameter_max_km": "$diameter_max_km",
                        "next_approach": "$next",
                    }},
                ],
                "count": [
                    {"$count": "total"}
                ],
            }
        }
    )
    return pipeline
@router.get("/search")
async def search(
    q: Optional[str] = Query(None, description="NEO adı/ID arama"),
    risk: Optional[List[str]] = Query(None, description="risk seviyeleri"),
    min_diameter_km: Optional[float] = Query(None, ge=0),
    max_diameter_km: Optional[float] = Query(None, ge=0),
    max_ld: Optional[float] = Query(None, ge=0, description="Maks. Ay uzaklığı (LD)"),
    window_days: int = Query(30, ge=0, le=365),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort: str = Query("-risk", description="risk|date|diameter|name, - prefix desc"),
) -> JSONResponse:
    try:
        nasa = get_nasa_services()
        items = []
        total = 0
        stats = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}
        
        if q:
            # ID Search
            logger.info(f"Direct NASA Search by ID: {q}")
            result = await nasa.get_neo_by_id(q)
            if result.get("status") == "success":
                mapped = _map_nasa_neo_to_response(result["data"])
                items = [mapped]
                total = 1
                # For single item stats
                stats[mapped["risk_level"]] = 1
        
        elif sort == "-risk" or sort == "risk":
            # Risk Sort -> Use Sentry Data with Filtering
            logger.info(f"Sentry Risk Search: page={page-1}, filters active")
            
            filters = {
                "risk": risk,
                "min_diameter_km": min_diameter_km,
                "max_diameter_km": max_diameter_km,
                "q": q
            }
            
            result = await nasa.get_sentry_paged(page=page-1, size=page_size, filters=filters)
            
            items = result.get("items", [])
            total = result.get("total", 0)
            stats = result.get("stats", stats)
            
        else:
            # Default Browse (Date/Random)
            logger.info(f"Direct NASA Browse: page={page-1}")
            result = await nasa.get_neo_browse(page=page-1, size=page_size)
            
            if result.get("status") == "success":
                data = result.get("data", {})
                raw_items = data.get("near_earth_objects", [])
                total = data.get("page", {}).get("total_elements", 0)
                items = [_map_nasa_neo_to_response(item) for item in raw_items]
                
                # For Browse, we can only calc stats for current page roughly
                for i in items:
                    stats[i["risk_level"]] += 1

        return JSONResponse(
            {
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": items,
                "stats": stats # Return global stats
            }
        )
    except Exception as e:
        logger.error("Search hatası", error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)
@router.get("/compare")
async def compare(ids: str = Query(..., description="Virgülle ayrılmış NEO ID listesi")) -> JSONResponse:
    try:
        id_list = [i.strip() for i in ids.split(",") if i.strip()]
        if not id_list:
            return JSONResponse({"items": []})
        col = get_collection("asteroids")
        now = datetime.utcnow()
        until = now + timedelta(days=365)
        pipeline = [
            {"$match": {"neo_id": {"$in": id_list}}},
            {
                "$lookup": {
                    "from": "risk_assessments",
                    "localField": "neo_id",
                    "foreignField": "neo_id",
                    "as": "risk",
                }
            },
            {"$unwind": {"path": "$risk", "preserveNullAndEmptyArrays": True}},
            {
                "$lookup": {
                    "from": "close_approaches",
                    "let": {"nid": "$neo_id"},
                    "pipeline": [
                        {"$match": {"$expr": {"$and": [
                            {"$eq": ["$neo_id", "$$nid"]},
                            {"$gte": ["$timestamp", now]},
                            {"$lte": ["$timestamp", until]},
                        ]}}},
                        {"$sort": {"timestamp": 1}},
                        {"$limit": 1},
                        {"$project": {"_id": 0, "timestamp": 1, "distance_ld": 1, "distance_au": 1, "relative_velocity_kms": 1}},
                    ],
                    "as": "next",
                }
            },
            {"$addFields": {"next": {"$arrayElemAt": ["$next", 0]}}},
            {
                "$project": {
                    "_id": 0,
                    "neoId": "$neo_id",
                    "name": "$name",
                    "risk_level": "$risk.risk_level",
                    "impact_probability": "$risk.impact_probability",
                    "torino": "$risk.torino",
                    "palermo": "$risk.palermo",
                    "diameter_min_km": "$diameter_min_km",
                    "diameter_max_km": "$diameter_max_km",
                    "next_approach": "$next",
                }
            },
        ]
        cursor = col.aggregate(pipeline)
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            items.append(doc)
        return JSONResponse({"items": _clean_mongo_doc(items)})
    except Exception as e:
        logger.error("Compare hatası", error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

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
logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/asteroids", tags=["Asteroid Threats"])
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
        logger.info("Detail ucuna istek", neo_id=neo_id)
        ast = await get_collection("asteroids").find_one({"neows_id": neo_id})
        if not ast:
            ast = await get_collection("asteroids").find_one({"neo_id": neo_id})
        risk = await get_collection("risk_assessments").find_one({"neo_id": neo_id})
        approaches_cursor = get_collection("close_approaches").find({"neo_id": neo_id}).sort("timestamp", -1).limit(10)
        approaches = []
        async for doc in approaches_cursor:
            approaches.append(doc)
        logger.info("Detail bulundu", has_ast=bool(ast), has_risk=bool(risk), approaches_count=len(approaches))
        result = {
            "asteroid": _clean_mongo_doc(ast),
            "risk": _clean_mongo_doc(risk),
            "approaches": _clean_mongo_doc(approaches)
        }
        return JSONResponse(result)
    except Exception as e:
        logger.error("Detail hatası", neo_id=neo_id, error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)
@router.get("/overview")
async def overview() -> JSONResponse:
    risks = get_collection("risk_assessments")
    counters = {k: 0 for k in ["critical", "high", "medium", "low", "none"]}
    last = None
    async for r in risks.find({}):
        lvl = r.get("risk_level", "none")
        counters[lvl] = counters.get(lvl, 0) + 1
        ts = r.get("updated_at")
        if ts and (last is None or ts > last):
            last = ts
    return JSONResponse({"updatedAt": (last or datetime.utcnow()).isoformat() + "Z", "counters": counters})
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
        col = get_collection("asteroids")
        pipeline = _build_search_pipeline(
            q=q,
            risks=risk,
            min_d_km=min_diameter_km,
            max_d_km=max_diameter_km,
            max_ld=max_ld,
            window_days=window_days,
            sort=sort,
            skip=(page - 1) * page_size,
            limit=page_size,
        )
        cursor = col.aggregate(pipeline)
        result = None
        async for doc in cursor:
            result = doc
            break
        if not result:
            result = {"items": [], "count": []}
        items = result.get("items", [])
        total = 0
        if result.get("count") and len(result["count"]) > 0:
            total = result["count"][0].get("total", 0)
        clean_items = _clean_mongo_doc(items)
        return JSONResponse(
            {
                "total": total,
                "page": page,
                "page_size": page_size,
                "items": clean_items,
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

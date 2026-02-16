from __future__ import annotations
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query, Path
from fastapi.responses import JSONResponse, StreamingResponse
import asyncio
import structlog
from app.services.alerts import subscribe, unsubscribe
from app.services.nasa_services import get_nasa_services
from app.core.cache import cache

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/asteroids", tags=["Asteroid Threats"])

def _calculate_nasa_risk(is_hazardous: bool, distance_ld: float, diameter_max_km: float = 0) -> str:
    if is_hazardous and distance_ld < 1.0: return "critical"
    if is_hazardous and distance_ld < 20.0: return "high"
    if not is_hazardous and diameter_max_km > 1.0 and distance_ld < 5.0: return "high"
    if is_hazardous: return "medium"
    if distance_ld < 10.0: return "medium"
    if diameter_max_km > 1.0 and distance_ld < 50.0: return "medium"
    if distance_ld < 100.0: return "low"
    if diameter_max_km > 0.5 and distance_ld < 200.0: return "low"
    return "none"

def _map_nasa_neo_to_response(neo: Dict[str, Any]) -> Dict[str, Any]:
    approaches = neo.get("close_approach_data", [])
    now_ts = datetime.utcnow().timestamp() * 1000
    sorted_approaches = sorted(approaches, key=lambda x: x.get("epoch_date_close_approach", 0))
    next_approach = None
    for app in sorted_approaches:
        if app.get("epoch_date_close_approach", 0) > now_ts:
            next_approach = app
            break
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

    base_date = datetime(1970, 1, 1)
    next_obj = None
    if next_approach:
        try:
            dt = base_date + timedelta(milliseconds=next_approach.get("epoch_date_close_approach", 0))
            ts_iso = dt.isoformat()
        except Exception:
            ts_iso = datetime.utcnow().isoformat()
        next_obj = {
            "timestamp": ts_iso,
            "distance_ld": dist_ld,
            "distance_au": dist_au,
            "relative_velocity_kms": velocity
        }

    return {
        "neoId": neo.get("id"),
        "name": neo.get("name"),
        "risk_level": risk_level,
        "impact_probability": 0,
        "torino": 0,
        "palermo": 0,
        "diameter_min_km": diameter_min,
        "diameter_max_km": diameter_max,
        "next_approach": next_obj
    }

@router.get("/detail/{neo_id:path}")
async def detail(neo_id: str) -> JSONResponse:
    try:
        logger.info("Direct NASA Detail Request", neo_id=neo_id)
        nasa = get_nasa_services()
        result = await nasa.get_neo_by_id(neo_id)
        if result.get("status") != "success":
            return JSONResponse({"error": "Asteroid not found in NASA database"}, status_code=404)
        data = result.get("data", {})
        est_diameter = data.get("estimated_diameter", {}).get("kilometers", {})
        orbital_data = data.get("orbital_data", {})
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
        approaches = []
        raw_approaches = data.get("close_approach_data", [])
        base_date = datetime(1970, 1, 1)
        for app in raw_approaches:
            epoch_ms = app.get("epoch_date_close_approach", 0)
            try:
                dt = base_date + timedelta(milliseconds=epoch_ms)
                ts_iso = dt.isoformat()
            except Exception:
                ts_iso = datetime.utcnow().isoformat()
            approaches.append({
                "timestamp": ts_iso,
                "distance_ld": float(app.get("miss_distance", {}).get("lunar", 0)),
                "distance_au": float(app.get("miss_distance", {}).get("astronomical", 0)),
                "relative_velocity_kms": float(app.get("relative_velocity", {}).get("kilometers_per_second", 0)),
                "orbiting_body": app.get("orbiting_body")
            })
        is_hazardous = data.get("is_potentially_hazardous_asteroid", False)
        now_ts = datetime.utcnow().isoformat()
        future_approaches = [a for a in approaches if a["timestamp"] > now_ts]
        closest_dist = 999.0
        if future_approaches:
            closest_dist = min(a["distance_ld"] for a in future_approaches)
        risk_level = _calculate_nasa_risk(is_hazardous, closest_dist, est_diameter.get("estimated_diameter_max", 0))
        risk_obj = {
            "neo_id": data.get("id"),
            "risk_level": risk_level,
            "impact_probability": 0,
            "torino": 0,
            "palermo": 0
        }
        return JSONResponse({"asteroid": asteroid_obj, "risk": risk_obj, "approaches": approaches})
    except Exception as e:
        logger.error("Detail hatasi", neo_id=neo_id, error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/overview")
async def overview() -> JSONResponse:
    try:
        cached = await cache.get("asteroids_overview")
        if cached:
            return JSONResponse(cached)

        nasa = get_nasa_services()
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        result = await nasa.get_neo_feed(start_date=today_str, end_date=today_str)
        counters = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}
        if result.get("status") == "success":
            near_earth_objects = result.get("data", {}).get("near_earth_objects", {}).get(today_str, [])
            for neo in near_earth_objects:
                is_hazardous = neo.get("is_potentially_hazardous_asteroid", False)
                approaches = neo.get("close_approach_data", [])
                min_dist_ld = 999.0
                if approaches:
                    min_dist_ld = min([float(a.get("miss_distance", {}).get("lunar", 999)) for a in approaches])
                diameter_max = neo.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_max", 0)
                risk_level = _calculate_nasa_risk(is_hazardous, min_dist_ld, diameter_max)
                counters[risk_level] = counters.get(risk_level, 0) + 1

        payload = {"updatedAt": datetime.utcnow().isoformat() + "Z", "counters": counters}
        await cache.set("asteroids_overview", payload, ttl=600)
        return JSONResponse(payload)
    except Exception as e:
        logger.error("Overview stats error", error=str(e))
        return JSONResponse({"updatedAt": datetime.utcnow().isoformat() + "Z", "counters": {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}})

@router.get("/approaches")
async def approaches(window: str = Query("7d", pattern=r"^\d+[d]$")) -> JSONResponse:
    try:
        days = int(window[:-1])
        cache_key = f"approaches_{days}d"
        cached = await cache.get(cache_key)
        if cached:
            return JSONResponse(cached)

        nasa = get_nasa_services()
        buckets: Dict[str, int] = {}
        fetch_days = min(days, 7)
        now = datetime.utcnow()
        start_date = now.strftime('%Y-%m-%d')
        end_date = (now + timedelta(days=fetch_days)).strftime('%Y-%m-%d')
        result = await nasa.get_neo_feed(start_date=start_date, end_date=end_date)
        if result.get("status") == "success":
            neos_by_day = result.get("data", {}).get("near_earth_objects", {})
            for day, neos in neos_by_day.items():
                buckets[day] = len(neos)
        series = sorted([[k, buckets[k]] for k in buckets.keys()])
        payload = {"window": window, "series": series}
        await cache.set(cache_key, payload, ttl=600)
        return JSONResponse(payload)
    except Exception as e:
        logger.error("Approaches error", error=str(e))
        return JSONResponse({"window": window, "series": []})

@router.get("/top")
async def top(limit: int = Query(10, ge=1, le=50)) -> JSONResponse:
    try:
        cached = await cache.get(f"top_{limit}")
        if cached:
            return JSONResponse(cached)

        nasa = get_nasa_services()
        result = await nasa.get_sentry_data()
        weights = {"critical": 4, "high": 3, "medium": 2, "low": 1, "none": 0}
        items: List[Dict[str, Any]] = []
        if result.get("status") == "success":
            sentry_items = result.get("data", {}).get("data", [])
            for item in sentry_items:
                des = item.get("des") or item.get("id")
                if not des:
                    continue
                diameter_km = float(item.get("diameter", 0) or 0)
                ip = float(item.get("ip", 0) or 0)
                is_hazardous = True
                risk_level = _calculate_nasa_risk(is_hazardous, 50.0, diameter_km)
                score = weights.get(risk_level, 0) + ip * 10
                items.append({"neoId": str(des), "riskLevel": risk_level, "score": score})
        items.sort(key=lambda x: x["score"], reverse=True)
        payload = {"items": items[:limit]}
        await cache.set(f"top_{limit}", payload, ttl=600)
        return JSONResponse(payload)
    except Exception as e:
        logger.error("Top error", error=str(e))
        return JSONResponse({"items": []})

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
    await cache.clear()
    return JSONResponse({"success": True, "message": "Cache cleared, next requests will fetch fresh data from NASA"})

@router.get("/search")
async def search(
    q: Optional[str] = Query(None, description="NEO adi/ID arama"),
    risk: Optional[List[str]] = Query(None, description="risk seviyeleri"),
    min_diameter_km: Optional[float] = Query(None, ge=0),
    max_diameter_km: Optional[float] = Query(None, ge=0),
    max_ld: Optional[float] = Query(None, ge=0, description="Maks. Ay uzakligi (LD)"),
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
            logger.info(f"Direct NASA Search by ID: {q}")
            result = await nasa.get_neo_by_id(q)
            if result.get("status") == "success":
                mapped = _map_nasa_neo_to_response(result["data"])
                items = [mapped]
                total = 1
                stats[mapped["risk_level"]] = 1
        elif sort == "-risk" or sort == "risk":
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
            logger.info(f"Direct NASA Browse: page={page-1}")
            result = await nasa.get_neo_browse(page=page-1, size=page_size)
            if result.get("status") == "success":
                data = result.get("data", {})
                raw_items = data.get("near_earth_objects", [])
                total = data.get("page", {}).get("total_elements", 0)
                items = [_map_nasa_neo_to_response(item) for item in raw_items]
                for i in items:
                    stats[i["risk_level"]] += 1

        return JSONResponse({
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": items,
            "stats": stats
        })
    except Exception as e:
        logger.error("Search hatasi", error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/compare")
async def compare(ids: str = Query(..., description="Virgülle ayrilmis NEO ID listesi")) -> JSONResponse:
    try:
        id_list = [i.strip() for i in ids.split(",") if i.strip()]
        if not id_list:
            return JSONResponse({"items": []})

        nasa = get_nasa_services()
        items: List[Dict[str, Any]] = []
        for neo_id in id_list:
            result = await nasa.get_neo_by_id(neo_id)
            if result.get("status") == "success":
                items.append(_map_nasa_neo_to_response(result["data"]))
        return JSONResponse({"items": items})
    except Exception as e:
        logger.error("Compare hatasi", error=str(e), exc_info=True)
        return JSONResponse({"error": str(e)}, status_code=500)

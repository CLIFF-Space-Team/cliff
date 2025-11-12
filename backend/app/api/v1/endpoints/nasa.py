from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import structlog
from app.services.nasa_services import get_nasa_services, NASAServices
from app.services.exoplanet_services import get_exoplanet_service, ExoplanetArchiveService
from app.services.nasa_image_services import get_nasa_image_service, NASAImageLibraryService
from app.services.tle_services import get_tle_service, TLEService
from app.core.config import settings
logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/nasa", tags=["NASA Services"])
@router.get("/neo/feed")
async def get_neo_feed(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🌑 Near-Earth Object Feed
    Get NEO data for date range (max 7 days)
    """
    try:
        logger.info(f"NEO feed requested: {start_date} to {end_date}")
        if not start_date:
            start_date = datetime.now().strftime('%Y-%m-%d')
        if not end_date:
            end_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        neo_data = await nasa_services.get_neo_feed(start_date=start_date, end_date=end_date)
        logger.info(f"NEO feed data retrieved: {len(neo_data.get('near_earth_objects', {}))} days")
        return JSONResponse(content={
            "success": True,
            "data": neo_data,
            "date_range": {
                "start_date": start_date,
                "end_date": end_date
            },
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"NEO feed failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get NEO feed: {str(e)}")
@router.get("/neo/lookup/{neo_id}")
async def lookup_neo_by_id(
    neo_id: str = Path(..., description="NEO reference ID"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🔍 NEO Lookup by ID
    Get detailed information about specific NEO
    """
    try:
        logger.info(f"NEO lookup requested: {neo_id}")
        neo_data = await nasa_services.get_neo_by_id(neo_id)
        logger.info(f"NEO data retrieved for: {neo_id}")
        return JSONResponse(content={
            "success": True,
            "neo_id": neo_id,
            "data": neo_data,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"NEO lookup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to lookup NEO: {str(e)}")
@router.get("/cad")
async def get_close_approach_data(
    date_min: Optional[str] = Query(None, description="Minimum approach date (YYYY-MM-DD)"),
    date_max: Optional[str] = Query(None, description="Maximum approach date (YYYY-MM-DD)"),
    dist_min: Optional[float] = Query(None, description="Minimum approach distance (AU)"),
    dist_max: Optional[float] = Query(None, description="Maximum approach distance (AU)"),
    h_min: Optional[float] = Query(None, description="Minimum absolute magnitude"),
    h_max: Optional[float] = Query(None, description="Maximum absolute magnitude"),
    limit: int = Query(100, le=1000, description="Maximum results to return"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🛰️ Close Approach Data (CAD)
    Get asteroid/comet close approach data to Earth
    """
    try:
        logger.info(f"CAD data requested with limit: {limit}")
        params = {}
        if date_min:
            params["date-min"] = date_min
        if date_max:
            params["date-max"] = date_max
        if dist_min:
            params["dist-min"] = str(dist_min)
        if dist_max:
            params["dist-max"] = str(dist_max)
        if h_min:
            params["h-min"] = str(h_min)
        if h_max:
            params["h-max"] = str(h_max)
        if limit:
            params["limit"] = str(limit)
        cad_data = await nasa_services.get_close_approach_data(params)
        logger.info(f"CAD data retrieved: {len(cad_data.get('data', []))} approaches")
        return JSONResponse(content={
            "success": True,
            "data": cad_data,
            "parameters": params,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"CAD data request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get close approach data: {str(e)}")
@router.get("/fireball")
async def get_fireball_data(
    date_min: Optional[str] = Query(None, description="Minimum date (YYYY-MM-DD)"),
    date_max: Optional[str] = Query(None, description="Maximum date (YYYY-MM-DD)"),
    energy_min: Optional[float] = Query(None, description="Minimum impact energy (kt)"),
    energy_max: Optional[float] = Query(None, description="Maximum impact energy (kt)"),
    limit: int = Query(100, le=1000, description="Maximum results to return"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🔥 Fireball Data
    Get fireball and bolide events detected by government sensors
    """
    try:
        logger.info(f"Fireball data requested with limit: {limit}")
        params = {}
        if date_min:
            params["date-min"] = date_min
        if date_max:
            params["date-max"] = date_max
        if energy_min:
            params["energy-min"] = str(energy_min)
        if energy_max:
            params["energy-max"] = str(energy_max)
        if limit:
            params["limit"] = str(limit)
        fireball_data = await nasa_services.get_fireball_data(params)
        logger.info(f"Fireball data retrieved: {len(fireball_data.get('data', []))} events")
        return JSONResponse(content={
            "success": True,
            "data": fireball_data,
            "parameters": params,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Fireball data request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get fireball data: {str(e)}")
@router.get("/scout")
async def get_scout_data(
    tdes: Optional[str] = Query(None, description="Temporary designation"),
    plot: bool = Query(False, description="Include plot data"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🎯 Scout Data
    Get Scout system data for newly discovered asteroids
    """
    try:
        logger.info(f"Scout data requested for tdes: {tdes}")
        scout_data = await nasa_services.get_scout_data(tdes=tdes, plot=plot)
        logger.info(f"Scout data retrieved")
        return JSONResponse(content={
            "success": True,
            "data": scout_data,
            "tdes": tdes,
            "plot_included": plot,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Scout data request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get Scout data: {str(e)}")
@router.get("/nhats")
async def get_nhats_data(
    dv: Optional[float] = Query(None, description="Maximum delta-V (km/s)"),
    dur: Optional[int] = Query(None, description="Maximum mission duration (days)"),
    stay: Optional[int] = Query(None, description="Minimum stay time (days)"),
    launch: Optional[str] = Query(None, description="Launch date range (YYYY-YYYY)"),
    h: Optional[float] = Query(None, description="Maximum absolute magnitude"),
    occ: Optional[int] = Query(None, description="Maximum orbit condition code"),
    spk: Optional[str] = Query(None, description="SPK-ID"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🚀 NHATS - Near-Earth Object Human Space Flight Accessible Targets Study
    Get data on asteroids accessible for human space missions
    """
    try:
        logger.info("NHATS data requested")
        params = {}
        if dv is not None:
            params["dv"] = str(dv)
        if dur is not None:
            params["dur"] = str(dur)
        if stay is not None:
            params["stay"] = str(stay)
        if launch:
            params["launch"] = launch
        if h is not None:
            params["h"] = str(h)
        if occ is not None:
            params["occ"] = str(occ)
        if spk:
            params["spk"] = spk
        nhats_data = await nasa_services.get_nhats_data(params)
        logger.info(f"NHATS data retrieved: {len(nhats_data.get('data', []))} targets")
        return JSONResponse(content={
            "success": True,
            "data": nhats_data,
            "parameters": params,
            "description": "Near-Earth Object Human Space Flight Accessible Targets Study",
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"NHATS data request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get NHATS data: {str(e)}")
@router.get("/exoplanets")
async def get_exoplanets(
    limit: int = Query(100, le=1000, description="Maximum results to return"),
    discovery_year_min: Optional[int] = Query(None, description="Minimum discovery year"),
    exoplanet_services: ExoplanetArchiveService = Depends(get_exoplanet_service)
) -> JSONResponse:
    """
    🪐 Exoplanet Data
    Get exoplanet discoveries and data from NASA Exoplanet Archive
    """
    try:
        logger.info(f"Exoplanet data requested: limit={limit}")
        exoplanet_data = await exoplanet_services.get_confirmed_exoplanets(
            limit=limit,
            discovery_year_min=discovery_year_min
        )
        logger.info(f"Exoplanet data retrieved: {len(exoplanet_data.get('exoplanets', []))} planets")
        return JSONResponse(content={
            "success": True,
            "data": exoplanet_data,
            "filters": {
                "limit": limit,
                "discovery_year_min": discovery_year_min
            },
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Exoplanet data request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get exoplanet data: {str(e)}")
@router.get("/exoplanets/habitable")
async def get_habitable_exoplanets(
    limit: int = Query(50, le=500, description="Maximum results to return"),
    exoplanet_services: ExoplanetArchiveService = Depends(get_exoplanet_service)
) -> JSONResponse:
    """
    🌍 Potentially Habitable Exoplanets
    Get potentially habitable exoplanets in the habitable zone
    """
    try:
        logger.info(f"Habitable exoplanet data requested: limit={limit}")
        habitable_data = await exoplanet_services.get_habitable_candidates(limit=limit)
        logger.info(f"Habitable exoplanet data retrieved: {len(habitable_data.get('habitable_candidates', []))} planets")
        return JSONResponse(content={
            "success": True,
            "data": habitable_data,
            "description": "Potentially habitable exoplanets in stellar habitable zones",
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Habitable exoplanet request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get habitable exoplanet data: {str(e)}")
@router.get("/images/search")
async def search_nasa_images(
    query: str = Query(..., description="Search query"),
    media_type: str = Query("image", description="Media type: image, video, audio"),
    limit: int = Query(100, le=500, description="Maximum results to return"),
    nasa_image_services: NASAImageLibraryService = Depends(get_nasa_image_service)
) -> JSONResponse:
    """
    📸 NASA Image Search
    Search NASA image and video library
    """
    try:
        logger.info(f"NASA image search: '{query}' (media_type={media_type}, limit={limit})")
        search_results = await nasa_image_services.search_images(
            query=query,
            media_type=media_type,
            limit=limit
        )
        logger.info(f"NASA image search completed: {len(search_results.get('items', []))} results")
        return JSONResponse(content={
            "success": True,
            "query": query,
            "data": search_results,
            "media_type": media_type,
            "limit": limit,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"NASA image search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to search NASA images: {str(e)}")
@router.get("/images/apod")
async def get_astronomy_picture_of_day(
    date: Optional[str] = Query(None, description="Date (YYYY-MM-DD), defaults to today"),
    hd: bool = Query(True, description="Retrieve high definition image"),
    nasa_image_services: NASAImageLibraryService = Depends(get_nasa_image_service)
) -> JSONResponse:
    """
    🖼️ Astronomy Picture of the Day (APOD)
    Get NASA's Astronomy Picture of the Day
    """
    try:
        logger.info(f"APOD requested for date: {date or 'today'}")
        apod_data = await nasa_image_services.get_apod(date=date, hd=hd)
        logger.info(f"APOD retrieved: {apod_data.get('title', 'Unknown')}")
        return JSONResponse(content={
            "success": True,
            "data": apod_data,
            "date": date or datetime.now().strftime('%Y-%m-%d'),
            "hd": hd,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"APOD request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get APOD: {str(e)}")
@router.get("/tle/satellite/{satellite_id}")
async def get_satellite_tle(
    satellite_id: str = Path(..., description="Satellite NORAD ID or name"),
    tle_service: TLEService = Depends(get_tle_service)
) -> JSONResponse:
    """
    🛰️ Satellite TLE Data
    Get Two-Line Element data for specific satellite
    """
    try:
        logger.info(f"TLE data requested for satellite: {satellite_id}")
        tle_data = await tle_service.get_satellite_tle(satellite_id)
        logger.info(f"TLE data retrieved for: {satellite_id}")
        return JSONResponse(content={
            "success": True,
            "satellite_id": satellite_id,
            "data": tle_data,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"TLE request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get TLE data: {str(e)}")
@router.get("/tle/category/{category}")
async def get_tle_by_category(
    category: str = Path(..., description="Satellite category (e.g., stations, weather, amateur)"),
    tle_service: TLEService = Depends(get_tle_service)
) -> JSONResponse:
    """
    📡 TLE by Category
    Get TLE data for satellite category
    """
    try:
        logger.info(f"TLE category data requested: {category}")
        tle_data = await tle_service.get_tle_by_category(category)
        logger.info(f"TLE category data retrieved: {len(tle_data.get('satellites', []))} satellites")
        return JSONResponse(content={
            "success": True,
            "category": category,
            "data": tle_data,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"TLE category request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get TLE category data: {str(e)}")
@router.get("/space-weather")
async def get_space_weather(
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    ☀️ Space Weather Data
    Get current space weather conditions and forecasts
    """
    try:
        logger.info("Space weather data requested")
        space_weather = await nasa_services.get_space_weather_data()
        logger.info("Space weather data retrieved")
        return JSONResponse(content={
            "success": True,
            "data": space_weather,
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Space weather request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get space weather data: {str(e)}")
@router.get("/earth-events")
async def get_earth_events(
    limit: int = Query(100, le=500, description="Maximum results to return"),
    category: Optional[str] = Query(None, description="Event category filter"),
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🌍 Earth Natural Events
    Get natural events on Earth from EONET (Earth Observatory Natural Event Tracker)
    """
    try:
        logger.info(f"Earth events requested: limit={limit}, category={category}")
        earth_events = await nasa_services.get_earth_events(limit=limit, category=category)
        logger.info(f"Earth events retrieved: {len(earth_events.get('events', []))} events")
        return JSONResponse(content={
            "success": True,
            "data": earth_events,
            "filters": {
                "limit": limit,
                "category": category
            },
            "retrieved_at": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Earth events request failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get Earth events: {str(e)}")
@router.get("/status")
async def nasa_services_status(
    nasa_services: NASAServices = Depends(get_nasa_services)
) -> JSONResponse:
    """
    🔧 NASA Services Status
    Check status of all NASA API endpoints and services
    """
    try:
        logger.info("NASA services status check requested")
        status_data = await nasa_services.health_check()
        service_info = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "nasa_api_key_configured": bool(settings.NASA_API_KEY),
            "available_endpoints": [
                "NEO Feed", "NEO Lookup", "Close Approach Data (CAD)",
                "Fireball Data", "Scout Data", "NHATS Data", 
                "Exoplanet Data", "NASA Image Search", "APOD",
                "TLE Data", "Space Weather", "Earth Events"
            ],
            "service_health": status_data,
            "documentation": "https://api.nasa.gov/",
            "rate_limits": {
                "hourly_limit": 1000,  # Default NASA API rate limit
                "demo_key_limit": 30   # Demo key limit per hour
            }
        }
        overall_status = "healthy" if status_data.get("api_accessible") else "degraded"
        status_code = 200 if overall_status == "healthy" else 503
        logger.info(f"NASA services status: {overall_status}")
        return JSONResponse(content={
            "success": True,
            "status": overall_status,
            "services": service_info
        }, status_code=status_code)
    except Exception as e:
        logger.error(f"NASA services status check failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to check NASA services status: {str(e)}")
import asyncio
import json
import ssl
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlencode
import httpx
import structlog
from pydantic import BaseModel, Field
import aiohttp
import logging
from app.core.config import settings
logger = structlog.get_logger(__name__)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE
NASA_BASE_URL = "https://api.nasa.gov"
SSD_BASE_URL = "https://ssd-api.jpl.nasa.gov"
CAD_API_URL = f"{SSD_BASE_URL}/cad.api"
SENTRY_API_URL = f"{SSD_BASE_URL}/sentry.api"  
SCOUT_API_URL = f"{SSD_BASE_URL}/scout.api"
FIREBALL_API_URL = f"{SSD_BASE_URL}/fireball.api"
NHATS_API_URL = f"{SSD_BASE_URL}/nhats.api"
class InMemoryCache:
    def __init__(self, ttl: int = 300):
        self._cache: Dict[str, Any] = {}
        self._ttl = ttl
    async def get(self, key: str) -> Optional[Any]:
        if key not in self._cache:
            return None
        data, timestamp = self._cache[key]
        if (datetime.utcnow() - timestamp).total_seconds() > self._ttl:
            logger.info(f"Cache expired for key: {key}")
            del self._cache[key]
            return None
        logger.info(f"Cache hit for key: {key}")
        return data
    async def set(self, key: str, value: Any):
        logger.info(f"Cache set for key: {key}")
        self._cache[key] = (value, datetime.utcnow())
class NASAServices:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self._request_count = 0
        self._last_request_time = datetime.now()
        self.cache = InMemoryCache(ttl=300) # Add Cache Support
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            self.session = aiohttp.ClientSession(
                timeout=timeout, 
                connector=connector,
                headers={
                    "User-Agent": "CLIFF-NASA-Client/2.0.0",
                    "Accept": "application/json"
                }
            )
        return self.session
    async def close_session(self):
        if self.session and not self.session.closed:
            await self.session.close()
    async def _rate_limit(self, delay: float = 0.5):
        now = datetime.now()
        time_diff = (now - self._last_request_time).total_seconds()
        if time_diff < delay:
            sleep_time = delay - time_diff
            logger.debug(f"Rate limiting: {sleep_time:.2f}s bekliyor")
            await asyncio.sleep(sleep_time)
        self._request_count += 1
        self._last_request_time = datetime.now()
    async def health_check(self) -> Dict[str, Any]:
        try:
            logger.info("NASA services health check başlıyor...")
            health_data = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "nasa_api_key_configured": bool(settings.NASA_API_KEY),
                "api_accessible": False,
                "endpoints_tested": [],
                "successful_endpoints": 0,
                "failed_endpoints": 0,
                "response_times": {},
                "errors": []
            }
            test_endpoints = [
                {
                    "name": "NEO Feed",
                    "url": f"{NASA_BASE_URL}/neo/rest/v1/feed",
                    "params": {
                        "start_date": datetime.now().strftime('%Y-%m-%d'),
                        "end_date": (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
                        "api_key": settings.NASA_API_KEY
                    }
                },
                {
                    "name": "APOD",
                    "url": f"{NASA_BASE_URL}/planetary/apod",
                    "params": {
                        "api_key": settings.NASA_API_KEY
                    }
                }
            ]
            session = await self._get_session()
            for endpoint in test_endpoints:
                try:
                    start_time = datetime.now()
                    async with session.get(endpoint["url"], params=endpoint["params"]) as response:
                        response_time = (datetime.now() - start_time).total_seconds() * 1000
                        health_data["endpoints_tested"].append(endpoint["name"])
                        health_data["response_times"][endpoint["name"]] = round(response_time, 2)
                        if response.status == 200:
                            health_data["successful_endpoints"] += 1
                            health_data["api_accessible"] = True
                        else:
                            health_data["failed_endpoints"] += 1
                            health_data["errors"].append({
                                "endpoint": endpoint["name"],
                                "status": response.status,
                                "error": f"HTTP {response.status}"
                            })
                except Exception as e:
                    health_data["failed_endpoints"] += 1
                    health_data["errors"].append({
                        "endpoint": endpoint["name"],
                        "error": str(e)
                    })
                    logger.error(f"{endpoint['name']} test başarısız: {str(e)}")
            health_data["overall_health"] = "healthy" if health_data["successful_endpoints"] > 0 else "degraded"
            logger.info("NASA services health check tamamlandı", 
                       health=health_data["overall_health"],
                       successful=health_data["successful_endpoints"],
                       failed=health_data["failed_endpoints"])
            return health_data
        except Exception as e:
            logger.error(f"Health check başarısız: {str(e)}")
            return {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "overall_health": "unhealthy",
                "error": str(e),
                "api_accessible": False
            }
    async def get_neo_feed(
        self, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None,
        detailed: bool = False
    ) -> Dict[str, Any]:
        try:
            if not start_date:
                start_date = datetime.now().strftime('%Y-%m-%d')
            if not end_date:
                end_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
            await self._rate_limit()
            params = {
                "start_date": start_date,
                "end_date": end_date,
                "api_key": settings.NASA_API_KEY,
                "detailed": str(detailed).lower()
            }
            url = f"{NASA_BASE_URL}/neo/rest/v1/feed"
            session = await self._get_session()
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"NEO Feed error {response.status}: {error_text}")
                    return {"error": f"HTTP {response.status}", "status": "failed"}
                data = await response.json()
                logger.info(f"NEO Feed başarılı: {start_date} - {end_date}")
                return {
                    "status": "success",
                    "data": data,
                    "element_count": data.get("element_count", 0)
                }
        except Exception as e:
            logger.error(f"NEO Feed çekme hatası: {str(e)}")
            return {"error": str(e), "status": "failed"}
    async def get_sentry_paged(
        self, 
        page: int = 0, 
        size: int = 20,
        filters: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        # Fetch ALL sentry data (it's small enough, ~1500 items)
        # Cache it, calculate stats, and return paginated slice
        cache_key = "sentry_full_data"
        cached = await self.cache.get(cache_key)
        
        data = []
        if cached:
            data = cached
        else:
            try:
                # Need to use CNEOS Sentry API
                # "all=1" fetches the full list. If fails, we might try removing it or checking docs.
                url = f"{SSD_BASE_URL}/sentry.api"
                params = {"all": "1"} 
                session = await self._get_session()
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        json_data = await response.json()
                        data = json_data.get("data", [])
                        await self.cache.set(cache_key, data)
                    else:
                        logger.error(f"Sentry API error: {response.status}")
                        return {"error": "NASA Sentry API unreachable", "items": [], "total": 0, "stats": {}}
            except Exception as e:
                logger.error(f"Sentry fetch error: {str(e)}")
                return {"error": str(e), "items": [], "total": 0, "stats": {}}

        # Process items first to apply filtering
        mapped_items = []
        
        # Calculate Stats for FILTERED items
        stats = {"critical": 0, "high": 0, "medium": 0, "low": 0, "none": 0}
        
        for item in data:
            # Sentry data fields mapping (based on API docs)
            # h: Absolute Magnitude (use to estimate diameter if missing)
            
            palermo_str = str(item.get("ps_cum", "-10"))
            palermo = float(palermo_str) if palermo_str and palermo_str != "None" else -10.0
            
            impact_prob_str = str(item.get("ip", "0"))
            impact_prob = float(impact_prob_str) if impact_prob_str and impact_prob_str != "None" else 0.0
            
            diameter_str = str(item.get("diameter", "0"))
            diameter = 0.0
            if diameter_str and diameter_str != "None" and float(diameter_str) > 0:
                diameter = float(diameter_str)
            else:
                # Estimate diameter from Absolute Magnitude (H)
                # D = 1329 / sqrt(p) * 10^(-0.2 * H)
                # Assuming geometric albedo p = 0.14 (standard assumption)
                h_str = str(item.get("h", "0"))
                if h_str and h_str != "None":
                    try:
                        h_val = float(h_str)
                        if h_val > 0:
                            diameter = 3.552 * (10 ** (-0.2 * h_val))
                    except:
                        diameter = 0.0
            
            velocity_str = str(item.get("v_inf", "0"))
            velocity = float(velocity_str) if velocity_str and velocity_str != "None" else 0.0

            # Risk Logic
            risk_level = "low" 
            if palermo >= 0: risk_level = "critical"
            elif palermo >= -2: risk_level = "high"
            elif palermo >= -4: risk_level = "medium"
            
            if impact_prob > 1e-2 and risk_level == "low":
                risk_level = "medium"
            
            # Calculate stats only for filtered items
            # ... (filtering logic below)
            if filters:
                # Risk Filter
                # If risk filter is provided AND not empty, apply it.
                # If empty list [], it implies "no filter" -> show all
                if filters.get("risk") and len(filters["risk"]) > 0 and risk_level not in filters["risk"]:
                    continue
                
                # Diameter Filter
                min_d = filters.get("min_diameter_km")
                max_d = filters.get("max_diameter_km")
                if min_d is not None and diameter < min_d: continue
                if max_d is not None and diameter > max_d: continue
                
                # Name/ID Search (q)
                q = filters.get("q")
                if q:
                    name = item.get("fullname", "").lower()
                    des = item.get("des", "").lower()
                    if q.lower() not in name and q.lower() not in des:
                        continue

            # Add to list only if passed filters
            stats[risk_level] += 1
            
            # Use designation as neoId if available, fallback to id
            # This is crucial because NeoWs expects designations or SPK-IDs
            neo_id = str(item.get("des", "")).strip() or str(item.get("id", "")).replace(")", "").replace("(", "")
            
            mapped_items.append({
                "neoId": neo_id,
                "name": item.get("fullname"),
                "risk_level": risk_level,
                "impact_probability": impact_prob,
                "palermo": palermo,
                "diameter_min_km": diameter * 0.9, # Estimate range
                "diameter_max_km": diameter * 1.1, # Estimate range
                "next_approach": {
                    "distance_ld": 0, # Sentry list doesn't have current distance. Set 0 or handle in frontend.
                    "distance_au": 0,
                    "relative_velocity_kms": velocity,
                    "timestamp": (item.get("range", "2025-2100").split("-")[0] if "-" in str(item.get("range")) else str(item.get("range"))) + "-01-01"
                }
            })
            
        # Sort by Palermo Scale (Descending - Most Dangerous First)
        mapped_items.sort(key=lambda x: x["palermo"], reverse=True)
        
        # Pagination
        total = len(mapped_items)
        start = page * size
        end = start + size
        paged_items = mapped_items[start:end]
        
        return {
            "status": "success",
            "items": paged_items,
            "total": total,
            "stats": stats
        }

    async def get_neo_browse(self, page: int = 0, size: int = 20) -> Dict[str, Any]:
        try:
            await self._rate_limit()
            url = f"{NASA_BASE_URL}/neo/rest/v1/neo/browse"
            params = {
                "page": page,
                "size": size,
                "api_key": settings.NASA_API_KEY
            }
            session = await self._get_session()
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"NEO Browse error {response.status}: {error_text}")
                    return {"error": f"HTTP {response.status}", "status": "failed"}
                data = await response.json()
                logger.info(f"NEO Browse başarılı: sayfa {page}")
                return {
                    "status": "success",
                    "data": data,
                    "element_count": data.get("page", {}).get("total_elements", 0)
                }
        except Exception as e:
            logger.error(f"NEO Browse çekme hatası: {str(e)}")
            return {"error": str(e), "status": "failed"}

    async def get_neo_details_fallback(self, identifier: str) -> Dict[str, Any]:
        """
        Fallback method to get NEO details using JPL SBDB API.
        Useful when NeoWs doesn't find the object by its Sentry ID or designation.
        """
        try:
            # Use SBDB API which is more robust for Sentry objects
            # sstr = identifier
            url = f"{SSD_BASE_URL}/sbdb.api"
            params = {
                "sstr": identifier,
                "phys": "1",
                "orbit": "1",
                "full_prec": "1"
            }
            
            await self._rate_limit()
            session = await self._get_session()
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    return {"error": f"SBDB API error {response.status}", "status": "failed"}
                
                data = await response.json()
                
                # Convert SBDB format to NeoWs format (as much as possible)
                if "object" not in data:
                    return {"error": "Object not found in SBDB", "status": "not_found"}

                obj = data.get("object", {})
                phys = {p["name"]: p for p in data.get("phys_par", [])}
                orbit = data.get("orbit", {})
                
                # Extract diameter from phys params
                diameter_km = 0.0
                if "diameter" in phys:
                    diameter_km = float(phys["diameter"].get("value", 0))
                elif "H" in phys:
                     # Estimate from H if diameter is missing
                     h_val = float(phys["H"].get("value", 0))
                     diameter_km = 3.552 * (10 ** (-0.2 * h_val)) if h_val > 0 else 0

                # Construct result matching NeoWs structure partly
                return {
                    "status": "success",
                    "data": {
                        "id": obj.get("spkid", identifier),
                        "neo_reference_id": obj.get("spkid"),
                        "name": obj.get("fullname", identifier),
                        "designation": obj.get("des", identifier),
                        "nasa_jpl_url": f"https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr={identifier}",
                        "absolute_magnitude_h": float(phys.get("H", {}).get("value", 0)) if "H" in phys else None,
                        "estimated_diameter": {
                            "kilometers": {
                                "estimated_diameter_min": diameter_km * 0.9,
                                "estimated_diameter_max": diameter_km * 1.1
                            }
                        },
                        "is_potentially_hazardous_asteroid": data.get("object", {}).get("pha", "N") == "Y",
                        "close_approach_data": [], # SBDB details doesn't include approaches in this call usually, requires separate CAD call
                        "orbital_data": {
                            "orbit_id": orbit.get("id"),
                            "orbit_determination_date": orbit.get("first_obs"), # Approx
                            "orbital_period": orbit.get("elements", {}).get("per", {}).get("value"), # days
                            "perihelion_distance": orbit.get("elements", {}).get("q", {}).get("value"), # AU
                            "aphelion_distance": orbit.get("elements", {}).get("ad", {}).get("value"), # AU
                            "eccentricity": orbit.get("elements", {}).get("e", {}).get("value"),
                            "inclination": orbit.get("elements", {}).get("i", {}).get("value"),
                            "orbit_class": {
                                "orbit_class_type": obj.get("orbit_class", {}).get("name", "Unknown"),
                                "orbit_class_description": obj.get("orbit_class", {}).get("code", "")
                            }
                        }
                    }
                }
        except Exception as e:
            logger.error(f"SBDB fallback error for {identifier}: {str(e)}")
            return {"error": str(e), "status": "failed"}

    async def get_neo_by_id(self, asteroid_id: str) -> Dict[str, Any]:
        try:
            await self._rate_limit()
            # Try NeoWs first
            url = f"{NASA_BASE_URL}/neo/rest/v1/neo/{asteroid_id}"
            params = {"api_key": settings.NASA_API_KEY}
            session = await self._get_session()
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"NEO detayı başarılı: {asteroid_id}")
                    return {
                        "status": "success",
                        "data": data
                    }
                elif response.status == 404:
                    # Try Fallback to SBDB
                    logger.info(f"NeoWs 404 for {asteroid_id}, trying SBDB fallback...")
                    return await self.get_neo_details_fallback(asteroid_id)
                else:
                    error_text = await response.text()
                    logger.error(f"NEO by ID error {response.status}: {error_text}")
                    return {"error": f"HTTP {response.status}", "status": "failed"}

        except Exception as e:
            logger.error(f"NEO ID çekme hatası: {str(e)}")
            # One last try with fallback if exception was client side or weird
            return await self.get_neo_details_fallback(asteroid_id)
    async def get_sentry_data(self, all_data: bool = True) -> Dict[str, Any]:
        try:
            await self._rate_limit(1.0)
            params = {"all": "true" if all_data else "false"}
            session = await self._get_session()
            async with session.get(SENTRY_API_URL, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Sentry API error {response.status}: {error_text}")
                    return {"error": f"HTTP {response.status}", "status": "failed"}
                data = await response.json()
                count = len(data.get("data", []))
                logger.info(f"Sentry data başarılı: {count} risk objesi")
                return {
                    "status": "success",
                    "data": data,
                    "count": count
                }
        except Exception as e:
            logger.error(f"Sentry data çekme hatası: {str(e)}")
            return {"error": str(e), "status": "failed"}
    async def get_close_approach_data(
        self,
        date_min: Optional[str] = None,
        date_max: Optional[str] = None,
        dist_max: Optional[float] = 0.05
    ) -> Dict[str, Any]:
        try:
            await self._rate_limit(0.7)
            if not date_min:
                date_min = datetime.now().strftime('%Y-%m-%d')
            if not date_max:
                date_max = (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')
            params = {
                "date-min": date_min,
                "date-max": date_max,
                "dist-max": str(dist_max),
                "sort": "date"
            }
            session = await self._get_session()
            async with session.get(CAD_API_URL, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"CAD API error {response.status}: {error_text}")
                    return {"error": f"HTTP {response.status}", "status": "failed"}
                data = await response.json()
                count = len(data.get("data", []))
                logger.info(f"Close approach data başarılı: {count} yaklaşma")
                return {
                    "status": "success",
                    "data": data,
                    "count": count
                }
        except Exception as e:
            logger.error(f"Close approach data çekme hatası: {str(e)}")
            return {"error": str(e), "status": "failed"}
    async def get_apod(self, date: Optional[str] = None) -> Dict[str, Any]:
        try:
            await self._rate_limit()
            params = {"api_key": settings.NASA_API_KEY}
            if date:
                params["date"] = date
            url = f"{NASA_BASE_URL}/planetary/apod"
            session = await self._get_session()
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"APOD error {response.status}: {error_text}")
                    return {"error": f"HTTP {response.status}", "status": "failed"}
                data = await response.json()
                logger.info(f"APOD başarılı: {date or 'bugün'}")
                return {
                    "status": "success",
                    "data": data
                }
        except Exception as e:
            logger.error(f"APOD çekme hatası: {str(e)}")
            return {"error": str(e), "status": "failed"}
    async def get_simple_asteroids(self, days_ahead: int = 7) -> list:
        
        try:
            feed_result = await self.get_neo_feed(
                start_date=datetime.now().strftime('%Y-%m-%d'),
                end_date=(datetime.now() + timedelta(days=days_ahead)).strftime('%Y-%m-%d')
            )
            
            if feed_result.get("status") != "success":
                logger.warning("NEO feed başarısız, boş liste döndürülüyor")
                return []
            
            data = feed_result.get("data", {})
            near_earth_objects = data.get("near_earth_objects", {})
            
            asteroids = []
            for date, objects in near_earth_objects.items():
                for obj in objects:
                    asteroids.append({
                        "id": obj.get("id"),
                        "name": obj.get("name"),
                        "is_hazardous": obj.get("is_potentially_hazardous_asteroid", False),
                        "diameter_km": obj.get("estimated_diameter", {}).get("kilometers", {}).get("estimated_diameter_max", 0),
                        "close_approach_date": obj.get("close_approach_data", [{}])[0].get("close_approach_date", date),
                        "miss_distance_km": float(obj.get("close_approach_data", [{}])[0].get("miss_distance", {}).get("kilometers", 0)),
                        "velocity_kms": float(obj.get("close_approach_data", [{}])[0].get("relative_velocity", {}).get("kilometers_per_second", 0))
                    })
            
            logger.info(f"Simple asteroids listesi hazırlandı: {len(asteroids)} asteroid")
            return asteroids
        except Exception as e:
            logger.error(f"Simple asteroids hazırlama hatası: {str(e)}")
            return []

    async def get_simple_earth_events(self, limit: int = 10) -> list:
        
        try:
            session = await self._get_session()
            eonet_url = "https://eonet.gsfc.nasa.gov/api/v3/events"
            params = {"limit": min(limit, 20), "status": "open"}
            
            async with session.get(eonet_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    eonet_events = data.get("events", [])
                    events = []
                    for event in eonet_events:
                        events.append({
                            "id": event.get("id"),
                            "title": event.get("title"),
                            "category": event.get("categories", [{}])[0].get("title") if event.get("categories") else "Unknown",
                            "date": event.get("geometry", [{}])[-1].get("date") if event.get("geometry") else None,
                            "coordinates": event.get("geometry", [{}])[-1].get("coordinates") if event.get("geometry") else None
                        })
                    logger.info(f"Simple earth events listesi hazirlandi: {len(events)} olay")
                    return events
                else:
                    logger.warning(f"EONET API returned status {response.status}")
                    return []
        except Exception as e:
            logger.error(f"Simple earth events hazirlama hatasi: {str(e)}")
            return []

    async def get_earth_events(self, limit: int = 100, category: Optional[str] = None) -> Dict[str, Any]:
        
        try:
            session = await self._get_session()
            eonet_url = "https://eonet.gsfc.nasa.gov/api/v3/events"
            params = {"limit": min(limit, 100), "status": "open"}
            if category:
                params["category"] = category
            
            events = []
            async with session.get(eonet_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    eonet_events = data.get("events", [])
                    for event in eonet_events:
                        events.append({
                            "event_id": event.get("id"),
                            "title": event.get("title"),
                            "description": event.get("description"),
                            "categories": event.get("categories", []),
                            "event_date": event.get("geometry", [{}])[-1].get("date") if event.get("geometry") else None,
                            "geometry": event.get("geometry", []),
                            "sources": event.get("sources", [])
                        })
                    logger.info(f"EONET API'den {len(eonet_events)} event cekildi")
            
            logger.info(f"Earth events listesi hazirlandi: {len(events)} olay (kategori: {category})")
            return {
                "status": "success",
                "count": len(events),
                "events": events
            }
        except Exception as e:
            logger.error(f"Earth events çekme hatası: {str(e)}")
            return {
                "status": "failed",
                "error": str(e),
                "count": 0,
                "events": []
            }

nasa_services = NASAServices()

async def close_client():
    await nasa_services.close_session()

def get_nasa_services() -> NASAServices:
    return nasa_services

async def get_full_nasa_service() -> NASAServices:
    return nasa_services

class SimplifiedNASAServices:
    def __init__(self):
        self.nasa_base_url = "https://api.nasa.gov"
        self.ssd_base_url = "https://ssd-api.jpl.nasa.gov"
        self.api_key = settings.NASA_API_KEY
        self.session: Optional[httpx.AsyncClient] = None
        self.cache = InMemoryCache(ttl=300)
    async def _get_session(self) -> httpx.AsyncClient:
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=30.0)
        return self.session
    async def close_client(self):
        if self.session:
            await self.session.aclose()
            self.session = None
    async def get_neo_feed(self, days: int = 7) -> Dict[str, Any]:
        cache_key = f"neo_feed_{days}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        try:
            start_date = datetime.now().strftime('%Y-%m-%d')
            end_date = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')
            url = f"{self.nasa_base_url}/neo/rest/v1/feed"
            params = {
                "start_date": start_date,
                "end_date": end_date,
                "api_key": self.api_key
            }
            session = await self._get_session()
            response = await session.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            await self.cache.set(cache_key, data)
            logger.info(f"NEO feed çekildi: {days} gün, {data.get('element_count', 0)} element")
            return data
        except Exception as e:
            logger.error(f"NEO feed hatası: {str(e)}")
            raise
    async def get_sentry_summary(self) -> Dict[str, Any]:
        cache_key = "sentry_summary"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        try:
            url = f"{self.ssd_base_url}/sentry.api"
            session = await self._get_session()
            response = await session.get(url)
            response.raise_for_status()
            data = response.json()
            await self.cache.set(cache_key, data)
            logger.info(f"Sentry summary çekildi: {data.get('count', 0)} obje")
            return data
        except Exception as e:
            logger.error(f"Sentry summary hatası: {str(e)}")
            raise
    async def get_close_approaches(self, days: int = 60) -> Dict[str, Any]:
        cache_key = f"close_approaches_{days}"
        cached = await self.cache.get(cache_key)
        if cached:
            return cached
        try:
            date_min = datetime.now().strftime('%Y-%m-%d')
            date_max = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')
            url = f"{self.ssd_base_url}/cad.api"
            params = {
                "date-min": date_min,
                "date-max": date_max,
                "dist-max": "0.05"
            }
            session = await self._get_session()
            response = await session.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            await self.cache.set(cache_key, data)
            logger.info(f"Close approaches çekildi: {days} gün, {data.get('count', 0)} yaklaşım")
            return data
        except Exception as e:
            logger.error(f"Close approaches hatası: {str(e)}")
            raise
simplified_nasa_services = SimplifiedNASAServices()

def get_simplified_nasa_services() -> SimplifiedNASAServices:
    return simplified_nasa_services

"""
CLIFF NASA Services - Basitleştirilmiş Versiyon
Kullanıcı dostu NASA API entegrasyonu
"""

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

# Settings import'u ekleniyor
from app.core.config import settings

# Setup logging
logger = structlog.get_logger(__name__)

# SSL context oluştur (production'da kaldırılacak)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# NASA ve SSD/CNEOS API configuration
NASA_BASE_URL = "https://api.nasa.gov"

# SSD/CNEOS API URLs (API key gerektirmez)
SSD_BASE_URL = "https://ssd-api.jpl.nasa.gov"
CAD_API_URL = f"{SSD_BASE_URL}/cad.api"
SENTRY_API_URL = f"{SSD_BASE_URL}/sentry.api"  
SCOUT_API_URL = f"{SSD_BASE_URL}/scout.api"
FIREBALL_API_URL = f"{SSD_BASE_URL}/fireball.api"
NHATS_API_URL = f"{SSD_BASE_URL}/nhats.api"

class InMemoryCache:
    """Simple in-memory cache with Time-To-Live (TTL) support."""
    def __init__(self, ttl: int = 300):
        self._cache: Dict[str, Any] = {}
        self._ttl = ttl  # Time to live in seconds

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
    
    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=30)
            connector = aiohttp.TCPConnector(ssl=ssl_context)  # SSL bypass
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
        """Gelişmiş rate limiting"""
        now = datetime.now()
        time_diff = (now - self._last_request_time).total_seconds()
        
        if time_diff < delay:
            sleep_time = delay - time_diff
            logger.debug(f"Rate limiting: {sleep_time:.2f}s bekliyor")
            await asyncio.sleep(sleep_time)
        
        self._request_count += 1
        self._last_request_time = datetime.now()

    # =============================================================================
    # HEALTH CHECK METHOD
    # =============================================================================
    
    async def health_check(self) -> Dict[str, Any]:
        """
        NASA Services health check
        Test all major NASA API endpoints
        """
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
            
            # Test endpoints
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
                        
                        if response.status == 200:
                            health_data["successful_endpoints"] += 1
                            health_data["api_accessible"] = True
                        else:
                            health_data["failed_endpoints"] += 1
                            health_data["errors"].append(f"{endpoint['name']}: HTTP {response.status}")
                        
                        health_data["endpoints_tested"].append(endpoint["name"])
                        health_data["response_times"][endpoint["name"]] = round(response_time, 2)
                        
                except Exception as e:
                    health_data["failed_endpoints"] += 1
                    health_data["errors"].append(f"{endpoint['name']}: {str(e)}")
                    health_data["endpoints_tested"].append(endpoint["name"])
                
                await asyncio.sleep(0.5)  # Rate limiting between tests
            
            logger.info(f"NASA health check tamamlandı: {health_data['successful_endpoints']}/{len(test_endpoints)} başarılı")
            return health_data
            
        except Exception as e:
            logger.error(f"NASA health check hatası: {str(e)}")
            return {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "api_accessible": False,
                "error": str(e),
                "endpoints_tested": [],
                "successful_endpoints": 0,
                "failed_endpoints": 0
            }

    # =============================================================================
    # NEO FEED METHOD WITH PARAMETERS
    # =============================================================================
    
    async def get_neo_feed(
        self, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        NEO Feed API with custom date parameters
        """
        try:
            if not start_date:
                start_date = datetime.now().strftime('%Y-%m-%d')
            if not end_date:
                end_date = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
            
            session = await self._get_session()
            await self._rate_limit()
            
            params = {
                "start_date": start_date,
                "end_date": end_date,
                "api_key": settings.NASA_API_KEY
            }
            
            url = f"{NASA_BASE_URL}/neo/rest/v1/feed"
            
            logger.debug(f"NEO API çağrısı: {url}")
            logger.debug(f"Parametreler: {params}")
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    # Calculate summary
                    total_objects = 0
                    hazardous_objects = 0
                    for date_key, objects in data.get('near_earth_objects', {}).items():
                        total_objects += len(objects)
                        hazardous_objects += sum(1 for obj in objects if obj.get('is_potentially_hazardous_asteroid', False))
                    
                    logger.info(f"NEO API yanıtı alındı - {len(data.get('near_earth_objects', {}))} günlük veri")
                    
                    return {
                        "success": True,
                        "near_earth_objects": data.get('near_earth_objects', {}),
                        "links": data.get('links', {}),
                        "element_count": data.get('element_count', 0),
                        "summary": {
                            "total_objects": total_objects,
                            "hazardous_objects": hazardous_objects,
                            "date_range": f"{start_date} to {end_date}"
                        }
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"NEO Feed API hatası: HTTP {response.status}")
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}",
                        "details": error_text[:200]
                    }
                    
        except Exception as e:
            logger.error(f"NEO Feed API hatası: {str(e)}")
            return {"success": False, "error": str(e)}

    # =============================================================================
    # NEO LOOKUP BY ID METHOD
    # =============================================================================
    
    async def get_neo_by_id(self, neo_id: str) -> Dict[str, Any]:
        """
        Get specific NEO by ID
        """
        try:
            session = await self._get_session()
            await self._rate_limit()
            
            params = {
                "api_key": settings.NASA_API_KEY
            }
            
            url = f"{NASA_BASE_URL}/neo/rest/v1/neo/{neo_id}"
            
            logger.debug(f"NEO Lookup API çağrısı: {url}")
            logger.debug(f"NEO ID: {neo_id}")
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.info(f"NEO lookup başarılı: {data.get('name', neo_id)}")
                    
                    return {
                        "success": True,
                        "neo_data": data
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"NEO Lookup API hatası: HTTP {response.status}")
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}",
                        "details": error_text[:200]
                    }
                    
        except Exception as e:
            logger.error(f"NEO Lookup API hatası: {str(e)}")
            return {"success": False, "error": str(e)}

    # =============================================================================
    # SPACE WEATHER DATA METHOD
    # =============================================================================
    
    async def get_space_weather_data(self) -> Dict[str, Any]:
        """
        Get space weather data from DONKI API
        """
        try:
            session = await self._get_session()
            await self._rate_limit()
            
            # Get last 7 days of data
            start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            end_date = datetime.now().strftime('%Y-%m-%d')
            
            params = {
                "startDate": start_date,
                "endDate": end_date,
                "api_key": settings.NASA_API_KEY
            }
            
            # Test multiple DONKI endpoints
            endpoints = [
                {"name": "Solar Flares", "endpoint": "FLR"},
                {"name": "Coronal Mass Ejections", "endpoint": "CME"},
                {"name": "Geomagnetic Storms", "endpoint": "GST"}
            ]
            
            space_weather_data = {
                "success": True,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "date_range": f"{start_date} to {end_date}",
                "events": []
            }
            
            for endpoint_info in endpoints:
                try:
                    url = f"{NASA_BASE_URL}/DONKI/{endpoint_info['endpoint']}"
                    
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            
                            for event in data[:5]:  # Limit to 5 events per type
                                space_weather_data["events"].append({
                                    "type": endpoint_info["name"],
                                    "data": event,
                                    "source": f"DONKI {endpoint_info['endpoint']}"
                                })
                        else:
                            logger.warning(f"DONKI {endpoint_info['endpoint']} endpoint failed: HTTP {response.status}")
                            
                except Exception as e:
                    logger.warning(f"DONKI {endpoint_info['endpoint']} endpoint error: {str(e)}")
                    continue
                
                await asyncio.sleep(0.5)  # Rate limiting
            
            logger.info(f"Space weather data retrieved: {len(space_weather_data['events'])} events")
            return space_weather_data
            
        except Exception as e:
            logger.error(f"Space weather API hatası: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "events": []
            }

    # =============================================================================
    # EARTH EVENTS METHOD WITH PARAMETERS
    # =============================================================================
    
    async def get_earth_events(
        self, 
        limit: int = 100, 
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get Earth natural events from EONET
        """
        try:
            session = await self._get_session()
            await self._rate_limit()
            
            params = {
                "status": "open",
                "limit": limit,
                "days": 30
            }
            
            if category:
                params["category"] = category
            
            url = f"{settings.NASA_EONET_URL}/events"
            
            logger.debug(f"EONET API çağrısı: {url}")
            logger.debug(f"Parametreler: {params}")
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    events = data.get("events", [])
                    
                    # Process events for better structure
                    processed_events = []
                    for event in events:
                        processed_event = {
                            "id": event.get("id"),
                            "title": event.get("title"),
                            "description": event.get("description"),
                            "link": event.get("link"),
                            "categories": event.get("categories", []),
                            "sources": event.get("sources", []),
                            "geometry": event.get("geometry", [])
                        }
                        processed_events.append(processed_event)
                    
                    logger.info(f"EONET events retrieved: {len(processed_events)} events")
                    
                    return {
                        "success": True,
                        "events": processed_events,
                        "summary": {
                            "total_events": len(processed_events),
                            "categories_filter": category,
                            "limit": limit
                        }
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"EONET API hatası: HTTP {response.status}")
                    return {
                        "success": False,
                        "error": f"HTTP {response.status}",
                        "details": error_text[:200]
                    }
                    
        except Exception as e:
            logger.error(f"EONET API hatası: {str(e)}")
            return {"success": False, "error": str(e)}

    # ==================== İYİLEŞTİRİLMİŞ SSD/CNEOS API METHODS ====================
    
    async def get_close_approach_data(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        CAD API - Asteroid ve komet yaklaşım verileri (PARAMETRE DESTEĞİ EKLENDİ)
        """
        session = await self._get_session()
        await self._rate_limit()
        
        try:
            # Default parameters if none provided
            if not params:
                params = {
                    'dist-max': '0.05',  # 0.05 AU maksimum mesafe
                    'date-min': datetime.now().strftime('%Y-%m-%d'),
                    'date-max': (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d'),
                    'limit': '20',
                    'sort': 'date'
                }
            
            logger.info(f"CAD API çağrısı: {CAD_API_URL}")
            logger.debug(f"Parametreler: {params}")
            
            async with session.get(CAD_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    logger.info(f"✅ CAD verisi alındı: {count} yaklaşım")
                    return {
                        'success': True,
                        'data': data,
                        'count': count,
                        'source': 'JPL/SSD CAD API',
                        'status_code': response.status
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ CAD API hatası: HTTP {response.status}")
                    logger.error(f"Response: {error_text[:200]}")
                    return {
                        'success': False, 
                        'error': f'HTTP {response.status}',
                        'details': error_text[:200],
                        'status_code': response.status
                    }
                    
        except Exception as e:
            logger.error(f"❌ CAD API çağrı hatası: {str(e)}")
            return {'success': False, 'error': str(e), 'status_code': None}

    async def get_fireball_data(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Fireball API - Atmosferik meteor çarpma verileri (PARAMETRE DESTEĞİ EKLENDİ)
        """
        session = await self._get_session()
        await self._rate_limit()
        
        try:
            # Default parameters if none provided
            if not params:
                params = {'limit': '20', 'sort': '-date'}
            
            logger.info(f"Fireball API çağrısı: {FIREBALL_API_URL}")
            logger.debug(f"Parametreler: {params}")
            
            async with session.get(FIREBALL_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    logger.info(f"✅ Fireball verisi alındı: {count} meteor çarpması")
                    return {
                        'success': True,
                        'data': data,
                        'count': count,
                        'source': 'US Government Sensors',
                        'status_code': response.status
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Fireball API hatası: HTTP {response.status}")
                    logger.error(f"Response: {error_text[:200]}")
                    return {
                        'success': False, 
                        'error': f'HTTP {response.status}',
                        'details': error_text[:200],
                        'status_code': response.status
                    }
                    
        except Exception as e:
            logger.error(f"❌ Fireball API çağrı hatası: {str(e)}")
            return {'success': False, 'error': str(e), 'status_code': None}

    async def get_scout_data(self, tdes: Optional[str] = None, plot: bool = False) -> Dict[str, Any]:
        """
        Scout API - Gerçek zamanlı NEO yörünge ve tehdit verileri (PARAMETRE DESTEĞİ EKLENDİ)
        """
        session = await self._get_session()
        await self._rate_limit()
        
        try:
            params = {}
            if tdes:
                params['tdes'] = tdes
            if plot:
                params['plot'] = '1'
            
            logger.info(f"Scout API çağrısı: {SCOUT_API_URL}")
            logger.debug(f"Parametreler: {params}")
            
            async with session.get(SCOUT_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    logger.info(f"✅ Scout verisi alındı: {count} gerçek zamanlı takip")
                    return {
                        'success': True,
                        'data': data,
                        'count': count,
                        'source': 'CNEOS Scout System',
                        'status_code': response.status
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Scout API hatası: HTTP {response.status}")
                    return {
                        'success': False, 
                        'error': f'HTTP {response.status}',
                        'details': error_text[:200],
                        'status_code': response.status
                    }
                    
        except Exception as e:
            logger.error(f"❌ Scout API çağrı hatası: {str(e)}")
            return {'success': False, 'error': str(e), 'status_code': None}

    async def get_nhats_data(self, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        NHATS API - İnsan erişilebilir NEO verileri (PARAMETRE DESTEĞİ EKLENDİ)
        """
        session = await self._get_session()
        await self._rate_limit()
        
        try:
            # Default parameters if none provided
            if not params:
                params = {}
            
            logger.info(f"NHATS API çağrısı: {NHATS_API_URL}")
            logger.debug(f"Parametreler: {params}")
            
            async with session.get(NHATS_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    logger.info(f"✅ NHATS verisi alındı: {count} erişilebilir NEO")
                    return {
                        'success': True,
                        'data': data,
                        'count': count,
                        'source': 'CNEOS NHATS',
                        'status_code': response.status
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ NHATS API hatası: HTTP {response.status}")
                    return {
                        'success': False, 
                        'error': f'HTTP {response.status}',
                        'details': error_text[:200],
                        'status_code': response.status
                    }
                    
        except Exception as e:
            logger.error(f"❌ NHATS API çağrı hatası: {str(e)}")
            return {'success': False, 'error': str(e), 'status_code': None}

    async def get_sentry_risk_data(self) -> Dict[str, Any]:
        """
        Sentry API - Dünya çarpma risk değerlendirmesi (PARAMETER OPTİMİZE EDİLDİ)
        Test sonucuna göre parametresiz çağrı yapılacak
        """
        session = await self._get_session()
        await self._rate_limit()
        
        try:
            # Test sonucuna göre parametre kullanmadan deneyelim
            params = {}
            
            logger.info(f"Sentry API çağrısı: {SENTRY_API_URL}")
            logger.debug("Parametresiz çağrı yapılıyor")
            
            async with session.get(SENTRY_API_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    count = len(data.get('data', []))
                    logger.info(f"✅ Sentry risk verisi alındı: {count} tehdit")
                    return {
                        'success': True,
                        'data': data,
                        'count': count,
                        'source': 'CNEOS Sentry System',
                        'status_code': response.status
                    }
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Sentry API hatası: HTTP {response.status}")
                    logger.error(f"Response: {error_text[:200]}")
                    
                    # Farklı parametreler deneyim
                    logger.info("🔄 Alternatif parametreler deneniyor...")
                    
                    # Alternatif 1: mode=summary
                    async with session.get(SENTRY_API_URL, params={'mode': 'summary'}) as alt_response:
                        if alt_response.status == 200:
                            alt_data = await alt_response.json()
                            logger.info("✅ Sentry API - mode=summary başarılı")
                            return {
                                'success': True,
                                'data': alt_data,
                                'count': len(alt_data.get('data', [])),
                                'source': 'CNEOS Sentry System (summary)',
                                'status_code': alt_response.status
                            }
                    
                    return {
                        'success': False, 
                        'error': f'HTTP {response.status}',
                        'details': error_text[:200],
                        'status_code': response.status
                    }
                    
        except Exception as e:
            logger.error(f"❌ Sentry API çağrı hatası: {str(e)}")
            return {'success': False, 'error': str(e), 'status_code': None}

    async def get_comprehensive_ssd_data(self) -> Dict[str, Any]:
        """
        Tüm SSD/CNEOS API'lerinden veri toplama - Paralel çağrı
        """
        try:
            logger.info("🚀 Kapsamlı SSD/CNEOS veri toplama başlıyor...")
            
            # Paralel API çağrıları
            cad_task = self.get_close_approach_data(limit=50)
            sentry_task = self.get_sentry_risk_data()
            scout_task = self.get_scout_data()
            fireball_task = self.get_fireball_data(limit=30)
            nhats_task = self.get_nhats_data()
            
            # Tüm sonuçları bekle
            results = await asyncio.gather(
                cad_task, sentry_task, scout_task, fireball_task, nhats_task,
                return_exceptions=True
            )
            
            cad_data, sentry_data, scout_data, fireball_data, nhats_data = results
            
            # Sonuçları değerlendir
            successful_apis = 0
            total_objects = 0
            
            api_status = {
                'cad': cad_data.get('success', False) if isinstance(cad_data, dict) else False,
                'sentry': sentry_data.get('success', False) if isinstance(sentry_data, dict) else False,
                'scout': scout_data.get('success', False) if isinstance(scout_data, dict) else False,
                'fireball': fireball_data.get('success', False) if isinstance(fireball_data, dict) else False,
                'nhats': nhats_data.get('success', False) if isinstance(nhats_data, dict) else False,
            }
            
            for api_name, status in api_status.items():
                if status:
                    successful_apis += 1
                    # Count objects
                    api_data = eval(f"{api_name}_data")
                    total_objects += api_data.get('count', 0)
            
            logger.info(f"✅ SSD/CNEOS toplama tamamlandı: {successful_apis}/5 API başarılı")
            
            return {
                'success': True,
                'timestamp': datetime.now().isoformat(),
                'api_status': api_status,
                'successful_apis': successful_apis,
                'total_apis': 5,
                'total_objects': total_objects,
                'data': {
                    'cad': cad_data,
                    'sentry': sentry_data,
                    'scout': scout_data,
                    'fireball': fireball_data,
                    'nhats': nhats_data
                },
                'summary': {
                    'close_approaches': cad_data.get('count', 0) if isinstance(cad_data, dict) else 0,
                    'risk_objects': sentry_data.get('count', 0) if isinstance(sentry_data, dict) else 0,
                    'scout_objects': scout_data.get('count', 0) if isinstance(scout_data, dict) else 0,
                    'fireball_events': fireball_data.get('count', 0) if isinstance(fireball_data, dict) else 0,
                    'accessible_neos': nhats_data.get('count', 0) if isinstance(nhats_data, dict) else 0,
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Kapsamlı SSD/CNEOS veri toplama hatası: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def calculate_asteroid_orbital_mechanics(self, asteroid_id: str) -> Dict[str, Any]:
        """
        Asteroid için gelişmiş yörünge mekaniği hesaplaması
        CAD ve Sentry verilerini birleştirerek detaylı analiz
        """
        try:
            # Paralel olarak CAD ve Sentry verilerini al
            cad_task = self.get_close_approach_data(limit=100)
            sentry_task = self.get_sentry_risk_data('O')  # Object details
            neo_task = self.get_asteroid_by_id(asteroid_id)
            
            cad_data, sentry_data, neo_data = await asyncio.gather(
                cad_task, sentry_task, neo_task, return_exceptions=True
            )
            
            # Hesaplamaları yap
            orbital_data = {
                'asteroid_id': asteroid_id,
                'timestamp': datetime.now().isoformat(),
                'sources': {
                    'neo_api': neo_data.get('success', False),
                    'cad_api': cad_data.get('success', False),
                    'sentry_api': sentry_data.get('success', False)
                },
                'orbital_mechanics': {
                    'perihelion_distance': None,
                    'aphelion_distance': None,
                    'eccentricity': None,
                    'inclination': None,
                    'orbital_period': None,
                    'close_approach_data': cad_data.get('data', {}),
                    'risk_assessment': sentry_data.get('data', {}),
                    'threat_level': 'CALCULATING'
                }
            }
            
            logger.info(f"Asteroid {asteroid_id} yörünge hesaplaması tamamlandı")
            return {
                'success': True,
                'data': orbital_data,
                'calculation_method': 'SSD/CNEOS Combined Analysis'
            }
            
        except Exception as e:
            logger.error(f"Yörünge hesaplama hatası {asteroid_id}: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_close_approach_data(self, params: dict) -> Dict[str, Any]:
        """
        Placeholder for Close-Approach Data API.
        """
        logger.warning("get_close_approach_data henüz tam olarak implemente edilmedi.")
        return {"status": "not implemented"}

    async def get_scout_data(self, params: dict) -> Dict[str, Any]:
        """
        Placeholder for Scout API.
        """
        logger.warning("get_scout_data henüz tam olarak implemente edilmedi.")
        return {"status": "not implemented"}

    # Eksik metotları ekle
    async def get_eonet_events(self, limit: int = 100, status: str = 'open') -> Dict[str, Any]:
        """EONET events API wrapper"""
        result = await self.get_earth_events(limit=limit)
        if result.get('success'):
            return {
                'success': True,
                'data': {
                    'events': result.get('events', [])
                }
            }
        return result
    
    async def get_donki_notifications(self, start_date: str, end_date: str, notification_type: str = 'all') -> Dict[str, Any]:
        """DONKI notifications API wrapper"""
        try:
            data = await self.get_simple_space_weather()
            return {
                'success': True,
                'data': [{'messageType': 'DONKI', 'messageBody': f'Space weather event: {item.type}'} for item in data[:10]]
            }
        except:
            return {'success': False, 'data': []}
    
    async def get_solar_flares(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Solar flares API wrapper"""
        try:
            data = await self.get_simple_space_weather()
            flares = [item for item in data if item.type == 'Güneş Patlaması']
            return {
                'success': True,
                'data': [{'flrID': item.id, 'classType': item.intensity, 'beginTime': item.start_time.isoformat()} for item in flares]
            }
        except:
            return {'success': False, 'data': []}
    
    async def get_coronal_mass_ejections(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """CME API wrapper"""
        try:
            data = await self.get_simple_space_weather()
            cmes = [item for item in data if 'CME' in item.type or 'Koronal' in item.type]
            return {
                'success': True,
                'data': [{'activityID': item.id, 'startTime': item.start_time.isoformat()} for item in cmes]
            }
        except:
            return {'success': False, 'data': []}

# =============================================================================
# BASIT PYDANTIC MODELS - KULLANICI DOSTU
# =============================================================================

class SimpleAsteroid(BaseModel):
    """Basitleştirilmiş asteroit modeli"""
    id: str = Field(..., description="Asteroit ID")
    name: str = Field(..., description="Asteroit adı")
    is_hazardous: bool = Field(default=False, description="Tehlikeli mi?")
    diameter_km: Optional[float] = Field(None, description="Çap (km)")
    approach_date: Optional[str] = Field(None, description="Yaklaşma tarihi")
    distance_km: Optional[float] = Field(None, description="Mesafe (km)")
    velocity_kmh: Optional[float] = Field(None, description="Hız (km/h)")
    threat_level: str = Field(default="Düşük", description="Tehdit seviyesiini belirler")
    orbital_data: Optional[Dict[str, Any]] = Field(None, description="Yörünge verileri")
    
    def get(self, key: str, default=None):
        """Dict-like get method for backward compatibility"""
        return getattr(self, key, default)


class SimpleEarthEvent(BaseModel):
    """Basitleştirilmiş doğal olay modeli"""
    id: str = Field(..., description="Olay ID")
    title: str = Field(..., description="Olay başlığı")
    category: str = Field(..., description="Olay kategorisi")
    date: str = Field(..., description="Olay tarihi")
    location: Optional[str] = Field(None, description="Konum")
    severity: str = Field(default="Düşük", description="Önem derecesi: Düşük, Orta, Yüksek")
    description: Optional[str] = Field(None, description="Açıklama")
    
    def get(self, key: str, default=None):
        """Dict-like get method for backward compatibility"""
        return getattr(self, key, default)


class SimpleSpaceWeather(BaseModel):
    """Basitleştirilmiş uzay hava durumu"""
    id: str = Field(..., description="Olay ID")
    type: str = Field(..., description="Olay türü")
    start_time: datetime = Field(..., description="Başlangıç zamanı")
    intensity: str = Field(default="Düşük", description="Şiddet: Düşük, Orta, Yüksek")
    impact: Optional[str] = Field(None, description="Etki açıklaması")
    
    def get(self, key: str, default=None):
        """Dict-like get method for backward compatibility"""
        return getattr(self, key, default)


class ThreatSummary(BaseModel):
    """Basit tehdit özeti"""
    overall_level: str = Field(..., description="Genel seviye: Düşük, Orta, Yüksek")
    asteroid_count: int = Field(default=0, description="Asteroit sayısı")
    earth_events_count: int = Field(default=0, description="Doğal olay sayısı")
    space_weather_count: int = Field(default=0, description="Uzay hava olayı sayısı")
    last_updated: datetime = Field(default_factory=datetime.utcnow, description="Son güncelleme")
    recommendations: List[str] = Field(default_factory=list, description="Öneriler")
    
    def get(self, key: str, default=None):
        """Dict-like get method for backward compatibility"""
        return getattr(self, key, default)


# =============================================================================
# BASITLEŞTIRILMIŞ NASA SERVICES CLIENT
# =============================================================================

class SimplifiedNASAServices:
    """
    Basitleştirilmiş NASA API istemcisi - Kullanıcı dostu
    """
    
    def __init__(self):
        self.http_client = None
        self.api_key = settings.NASA_API_KEY
        self.cache = InMemoryCache(ttl=300) # 5 minute cache
        self.base_headers = {
            "User-Agent": "CLIFF-App/2.0.0",
            "Accept": "application/json",
        }
        self._initialize_client()
    
    def _initialize_client(self):
        """HTTP client başlat"""
        try:
            self.http_client = httpx.AsyncClient(
                headers=self.base_headers,
                timeout=20.0,
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=50),
            )
            logger.info("NASA servisleri başlatıldı")
        except Exception as e:
            logger.error(f"NASA client başlatılamadı: {str(e)}")
            raise
    
    async def close_client(self):
        """HTTP client kapat"""
        if self.http_client:
            await self.http_client.aclose()
    
    def _add_api_key(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """API key ekle"""
        if self.api_key and self.api_key != "DEMO_KEY":
            params["api_key"] = self.api_key
        return params

    # =============================================================================
    # BASITLEŞTIRILMIŞ NEO FEED
    # =============================================================================
    
    async def get_simple_asteroids(
        self,
        days_ahead: int = 7
    ) -> List[SimpleAsteroid]:
        """
        Basit asteroit listesi al - NASA NEO Feed API
        Dokümantasyona göre: GET /neo/rest/v1/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&api_key=API_KEY
        """
        cache_key = f"simple_asteroids_{days_ahead}"
        cached_data = await self.cache.get(cache_key)
        if cached_data:
            return cached_data

        try:
            start_date = datetime.utcnow()
            # Maksimum 7 gün - NASA API sınırı
            end_date = start_date + timedelta(days=min(days_ahead, 7))
            
            # NASA dokümantasyonuna göre sadece bu parametreler geçerli
            params = {
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
            }
            params = self._add_api_key(params)
            
            url = f"{settings.NASA_NEOWS_URL}/feed"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"NEO API çağrısı: {url}")
            logger.debug(f"Parametreler: {params}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            asteroids = []
            
            logger.info(f"NEO API yanıtı alındı - {len(data.get('near_earth_objects', {}))} günlük veri")
            
            # NASA response formatı: {"near_earth_objects": {"2025-10-04": [...], "2025-10-05": [...]}}
            for date_str, objects in data.get("near_earth_objects", {}).items():
                logger.debug(f"{date_str} tarihinde {len(objects)} asteroit")
                
                for obj in objects[:15]:  # Günlük maksimum 15 asteroit
                    try:
                        # Çap bilgisi
                        diameter = None
                        if obj.get("estimated_diameter", {}).get("kilometers"):
                            diameter = obj["estimated_diameter"]["kilometers"].get("estimated_diameter_max", 0)
                        
                        # Yaklaşma verileri - close_approach_data bir liste
                        distance_km = None
                        velocity_kmh = None
                        
                        if obj.get("close_approach_data") and len(obj["close_approach_data"]) > 0:
                            approach = obj["close_approach_data"][0]
                            if approach.get("miss_distance", {}).get("kilometers"):
                                distance_km = float(approach["miss_distance"]["kilometers"])
                            if approach.get("relative_velocity", {}).get("kilometers_per_hour"):
                                velocity_kmh = float(approach["relative_velocity"]["kilometers_per_hour"])
                        
                        # Tehdit seviyesi hesaplama (İYİLEŞTİRİLMİŞ)
                        threat_level = "Düşük"
                        is_hazardous = obj.get("is_potentially_hazardous_asteroid", False)
                        
                        if is_hazardous:
                            # Orta seviye varsayılan
                            threat_level = "Orta"
                            # Yüksek seviye koşulları
                            if distance_km and diameter and velocity_kmh:
                                if distance_km < 7500000 and (diameter > 0.5 or velocity_kmh > 72000):
                                    threat_level = "Yüksek"
                        
                        asteroid = SimpleAsteroid(
                            id=obj.get("id", "unknown"),
                            name=obj.get("name", "Bilinmeyen Asteroit"),
                            is_hazardous=is_hazardous,
                            diameter_km=diameter,
                            approach_date=date_str,
                            distance_km=distance_km,
                            velocity_kmh=velocity_kmh,
                            threat_level=threat_level,
                            orbital_data=obj.get("orbital_data")
                        )
                        asteroids.append(asteroid)
                        
                    except Exception as e:
                        logger.warning(f"Asteroit verisi işlenemedi: {str(e)}")
                        continue
            
            logger.info(f"Basit asteroit verisi alındı: {len(asteroids)} adet")
            
            # Set cache before returning
            await self.cache.set(cache_key, asteroids)
            return asteroids[:25]  # Maksimum 25 asteroit döndür
            
        except Exception as e:
            logger.error(f"Asteroit verisi alınamadı: {str(e)}")
            logger.error(f"URL: {url}")
            logger.error(f"Params: {params}")
            return []
    
    # =============================================================================
    # ALIAS METHOD - BACKWARD COMPATIBILITY
    # =============================================================================
    
    async def get_asteroids(self, limit: int = 25) -> List[SimpleAsteroid]:
        """
        Backward compatibility alias for get_simple_asteroids
        """
        return await self.get_simple_asteroids(days_ahead=7)
    
    # =============================================================================
    # NEO LOOKUP API - TEK ASTEROİT SORGULAMA
    # =============================================================================
    
    async def get_asteroid_by_id(self, asteroid_id: str) -> Optional[SimpleAsteroid]:
        """
        Belirli bir asteroiti ID ile sorgula - NASA NEO Lookup API
        Dokümantasyona göre: GET /neo/rest/v1/neo/{asteroid_id}?api_key=API_KEY
        """
        try:
            params = {}
            params = self._add_api_key(params)
            
            url = f"{settings.NASA_NEOWS_URL}/neo/{asteroid_id}"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"NEO Lookup API çağrısı: {url}")
            logger.debug(f"Asteroid ID: {asteroid_id}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            obj = response.json()
            
            # Çap bilgisi
            diameter = None
            if obj.get("estimated_diameter", {}).get("kilometers"):
                diameter = obj["estimated_diameter"]["kilometers"].get("estimated_diameter_max", 0)
            
            # İlk yaklaşma verisini al
            distance_km = None
            velocity_kmh = None
            approach_date = None
            
            if obj.get("close_approach_data") and len(obj["close_approach_data"]) > 0:
                approach = obj["close_approach_data"][0]
                approach_date = approach.get("close_approach_date", "")
                if approach.get("miss_distance", {}).get("kilometers"):
                    distance_km = float(approach["miss_distance"]["kilometers"])
                if approach.get("relative_velocity", {}).get("kilometers_per_hour"):
                    velocity_kmh = float(approach["relative_velocity"]["kilometers_per_hour"])
            
            # Tehdit seviyesiini hesaplama
            threat_level = "Düşük"
            is_hazardous = obj.get("is_potentially_hazardous_asteroid", False)
            
            if is_hazardous:
                if distance_km and distance_km < 7500000:  # 7.5M km'den yakın
                    threat_level = "Yüksek"
                else:
                    threat_level = "Orta"
            
            asteroid = SimpleAsteroid(
                id=obj.get("id", asteroid_id),
                name=obj.get("name", f"Asteroit {asteroid_id}"),
                is_hazardous=is_hazardous,
                diameter_km=diameter,
                approach_date=approach_date,
                distance_km=distance_km,
                velocity_kmh=velocity_kmh,
                threat_level=threat_level,
                orbital_data=obj.get("orbital_data")
            )
            
            logger.info(f"Asteroit detayı alındı: {asteroid.name}")
            return asteroid
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                logger.warning(f"Asteroit bulunamadı: {asteroid_id}")
                return None
            else:
                logger.error(f"Asteroit detayı alınamadı ({e.response.status_code}): {str(e)}")
                return None
        except Exception as e:
            logger.error(f"Asteroit detayı hatası: {str(e)}")
            return None
    
    # =============================================================================
    # NEO BROWSE API - GENEL DATASET TARAMA  
    # =============================================================================
    
    async def browse_asteroids(
        self, 
        page: int = 0, 
        size: int = 20
    ) -> Dict[str, Any]:
        """
        Asteroit veritabanını tara - NASA NEO Browse API
        Dokümantasyona göre: GET /neo/rest/v1/neo/browse?api_key=API_KEY&page=0&size=20
        """
        try:
            params = {
                "page": page,
                "size": min(size, 20)  # Maksimum 20 kayıt
            }
            params = self._add_api_key(params)
            
            url = f"{settings.NASA_NEOWS_URL}/neo/browse"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"NEO Browse API çağrısı: {url}")
            logger.debug(f"Sayfa: {page}, Boyut: {size}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            asteroids = []
            
            # Browse API response formatı farklı
            for obj in data.get("near_earth_objects", []):
                try:
                    # Çap bilgisi
                    diameter = None
                    if obj.get("estimated_diameter", {}).get("kilometers"):
                        diameter = obj["estimated_diameter"]["kilometers"].get("estimated_diameter_max", 0)
                    
                    # İlk yaklaşma verisini al (eğer varsa)
                    distance_km = None
                    velocity_kmh = None
                    approach_date = None
                    
                    if obj.get("close_approach_data") and len(obj["close_approach_data"]) > 0:
                        approach = obj["close_approach_data"][0]
                        approach_date = approach.get("close_approach_date", "")
                        if approach.get("miss_distance", {}).get("kilometers"):
                            distance_km = float(approach["miss_distance"]["kilometers"])
                        if approach.get("relative_velocity", {}).get("kilometers_per_hour"):
                            velocity_kmh = float(approach["relative_velocity"]["kilometers_per_hour"])
                    
                    # Tehdit seviyesi hesaplama
                    threat_level = "Düşük"
                    is_hazardous = obj.get("is_potentially_hazardous_asteroid", False)
                    
                    if is_hazardous:
                        if distance_km and distance_km < 7500000:  # 7.5M km'den yakın
                            threat_level = "Yüksek"
                        else:
                            threat_level = "Orta"
                    
                    asteroid = SimpleAsteroid(
                        id=obj.get("id", "unknown"),
                        name=obj.get("name", "Bilinmeyen Asteroit"),
                        is_hazardous=is_hazardous,
                        diameter_km=diameter,
                        approach_date=approach_date,
                        distance_km=distance_km,
                        velocity_kmh=velocity_kmh,
                        threat_level=threat_level,
                        orbital_data=obj.get("orbital_data")
                    )
                    asteroids.append(asteroid)
                    
                except Exception as e:
                    logger.warning(f"Browse asteroit verisi işlenemedi: {str(e)}")
                    continue
            
            # Pagination bilgisini de döndür
            result = {
                "asteroids": asteroids,
                "pagination": {
                    "page": data.get("page", {}).get("number", page),
                    "size": data.get("page", {}).get("size", size),
                    "total_elements": data.get("page", {}).get("total_elements", 0),
                    "total_pages": data.get("page", {}).get("total_pages", 1)
                },
                "links": data.get("links", {})
            }
            
            logger.info(f"Browse API - {len(asteroids)} asteroit listelendi (sayfa {page})")
            return result
            
        except Exception as e:
            logger.error(f"Browse API hatası: {str(e)}")
            return {
                "asteroids": [],
                "pagination": {"page": page, "size": size, "total_elements": 0, "total_pages": 0},
                "links": {}
            }
    
    # =============================================================================
    # BASITLEŞTIRILMIŞ EARTH EVENTS
    # =============================================================================
    
    async def get_earth_events(
        self,
        limit: int = 100,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get Earth natural events from EONET - API endpoint uyumlu format
        """
        try:
            params = {
                "status": "open",
                "limit": limit,
                "days": 30
            }
            
            if category:
                params["category"] = category
            
            url = f"{settings.NASA_EONET_URL}/events"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"EONET API çağrısı: {url}")
            logger.debug(f"Parametreler: {params}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            events = data.get("events", [])
            
            # Process events for better structure
            processed_events = []
            for event in events:
                processed_event = {
                    "id": event.get("id"),
                    "title": event.get("title"),
                    "description": event.get("description"),
                    "link": event.get("link"),
                    "categories": event.get("categories", []),
                    "sources": event.get("sources", []),
                    "geometry": event.get("geometry", [])
                }
                processed_events.append(processed_event)
            
            logger.info(f"EONET events retrieved: {len(processed_events)} events")
            
            return {
                "success": True,
                "events": processed_events,
                "summary": {
                    "total_events": len(processed_events),
                    "categories_filter": category,
                    "limit": limit
                }
            }
            
        except Exception as e:
            logger.error(f"EONET API hatası: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_simple_earth_events(self, limit: int = 20) -> List[SimpleEarthEvent]:
        """
        Basit doğal olay listesi al
        """
        cache_key = f"simple_earth_events_{limit}"
        cached_data = await self.cache.get(cache_key)
        if cached_data:
            return cached_data

        try:
            params = {
                "status": "open",
                "limit": limit,
                "days": 30,
            }
            
            url = f"{settings.NASA_EONET_URL}/events"
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            events = []
            
            for event_data in data.get("events", []):
                try:
                    # Kategoriyi basitleştir
                    category = "Diğer"
                    category_id = None
                    if event_data.get("categories"):
                        cat_title = event_data["categories"][0].get("title", "") if len(event_data["categories"]) > 0 else ""
                        category_id = event_data["categories"][0].get("id", "").lower() if len(event_data["categories"]) > 0 else ""
                        category = cat_title
                    
                    # Önem derecesini belirle (İYİLEŞTİRİLMİŞ)
                    severity = "Düşük"
                    high_sev_cats = ["severeStorms", "volcanoes", "earthquakes"]
                    med_sev_cats = ["wildfires", "floods", "landslides", "seaAndLakeIce"]
                    
                    if category_id in high_sev_cats:
                        severity = "Yüksek"
                    elif category_id in med_sev_cats:
                        severity = "Orta"
                    
                    # Son geometri datasını al (en güncel konum)
                    date_str = ""
                    location = None
                    if event_data.get("geometry"):
                        last_geom = event_data["geometry"][-1]
                        date_str = last_geom.get("date", "")
                        if last_geom.get("coordinates"):
                            coords = last_geom["coordinates"]
                            if isinstance(coords, list) and len(coords) >= 2:
                                location = f"{coords[1]:.2f}, {coords[0]:.2f}"
                    
                    event = SimpleEarthEvent(
                        id=event_data.get("id", "unknown"),
                        title=event_data.get("title", "Bilinmeyen Olay"),
                        category=category,
                        date=date_str[:10] if date_str else "",  # Sadece tarih kısmı
                        location=location,
                        severity=severity,
                        description=event_data.get("description", "")[:200] if event_data.get("description") else None
                    )
                    events.append(event)
                    
                except Exception as e:
                    logger.warning(f"Olay verisi işlenemedi: {str(e)}")
                    continue
            
            logger.info(f"Basit doğal olay verisi alındı: {len(events)} adet")
            
            # Set cache before returning
            await self.cache.set(cache_key, events)
            return events[:20]
            
        except Exception as e:
            logger.error(f"Doğal olay verisi alınamadı: {str(e)}")
            return []
    
    # =============================================================================
    # BASITLEŞTIRILMIŞ SPACE WEATHER
    # =============================================================================
    
    async def get_simple_space_weather(self) -> List[SimpleSpaceWeather]:
        """
        Basit uzay hava durumu al
        """
        cache_key = "simple_space_weather"
        cached_data = await self.cache.get(cache_key)
        if cached_data:
            return cached_data

        try:
            start_date = datetime.utcnow() - timedelta(days=7)
            end_date = datetime.utcnow()
            
            params = {
                "startDate": start_date.strftime("%Y-%m-%d"),
                "endDate": end_date.strftime("%Y-%m-%d"),
            }
            params = self._add_api_key(params)
            
            url = f"{settings.NASA_DONKI_URL}/FLR"
            
            await asyncio.sleep(1.0)  # Rate limiting
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            weather_events = []
            
            for flare_data in data[:10]:  # Maksimum 10 olay
                try:
                    # Şiddeti belirle
                    intensity = "Düşük"
                    class_type = flare_data.get("classType", "")
                    if class_type.startswith("X"):
                        intensity = "Yüksek"
                    elif class_type.startswith("M"):
                        intensity = "Orta"
                    
                    # Etki açıklaması
                    impact = None
                    if intensity == "Yüksek":
                        impact = "Uydu ve iletişim sistemlerinde aksaklık olabilir"
                    elif intensity == "Orta":
                        impact = "Radyo dalgalarında hafif etkiler"
                    else:
                        impact = "Minimal etki"
                    
                    event = SimpleSpaceWeather(
                        id=flare_data.get("flrID", "unknown"),
                        type="Güneş Patlaması",
                        start_time=datetime.fromisoformat(flare_data.get("beginTime", "").replace("Z", "+00:00")),
                        intensity=intensity,
                        impact=impact
                    )
                    weather_events.append(event)
                    
                except Exception as e:
                    logger.warning(f"Uzay hava verisi işlenemedi: {str(e)}")
                    continue
            
            logger.info(f"Basit uzay hava verisi alındı: {len(weather_events)} adet")
            
            # Set cache before returning
            await self.cache.set(cache_key, weather_events)
            return weather_events
            
        except Exception as e:
            logger.error(f"Uzay hava verisi alınamadı: {str(e)}")
            return []
    
    # =============================================================================
    # NASA APOD API - ASTRONOMY PICTURE OF THE DAY
    # =============================================================================
    
    async def get_astronomy_picture_of_day(self, date: Optional[str] = None) -> Dict[str, Any]:
        """
        NASA Astronomy Picture of the Day al
        Dokümantasyona göre: GET https://api.nasa.gov/planetary/apod?api_key=API_KEY&date=YYYY-MM-DD
        """
        try:
            params = {}
            if date:
                params["date"] = date
            params = self._add_api_key(params)
            
            url = "https://api.nasa.gov/planetary/apod"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"APOD API çağrısı: {url}")
            logger.debug(f"Parametreler: {params}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            
            # APOD verisini basitleştir
            apod_data = {
                "title": data.get("title", "Günün Astronomi Resmi"),
                "explanation": data.get("explanation", "Açıklama mevcut değil"),
                "date": data.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
                "media_type": data.get("media_type", "image"),
                "url": data.get("url", ""),
                "hdurl": data.get("hdurl", data.get("url", "")),
                "copyright": data.get("copyright", "NASA")
            }
            
            logger.info(f"APOD verisi alındı: {apod_data['title']} ({apod_data['date']})")
            return apod_data
            
        except Exception as e:
            logger.error(f"APOD verisi alınamadı: {str(e)}")
            return {
                "title": "APOD Verisi Alınamadı",
                "explanation": "Teknik sorun nedeniyle günün astronomi resmi alınamadı",
                "date": datetime.utcnow().strftime("%Y-%m-%d"),
                "media_type": "error",
                "url": "",
                "hdurl": "",
                "copyright": "NASA"
            }
    
    # =============================================================================
    # NASA EPIC API - EARTH POLYCHROMATIC IMAGING CAMERA
    # =============================================================================
    
    async def get_earth_images(self, date: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        NASA EPIC - Dünya'nın uzaydan görüntüleri
        Dokümantasyona göre: GET https://api.nasa.gov/EPIC/api/natural/date/YYYY-MM-DD?api_key=API_KEY
        """
        try:
            if not date:
                date = (datetime.utcnow() - timedelta(days=1)).strftime("%Y-%m-%d")
            
            params = {}
            params = self._add_api_key(params)
            
            url = f"https://api.nasa.gov/EPIC/api/natural/date/{date}"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"EPIC API çağrısı: {url}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            earth_images = []
            
            for img_data in data[:5]:  # İlk 5 görüntü
                try:
                    image_name = img_data.get("image", "")
                    image_date = img_data.get("date", "")
                    
                    # EPIC image URL formatı
                    image_url = f"https://api.nasa.gov/EPIC/archive/natural/{date[:4]}/{date[5:7]}/{date[8:]}/png/{image_name}.png"
                    
                    earth_image = {
                        "image_name": image_name,
                        "date": image_date,
                        "image_url": image_url,
                        "caption": img_data.get("caption", f"Dünya görüntüsü - {date}"),
                        "coordinates": {
                            "centroid_lat": img_data.get("centroid_coordinates", {}).get("lat", 0),
                            "centroid_lon": img_data.get("centroid_coordinates", {}).get("lon", 0)
                        }
                    }
                    earth_images.append(earth_image)
                    
                except Exception as e:
                    logger.warning(f"EPIC görüntü verisi işlenemedi: {str(e)}")
                    continue
            
            logger.info(f"EPIC Dünya görüntüleri alındı: {len(earth_images)} adet ({date})")
            return earth_images
            
        except Exception as e:
            logger.error(f"EPIC verisi alınamadı: {str(e)}")
            return []
    
    # =============================================================================
    # NASA MARS ROVER PHOTOS API
    # =============================================================================
    
    async def get_mars_rover_photos(
        self, 
        rover: str = "curiosity", 
        sol: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Mars Rover fotoğrafları al
        Dokümantasyona göre: GET https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos?sol={sol}&api_key=API_KEY
        """
        try:
            params = {
                "sol": sol
            }
            params = self._add_api_key(params)
            
            url = f"https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos"
            
            await asyncio.sleep(0.5)  # Rate limiting
            
            logger.debug(f"Mars Rover API çağrısı: {url}")
            logger.debug(f"Rover: {rover}, Sol: {sol}")
            
            response = await self.http_client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            mars_photos = []
            
            for photo_data in data.get("photos", [])[:10]:  # İlk 10 fotoğraf
                try:
                    mars_photo = {
                        "photo_id": photo_data.get("id", 0),
                        "img_src": photo_data.get("img_src", ""),
                        "earth_date": photo_data.get("earth_date", ""),
                        "sol": photo_data.get("sol", sol),
                        "camera": {
                            "name": photo_data.get("camera", {}).get("name", "Unknown"),
                            "full_name": photo_data.get("camera", {}).get("full_name", "Unknown Camera")
                        },
                        "rover": {
                            "name": photo_data.get("rover", {}).get("name", rover.title()),
                            "status": photo_data.get("rover", {}).get("status", "active"),
                            "launch_date": photo_data.get("rover", {}).get("launch_date", ""),
                            "landing_date": photo_data.get("rover", {}).get("landing_date", "")
                        }
                    }
                    mars_photos.append(mars_photo)
                    
                except Exception as e:
                    logger.warning(f"Mars fotoğraf verisi işlenemedi: {str(e)}")
                    continue
            
            logger.info(f"Mars Rover fotoğrafları alındı: {len(mars_photos)} adet ({rover}, sol {sol})")
            return mars_photos
            
        except Exception as e:
            logger.error(f"Mars Rover verisi alınamadı: {str(e)}")
            return []
    
    # =============================================================================
    # BASITLEŞTIRILMIŞ THREAT ASSESSMENT
    # =============================================================================
    
    async def get_simple_threat_summary(self) -> ThreatSummary:
        """
        Basit tehdit özeti al
        """
        try:
            logger.info("Basit tehdit özeti hazırlanıyor...")
            
            # Paralel olarak tüm verileri al - days_ahead'i 7'ye düşür
            asteroids, earth_events, space_weather = await asyncio.gather(
                self.get_simple_asteroids(days_ahead=7),  # 14'den 7'ye değiştirildi
                self.get_simple_earth_events(limit=15),
                self.get_simple_space_weather(),
                return_exceptions=True
            )
            
            # Hata kontrolü
            if isinstance(asteroids, Exception):
                logger.error(f"Asteroid verisi hatası: {asteroids}")
                asteroids = []
            if isinstance(earth_events, Exception):
                logger.error(f"Earth events hatası: {earth_events}")
                earth_events = []
            if isinstance(space_weather, Exception):
                logger.error(f"Space weather hatası: {space_weather}")
                space_weather = []
            
            # Genel tehdit seviyesini belirle
            high_threats = 0
            medium_threats = 0
            
            # Asteroitlerden tehdit değerlendirmesi
            for ast in asteroids:
                if ast.threat_level == "Yüksek":
                    high_threats += 1
                elif ast.threat_level == "Orta":
                    medium_threats += 1
            
            # Doğal olaylardan tehdit değerlendirmesi
            for event in earth_events:
                if event.severity == "Yüksek":
                    high_threats += 1
                elif event.severity == "Orta":
                    medium_threats += 1
            
            # Uzay hava durumundan tehdit değerlendirmesi
            for weather in space_weather:
                if weather.intensity == "Yüksek":
                    high_threats += 1
                elif weather.intensity == "Orta":
                    medium_threats += 1
            
            # Genel seviye belirle
            overall_level = "Düşük"
            if high_threats >= 3:
                overall_level = "Yüksek"
            elif high_threats >= 1 or medium_threats >= 5:
                overall_level = "Orta"
            
            # Önerileri hazırla
            recommendations = []
            if overall_level == "Yüksek":
                recommendations = [
                    "Acil durum protokollerini gözden geçirin",
                    "İletişim sistemlerini izleyin",
                    "Uzay hava durumu takibini artırın"
                ]
            elif overall_level == "Orta":
                recommendations = [
                    "Durumu yakından takip edin",
                    "Güncellemeleri düzenli kontrol edin"
                ]
            else:
                recommendations = [
                    "Normal gözlem rutinini sürdürün"
                ]
            
            summary = ThreatSummary(
                overall_level=overall_level,
                asteroid_count=len(asteroids),
                earth_events_count=len(earth_events),
                space_weather_count=len(space_weather),
                last_updated=datetime.utcnow(),
                recommendations=recommendations
            )
            
            logger.info(f"Basit tehdit özeti hazırlandı: {overall_level} seviye")
            return summary
            
        except Exception as e:
            logger.error(f"Tehdit özeti hazırlanamadı: {str(e)}")
            # Varsayılan güvenli değer döndür
            return ThreatSummary(
                overall_level="Düşük",
                recommendations=["Sistem geçici olarak kullanılamıyor"]
            )
    
    # =============================================================================
    # PLACEHOLDER METHODS FOR MISSING ENDPOINTS
    # =============================================================================

    async def get_close_approach_data(self, params: dict) -> Dict[str, Any]:
        """
        Placeholder for Close-Approach Data API.
        """
        logger.warning("get_close_approach_data henüz tam olarak implemente edilmedi.")
        return {"status": "not implemented"}

    async def get_scout_data(self, params: dict) -> Dict[str, Any]:
        """
        Placeholder for Scout API.
        """
        logger.warning("get_scout_data henüz tam olarak implemente edilmedi.")
        return {"status": "not implemented"}

    async def get_nhats_data(self, params: dict) -> Dict[str, Any]:
        """
        Placeholder for NHATS API.
        """
        logger.warning("get_nhats_data henüz tam olarak implemente edilmedi.")
        return {"status": "not implemented"}

# =============================================================================
# GLOBAL INSTANCE VE UTILITY FUNCTIONS
# =============================================================================

# Not: Bu kısım aşağıda SINGLETON INSTANCES bölümünde tanımlanacak
# Burada sadece utility functions olmalı

# Basit durum kontrolü
async def get_simple_space_status() -> Dict[str, Any]:
    """Basit uzay durumu özeti"""
    try:
        summary = await simplified_nasa_services.get_simple_threat_summary()
        
        # Get recommendations list properly
        recs = summary.recommendations if isinstance(summary.recommendations, list) else []
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "OPERATIONAL",
            "threat_level": summary.overall_level,
            "active_objects": summary.asteroid_count + summary.earth_events_count + summary.space_weather_count,
            "recommendations": recs[:2] if len(recs) > 0 else []  # İlk 2 öneri
        }
        
    except Exception as e:
        logger.error(f"Basit uzay durumu alınamadı: {str(e)}")
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "ERROR",
            "message": "Sistem geçici olarak kullanılamıyor"
        }

# AI analizi placeholder - basit versiyon
async def analyze_nasa_data_with_ai(data: Dict[str, Any], data_type: str) -> Dict[str, Any]:
    """
    Basitleştirilmiş AI analizi
    """
    return {
        "threat_level": "Orta",
        "confidence": 0.85,
        "analysis": f"{data_type} verisi analiz edildi",
        "recommendations": ["Durumu yakından takip edin"],
        "analyzed_at": datetime.utcnow().isoformat(),
    }

# =============================================================================
# SINGLETON INSTANCES & DEPENDENCY INJECTION
# =============================================================================

# Tek bir SimplifiedNASAServices instance kullan (full-featured NASA service artık SimplifiedNASAServices)
simplified_nasa_services = SimplifiedNASAServices()

# Geriye dönük uyumluluk için
nasa_services = simplified_nasa_services

def get_full_nasa_service() -> SimplifiedNASAServices:
    """Dependency injector for the NASAServices instance."""
    return simplified_nasa_services

def get_nasa_services() -> SimplifiedNASAServices:
    """NASA services dependency injector."""
    return simplified_nasa_services

def get_simplified_nasa_services() -> SimplifiedNASAServices:
    """Dependency injector for the simplified NASAServices instance."""
    return simplified_nasa_services
"""
🌐 Multi-Source Data Integrator - Çoklu Veri Kaynağı Entegratörü
NASA, ESA, SpaceX ve diğer kaynaklardan veri çekme ve normalleştirme
"""

import asyncio
import aiohttp
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import structlog
from urllib.parse import urljoin, urlencode
import xml.etree.ElementTree as ET

from pydantic import BaseModel, Field

# Internal imports
from .intelligent_threat_processor import ThreatType, intelligent_threat_processor
from .unified_ai_service import unified_ai_service, UnifiedChatRequest
from ..core.config import settings

# Setup logging
logger = structlog.get_logger(__name__)

# Scientific computing imports with fallbacks
try:
    import numpy as np
    numpy_available = True
except ImportError:
    logger.warning("NumPy not available for data processing, using fallback operations")
    np = None
    numpy_available = False

try:
    import pandas as pd
    pandas_available = True
except ImportError:
    logger.warning("Pandas not available for data processing, using simple data structures")
    pd = None
    pandas_available = False


class DataSource(str, Enum):
    """Veri kaynakları"""
    NASA_NEO = "nasa_neo"                   # NASA Near Earth Objects
    NASA_EONET = "nasa_eonet"               # Earth Observatory Natural Event Tracker
    NASA_DONKI = "nasa_donki"               # Space Weather Database
    NASA_SSD = "nasa_ssd"                   # Small-Body Database
    NASA_CNEOS = "nasa_cneos"               # Center for Near Earth Object Studies
    ESA_SSA = "esa_ssa"                     # Space Situational Awareness
    ESA_SPACE_WEATHER = "esa_space_weather" # ESA Space Weather
    SPACEX_API = "spacex_api"               # SpaceX Launch Data
    NOAA_SWPC = "noaa_swpc"                 # NOAA Space Weather Prediction Center
    CELESTRAK = "celestrak"                 # Satellite tracking
    CUSTOM = "custom"                       # Özel veri kaynağı


class DataQuality(str, Enum):
    """Veri kalitesi"""
    EXCELLENT = "excellent"     # 0.9-1.0
    GOOD = "good"              # 0.7-0.9
    FAIR = "fair"              # 0.5-0.7
    POOR = "poor"              # 0.0-0.5


class DataFreshness(str, Enum):
    """Veri güncelliği"""
    REAL_TIME = "real_time"     # <5 minutes
    RECENT = "recent"           # 5min - 1 hour
    CURRENT = "current"         # 1-24 hours
    DATED = "dated"             # >24 hours
    STALE = "stale"             # >1 week


@dataclass
class SourceMetadata:
    """Veri kaynağı metadata'sı"""
    source: DataSource
    api_endpoint: str
    update_frequency: str
    data_format: str  # json, xml, csv
    authentication_required: bool
    
    # Quality metrics
    reliability_score: float = 0.8
    typical_latency_seconds: float = 2.0
    rate_limit: Optional[str] = None
    
    # Status
    last_successful_fetch: Optional[datetime] = None
    consecutive_failures: int = 0
    is_active: bool = True


@dataclass
class RawDataRecord:
    """Ham veri kaydı"""
    record_id: str
    source: DataSource
    data_type: str
    raw_data: Dict[str, Any]
    
    # Timestamps
    fetched_at: datetime
    source_timestamp: Optional[datetime] = None
    
    # Quality assessment
    data_quality: DataQuality = DataQuality.GOOD
    data_freshness: DataFreshness = DataFreshness.CURRENT
    
    # Metadata
    api_version: Optional[str] = None
    processing_notes: List[str] = field(default_factory=list)


@dataclass
class NormalizedThreatData:
    """Normalize edilmiş tehdit verisi"""
    threat_id: str
    source: DataSource
    
    # Core threat information
    threat_type: ThreatType
    title: str
    description: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    
    # Spatial data
    coordinates: Optional[Dict[str, float]] = None  # lat, lng
    affected_region: Optional[str] = None
    affected_radius_km: Optional[float] = None
    
    # Temporal data
    detection_time: datetime = field(default_factory=datetime.now)
    time_to_impact: Optional[datetime] = None
    time_to_impact_hours: Optional[float] = None
    duration_hours: Optional[float] = None
    
    # Risk assessment
    impact_probability: float = 0.1
    confidence_score: float = 0.5
    
    # Source-specific data
    original_data: Dict[str, Any] = field(default_factory=dict)
    data_quality_score: float = 0.7
    
    # Enrichment flags
    needs_ai_analysis: bool = True
    priority_computed: bool = False
    risk_assessed: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Dictionary formatına çevir"""
        result = {
            'threat_id': self.threat_id,
            'source': self.source.value,
            'threat_type': self.threat_type.value,
            'title': self.title,
            'description': self.description,
            'severity': self.severity,
            'detection_time': self.detection_time.isoformat(),
            'impact_probability': self.impact_probability,
            'confidence_score': self.confidence_score,
            'data_quality_score': self.data_quality_score
        }
        
        if self.coordinates:
            result['coordinates'] = self.coordinates
        if self.affected_region:
            result['affected_region'] = self.affected_region
        if self.affected_radius_km:
            result['affected_radius_km'] = self.affected_radius_km
        if self.time_to_impact:
            result['time_to_impact'] = self.time_to_impact.isoformat()
        if self.time_to_impact_hours:
            result['time_to_impact_hours'] = self.time_to_impact_hours
        if self.duration_hours:
            result['duration_hours'] = self.duration_hours
        
        return result


class APIClient:
    """Generic API client"""
    
    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self.nasa_api_key = settings.NASA_API_KEY
        
    async def fetch_data(
        self, 
        url: str, 
        headers: Optional[Dict] = None,
        params: Optional[Dict] = None,
        timeout: int = 30
    ) -> Optional[Dict]:
        """Generic data fetching"""
        try:
            request_headers = headers or {}
            request_params = params or {}
            
            # Add NASA API key if needed
            if 'api.nasa.gov' in url and self.nasa_api_key:
                request_params['api_key'] = self.nasa_api_key
            
            async with self.session.get(
                url, 
                headers=request_headers, 
                params=request_params,
                timeout=aiohttp.ClientTimeout(total=timeout)
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.warning(f"API request failed: {response.status} for {url}")
                    return None
                    
        except Exception as e:
            logger.error(f"API fetch error for {url}: {str(e)}")
            return None


class NASANEOFetcher:
    """NASA Near Earth Objects fetcher"""
    
    def __init__(self, client: APIClient):
        self.client = client
        self.base_url = "https://api.nasa.gov/neo/rest/v1"
    
    async def fetch_neo_data(self, days: int = 7) -> List[RawDataRecord]:
        """NEO verilerini çek - Geliştirilmiş versiyon"""
        records = []
        
        try:
            # 1. NEO Feed API - Son X gün içindeki yaklaşımlar
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            url = f"{self.base_url}/feed"
            params = {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            }
            
            feed_data = await self.client.fetch_data(url, params=params)
            
            if feed_data and 'near_earth_objects' in feed_data:
                for date_str, neos in feed_data['near_earth_objects'].items():
                    for neo in neos:
                        record = RawDataRecord(
                            record_id=f"neo_feed_{neo.get('id', 'unknown')}",
                            source=DataSource.NASA_NEO,
                            data_type='asteroid',
                            raw_data=neo,
                            fetched_at=datetime.now(),
                            data_quality=DataQuality.EXCELLENT
                        )
                        records.append(record)
            
            logger.info(f"NASA NEO Feed: Fetched {len(records)} records")
            
            # 2. NEO Browse API - Daha geniş kapsamlı veri
            try:
                browse_url = f"{self.base_url}/browse"
                browse_params = {
                    'size': 100,  # Daha fazla veri
                    'page': 0
                }
                
                browse_data = await self.client.fetch_data(browse_url, params=browse_params)
                
                if browse_data and 'near_earth_objects' in browse_data:
                    browse_count = 0
                    for neo in browse_data['near_earth_objects']:
                        # Duplicate kontrolü - ID'ye göre
                        neo_id = neo.get('id', 'unknown')
                        existing_record = any(
                            record.raw_data.get('id') == neo_id
                            for record in records
                        )
                        
                        if not existing_record:
                            record = RawDataRecord(
                                record_id=f"neo_browse_{neo_id}",
                                source=DataSource.NASA_NEO,
                                data_type='asteroid',
                                raw_data=neo,
                                fetched_at=datetime.now(),
                                data_quality=DataQuality.EXCELLENT
                            )
                            records.append(record)
                            browse_count += 1
                    
                    logger.info(f"NASA NEO Browse: Added {browse_count} additional records")
            
            except Exception as browse_error:
                logger.warning(f"NEO Browse API error: {str(browse_error)}")
            
            # 3. Potentially Hazardous Asteroids (PHA)
            try:
                pha_url = f"{self.base_url}/browse"
                pha_params = {
                    'is_potentially_hazardous_asteroid': 'true',
                    'size': 50
                }
                
                pha_data = await self.client.fetch_data(pha_url, params=pha_params)
                
                if pha_data and 'near_earth_objects' in pha_data:
                    pha_count = 0
                    for neo in pha_data['near_earth_objects']:
                        neo_id = neo.get('id', 'unknown')
                        existing_record = any(
                            record.raw_data.get('id') == neo_id
                            for record in records
                        )
                        
                        if not existing_record:
                            record = RawDataRecord(
                                record_id=f"neo_pha_{neo_id}",
                                source=DataSource.NASA_NEO,
                                data_type='potentially_hazardous_asteroid',
                                raw_data=neo,
                                fetched_at=datetime.now(),
                                data_quality=DataQuality.EXCELLENT
                            )
                            records.append(record)
                            pha_count += 1
                    
                    logger.info(f"NASA PHA: Added {pha_count} potentially hazardous asteroids")
                    
            except Exception as pha_error:
                logger.warning(f"PHA API error: {str(pha_error)}")
            
            total_records = len(records)
            logger.info(f"NASA NEO TOTAL: Fetched {total_records} unique asteroid records")
            return records
            
        except Exception as e:
            logger.error(f"NASA NEO comprehensive fetch error: {str(e)}")
            return []
    
    async def fetch_sentry_data(self) -> List[RawDataRecord]:
        """NASA Sentry risk tablosu"""
        records = []
        
        try:
            url = f"{self.base_url}/sentry"
            data = await self.client.fetch_data(url)
            
            if data and 'data' in data:
                for item in data['data']:
                    record = RawDataRecord(
                        record_id=f"sentry_{item.get('spkid', 'unknown')}",
                        source=DataSource.NASA_NEO,
                        data_type='high_risk_asteroid',
                        raw_data=item,
                        fetched_at=datetime.now(),
                        data_quality=DataQuality.EXCELLENT
                    )
                    records.append(record)
            
            logger.info(f"NASA Sentry: Fetched {len(records)} records")
            return records
            
        except Exception as e:
            logger.error(f"NASA Sentry fetch error: {str(e)}")
            return []


class NASAEONETFetcher:
    """NASA Earth Observatory Natural Event Tracker fetcher"""
    
    def __init__(self, client: APIClient):
        self.client = client
        self.base_url = "https://eonet.gsfc.nasa.gov/api/v3"
    
    async def fetch_natural_events(self, days: int = 30) -> List[RawDataRecord]:
        """Doğal afet verilerini çek"""
        records = []
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            url = f"{self.base_url}/events"
            params = {
                'start': start_date.strftime('%Y-%m-%d'),
                'end': end_date.strftime('%Y-%m-%d'),
                'status': 'open'
            }
            
            data = await self.client.fetch_data(url, params=params)
            
            if data and 'events' in data:
                for event in data['events']:
                    record = RawDataRecord(
                        record_id=f"eonet_{event.get('id', 'unknown')}",
                        source=DataSource.NASA_EONET,
                        data_type='earth_event',
                        raw_data=event,
                        fetched_at=datetime.now(),
                        data_quality=DataQuality.GOOD
                    )
                    records.append(record)
            
            logger.info(f"NASA EONET: Fetched {len(records)} records")
            return records
            
        except Exception as e:
            logger.error(f"NASA EONET fetch error: {str(e)}")
            return []


class NASADONKIFetcher:
    """NASA Space Weather Database fetcher"""
    
    def __init__(self, client: APIClient):
        self.client = client
        self.base_url = "https://api.nasa.gov/DONKI"
    
    async def fetch_space_weather_events(self, days: int = 7) -> List[RawDataRecord]:
        """Space weather verilerini çek"""
        records = []
        
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Different event types
            event_types = ['FLR', 'CME', 'GST', 'IPS', 'MPC', 'SEP', 'RBE']
            
            for event_type in event_types:
                url = f"{self.base_url}/{event_type}"
                params = {
                    'startDate': start_date.strftime('%Y-%m-%d'),
                    'endDate': end_date.strftime('%Y-%m-%d')
                }
                
                data = await self.client.fetch_data(url, params=params)
                
                if data:
                    for event in data:
                        record = RawDataRecord(
                            record_id=f"donki_{event_type}_{event.get('activityID', 'unknown')}",
                            source=DataSource.NASA_DONKI,
                            data_type='space_weather',
                            raw_data=event,
                            fetched_at=datetime.now(),
                            data_quality=DataQuality.EXCELLENT
                        )
                        records.append(record)
            
            logger.info(f"NASA DONKI: Fetched {len(records)} records")
            return records
            
        except Exception as e:
            logger.error(f"NASA DONKI fetch error: {str(e)}")
            return []


class ESASSAFetcher:
    """ESA Space Situational Awareness fetcher"""
    
    def __init__(self, client: APIClient):
        self.client = client
        self.base_url = "https://swe.ssa.esa.int/web/guest/monitoring-predictions"
    
    async def fetch_esa_space_weather(self) -> List[RawDataRecord]:
        """ESA space weather verilerini çek"""
        records = []
        
        try:
            # ESA API'sı için özel implementation
            # Bu örnek implementation - gerçek ESA API endpoints kullanılacak
            
            url = f"{self.base_url}/space-weather-now"
            data = await self.client.fetch_data(url)
            
            if data:
                # Process ESA space weather data
                for item in data.get('events', []):
                    record = RawDataRecord(
                        record_id=f"esa_{item.get('id', 'unknown')}",
                        source=DataSource.ESA_SSA,
                        data_type='space_weather',
                        raw_data=item,
                        fetched_at=datetime.now(),
                        data_quality=DataQuality.GOOD
                    )
                    records.append(record)
            
            logger.info(f"ESA SSA: Fetched {len(records)} records")
            return records
            
        except Exception as e:
            logger.error(f"ESA SSA fetch error: {str(e)}")
            return []


class SpaceXAPIFetcher:
    """SpaceX API fetcher"""
    
    def __init__(self, client: APIClient):
        self.client = client
        self.base_url = "https://api.spacexdata.com/v4"
    
    async def fetch_upcoming_launches(self) -> List[RawDataRecord]:
        """Yaklaşan SpaceX fırlatmalarını çek"""
        records = []
        
        try:
            url = f"{self.base_url}/launches/upcoming"
            data = await self.client.fetch_data(url)
            
            if data:
                for launch in data:
                    record = RawDataRecord(
                        record_id=f"spacex_{launch.get('id', 'unknown')}",
                        source=DataSource.SPACEX_API,
                        data_type='launch_event',
                        raw_data=launch,
                        fetched_at=datetime.now(),
                        data_quality=DataQuality.GOOD
                    )
                    records.append(record)
            
            logger.info(f"SpaceX API: Fetched {len(records)} records")
            return records
            
        except Exception as e:
            logger.error(f"SpaceX API fetch error: {str(e)}")
            return []


class DataNormalizer:
    """Veri normalleştirici"""
    
    def __init__(self):
        self.ai_service = unified_ai_service
    
    async def normalize_raw_data(self, raw_records: List[RawDataRecord]) -> List[NormalizedThreatData]:
        """Ham verileri normalize et"""
        normalized_threats = []
        
        for record in raw_records:
            try:
                if record.source == DataSource.NASA_NEO:
                    threats = await self._normalize_nasa_neo(record)
                elif record.source == DataSource.NASA_EONET:
                    threats = await self._normalize_nasa_eonet(record)
                elif record.source == DataSource.NASA_DONKI:
                    threats = await self._normalize_nasa_donki(record)
                elif record.source == DataSource.ESA_SSA:
                    threats = await self._normalize_esa_ssa(record)
                elif record.source == DataSource.SPACEX_API:
                    threats = await self._normalize_spacex(record)
                else:
                    threats = []
                
                normalized_threats.extend(threats)
                
            except Exception as e:
                logger.error(f"Normalization error for {record.record_id}: {str(e)}")
                continue
        
        logger.info(f"Data normalization completed: {len(normalized_threats)} threats")
        return normalized_threats
    
    async def _normalize_nasa_neo(self, record: RawDataRecord) -> List[NormalizedThreatData]:
        """NASA NEO verisini normalize et"""
        threats = []
        data = record.raw_data
        
        try:
            # Asteroid threat
            threat_id = f"neo_{data.get('id', 'unknown')}"
            name = data.get('name', 'Unknown Asteroid')
            
            # Risk assessment
            is_potentially_hazardous = data.get('is_potentially_hazardous_asteroid', False)
            
            # Close approach data
            close_approaches = data.get('close_approach_data', [])
            if close_approaches:
                closest_approach = min(close_approaches, key=lambda x: float(x.get('miss_distance', {}).get('kilometers', float('inf'))))
                
                miss_distance_km = float(closest_approach.get('miss_distance', {}).get('kilometers', 0))
                approach_date = closest_approach.get('close_approach_date_full', '')
                
                # Calculate time to impact
                time_to_impact = self._parse_nasa_date(approach_date) if approach_date else None
                time_to_impact_hours = None
                if time_to_impact:
                    time_to_impact_hours = (time_to_impact - datetime.now()).total_seconds() / 3600
                
                # Severity assessment
                diameter_km = float(data.get('estimated_diameter', {}).get('kilometers', {}).get('estimated_diameter_max', 0))
                
                if is_potentially_hazardous and miss_distance_km < 7.5e6:  # 7.5M km
                    severity = 'HIGH'
                elif is_potentially_hazardous:
                    severity = 'MEDIUM'
                elif diameter_km > 1.0:
                    severity = 'MEDIUM'
                else:
                    severity = 'LOW'
                
                # Impact probability (simplified)
                if miss_distance_km < 1e6:  # Very close
                    impact_probability = 0.001
                elif miss_distance_km < 5e6:
                    impact_probability = 0.0001
                else:
                    impact_probability = 0.00001
                
                threat = NormalizedThreatData(
                    threat_id=threat_id,
                    source=DataSource.NASA_NEO,
                    threat_type=ThreatType.ASTEROID,
                    title=f"Asteroid {name} Close Approach",
                    description=f"Asteroid {name} approaching Earth. Miss distance: {miss_distance_km:,.0f} km",
                    severity=severity,
                    time_to_impact=time_to_impact,
                    time_to_impact_hours=time_to_impact_hours,
                    impact_probability=impact_probability,
                    confidence_score=0.9,
                    original_data=data,
                    data_quality_score=0.9
                )
                
                threats.append(threat)
        
        except Exception as e:
            logger.error(f"NASA NEO normalization error: {str(e)}")
        
        return threats
    
    async def _normalize_nasa_eonet(self, record: RawDataRecord) -> List[NormalizedThreatData]:
        """NASA EONET verisini normalize et"""
        threats = []
        data = record.raw_data
        
        try:
            threat_id = f"eonet_{data.get('id', 'unknown')}"
            title = data.get('title', 'Natural Event')
            
            # Event category mapping
            categories = data.get('categories', [])
            event_type = categories[0].get('title', 'Unknown') if categories else 'Unknown'
            
            threat_type_mapping = {
                'Wildfires': ThreatType.EARTH_EVENT,
                'Volcanoes': ThreatType.EARTH_EVENT,
                'Severe Storms': ThreatType.EARTH_EVENT,
                'Drought': ThreatType.EARTH_EVENT,
                'Dust and Haze': ThreatType.EARTH_EVENT,
                'Floods': ThreatType.EARTH_EVENT,
                'Landslides': ThreatType.EARTH_EVENT,
                'Manmade': ThreatType.EARTH_EVENT,
                'Sea and Lake Ice': ThreatType.EARTH_EVENT,
                'Snow': ThreatType.EARTH_EVENT,
                'Temperature Extremes': ThreatType.EARTH_EVENT,
                'Water Color': ThreatType.EARTH_EVENT
            }
            
            threat_type = threat_type_mapping.get(event_type, ThreatType.UNKNOWN)
            
            # Coordinates
            geometries = data.get('geometry', [])
            coordinates = None
            if geometries and geometries[0].get('coordinates'):
                coords = geometries[0]['coordinates']
                if len(coords) >= 2:
                    coordinates = {'lat': coords[1], 'lng': coords[0]}
            
            # Severity assessment based on event type
            severity_mapping = {
                'Volcanoes': 'HIGH',
                'Severe Storms': 'MEDIUM',
                'Wildfires': 'MEDIUM',
                'Floods': 'MEDIUM',
                'Landslides': 'MEDIUM',
                'Temperature Extremes': 'LOW',
                'Drought': 'LOW'
            }
            
            severity = severity_mapping.get(event_type, 'LOW')
            
            threat = NormalizedThreatData(
                threat_id=threat_id,
                source=DataSource.NASA_EONET,
                threat_type=threat_type,
                title=title,
                description=f"{event_type}: {title}",
                severity=severity,
                coordinates=coordinates,
                impact_probability=0.8,  # Natural events usually happen
                confidence_score=0.8,
                original_data=data,
                data_quality_score=0.8
            )
            
            threats.append(threat)
        
        except Exception as e:
            logger.error(f"NASA EONET normalization error: {str(e)}")
        
        return threats
    
    async def _normalize_nasa_donki(self, record: RawDataRecord) -> List[NormalizedThreatData]:
        """NASA DONKI space weather verisini normalize et"""
        threats = []
        data = record.raw_data
        
        try:
            activity_id = data.get('activityID', 'unknown')
            threat_id = f"donki_{activity_id}"
            
            # Event type detection
            if 'FLR' in record.record_id:
                title = f"Solar Flare - Class {data.get('classType', 'Unknown')}"
                threat_type = ThreatType.SPACE_WEATHER
                severity = self._classify_solar_flare_severity(data.get('classType', ''))
            elif 'CME' in record.record_id:
                title = "Coronal Mass Ejection"
                threat_type = ThreatType.SPACE_WEATHER
                severity = 'MEDIUM'
            elif 'GST' in record.record_id:
                title = "Geomagnetic Storm"
                threat_type = ThreatType.SPACE_WEATHER
                severity = 'HIGH'
            else:
                title = "Space Weather Event"
                threat_type = ThreatType.SPACE_WEATHER
                severity = 'LOW'
            
            # Time analysis
            begin_time = data.get('beginTime', '')
            time_to_impact = self._parse_nasa_date(begin_time) if begin_time else None
            time_to_impact_hours = None
            
            if time_to_impact:
                time_to_impact_hours = (time_to_impact - datetime.now()).total_seconds() / 3600
            
            threat = NormalizedThreatData(
                threat_id=threat_id,
                source=DataSource.NASA_DONKI,
                threat_type=threat_type,
                title=title,
                description=f"Space weather event: {title}",
                severity=severity,
                time_to_impact=time_to_impact,
                time_to_impact_hours=time_to_impact_hours,
                impact_probability=0.7,
                confidence_score=0.9,
                original_data=data,
                data_quality_score=0.9
            )
            
            threats.append(threat)
        
        except Exception as e:
            logger.error(f"NASA DONKI normalization error: {str(e)}")
        
        return threats
    
    async def _normalize_esa_ssa(self, record: RawDataRecord) -> List[NormalizedThreatData]:
        """ESA SSA verisini normalize et"""
        threats = []
        data = record.raw_data
        
        try:
            # ESA normalization logic
            threat_id = f"esa_{data.get('id', 'unknown')}"
            
            threat = NormalizedThreatData(
                threat_id=threat_id,
                source=DataSource.ESA_SSA,
                threat_type=ThreatType.SPACE_WEATHER,
                title=data.get('title', 'ESA Space Weather Event'),
                description=data.get('description', 'ESA space weather monitoring event'),
                severity='MEDIUM',
                impact_probability=0.5,
                confidence_score=0.7,
                original_data=data,
                data_quality_score=0.7
            )
            
            threats.append(threat)
        
        except Exception as e:
            logger.error(f"ESA SSA normalization error: {str(e)}")
        
        return threats
    
    async def _normalize_spacex(self, record: RawDataRecord) -> List[NormalizedThreatData]:
        """SpaceX verisini normalize et"""
        threats = []
        data = record.raw_data
        
        try:
            # SpaceX launches as potential orbital debris threats
            launch_id = data.get('id', 'unknown')
            threat_id = f"spacex_{launch_id}"
            
            name = data.get('name', 'SpaceX Mission')
            date_utc = data.get('date_utc', '')
            
            time_to_impact = self._parse_iso_date(date_utc) if date_utc else None
            time_to_impact_hours = None
            
            if time_to_impact:
                time_to_impact_hours = (time_to_impact - datetime.now()).total_seconds() / 3600
            
            # Launch debris potential
            threat = NormalizedThreatData(
                threat_id=threat_id,
                source=DataSource.SPACEX_API,
                threat_type=ThreatType.ORBITAL_DEBRIS,
                title=f"SpaceX Launch: {name}",
                description=f"Potential orbital debris from SpaceX mission {name}",
                severity='LOW',
                time_to_impact=time_to_impact,
                time_to_impact_hours=time_to_impact_hours,
                impact_probability=0.1,
                confidence_score=0.6,
                original_data=data,
                data_quality_score=0.7
            )
            
            threats.append(threat)
        
        except Exception as e:
            logger.error(f"SpaceX normalization error: {str(e)}")
        
        return threats
    
    def _classify_solar_flare_severity(self, class_type: str) -> str:
        """Solar flare severity classification"""
        if not class_type:
            return 'LOW'
        
        class_letter = class_type[0].upper() if class_type else 'C'
        
        if class_letter == 'X':
            return 'CRITICAL'
        elif class_letter == 'M':
            return 'HIGH'
        elif class_letter == 'C':
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def _parse_nasa_date(self, date_str: str) -> Optional[datetime]:
        """NASA tarih formatını parse et"""
        try:
            # NASA uses various date formats
            formats = [
                '%Y-%m-%dT%H:%M:%S',
                '%Y-%m-%d %H:%M',
                '%Y-%m-%d'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
            
            # Try ISO format
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None)
            
        except Exception:
            return None
    
    def _parse_iso_date(self, date_str: str) -> Optional[datetime]:
        """ISO tarih formatını parse et"""
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).replace(tzinfo=None)
        except Exception:
            return None


class MultiSourceDataIntegrator:
    """
    🌐 Ana çoklu veri kaynağı entegratörü
    """
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.api_client: Optional[APIClient] = None
        
        # Data fetchers
        self.nasa_neo_fetcher: Optional[NASANEOFetcher] = None
        self.nasa_eonet_fetcher: Optional[NASAEONETFetcher] = None
        self.nasa_donki_fetcher: Optional[NASADONKIFetcher] = None
        self.esa_ssa_fetcher: Optional[ESASSAFetcher] = None
        self.spacex_fetcher: Optional[SpaceXAPIFetcher] = None
        
        # Data processor
        self.normalizer = DataNormalizer()
        
        # Source metadata
        self.source_metadata: Dict[DataSource, SourceMetadata] = {}
        self._initialize_source_metadata()
        
        # Caching
        self.data_cache: Dict[str, Any] = {}
        self.cache_ttl = 3600  # 1 hour
        
        logger.info("Multi-Source Data Integrator initialized")
    
    def _initialize_source_metadata(self):
        """Veri kaynağı metadata'sını başlat"""
        self.source_metadata = {
            DataSource.NASA_NEO: SourceMetadata(
                source=DataSource.NASA_NEO,
                api_endpoint="https://api.nasa.gov/neo/rest/v1",
                update_frequency="daily",
                data_format="json",
                authentication_required=True,
                reliability_score=0.95,
                typical_latency_seconds=2.0,
                rate_limit="1000/hour"
            ),
            DataSource.NASA_EONET: SourceMetadata(
                source=DataSource.NASA_EONET,
                api_endpoint="https://eonet.gsfc.nasa.gov/api/v3",
                update_frequency="real-time",
                data_format="json",
                authentication_required=False,
                reliability_score=0.9,
                typical_latency_seconds=1.5
            ),
            DataSource.NASA_DONKI: SourceMetadata(
                source=DataSource.NASA_DONKI,
                api_endpoint="https://api.nasa.gov/DONKI",
                update_frequency="real-time",
                data_format="json",
                authentication_required=True,
                reliability_score=0.95,
                typical_latency_seconds=3.0,
                rate_limit="1000/hour"
            ),
            DataSource.ESA_SSA: SourceMetadata(
                source=DataSource.ESA_SSA,
                api_endpoint="https://swe.ssa.esa.int",
                update_frequency="hourly",
                data_format="json",
                authentication_required=False,
                reliability_score=0.8,
                typical_latency_seconds=4.0
            ),
            DataSource.SPACEX_API: SourceMetadata(
                source=DataSource.SPACEX_API,
                api_endpoint="https://api.spacexdata.com/v4",
                update_frequency="event-driven",
                data_format="json",
                authentication_required=False,
                reliability_score=0.85,
                typical_latency_seconds=2.5
            )
        }
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        self.api_client = APIClient(self.session)
        
        # Initialize fetchers
        self.nasa_neo_fetcher = NASANEOFetcher(self.api_client)
        self.nasa_eonet_fetcher = NASAEONETFetcher(self.api_client)
        self.nasa_donki_fetcher = NASADONKIFetcher(self.api_client)
        self.esa_ssa_fetcher = ESASSAFetcher(self.api_client)
        self.spacex_fetcher = SpaceXAPIFetcher(self.api_client)
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def fetch_all_threat_data(
        self,
        sources: Optional[List[DataSource]] = None,
        lookback_days: int = 7,
        lookahead_days: int = 30
    ) -> List[NormalizedThreatData]:
        """
        🎯 Tüm kaynaklardan tehdit verilerini çek ve normalize et
        """
        fetch_start = datetime.now()
        
        # Default sources
        if sources is None:
            sources = [
                DataSource.NASA_NEO,
                DataSource.NASA_EONET, 
                DataSource.NASA_DONKI,
                DataSource.SPACEX_API
            ]
        
        logger.info(f"Fetching threat data from {len(sources)} sources")
        
        try:
            # Parallel data fetching
            fetch_tasks = []
            
            if DataSource.NASA_NEO in sources:
                fetch_tasks.extend([
                    self.nasa_neo_fetcher.fetch_neo_data(days=lookback_days),
                    self.nasa_neo_fetcher.fetch_sentry_data()
                ])
            
            if DataSource.NASA_EONET in sources:
                fetch_tasks.append(
                    self.nasa_eonet_fetcher.fetch_natural_events(days=lookback_days)
                )
            
            if DataSource.NASA_DONKI in sources:
                fetch_tasks.append(
                    self.nasa_donki_fetcher.fetch_space_weather_events(days=lookback_days)
                )
            
            if DataSource.ESA_SSA in sources:
                fetch_tasks.append(
                    self.esa_ssa_fetcher.fetch_esa_space_weather()
                )
            
            if DataSource.SPACEX_API in sources:
                fetch_tasks.append(
                    self.spacex_fetcher.fetch_upcoming_launches()
                )
            
            # Execute all fetch tasks
            raw_data_results = await asyncio.gather(*fetch_tasks, return_exceptions=True)
            
            # Collect all raw records
            all_raw_records = []
            for result in raw_data_results:
                if isinstance(result, list):
                    all_raw_records.extend(result)
                elif isinstance(result, Exception):
                    logger.error(f"Data fetch error: {str(result)}")
            
            logger.info(f"Raw data collection completed: {len(all_raw_records)} records")
            
            # Normalize all data
            normalized_threats = await self.normalizer.normalize_raw_data(all_raw_records)
            
            # Post-processing and quality assessment
            enhanced_threats = await self._enhance_threat_data(normalized_threats)
            
            # Update source metadata
            await self._update_source_statistics(sources, len(normalized_threats))
            
            processing_time = (datetime.now() - fetch_start).total_seconds()
            logger.info(f"Multi-source data integration completed in {processing_time:.2f}s")
            logger.info(f"Final threat count: {len(enhanced_threats)}")
            
            return enhanced_threats
            
        except Exception as e:
            logger.error(f"Multi-source data integration error: {str(e)}")
            return []
    
    async def _enhance_threat_data(self, threats: List[NormalizedThreatData]) -> List[NormalizedThreatData]:
        """Tehdit verilerini geliştirir"""
        enhanced_threats = []
        
        try:
            # AI-powered enhancement
            for threat in threats:
                # Geographic enrichment
                if threat.coordinates and not threat.affected_region:
                    threat.affected_region = await self._determine_geographic_region(threat.coordinates)
                
                # Time-based enhancements
                if threat.time_to_impact and not threat.time_to_impact_hours:
                    threat.time_to_impact_hours = (threat.time_to_impact - datetime.now()).total_seconds() / 3600
                
                # Confidence adjustment based on source
                source_metadata = self.source_metadata.get(threat.source)
                if source_metadata:
                    threat.confidence_score *= source_metadata.reliability_score
                
                enhanced_threats.append(threat)
            
            return enhanced_threats
            
        except Exception as e:
            logger.error(f"Threat data enhancement error: {str(e)}")
            return threats  # Return original if enhancement fails
    
    async def _determine_geographic_region(self, coordinates: Dict[str, float]) -> str:
        """Koordinatlardan coğrafi bölge belirle"""
        try:
            lat, lng = coordinates.get('lat', 0), coordinates.get('lng', 0)
            
            # Simple regional classification
            if lat >= 60:
                return "Arctic"
            elif lat >= 23.5:
                return "Northern Hemisphere"
            elif lat >= -23.5:
                return "Equatorial"
            elif lat >= -60:
                return "Southern Hemisphere"
            else:
                return "Antarctic"
                
        except Exception:
            return "Unknown"
    
    async def _update_source_statistics(self, sources: List[DataSource], threat_count: int):
        """Kaynak istatistiklerini güncelle"""
        try:
            current_time = datetime.now()
            
            for source in sources:
                if source in self.source_metadata:
                    metadata = self.source_metadata[source]
                    metadata.last_successful_fetch = current_time
                    metadata.consecutive_failures = 0  # Reset failure count
            
            logger.info(f"Source statistics updated for {len(sources)} sources")
            
        except Exception as e:
            logger.error(f"Source statistics update error: {str(e)}")
    
    async def get_source_health_status(self) -> Dict[str, Any]:
        """Kaynak sağlık durumu"""
        health_status = {}
        
        try:
            for source, metadata in self.source_metadata.items():
                last_fetch = metadata.last_successful_fetch
                is_healthy = (
                    metadata.is_active and 
                    metadata.consecutive_failures < 3 and
                    (last_fetch is None or (datetime.now() - last_fetch).total_seconds() < 7200)  # 2 hours
                )
                
                health_status[source.value] = {
                    'is_healthy': is_healthy,
                    'reliability_score': metadata.reliability_score,
                    'last_successful_fetch': last_fetch.isoformat() if last_fetch else None,
                    'consecutive_failures': metadata.consecutive_failures,
                    'is_active': metadata.is_active
                }
            
            return health_status
            
        except Exception as e:
            logger.error(f"Source health check error: {str(e)}")
            return {}
    
    def get_supported_sources(self) -> List[str]:
        """Desteklenen veri kaynaklarını döndür"""
        return [source.value for source in DataSource]


# Global service instance
multi_source_data_integrator = MultiSourceDataIntegrator()

def get_multi_source_data_integrator() -> MultiSourceDataIntegrator:
    """Dependency injection için"""
    return multi_source_data_integrator


# Export main classes
__all__ = [
    'MultiSourceDataIntegrator',
    'DataSource',
    'DataQuality',
    'DataFreshness',
    'NormalizedThreatData',
    'RawDataRecord',
    'SourceMetadata',
    'multi_source_data_integrator',
    'get_multi_source_data_integrator'
]
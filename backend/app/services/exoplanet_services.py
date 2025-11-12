import asyncio
import aiohttp
import ssl
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import logging
logger = logging.getLogger(__name__)
@dataclass
class ExoplanetData:
    """Exoplanet data structure"""
    name: str
    host_star: str
    discovery_method: str
    discovery_year: Optional[int]
    orbital_period_days: Optional[float]
    planet_radius_earth: Optional[float]
    planet_mass_earth: Optional[float]
    stellar_distance_parsecs: Optional[float]
    equilibrium_temperature_k: Optional[float]
    habitable_zone_flag: bool
    discovery_facility: Optional[str]
    publication_date: Optional[str]
    @property
    def is_potentially_habitable(self) -> bool:
        """Check if planet is potentially habitable"""
        if not all([self.equilibrium_temperature_k, self.planet_radius_earth]):
            return False
        temp_ok = 200 <= self.equilibrium_temperature_k <= 350  # Liquid water range
        size_ok = 0.5 <= self.planet_radius_earth <= 2.5  # Earth-like size range
        return temp_ok and size_ok
@dataclass  
class ExoplanetStatistics:
    """Exoplanet collection statistics"""
    total_planets: int
    total_systems: int
    discovery_methods: Dict[str, int]
    discovery_years: Dict[int, int]
    potentially_habitable: int
    confirmed_planets: int
    candidate_planets: int
    average_orbital_period: Optional[float]
    average_planet_radius: Optional[float]
    nearest_distance_parsecs: Optional[float]
    farthest_distance_parsecs: Optional[float]
class ExoplanetArchiveService:
    """NASA Exoplanet Archive API service"""
    def __init__(self):
        self.base_url = "https://exoplanetarchive.ipac.caltech.edu"
        self.endpoints = {
            'confirmed': '/cgi-bin/nstedAPI/nph-nstedAPI',
            'composite': '/TAP/sync',
            'planetary_systems': '/cgi-bin/nstedAPI/nph-nstedAPI'
        }
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        self.max_requests_per_second = 2
        self.last_request_time = 0
    async def _make_request(self, session: aiohttp.ClientSession, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make rate-limited API request"""
        try:
            current_time = datetime.now().timestamp()
            time_since_last = current_time - self.last_request_time
            if time_since_last < (1.0 / self.max_requests_per_second):
                await asyncio.sleep((1.0 / self.max_requests_per_second) - time_since_last)
            self.last_request_time = datetime.now().timestamp()
            async with session.get(url, params=params, timeout=30) as response:
                if response.status == 200:
                    content_type = response.headers.get('content-type', '').lower()
                    if 'json' in content_type:
                        return await response.json()
                    else:
                        text = await response.text()
                        return self._parse_csv_response(text)
                else:
                    error_text = await response.text()
                    logger.error(f"API request failed: HTTP {response.status} - {error_text}")
                    return {'success': False, 'error': f'HTTP {response.status}', 'message': error_text}
        except asyncio.TimeoutError:
            logger.error("Request timeout")
            return {'success': False, 'error': 'timeout'}
        except Exception as e:
            logger.error(f"Request error: {str(e)}")
            return {'success': False, 'error': str(e)}
    def _parse_csv_response(self, csv_text: str) -> Dict[str, Any]:
        """Parse CSV response to structured data"""
        try:
            lines = csv_text.strip().split('\n')
            if len(lines) < 2:
                return {'success': False, 'error': 'Empty response'}
            header = lines[0].split(',')
            header = [col.strip() for col in header]
            data_rows = []
            for line in lines[1:]:
                if line.strip():
                    row_data = line.split(',')
                    row_dict = {}
                    for i, value in enumerate(row_data):
                        if i < len(header):
                            row_dict[header[i]] = value.strip()
                    data_rows.append(row_dict)
            return {
                'success': True,
                'columns': header,
                'data': data_rows,
                'count': len(data_rows)
            }
        except Exception as e:
            logger.error(f"CSV parsing error: {str(e)}")
            return {'success': False, 'error': f'CSV parse error: {str(e)}'}
    async def get_confirmed_exoplanets(self, limit: int = 100, discovery_year_min: Optional[int] = None) -> Dict[str, Any]:
        """Get confirmed exoplanets from NASA archive"""
        try:
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            async with aiohttp.ClientSession(connector=connector) as session:
                params = {
                    'table': 'exoplanets',
                    'format': 'csv',
                    'order': 'pl_disc_year desc',
                    'select': 'pl_name,hostname,pl_discmethod,pl_disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,pl_facility',
                }
                if limit:
                    params['limit'] = str(limit)
                if discovery_year_min:
                    params['where'] = f'pl_disc_year >= {discovery_year_min}'
                url = f"{self.base_url}{self.endpoints['confirmed']}"
                logger.info(f"Fetching confirmed exoplanets (limit: {limit})")
                response = await self._make_request(session, url, params)
                if response.get('success'):
                    exoplanets = []
                    for row in response.get('data', []):
                        try:
                            exoplanet = self._parse_exoplanet_row(row)
                            if exoplanet:
                                exoplanets.append(exoplanet)
                        except Exception as e:
                            logger.warning(f"Failed to parse exoplanet row: {str(e)}")
                            continue
                    logger.info(f"Successfully parsed {len(exoplanets)} exoplanets")
                    return {
                        'success': True,
                        'exoplanets': exoplanets,
                        'count': len(exoplanets),
                        'source': 'NASA Exoplanet Archive',
                        'fetch_time': datetime.now().isoformat()
                    }
                else:
                    return response
        except Exception as e:
            logger.error(f"Get confirmed exoplanets error: {str(e)}")
            return {'success': False, 'error': str(e)}
    def _parse_exoplanet_row(self, row: Dict[str, str]) -> Optional[ExoplanetData]:
        """Parse single exoplanet data row"""
        try:
            def safe_float(value: str) -> Optional[float]:
                try:
                    return float(value) if value and value.strip() not in ['', 'null', 'NULL', 'NaN'] else None
                except (ValueError, TypeError):
                    return None
            def safe_int(value: str) -> Optional[int]:
                try:
                    return int(float(value)) if value and value.strip() not in ['', 'null', 'NULL'] else None
                except (ValueError, TypeError):
                    return None
            name = row.get('pl_name', '').strip()
            if not name:
                return None
            host_star = row.get('hostname', '').strip()
            discovery_method = row.get('pl_discmethod', '').strip()
            discovery_year = safe_int(row.get('pl_disc_year', ''))
            orbital_period = safe_float(row.get('pl_orbper', ''))
            planet_radius = safe_float(row.get('pl_rade', ''))  # Earth radii
            planet_mass = safe_float(row.get('pl_masse', ''))    # Earth masses
            stellar_distance = safe_float(row.get('sy_dist', ''))  # parsecs
            equilibrium_temp = safe_float(row.get('pl_eqt', ''))  # Kelvin
            discovery_facility = row.get('pl_facility', '').strip()
            habitable_zone = False
            if equilibrium_temp and planet_radius:
                temp_range = 200 <= equilibrium_temp <= 350
                size_range = 0.5 <= planet_radius <= 2.5
                habitable_zone = temp_range and size_range
            return ExoplanetData(
                name=name,
                host_star=host_star,
                discovery_method=discovery_method,
                discovery_year=discovery_year,
                orbital_period_days=orbital_period,
                planet_radius_earth=planet_radius,
                planet_mass_earth=planet_mass,
                stellar_distance_parsecs=stellar_distance,
                equilibrium_temperature_k=equilibrium_temp,
                habitable_zone_flag=habitable_zone,
                discovery_facility=discovery_facility,
                publication_date=None  # Not available in this endpoint
            )
        except Exception as e:
            logger.warning(f"Failed to parse exoplanet row: {str(e)}")
            return None
    async def get_habitable_candidates(self, limit: int = 50) -> Dict[str, Any]:
        """Get potentially habitable exoplanet candidates"""
        try:
            all_exoplanets_response = await self.get_confirmed_exoplanets(limit=limit * 3)
            if not all_exoplanets_response.get('success'):
                return all_exoplanets_response
            exoplanets = all_exoplanets_response.get('exoplanets', [])
            habitable_candidates = [
                planet for planet in exoplanets 
                if planet.is_potentially_habitable
            ]
            habitable_candidates.sort(
                key=lambda p: p.stellar_distance_parsecs or float('inf')
            )
            habitable_candidates = habitable_candidates[:limit]
            logger.info(f"Found {len(habitable_candidates)} potentially habitable exoplanets")
            return {
                'success': True,
                'habitable_candidates': habitable_candidates,
                'count': len(habitable_candidates),
                'source': 'NASA Exoplanet Archive (Filtered)',
                'criteria': 'Temperature 200-350K, Radius 0.5-2.5 Earth radii',
                'fetch_time': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Get habitable candidates error: {str(e)}")
            return {'success': False, 'error': str(e)}
    async def get_recent_discoveries(self, days_back: int = 365, limit: int = 100) -> Dict[str, Any]:
        """Get recently discovered exoplanets"""
        try:
            current_year = datetime.now().year
            min_year = current_year - (days_back // 365) - 1
            response = await self.get_confirmed_exoplanets(
                limit=limit,
                discovery_year_min=max(2020, min_year)  # Don't go before 2020
            )
            if response.get('success'):
                response['filter_criteria'] = f'Discovered since {min_year}'
                response['source'] = 'NASA Exoplanet Archive (Recent)'
            return response
        except Exception as e:
            logger.error(f"Get recent discoveries error: {str(e)}")
            return {'success': False, 'error': str(e)}
    def calculate_statistics(self, exoplanets: List[ExoplanetData]) -> ExoplanetStatistics:
        """Calculate statistics from exoplanet data"""
        try:
            if not exoplanets:
                return ExoplanetStatistics(
                    total_planets=0, total_systems=0, discovery_methods={},
                    discovery_years={}, potentially_habitable=0, confirmed_planets=0,
                    candidate_planets=0, average_orbital_period=None,
                    average_planet_radius=None, nearest_distance_parsecs=None,
                    farthest_distance_parsecs=None
                )
            total_planets = len(exoplanets)
            host_stars = set(planet.host_star for planet in exoplanets if planet.host_star)
            total_systems = len(host_stars)
            discovery_methods = {}
            for planet in exoplanets:
                method = planet.discovery_method or 'Unknown'
                discovery_methods[method] = discovery_methods.get(method, 0) + 1
            discovery_years = {}
            for planet in exoplanets:
                year = planet.discovery_year
                if year:
                    discovery_years[year] = discovery_years.get(year, 0) + 1
            potentially_habitable = sum(1 for planet in exoplanets if planet.is_potentially_habitable)
            confirmed_planets = total_planets
            candidate_planets = 0
            orbital_periods = [p.orbital_period_days for p in exoplanets if p.orbital_period_days]
            average_orbital_period = sum(orbital_periods) / len(orbital_periods) if orbital_periods else None
            planet_radii = [p.planet_radius_earth for p in exoplanets if p.planet_radius_earth]
            average_planet_radius = sum(planet_radii) / len(planet_radii) if planet_radii else None
            distances = [p.stellar_distance_parsecs for p in exoplanets if p.stellar_distance_parsecs]
            nearest_distance = min(distances) if distances else None
            farthest_distance = max(distances) if distances else None
            return ExoplanetStatistics(
                total_planets=total_planets,
                total_systems=total_systems,
                discovery_methods=discovery_methods,
                discovery_years=discovery_years,
                potentially_habitable=potentially_habitable,
                confirmed_planets=confirmed_planets,
                candidate_planets=candidate_planets,
                average_orbital_period=average_orbital_period,
                average_planet_radius=average_planet_radius,
                nearest_distance_parsecs=nearest_distance,
                farthest_distance_parsecs=farthest_distance
            )
        except Exception as e:
            logger.error(f"Statistics calculation error: {str(e)}")
            return ExoplanetStatistics(
                total_planets=0, total_systems=0, discovery_methods={},
                discovery_years={}, potentially_habitable=0, confirmed_planets=0,
                candidate_planets=0, average_orbital_period=None,
                average_planet_radius=None, nearest_distance_parsecs=None,
                farthest_distance_parsecs=None
            )
_exoplanet_service_instance = None
def get_exoplanet_service() -> ExoplanetArchiveService:
    """Get exoplanet service singleton"""
    global _exoplanet_service_instance
    if _exoplanet_service_instance is None:
        _exoplanet_service_instance = ExoplanetArchiveService()
    return _exoplanet_service_instance
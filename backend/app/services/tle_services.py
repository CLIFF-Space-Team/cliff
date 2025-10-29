#!/usr/bin/env python3
"""
TLE (Two-Line Element) Services
Uydu ve uzay araçlarının yörünge verilerini sağlayan servis modülü
CelesTrak ve Space-Track.org API entegrasyonu
"""

import asyncio
import aiohttp
import ssl
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import logging
import math

logger = logging.getLogger(__name__)


@dataclass
class TLEData:
    """TLE data structure"""
    name: str
    catalog_number: str  # NORAD catalog number
    classification: str  # U=unclassified, C=classified, S=secret
    launch_year: int
    launch_number: int
    piece_designation: str
    epoch_year: int
    epoch_day: float
    mean_motion_first_derivative: float
    mean_motion_second_derivative: float
    bstar_drag: float
    element_set_number: int
    checksum1: int
    
    # Orbital elements from line 2
    inclination: float  # degrees
    right_ascension: float  # degrees
    eccentricity: float
    argument_of_perigee: float  # degrees
    mean_anomaly: float  # degrees
    mean_motion: float  # revolutions per day
    revolution_number: int
    checksum2: int
    
    # Calculated properties
    orbital_period: float  # minutes
    altitude_perigee: float  # km
    altitude_apogee: float  # km
    semi_major_axis: float  # km
    
    # Raw TLE lines
    tle_line1: str
    tle_line2: str


@dataclass
class SatellitePosition:
    """Satellite position at a given time"""
    satellite_name: str
    catalog_number: str
    timestamp: datetime
    latitude: float  # degrees
    longitude: float  # degrees
    altitude: float  # km
    velocity: float  # km/s
    is_visible: bool
    azimuth: Optional[float] = None  # degrees from observer
    elevation: Optional[float] = None  # degrees from horizon
    range: Optional[float] = None  # km from observer


@dataclass
class TLEStatistics:
    """Statistics for TLE data collection"""
    total_satellites: int
    by_country: Dict[str, int]
    by_orbit_type: Dict[str, int]
    newest_launch: str
    oldest_active: str
    highest_altitude: str
    lowest_altitude: str
    fastest_orbit: str
    most_eccentric: str


class TLEService:
    """TLE (Two-Line Element) API service"""
    
    def __init__(self):
        # CelesTrak API endpoints
        self.celestrak_base = "https://celestrak.org"
        self.norad_elements = "/NORAD/elements"
        
        # Common satellite groups
        self.satellite_groups = {
            'stations': 'Space stations',
            'active': 'Active satellites',
            'starlink': 'Starlink satellites',
            'weather': 'Weather satellites',
            'noaa': 'NOAA satellites',
            'geos': 'Geostationary satellites',
            'science': 'Science satellites',
            'visual': 'Visible satellites',
            'iridium': 'Iridium satellites',
            'geo': 'GEO satellites',
            'gps-ops': 'GPS operational',
            'galileo': 'Galileo navigation',
            'beidou': 'Beidou navigation',
            'resource': 'Earth resources',
            'sarsat': 'Search & rescue',
            'dmc': 'Disaster monitoring',
            'education': 'Educational',
            'engineering': 'Engineering',
            'geodetic': 'Geodetic',
            'military': 'Military',
            'radar': 'Radar calibration',
            'cubesat': 'CubeSats',
            'other': 'Other satellites'
        }
        
        # SSL context for Windows
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE
        
        # Earth parameters
        self.EARTH_RADIUS = 6371.0  # km
        self.EARTH_MU = 398600.4418  # km^3/s^2
        
    def parse_tle_lines(self, name: str, line1: str, line2: str) -> Optional[TLEData]:
        """Parse TLE format lines into structured data"""
        try:
            # Remove extra whitespace
            name = name.strip()
            line1 = line1.strip()
            line2 = line2.strip()
            
            # Validate line numbers
            if not line1.startswith('1 ') or not line2.startswith('2 '):
                logger.warning(f"Invalid TLE lines for {name}")
                return None
            
            # Parse line 1
            catalog_number = line1[2:7].strip()
            classification = line1[7:8]
            launch_year_str = line1[9:11]
            launch_number = int(line1[11:14])
            piece_designation = line1[14:17].strip()
            epoch_year = int(line1[18:20])
            epoch_day = float(line1[20:32])
            mean_motion_first = float(line1[33:43])
            mean_motion_second_str = line1[44:52].strip()
            
            # Handle scientific notation for second derivative
            if mean_motion_second_str:
                # Format: -11606-4 means -0.11606e-4
                match = re.match(r'([+-]?\d+)([+-]\d)', mean_motion_second_str)
                if match:
                    mantissa = float(match.group(1)) / 100000
                    exponent = int(match.group(2))
                    mean_motion_second = mantissa * (10 ** exponent)
                else:
                    mean_motion_second = 0.0
            else:
                mean_motion_second = 0.0
            
            bstar_str = line1[53:61].strip()
            # Similar handling for BSTAR
            if bstar_str:
                match = re.match(r'([+-]?\d+)([+-]\d)', bstar_str)
                if match:
                    mantissa = float(match.group(1)) / 100000
                    exponent = int(match.group(2))
                    bstar_drag = mantissa * (10 ** exponent)
                else:
                    bstar_drag = 0.0
            else:
                bstar_drag = 0.0
            
            element_set_number = int(line1[64:68])
            checksum1 = int(line1[68:69])
            
            # Parse line 2
            inclination = float(line2[8:16])
            right_ascension = float(line2[17:25])
            eccentricity = float('0.' + line2[26:33])
            argument_of_perigee = float(line2[34:42])
            mean_anomaly = float(line2[43:51])
            mean_motion = float(line2[52:63])
            revolution_number = int(line2[63:68])
            checksum2 = int(line2[68:69])
            
            # Calculate launch year (2-digit to 4-digit)
            launch_year = int(launch_year_str)
            if launch_year < 57:
                launch_year += 2000
            else:
                launch_year += 1900
            
            # Calculate orbital period (minutes)
            orbital_period = 1440.0 / mean_motion if mean_motion > 0 else 0
            
            # Calculate semi-major axis using Kepler's third law
            # T^2 = 4π^2 * a^3 / μ
            period_seconds = orbital_period * 60
            if period_seconds > 0:
                semi_major_axis = math.pow(
                    (period_seconds ** 2) * self.EARTH_MU / (4 * math.pi ** 2), 
                    1/3
                )
            else:
                semi_major_axis = 0
            
            # Calculate perigee and apogee altitudes
            if semi_major_axis > 0:
                altitude_perigee = semi_major_axis * (1 - eccentricity) - self.EARTH_RADIUS
                altitude_apogee = semi_major_axis * (1 + eccentricity) - self.EARTH_RADIUS
            else:
                altitude_perigee = 0
                altitude_apogee = 0
            
            return TLEData(
                name=name,
                catalog_number=catalog_number,
                classification=classification,
                launch_year=launch_year,
                launch_number=launch_number,
                piece_designation=piece_designation,
                epoch_year=epoch_year,
                epoch_day=epoch_day,
                mean_motion_first_derivative=mean_motion_first,
                mean_motion_second_derivative=mean_motion_second,
                bstar_drag=bstar_drag,
                element_set_number=element_set_number,
                checksum1=checksum1,
                inclination=inclination,
                right_ascension=right_ascension,
                eccentricity=eccentricity,
                argument_of_perigee=argument_of_perigee,
                mean_anomaly=mean_anomaly,
                mean_motion=mean_motion,
                revolution_number=revolution_number,
                checksum2=checksum2,
                orbital_period=orbital_period,
                altitude_perigee=altitude_perigee,
                altitude_apogee=altitude_apogee,
                semi_major_axis=semi_major_axis,
                tle_line1=line1,
                tle_line2=line2
            )
            
        except Exception as e:
            logger.error(f"Error parsing TLE for {name}: {str(e)}")
            return None
    
    async def fetch_tle_group(self, group_name: str) -> Dict[str, Any]:
        """Fetch TLE data for a specific satellite group"""
        try:
            url = f"{self.celestrak_base}{self.norad_elements}/{group_name}.txt"
            
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        text = await response.text()
                        lines = text.strip().split('\n')
                        
                        satellites = []
                        i = 0
                        while i < len(lines) - 2:
                            # TLE format: name, line1, line2
                            name = lines[i].strip()
                            line1 = lines[i + 1].strip()
                            line2 = lines[i + 2].strip()
                            
                            tle_data = self.parse_tle_lines(name, line1, line2)
                            if tle_data:
                                satellites.append(tle_data)
                            
                            i += 3
                        
                        logger.info(f"Fetched {len(satellites)} satellites from {group_name}")
                        
                        return {
                            'success': True,
                            'group': group_name,
                            'description': self.satellite_groups.get(group_name, 'Unknown group'),
                            'satellites': satellites,
                            'count': len(satellites),
                            'fetch_time': datetime.now().isoformat()
                        }
                    else:
                        return {
                            'success': False,
                            'error': f'HTTP {response.status}',
                            'group': group_name
                        }
                        
        except Exception as e:
            logger.error(f"Error fetching TLE group {group_name}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'group': group_name
            }
    
    async def get_iss_tle(self) -> Dict[str, Any]:
        """Get current TLE for International Space Station"""
        try:
            url = f"{self.celestrak_base}{self.norad_elements}/gp.php?CATNR=25544&FORMAT=tle"
            
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        text = await response.text()
                        lines = text.strip().split('\n')
                        
                        if len(lines) >= 3:
                            name = lines[0].strip()
                            line1 = lines[1].strip()
                            line2 = lines[2].strip()
                            
                            tle_data = self.parse_tle_lines(name, line1, line2)
                            
                            if tle_data:
                                return {
                                    'success': True,
                                    'satellite': tle_data,
                                    'fetch_time': datetime.now().isoformat()
                                }
                        
                        return {
                            'success': False,
                            'error': 'Invalid TLE format'
                        }
                    else:
                        return {
                            'success': False,
                            'error': f'HTTP {response.status}'
                        }
                        
        except Exception as e:
            logger.error(f"Error fetching ISS TLE: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_satellite_by_norad(self, norad_id: int) -> Dict[str, Any]:
        """Get TLE for specific satellite by NORAD catalog number"""
        try:
            url = f"{self.celestrak_base}{self.norad_elements}/gp.php?CATNR={norad_id}&FORMAT=tle"
            
            connector = aiohttp.TCPConnector(ssl=self.ssl_context)
            timeout = aiohttp.ClientTimeout(total=30)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        text = await response.text()
                        lines = text.strip().split('\n')
                        
                        if len(lines) >= 3:
                            name = lines[0].strip()
                            line1 = lines[1].strip()
                            line2 = lines[2].strip()
                            
                            tle_data = self.parse_tle_lines(name, line1, line2)
                            
                            if tle_data:
                                return {
                                    'success': True,
                                    'satellite': tle_data,
                                    'norad_id': norad_id,
                                    'fetch_time': datetime.now().isoformat()
                                }
                        
                        return {
                            'success': False,
                            'error': 'Satellite not found or invalid TLE'
                        }
                    else:
                        return {
                            'success': False,
                            'error': f'HTTP {response.status}'
                        }
                        
        except Exception as e:
            logger.error(f"Error fetching satellite {norad_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_starlink_satellites(self) -> Dict[str, Any]:
        """Get all Starlink satellites"""
        return await self.fetch_tle_group('starlink')
    
    async def get_weather_satellites(self) -> Dict[str, Any]:
        """Get weather satellites"""
        return await self.fetch_tle_group('weather')
    
    async def get_active_satellites(self) -> Dict[str, Any]:
        """Get all active satellites"""
        return await self.fetch_tle_group('active')
    
    async def get_space_stations(self) -> Dict[str, Any]:
        """Get space stations (ISS, Tiangong, etc.)"""
        return await self.fetch_tle_group('stations')
    
    async def get_visual_satellites(self) -> Dict[str, Any]:
        """Get satellites visible to naked eye"""
        return await self.fetch_tle_group('visual')
    
    def calculate_statistics(self, satellites: List[TLEData]) -> TLEStatistics:
        """Calculate statistics from satellite collection"""
        if not satellites:
            return TLEStatistics(
                total_satellites=0,
                by_country={},
                by_orbit_type={},
                newest_launch="N/A",
                oldest_active="N/A",
                highest_altitude="N/A",
                lowest_altitude="N/A",
                fastest_orbit="N/A",
                most_eccentric="N/A"
            )
        
        # Sort by various criteria
        by_launch = sorted(satellites, key=lambda s: (s.launch_year, s.launch_number))
        by_altitude = sorted(satellites, key=lambda s: s.altitude_apogee)
        by_period = sorted(satellites, key=lambda s: s.orbital_period)
        by_eccentricity = sorted(satellites, key=lambda s: s.eccentricity, reverse=True)
        
        # Classify orbits
        orbit_types = {}
        for sat in satellites:
            if sat.altitude_perigee < 2000:
                orbit_type = 'LEO'  # Low Earth Orbit
            elif sat.altitude_perigee < 35700:
                orbit_type = 'MEO'  # Medium Earth Orbit
            elif 35700 <= sat.altitude_perigee <= 35800:
                orbit_type = 'GEO'  # Geostationary
            else:
                orbit_type = 'HEO'  # High Earth Orbit
            
            orbit_types[orbit_type] = orbit_types.get(orbit_type, 0) + 1
        
        # Country classification (simplified - based on launch year patterns)
        countries = {}
        for sat in satellites:
            # This is simplified - real implementation would use catalog prefixes
            if sat.catalog_number.startswith('1'):
                country = 'USA'
            elif sat.catalog_number.startswith('2'):
                country = 'Russia'
            elif sat.catalog_number.startswith('3'):
                country = 'China'
            elif sat.catalog_number.startswith('4'):
                country = 'Europe'
            else:
                country = 'Other'
            
            countries[country] = countries.get(country, 0) + 1
        
        return TLEStatistics(
            total_satellites=len(satellites),
            by_country=countries,
            by_orbit_type=orbit_types,
            newest_launch=f"{by_launch[-1].name} ({by_launch[-1].launch_year})" if by_launch else "N/A",
            oldest_active=f"{by_launch[0].name} ({by_launch[0].launch_year})" if by_launch else "N/A",
            highest_altitude=f"{by_altitude[-1].name} ({by_altitude[-1].altitude_apogee:.0f} km)" if by_altitude else "N/A",
            lowest_altitude=f"{by_altitude[0].name} ({by_altitude[0].altitude_perigee:.0f} km)" if by_altitude else "N/A",
            fastest_orbit=f"{by_period[0].name} ({by_period[0].orbital_period:.1f} min)" if by_period else "N/A",
            most_eccentric=f"{by_eccentricity[0].name} ({by_eccentricity[0].eccentricity:.4f})" if by_eccentricity else "N/A"
        )


# Global singleton instance
_tle_service_instance = None

def get_tle_service() -> TLEService:
    """Get TLE service singleton"""
    global _tle_service_instance
    if _tle_service_instance is None:
        _tle_service_instance = TLEService()
    return _tle_service_instance
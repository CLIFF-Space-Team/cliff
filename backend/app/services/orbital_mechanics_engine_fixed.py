import math
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
class ThreatLevel(Enum):
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"  
    CRITICAL = "critical"
@dataclass
class CloseApproachData:
    date_julian: float
    date_string: str
    distance_au: float
    distance_km: float
    velocity_kms: float
    uncertainty_km: float = 0.0
@dataclass
class OrbitalElements:
    semi_major_axis_au: Optional[float] = None
    eccentricity: Optional[float] = None
    inclination_deg: Optional[float] = None
    perihelion_distance_au: Optional[float] = None
    aphelion_distance_au: Optional[float] = None
    orbital_period_years: Optional[float] = None
@dataclass
class RiskAssessment:
    threat_level: ThreatLevel
    impact_probability: float
    monitoring_priority: int  # 1-5
    impact_energy_megatons: Optional[float] = None
    damage_radius_km: Optional[float] = None
    recommendations: List[str] = None
@dataclass
class AsteroidData:
    designation: str
    orbit_id: str
    close_approach_data: List[CloseApproachData]
    orbital_elements: OrbitalElements
    estimated_diameter_km: Optional[float] = None
class FixedOrbitalMechanicsEngine:
    """Fixed version with proper CAD API parsing"""
    def __init__(self):
        self.au_to_km = 149597870.7  # 1 AU in kilometers
        self.earth_radius_km = 6371.0
    def date_string_to_julian(self, date_str: str) -> float:
        """Convert date string to Julian Date - FIXED VERSION"""
        try:
            if not date_str or date_str == 'N/A':
                return 0.0
            import re
            month_map = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            }
            date_normalized = date_str.strip()
            for month_name, month_num in month_map.items():
                date_normalized = date_normalized.replace(month_name, month_num)
            patterns = [
                '%Y-%m-%d %H:%M',      # 2025-10-04 04:29
                '%Y-%m-%d %H:%M:%S',   # 2025-10-04 04:29:00
                '%Y-%m-%d',            # 2025-10-04
                '%Y/%m/%d %H:%M',      # 2025/10/04 04:29
            ]
            parsed_date = None
            for pattern in patterns:
                try:
                    parsed_date = datetime.strptime(date_normalized, pattern)
                    break
                except ValueError:
                    continue
            if not parsed_date:
                print(f"[WARN] Tarih parse edilemedi: {date_str}")
                parsed_date = datetime.now()
            a = (14 - parsed_date.month) // 12
            y = parsed_date.year + 4800 - a
            m = parsed_date.month + 12 * a - 3
            jdn = parsed_date.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
            time_fraction = (parsed_date.hour + parsed_date.minute / 60.0 + parsed_date.second / 3600.0) / 24.0
            julian_date = jdn + time_fraction - 0.5
            return julian_date
        except Exception as e:
            print(f"[ERROR] Julian date conversion error: {e}")
            return 2460000.0  # Fallback Julian Date
    def parse_cad_data(self, cad_response_data: Dict[str, Any]) -> List[AsteroidData]:
        """Parse CAD API response data - FIXED VERSION"""
        asteroids = []
        try:
            fields = cad_response_data.get('fields', [])
            data_rows = cad_response_data.get('data', [])
            if not fields or not data_rows:
                print("[WARN] CAD response boþ veya geçersiz")
                return asteroids
            field_map = {field: idx for idx, field in enumerate(fields)}
            print(f"[INFO] CAD field mapping: {field_map}")
            for row_idx, row in enumerate(data_rows):
                try:
                    if len(row) < len(fields):
                        print(f"[WARN] Row {row_idx}: Eksik field ({len(row)}/{len(fields)})")
                        continue
                    designation = str(row[field_map.get('des', 0)]) if 'des' in field_map else f'Unknown_{row_idx}'
                    orbit_id = str(row[field_map.get('orbit_id', 1)]) if 'orbit_id' in field_map else str(row_idx)
                    close_date_str = str(row[field_map.get('cd', 2)]) if 'cd' in field_map else None
                    close_date_jd = self.date_string_to_julian(close_date_str) if close_date_str else 0.0
                    try:
                        distance_au = float(str(row[field_map.get('dist', 3)])) if 'dist' in field_map else 0.0
                        distance_min_au = float(str(row[field_map.get('dist_min', 4)])) if 'dist_min' in field_map else distance_au
                        distance_max_au = float(str(row[field_map.get('dist_max', 5)])) if 'dist_max' in field_map else distance_au
                    except (ValueError, TypeError) as e:
                        print(f"[ERROR] Row {row_idx}: Distance parse error - {e}")
                        continue
                    try:
                        v_rel_kms = float(str(row[field_map.get('v_rel', 6)])) if 'v_rel' in field_map else 0.0
                        v_inf_kms = float(str(row[field_map.get('v_inf', 7)])) if 'v_inf' in field_map else v_rel_kms
                    except (ValueError, TypeError) as e:
                        print(f"[WARN] Row {row_idx}: Velocity parse error - {e}, using default")
                        v_rel_kms = 20.0  # Default fallback
                        v_inf_kms = 20.0
                    asteroid = AsteroidData(
                        designation=designation,
                        orbit_id=orbit_id,
                        close_approach_data=[
                            CloseApproachData(
                                date_julian=close_date_jd,
                                date_string=close_date_str or "Unknown",
                                distance_au=distance_au,
                                distance_km=distance_au * self.au_to_km,
                                velocity_kms=v_rel_kms,
                                uncertainty_km=(distance_max_au - distance_min_au) * self.au_to_km
                            )
                        ],
                        orbital_elements=OrbitalElements()
                    )
                    asteroids.append(asteroid)
                    print(f"[SUCCESS] Row {row_idx}: {designation} parsed successfully")
                except Exception as e:
                    print(f"[ERROR] CAD row {row_idx} parse hatasý: {e}")
                    continue
            print(f"[INFO] CAD parsing tamamlandý: {len(asteroids)}/{len(data_rows)} asteroid")
            return asteroids
        except Exception as e:
            print(f"[ERROR] CAD data parse genel hatasý: {e}")
            return []
    def calculate_orbital_elements(self, asteroid: AsteroidData) -> OrbitalElements:
        """Calculate orbital elements from close approach data"""
        try:
            if not asteroid.close_approach_data:
                return OrbitalElements()
            approach = asteroid.close_approach_data[0]
            mu_sun = 1.327e20  # m³/s² - Standard gravitational parameter of Sun
            r = approach.distance_km * 1000  # meters
            v = approach.velocity_kms * 1000  # m/s
            semi_major_axis_m = (mu_sun * r) / (2 * mu_sun - r * v * v)
            semi_major_axis_au = semi_major_axis_m / (self.au_to_km * 1000)
            if semi_major_axis_au <= 0:
                semi_major_axis_au = approach.distance_au * 2  # Fallback
            eccentricity = min(0.99, abs(1.0 - approach.distance_au / semi_major_axis_au))
            orbital_period_years = math.pow(abs(semi_major_axis_au), 1.5)
            perihelion_au = semi_major_axis_au * (1 - eccentricity)
            aphelion_au = semi_major_axis_au * (1 + eccentricity)
            return OrbitalElements(
                semi_major_axis_au=semi_major_axis_au,
                eccentricity=eccentricity,
                inclination_deg=None,  # Not calculable from close approach data alone
                perihelion_distance_au=max(0.1, perihelion_au),
                aphelion_distance_au=aphelion_au,
                orbital_period_years=orbital_period_years
            )
        except Exception as e:
            print(f"[ERROR] Orbital elements calculation error: {e}")
            return OrbitalElements()
    def assess_threat_level(self, asteroid: AsteroidData, diameter_km: Optional[float] = None) -> RiskAssessment:
        """Assess asteroid threat level"""
        try:
            if not asteroid.close_approach_data:
                return RiskAssessment(
                    threat_level=ThreatLevel.MINIMAL,
                    impact_probability=0.0,
                    monitoring_priority=1,
                    recommendations=["Insufficient data for assessment"]
                )
            approach = asteroid.close_approach_data[0]
            distance_km = approach.distance_km
            velocity_kms = approach.velocity_kms
            if distance_km < 100000:  # 100,000 km
                base_probability = 0.001  # 0.1%
                threat_level = ThreatLevel.CRITICAL
                priority = 5
            elif distance_km < 500000:  # 500,000 km
                base_probability = 0.0001  # 0.01%
                threat_level = ThreatLevel.HIGH
                priority = 4
            elif distance_km < 2000000:  # 2M km
                base_probability = 0.00001  # 0.001%
                threat_level = ThreatLevel.MODERATE
                priority = 3
            elif distance_km < 7500000:  # 7.5M km (about 0.05 AU)
                base_probability = 0.000001  # 0.0001%
                threat_level = ThreatLevel.LOW
                priority = 2
            else:
                base_probability = 0.0000001  # 0.00001%
                threat_level = ThreatLevel.MINIMAL
                priority = 1
            velocity_factor = min(3.0, velocity_kms / 10.0)  # Cap at 3x
            impact_probability = base_probability * velocity_factor
            impact_energy_megatons = None
            damage_radius_km = None
            if diameter_km:
                mass_kg = (4/3 * math.pi * (diameter_km * 500) ** 3) * 2500
                kinetic_energy_joules = 0.5 * mass_kg * (velocity_kms * 1000) ** 2
                impact_energy_megatons = kinetic_energy_joules / 4.184e15
                damage_radius_km = 10 * (impact_energy_megatons ** 0.33)  # Simplified
            recommendations = []
            if threat_level in [ThreatLevel.CRITICAL, ThreatLevel.HIGH]:
                recommendations.append("Immediate continuous monitoring required")
                recommendations.append("Calculate precise trajectory and impact probability")
                recommendations.append("Prepare deflection mission scenarios")
            elif threat_level == ThreatLevel.MODERATE:
                recommendations.append("Increase observation frequency")
                recommendations.append("Refine orbital parameters")
                recommendations.append("Monitor for trajectory changes")
            else:
                recommendations.append("Continue routine monitoring")
                recommendations.append("Update orbital data periodically")
            return RiskAssessment(
                threat_level=threat_level,
                impact_probability=impact_probability,
                monitoring_priority=priority,
                impact_energy_megatons=impact_energy_megatons,
                damage_radius_km=damage_radius_km,
                recommendations=recommendations
            )
        except Exception as e:
            print(f"[ERROR] Threat assessment error: {e}")
            return RiskAssessment(
                threat_level=ThreatLevel.MINIMAL,
                impact_probability=0.0,
                monitoring_priority=1,
                recommendations=["Assessment failed due to data error"]
            )
    def calculate_comprehensive_analysis(self, 
                                       cad_data: Dict[str, Any], 
                                       fireball_data: Dict[str, Any],
                                       asteroid_diameter_km: Optional[float] = None) -> Dict[str, Any]:
        """Comprehensive asteroid analysis - FIXED VERSION"""
        start_time = time.time()
        try:
            asteroids = self.parse_cad_data(cad_data)
            if not asteroids:
                return {
                    'success': False,
                    'error': 'CAD verisi parse edilemedi',
                    'calculation_time_seconds': time.time() - start_time
                }
            analyzed_asteroids = []
            for asteroid in asteroids:
                asteroid.orbital_elements = self.calculate_orbital_elements(asteroid)
                asteroid.estimated_diameter_km = asteroid_diameter_km
                risk_assessment = self.assess_threat_level(asteroid, asteroid_diameter_km)
                analyzed_asteroids.append({
                    'asteroid': asteroid,
                    'risk': risk_assessment
                })
            closest_asteroid = min(analyzed_asteroids, 
                                 key=lambda x: x['asteroid'].close_approach_data[0].distance_km)
            closest_approach = closest_asteroid['asteroid'].close_approach_data[0]
            closest_risk = closest_asteroid['risk']
            closest_orbital = closest_asteroid['asteroid'].orbital_elements
            total_approaches = len(analyzed_asteroids)
            future_approaches = sum(1 for a in analyzed_asteroids 
                                  if a['asteroid'].close_approach_data[0].date_julian > 2460000)
            threat_counts = {}
            for level in ThreatLevel:
                threat_counts[level.value] = sum(1 for a in analyzed_asteroids 
                                               if a['risk'].threat_level == level)
            fireball_context = self.analyze_fireball_context(fireball_data)
            return {
                'success': True,
                'calculation_time_seconds': time.time() - start_time,
                'closest_approach': {
                    'designation': closest_asteroid['asteroid'].designation,
                    'date': closest_approach.date_string,
                    'date_julian': closest_approach.date_julian,
                    'distance_km': closest_approach.distance_km,
                    'distance_au': closest_approach.distance_au,
                    'velocity_kms': closest_approach.velocity_kms,
                    'uncertainty_km': closest_approach.uncertainty_km
                },
                'orbital_elements': {
                    'semi_major_axis_au': closest_orbital.semi_major_axis_au,
                    'eccentricity': closest_orbital.eccentricity,
                    'orbital_period_years': closest_orbital.orbital_period_years,
                    'perihelion_distance_au': closest_orbital.perihelion_distance_au,
                    'aphelion_distance_au': closest_orbital.aphelion_distance_au
                },
                'risk_assessment': {
                    'threat_level': closest_risk.threat_level.value,
                    'impact_probability': closest_risk.impact_probability,
                    'monitoring_priority': closest_risk.monitoring_priority,
                    'impact_energy_megatons': closest_risk.impact_energy_megatons,
                    'damage_radius_km': closest_risk.damage_radius_km
                },
                'statistics': {
                    'total_approaches': total_approaches,
                    'threat_distribution': threat_counts,
                    'average_distance_km': sum(a['asteroid'].close_approach_data[0].distance_km 
                                             for a in analyzed_asteroids) / total_approaches,
                    'average_velocity_kms': sum(a['asteroid'].close_approach_data[0].velocity_kms 
                                              for a in analyzed_asteroids) / total_approaches
                },
                'future_approaches_count': future_approaches,
                'fireball_context': fireball_context,
                'recommendations': closest_risk.recommendations[:5]  # Top 5 recommendations
            }
        except Exception as e:
            print(f"[ERROR] Comprehensive analysis error: {e}")
            return {
                'success': False,
                'error': str(e),
                'calculation_time_seconds': time.time() - start_time
            }
    def analyze_fireball_context(self, fireball_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze fireball data for context"""
        try:
            if not fireball_data.get('success'):
                return {'analysis': 'Fireball data not available'}
            fb_data = fireball_data.get('data', {})
            events = fb_data.get('data', [])
            if not events:
                return {'analysis': 'No recent fireball events'}
            event_count = len(events)
            try:
                energies = []
                for event in events:
                    if len(event) > 1:
                        energy_str = str(event[1])
                        if energy_str.replace('.', '').isdigit():
                            energies.append(float(energy_str))
                if energies:
                    avg_energy = sum(energies) / len(energies)
                    return {
                        'recent_events_count': event_count,
                        'average_energy_kilotons': avg_energy,
                        'analysis': f'{event_count} recent fireball events detected with average energy of {avg_energy:.1f} kilotons'
                    }
            except Exception:
                pass
            return {
                'recent_events_count': event_count,
                'analysis': f'{event_count} recent fireball events detected'
            }
        except Exception as e:
            print(f"[ERROR] Fireball analysis error: {e}")
            return {'analysis': 'Fireball analysis failed'}
_fixed_engine_instance = None
def get_fixed_orbital_mechanics_engine() -> FixedOrbitalMechanicsEngine:
    """Get fixed orbital mechanics engine singleton"""
    global _fixed_engine_instance
    if _fixed_engine_instance is None:
        _fixed_engine_instance = FixedOrbitalMechanicsEngine()
    return _fixed_engine_instance

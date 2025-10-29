#!/usr/bin/env python3
"""
Advanced Orbital Mechanics Engine for Asteroid Calculations
CAD ve Fireball verilerini kullanarak asteroid yörüngesi hesaplama motoru
"""

import asyncio
import math
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import logging
from dataclasses import dataclass
from enum import Enum
import numpy as np

logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    """Threat level classification"""
    MINIMAL = "minimal"      # > 7.5M km, low velocity
    LOW = "low"             # 1-7.5M km, normal velocity
    MODERATE = "moderate"   # 0.5-1M km, high velocity
    HIGH = "high"           # < 0.5M km, very high velocity
    CRITICAL = "critical"   # < 0.1M km, extreme velocity

@dataclass
class AsteroidData:
    """Asteroid data structure"""
    id: str
    name: str
    designation: str
    discovery_date: Optional[datetime] = None
    absolute_magnitude: Optional[float] = None
    estimated_diameter_km: Optional[float] = None

@dataclass
class OrbitalElements:
    """Orbital elements for asteroid"""
    semi_major_axis: Optional[float] = None     # AU
    eccentricity: Optional[float] = None        # 0-1
    inclination: Optional[float] = None         # degrees
    ascending_node: Optional[float] = None      # degrees
    arg_perihelion: Optional[float] = None      # degrees
    mean_anomaly: Optional[float] = None        # degrees
    epoch: Optional[datetime] = None            # reference time
    perihelion_distance: Optional[float] = None # AU
    aphelion_distance: Optional[float] = None   # AU
    orbital_period: Optional[float] = None      # years

@dataclass
class CloseApproachData:
    """Close approach data structure"""
    approach_date: datetime
    distance_km: float
    distance_au: float
    velocity_kmh: float
    velocity_kms: float
    approach_angle: Optional[float] = None
    uncertainty: Optional[str] = None

@dataclass
class RiskAssessment:
    """Risk assessment results"""
    threat_level: ThreatLevel
    impact_probability: float              # 0-1
    impact_energy_megatons: Optional[float] = None
    potential_damage_radius_km: Optional[float] = None
    time_to_impact: Optional[timedelta] = None
    monitoring_priority: int = 1           # 1-5 scale

class OrbitalMechanicsEngine:
    """Advanced orbital mechanics calculation engine"""
    
    # Constants
    AU_TO_KM = 149597870.7           # Astronomical Unit to kilometers
    EARTH_RADIUS_KM = 6371.0         # Earth's radius
    GRAVITATIONAL_CONSTANT = 6.67430e-11  # m^3 kg^-1 s^-2
    SUN_MASS_KG = 1.98847e30         # kg
    EARTH_MASS_KG = 5.97219e24       # kg
    
    def __init__(self):
        self.calculation_cache: Dict[str, Any] = {}
        self.last_calculation_time = datetime.now()
    
    def parse_cad_data(self, cad_response: Dict[str, Any]) -> List[CloseApproachData]:
        """CAD API yanıtını parse et"""
        approaches = []
        
        try:
            data = cad_response.get('data', [])
            fields = cad_response.get('fields', [])
            
            # Field mapping (CAD API documentation based)
            field_map = {}
            for i, field in enumerate(fields):
                field_map[field] = i
            
            for row in data:
                try:
                    # Parse date (Julian Date to datetime)
                    cd_index = field_map.get('cd', 2)  # close approach date
                    julian_date = float(row[cd_index])
                    approach_date = self.julian_to_datetime(julian_date)
                    
                    # Parse distance
                    dist_index = field_map.get('dist', 4)  # distance in AU
                    distance_au = float(row[dist_index])
                    distance_km = distance_au * self.AU_TO_KM
                    
                    # Parse velocity
                    v_rel_index = field_map.get('v_rel', 7)  # relative velocity km/s
                    if v_rel_index < len(row) and row[v_rel_index]:
                        velocity_kms = float(row[v_rel_index])
                        velocity_kmh = velocity_kms * 3600
                    else:
                        velocity_kms = 20.0  # Default NEO velocity
                        velocity_kmh = velocity_kms * 3600
                    
                    approach = CloseApproachData(
                        approach_date=approach_date,
                        distance_km=distance_km,
                        distance_au=distance_au,
                        velocity_kmh=velocity_kmh,
                        velocity_kms=velocity_kms
                    )
                    approaches.append(approach)
                    
                except (ValueError, IndexError, TypeError) as e:
                    logger.warning(f"CAD data row parse hatası: {e}")
                    continue
            
            logger.info(f"CAD verisi parse edildi: {len(approaches)} yaklaşım")
            return approaches
            
        except Exception as e:
            logger.error(f"CAD data parse hatası: {e}")
            return []
    
    def julian_to_datetime(self, julian_date: float) -> datetime:
        """Julian Date'i datetime'a çevir"""
        try:
            # Julian Date epoch: January 1, 4713 BCE
            # Modified Julian Date for easier calculation
            mjd = julian_date - 2400000.5
            epoch = datetime(1858, 11, 17)  # MJD epoch
            return epoch + timedelta(days=mjd)
        except:
            # Fallback: current time + estimated days
            days_ahead = max(0, julian_date - 2460000)  # Rough estimation
            return datetime.now() + timedelta(days=days_ahead)
    
    def calculate_orbital_elements(self, approach_data: CloseApproachData) -> OrbitalElements:
        """Yaklaşım verilerinden orbital elementleri hesapla"""
        try:
            # Simplified orbital calculations based on approach data
            distance_au = approach_data.distance_au
            velocity_kms = approach_data.velocity_kms
            
            # Estimate semi-major axis using vis-viva equation
            # v² = GM(2/r - 1/a) where a is semi-major axis
            r = distance_au  # current distance
            v = velocity_kms * 1000  # convert to m/s
            mu = self.GRAVITATIONAL_CONSTANT * self.SUN_MASS_KG  # GM for Sun
            r_meters = r * self.AU_TO_KM * 1000  # convert to meters
            
            # Calculate semi-major axis
            a_meters = 1 / (2/r_meters - v*v/mu)
            semi_major_axis = abs(a_meters) / (self.AU_TO_KM * 1000)  # convert back to AU
            
            # Estimate eccentricity (rough approximation)
            # For NEOs, typically 0.1 to 0.9
            eccentricity = min(0.9, max(0.1, (semi_major_axis - r) / semi_major_axis))
            
            # Calculate perihelion and aphelion
            perihelion = semi_major_axis * (1 - eccentricity)
            aphelion = semi_major_axis * (1 + eccentricity)
            
            # Estimate orbital period using Kepler's third law
            # P² = a³ (in years)
            orbital_period = math.sqrt(semi_major_axis ** 3)
            
            # Rough estimates for other elements
            inclination = min(30.0, max(0.5, distance_au * 10))  # Rough estimation
            
            return OrbitalElements(
                semi_major_axis=semi_major_axis,
                eccentricity=eccentricity,
                perihelion_distance=perihelion,
                aphelion_distance=aphelion,
                orbital_period=orbital_period,
                inclination=inclination,
                epoch=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Orbital elements hesaplama hatası: {e}")
            return OrbitalElements()
    
    def assess_threat_level(self, approach_data: CloseApproachData, 
                           diameter_km: Optional[float] = None) -> RiskAssessment:
        """Threat level değerlendirmesi"""
        try:
            distance_km = approach_data.distance_km
            velocity_kms = approach_data.velocity_kms
            
            # Distance-based threat assessment
            if distance_km > 7500000:  # > 7.5M km
                base_threat = ThreatLevel.MINIMAL
                impact_prob = 0.0001
            elif distance_km > 1000000:  # 1-7.5M km
                base_threat = ThreatLevel.LOW
                impact_prob = 0.001
            elif distance_km > 500000:   # 0.5-1M km
                base_threat = ThreatLevel.MODERATE
                impact_prob = 0.01
            elif distance_km > 100000:   # 0.1-0.5M km
                base_threat = ThreatLevel.HIGH
                impact_prob = 0.1
            else:                        # < 0.1M km
                base_threat = ThreatLevel.CRITICAL
                impact_prob = 0.5
            
            # Velocity factor (higher velocity = higher threat)
            velocity_factor = min(2.0, velocity_kms / 20.0)  # 20 km/s baseline
            impact_prob *= velocity_factor
            
            # Size factor
            energy_megatons = None
            damage_radius = None
            
            if diameter_km:
                # Kinetic energy: E = 0.5 * m * v²
                # Rough mass estimation: m ≈ density * volume
                density = 2.5e12  # kg/km³ (typical asteroid density)
                mass_kg = density * (4/3) * math.pi * (diameter_km/2)**3
                
                velocity_ms = velocity_kms * 1000
                kinetic_energy_joules = 0.5 * mass_kg * velocity_ms**2
                
                # Convert to megatons TNT (1 megaton = 4.184e15 Joules)
                energy_megatons = kinetic_energy_joules / 4.184e15
                
                # Damage radius rough estimation
                damage_radius = math.sqrt(energy_megatons) * 10  # km
                
                # Adjust threat level based on size
                if diameter_km > 1.0:  # > 1km
                    if base_threat.value in ['minimal', 'low']:
                        base_threat = ThreatLevel.MODERATE
                elif diameter_km > 0.1:  # 100m - 1km  
                    if base_threat == ThreatLevel.MINIMAL:
                        base_threat = ThreatLevel.LOW
            
            # Time to impact
            days_to_impact = (approach_data.approach_date - datetime.now()).days
            time_to_impact = timedelta(days=max(0, days_to_impact))
            
            # Monitoring priority (1-5, higher = more urgent)
            priority = 1
            if base_threat == ThreatLevel.CRITICAL:
                priority = 5
            elif base_threat == ThreatLevel.HIGH:
                priority = 4
            elif base_threat == ThreatLevel.MODERATE:
                priority = 3
            elif base_threat == ThreatLevel.LOW:
                priority = 2
            
            return RiskAssessment(
                threat_level=base_threat,
                impact_probability=min(1.0, impact_prob),
                impact_energy_megatons=energy_megatons,
                potential_damage_radius_km=damage_radius,
                time_to_impact=time_to_impact,
                monitoring_priority=priority
            )
            
        except Exception as e:
            logger.error(f"Threat assessment hatası: {e}")
            return RiskAssessment(
                threat_level=ThreatLevel.LOW,
                impact_probability=0.001,
                monitoring_priority=1
            )
    
    def calculate_comprehensive_analysis(self, cad_data: Dict[str, Any], 
                                       fireball_data: Dict[str, Any],
                                       asteroid_diameter_km: Optional[float] = None) -> Dict[str, Any]:
        """Kapsamlı asteroid analizi"""
        try:
            start_time = datetime.now()
            
            # Parse close approach data
            approaches = self.parse_cad_data(cad_data)
            
            if not approaches:
                return {
                    'success': False,
                    'error': 'CAD verisi parse edilemedi',
                    'timestamp': start_time.isoformat()
                }
            
            # En yakın yaklaşımı seç
            closest_approach = min(approaches, key=lambda x: x.distance_km)
            
            # Orbital elements hesapla
            orbital_elements = self.calculate_orbital_elements(closest_approach)
            
            # Risk assessment
            risk_assessment = self.assess_threat_level(closest_approach, asteroid_diameter_km)
            
            # Fireball data analysis (historical impact context)
            fireball_analysis = self.analyze_fireball_context(fireball_data)
            
            # İstatistikler
            approach_stats = {
                'total_approaches': len(approaches),
                'closest_distance_km': closest_approach.distance_km,
                'closest_distance_au': closest_approach.distance_au,
                'average_velocity_kms': sum(a.velocity_kms for a in approaches) / len(approaches),
                'approach_date_range': {
                    'earliest': min(a.approach_date for a in approaches).isoformat(),
                    'latest': max(a.approach_date for a in approaches).isoformat()
                }
            }
            
            # Yörünge predictions (gelecek yaklaşımlar)
            future_approaches = [a for a in approaches if a.approach_date > datetime.now()]
            
            calculation_time = (datetime.now() - start_time).total_seconds()
            
            return {
                'success': True,
                'timestamp': start_time.isoformat(),
                'calculation_time_seconds': calculation_time,
                'closest_approach': {
                    'date': closest_approach.approach_date.isoformat(),
                    'distance_km': closest_approach.distance_km,
                    'distance_au': closest_approach.distance_au,
                    'velocity_kms': closest_approach.velocity_kms,
                    'velocity_kmh': closest_approach.velocity_kmh
                },
                'orbital_elements': {
                    'semi_major_axis_au': orbital_elements.semi_major_axis,
                    'eccentricity': orbital_elements.eccentricity,
                    'inclination_degrees': orbital_elements.inclination,
                    'perihelion_distance_au': orbital_elements.perihelion_distance,
                    'aphelion_distance_au': orbital_elements.aphelion_distance,
                    'orbital_period_years': orbital_elements.orbital_period
                },
                'risk_assessment': {
                    'threat_level': risk_assessment.threat_level.value,
                    'impact_probability': risk_assessment.impact_probability,
                    'impact_energy_megatons': risk_assessment.impact_energy_megatons,
                    'damage_radius_km': risk_assessment.potential_damage_radius_km,
                    'monitoring_priority': risk_assessment.monitoring_priority,
                    'time_to_closest_approach_days': risk_assessment.time_to_impact.days if risk_assessment.time_to_impact else None
                },
                'statistics': approach_stats,
                'future_approaches_count': len(future_approaches),
                'fireball_context': fireball_analysis,
                'recommendations': self.generate_recommendations(risk_assessment, orbital_elements)
            }
            
        except Exception as e:
            logger.error(f"Comprehensive analysis hatası: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def analyze_fireball_context(self, fireball_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fireball verilerini analiz et (historical context)"""
        try:
            if not fireball_data.get('success'):
                return {'analysis': 'Fireball verisi mevcut değil'}
            
            data = fireball_data.get('data', {}).get('data', [])
            
            if not data:
                return {'analysis': 'Fireball verisi boş'}
            
            # Son 5 fireball için analiz
            recent_events = []
            total_energy = 0
            
            for event in data[:5]:
                try:
                    if len(event) >= 2:
                        date_str = event[0]
                        energy_str = event[1]
                        
                        # Parse date
                        event_date = datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
                        
                        # Parse energy (kt TNT equivalent)
                        energy_kt = float(energy_str)
                        total_energy += energy_kt
                        
                        recent_events.append({
                            'date': event_date.isoformat(),
                            'energy_kilotons': energy_kt
                        })
                        
                except (ValueError, IndexError) as e:
                    logger.warning(f"Fireball event parse hatası: {e}")
                    continue
            
            avg_energy = total_energy / len(recent_events) if recent_events else 0
            
            return {
                'recent_events_count': len(recent_events),
                'average_energy_kilotons': avg_energy,
                'total_energy_kilotons': total_energy,
                'recent_events': recent_events[:3],  # Show last 3
                'analysis': f'Son {len(recent_events)} fireball olayı analiz edildi. Ortalama enerji: {avg_energy:.1f} kt'
            }
            
        except Exception as e:
            logger.error(f"Fireball analysis hatası: {e}")
            return {'analysis': f'Fireball analiz hatası: {str(e)}'}
    
    def generate_recommendations(self, risk: RiskAssessment, orbital: OrbitalElements) -> List[str]:
        """Öneriler üret"""
        recommendations = []
        
        if risk.threat_level == ThreatLevel.CRITICAL:
            recommendations.extend([
                "ACİL: Sürekli izleme gerekli",
                "Uluslararası uzay ajansları bilgilendirilmeli",
                "Deflection mission planları değerlendirilmeli"
            ])
        elif risk.threat_level == ThreatLevel.HIGH:
            recommendations.extend([
                "Yoğun gözlem programı başlatılmalı",
                "Yörünge parametreleri düzenli güncellenilmeli",
                "Acil durum planları gözden geçirilmeli"
            ])
        elif risk.threat_level == ThreatLevel.MODERATE:
            recommendations.extend([
                "Düzenli teleskop gözlemi yapılmalı",
                "Yörünge tahminleri geliştirilmeli"
            ])
        else:
            recommendations.extend([
                "Normal gözlem rutini sürdürülmeli",
                "Periyodik kontroller yapılmalı"
            ])
        
        # Orbital element based recommendations
        if orbital.eccentricity and orbital.eccentricity > 0.7:
            recommendations.append("Yüksek eksantriklik: Yörünge belirsizliği artırılmış izleme gerektirir")
        
        if orbital.inclination and orbital.inclination > 20:
            recommendations.append("Yüksek eğim açısı: Ek gözlem noktaları gerekli")
        
        return recommendations[:5]  # Max 5 recommendation

# Singleton instance
orbital_engine = OrbitalMechanicsEngine()

def get_orbital_mechanics_engine() -> OrbitalMechanicsEngine:
    """Orbital mechanics engine instance"""
    return orbital_engine
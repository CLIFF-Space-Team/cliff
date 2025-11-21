import asyncio
import logging
import math
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import structlog
import math
import statistics
from pydantic import BaseModel, Field
try:
    import numpy as np
except ImportError:
    logger.warning("NumPy not available, using fallback math operations")
    np = None
from .intelligent_threat_processor import ThreatAnalysisResult, ThreatType, intelligent_threat_processor
from .unified_ai_service import unified_ai_service, UnifiedChatRequest
from ..core.config import settings
logger = structlog.get_logger(__name__)
class PriorityLevel(str, Enum):
    
    CRITICAL = "critical"      # 0.8-1.0
    HIGH = "high"             # 0.6-0.8
    MEDIUM = "medium"         # 0.4-0.6
    LOW = "low"              # 0.2-0.4
    MINIMAL = "minimal"       # 0.0-0.2
class ImpactCategory(str, Enum):
    
    GLOBAL = "global"
    REGIONAL = "regional"
    LOCAL = "local"
    MINIMAL = "minimal"
@dataclass
class PriorityScore:
    
    threat_id: str
    overall_score: float  # 0.0 - 1.0
    priority_level: PriorityLevel
    impact_probability_score: float
    damage_potential_score: float
    time_criticality_score: float
    data_reliability_score: float
    confidence_score: float
    urgency_multiplier: float
    impact_category: ImpactCategory
    time_to_impact_hours: Optional[float]
    score_evolution_trend: str  # 'increasing', 'decreasing', 'stable'
    simulation_results: Optional[Dict[str, Any]] = None
    calculation_timestamp: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    version: int = 1
class PriorityQueue:
    
    def __init__(self, max_size: int = 1000):
        self.queue: List[PriorityScore] = []
        self.max_size = max_size
        self.threat_index: Dict[str, int] = {}  # threat_id -> queue_index
    def add_or_update(self, priority_score: PriorityScore):
        
        threat_id = priority_score.threat_id
        if threat_id in self.threat_index:
            idx = self.threat_index[threat_id]
            self.queue[idx] = priority_score
        else:
            self.queue.append(priority_score)
            self.threat_index[threat_id] = len(self.queue) - 1
        self._resort_queue()
        if len(self.queue) > self.max_size:
            self._trim_queue()
    def get_top_priorities(self, limit: int = 10) -> List[PriorityScore]:
        
        return self.queue[:limit]
    def get_by_level(self, level: PriorityLevel) -> List[PriorityScore]:
        
        return [ps for ps in self.queue if ps.priority_level == level]
    def remove_threat(self, threat_id: str) -> bool:
        
        if threat_id in self.threat_index:
            idx = self.threat_index[threat_id]
            del self.queue[idx]
            del self.threat_index[threat_id]
            self._rebuild_index()
            return True
        return False
    def _resort_queue(self):
        
        self.queue.sort(key=lambda x: x.overall_score, reverse=True)
        self._rebuild_index()
    def _rebuild_index(self):
        
        self.threat_index = {
            score.threat_id: idx for idx, score in enumerate(self.queue)
        }
    def _trim_queue(self):
        
        if len(self.queue) > self.max_size:
            self.queue = self.queue[:self.max_size]
            self._rebuild_index()
class MonteCarloSimulator:
    
    def __init__(self, num_simulations: int = 10000):
        self.num_simulations = num_simulations
    async def simulate_asteroid_impact(self, threat_data: Dict) -> Dict[str, Any]:
        
        try:
            nominal_distance = threat_data.get('miss_distance_km', 7500000)  # 7.5M km default
            distance_uncertainty = threat_data.get('distance_uncertainty', 0.1)
            velocity = threat_data.get('velocity_km_per_second', 20)
            diameter = threat_data.get('estimated_diameter_max', 100)
            impact_probabilities = []
            damage_estimates = []
            for _ in range(self.num_simulations):
                if np is not None:
                    actual_distance = np.random.normal(
                        nominal_distance,
                        nominal_distance * distance_uncertainty
                    )
                else:
                    actual_distance = nominal_distance + random.gauss(0, nominal_distance * distance_uncertainty)
                earth_radius = 6371  # km
                impact_prob = max(0, 1 - (actual_distance / (earth_radius * 100)))
                impact_probabilities.append(impact_prob)
                if impact_prob > 0.001:  # If significant impact chance
                    kinetic_energy = 0.5 * (diameter ** 3) * (velocity ** 2) / 1000000
                    damage_score = min(1.0, kinetic_energy / 1000)  # Normalize
                else:
                    damage_score = 0.0
                damage_estimates.append(damage_score)
            if np is not None:
                mean_impact_prob = np.mean(impact_probabilities)
                std_impact_prob = np.std(impact_probabilities)
                mean_damage = np.mean(damage_estimates)
                impact_prob_95_ci = np.percentile(impact_probabilities, [2.5, 97.5])
                damage_95_ci = np.percentile(damage_estimates, [2.5, 97.5])
                high_risk_pct = float(np.sum(np.array(damage_estimates) > 0.7) / self.num_simulations * 100)
            else:
                mean_impact_prob = statistics.mean(impact_probabilities)
                std_impact_prob = statistics.stdev(impact_probabilities) if len(impact_probabilities) > 1 else 0.0
                mean_damage = statistics.mean(damage_estimates)
                sorted_impact = sorted(impact_probabilities)
                sorted_damage = sorted(damage_estimates)
                n = len(sorted_impact)
                impact_prob_95_ci = [sorted_impact[int(n*0.025)], sorted_impact[int(n*0.975)]]
                damage_95_ci = [sorted_damage[int(n*0.025)], sorted_damage[int(n*0.975)]]
                high_risk_pct = float(len([d for d in damage_estimates if d > 0.7]) / self.num_simulations * 100)
            return {
                'simulation_type': 'asteroid_impact',
                'mean_impact_probability': float(mean_impact_prob),
                'impact_probability_std': float(std_impact_prob),
                'mean_damage_potential': float(mean_damage),
                'impact_probability_95_ci': impact_prob_95_ci if np is not None else impact_prob_95_ci,
                'damage_potential_95_ci': damage_95_ci if np is not None else damage_95_ci,
                'high_risk_scenarios_pct': high_risk_pct,
                'simulation_count': self.num_simulations,
                'confidence_level': self._calculate_simulation_confidence(impact_probabilities)
            }
        except Exception as e:
            logger.error(f"Monte Carlo asteroid simulation error: {str(e)}")
            return self._fallback_simulation_result('asteroid_impact')
    async def simulate_space_weather_impact(self, threat_data: Dict) -> Dict[str, Any]:
        
        try:
            solar_flux = threat_data.get('solar_flux', 100)
            geomagnetic_index = threat_data.get('kp_index', 3)
            duration_hours = threat_data.get('duration_hours', 12)
            impact_probabilities = []
            severity_scores = []
            for _ in range(self.num_simulations):
                if np is not None:
                    actual_flux = np.random.normal(solar_flux, solar_flux * 0.2)
                    actual_kp = np.random.normal(geomagnetic_index, 0.5)
                    actual_duration = np.random.normal(duration_hours, duration_hours * 0.3)
                else:
                    actual_flux = solar_flux + random.gauss(0, solar_flux * 0.2)
                    actual_kp = geomagnetic_index + random.gauss(0, 0.5)
                    actual_duration = duration_hours + random.gauss(0, duration_hours * 0.3)
                flux_factor = min(actual_flux / 200, 1.0)  # Normalize
                kp_factor = min(actual_kp / 9, 1.0)  # Kp scale 0-9
                duration_factor = min(actual_duration / 48, 1.0)  # Max 48h
                impact_prob = (flux_factor * 0.4 + kp_factor * 0.4 + duration_factor * 0.2)
                impact_probabilities.append(impact_prob)
                severity = flux_factor * kp_factor * (1 + duration_factor * 0.5)
                severity_scores.append(min(severity, 1.0))
            if np is not None:
                mean_impact = np.mean(impact_probabilities)
                mean_severity = np.mean(severity_scores)
                comm_disruption_risk = float(np.mean([s for s in severity_scores if s > 0.5]))
            else:
                mean_impact = statistics.mean(impact_probabilities)
                mean_severity = statistics.mean(severity_scores)
                high_sev_scores = [s for s in severity_scores if s > 0.5]
                comm_disruption_risk = float(statistics.mean(high_sev_scores) if high_sev_scores else 0.0)
            return {
                'simulation_type': 'space_weather',
                'mean_impact_probability': float(mean_impact),
                'mean_severity': float(mean_severity),
                'communication_disruption_risk': comm_disruption_risk,
                'satellite_impact_probability': float(mean_impact * 0.8),  # Slightly lower
                'power_grid_risk': float(mean_severity * 0.6),  # Regional effect
                'simulation_count': self.num_simulations,
                'confidence_level': self._calculate_simulation_confidence(impact_probabilities)
            }
        except Exception as e:
            logger.error(f"Monte Carlo space weather simulation error: {str(e)}")
            return self._fallback_simulation_result('space_weather')
    def _calculate_simulation_confidence(self, probabilities: List[float]) -> float:
        
        if not probabilities:
            return 0.0
        if np is not None:
            std_error = np.std(probabilities) / np.sqrt(len(probabilities))
        else:
            std_dev = statistics.stdev(probabilities) if len(probabilities) > 1 else 0.0
            std_error = std_dev / math.sqrt(len(probabilities))
        confidence = max(0.0, 1.0 - (std_error * 4))  # Empirical formula
        return float(confidence)
    def _fallback_simulation_result(self, sim_type: str) -> Dict[str, Any]:
        
        return {
            'simulation_type': sim_type,
            'mean_impact_probability': 0.1,
            'simulation_error': True,
            'confidence_level': 0.2,
            'simulation_count': 0
        }
class RealtimePriorityEngine:
    
    PRIORITY_WEIGHTS = {
        "impact_probability": 0.35,    # Çarpma/Etki olasılığı
        "damage_potential": 0.25,     # Hasar potansiyeli
        "time_criticality": 0.20,     # Zaman kritiği
        "data_reliability": 0.20      # Veri güvenilirliği
    }
    def __init__(self):
        self.priority_queue = PriorityQueue(max_size=1000)
        self.monte_carlo = MonteCarloSimulator()
        self.ai_service = unified_ai_service
        self.threat_processor = intelligent_threat_processor
        self._cache = {}
        self._cache_ttl = 300  # 5 minutes
        logger.info("Realtime Priority Engine initialized")
    async def calculate_dynamic_priority(self, threat_data: Dict) -> PriorityScore:
        
        threat_id = threat_data.get('threat_id', f"threat_{int(datetime.now().timestamp())}")
        logger.info(f"Calculating dynamic priority for threat {threat_id}")
        try:
            analysis_tasks = [
                self._assess_impact_probability(threat_data),
                self._calculate_damage_potential(threat_data),
                self._assess_time_criticality(threat_data),
                self._validate_data_reliability(threat_data)
            ]
            results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            impact_score = self._handle_score_result(results[0], 'impact_probability', 0.1)
            damage_score = self._handle_score_result(results[1], 'damage_potential', 0.3)
            time_score = self._handle_score_result(results[2], 'time_criticality', 0.5)
            reliability_score = self._handle_score_result(results[3], 'data_reliability', 0.7)
            priority_score = (
                impact_score * self.PRIORITY_WEIGHTS["impact_probability"] +
                damage_score * self.PRIORITY_WEIGHTS["damage_potential"] +
                time_score * self.PRIORITY_WEIGHTS["time_criticality"] +
                reliability_score * self.PRIORITY_WEIGHTS["data_reliability"]
            )
            if priority_score > 0.6:  # Only for medium+ threats
                ai_enhancement = await self._ai_priority_enhancement(threat_data, priority_score)
                priority_score = min(1.0, priority_score * ai_enhancement)
            simulation_results = None
            if priority_score > 0.7:  # Only for high-risk threats
                simulation_results = await self._run_monte_carlo_simulation(threat_data)
                if simulation_results and not simulation_results.get('simulation_error'):
                    sim_impact = simulation_results.get('mean_impact_probability', 0.1)
                    confidence = simulation_results.get('confidence_level', 0.5)
                    adjustment_factor = (sim_impact * confidence * 0.2) + 0.8
                    priority_score *= adjustment_factor
            urgency_multiplier = self._calculate_urgency_multiplier(threat_data)
            final_score = min(1.0, priority_score * urgency_multiplier)
            priority_result = PriorityScore(
                threat_id=threat_id,
                overall_score=final_score,
                priority_level=self._categorize_priority_level(final_score),
                impact_probability_score=impact_score,
                damage_potential_score=damage_score,
                time_criticality_score=time_score,
                data_reliability_score=reliability_score,
                confidence_score=self._calculate_overall_confidence([
                    impact_score, damage_score, time_score, reliability_score
                ]),
                urgency_multiplier=urgency_multiplier,
                impact_category=self._determine_impact_category(threat_data, damage_score),
                time_to_impact_hours=self._extract_time_to_impact(threat_data),
                score_evolution_trend=self._predict_score_evolution(threat_data),
                simulation_results=simulation_results
            )
            self.priority_queue.add_or_update(priority_result)
            logger.info(f"Priority calculated: {final_score:.3f} ({priority_result.priority_level})")
            return priority_result
        except Exception as e:
            logger.error(f"Priority calculation error for {threat_id}: {str(e)}")
            return self._create_fallback_priority(threat_data, threat_id)
    async def _assess_impact_probability(self, threat_data: Dict) -> float:
        
        try:
            threat_type = threat_data.get('threat_type', 'unknown')
            if threat_type == 'asteroid':
                return await self._asteroid_impact_probability(threat_data)
            elif threat_type == 'space_weather':
                return await self._space_weather_impact_probability(threat_data)
            elif threat_type == 'earth_event':
                return await self._earth_event_impact_probability(threat_data)
            else:
                base_probability = threat_data.get('impact_probability', 0.1)
                severity_factor = self._get_severity_factor(threat_data.get('severity', 'MEDIUM'))
                return min(1.0, base_probability * severity_factor)
        except Exception as e:
            logger.error(f"Impact probability assessment error: {str(e)}")
            return 0.1
    async def _asteroid_impact_probability(self, threat_data: Dict) -> float:
        
        miss_distance = threat_data.get('miss_distance_km', 7500000)
        earth_radius = 6371  # km
        if miss_distance < earth_radius * 10:  # Very close
            base_prob = 0.9
        elif miss_distance < earth_radius * 100:  # Close
            base_prob = 0.5
        elif miss_distance < earth_radius * 1000:  # Moderate distance
            base_prob = 0.1
        else:  # Far
            base_prob = 0.01
        uncertainty = threat_data.get('distance_uncertainty', 0.1)
        adjusted_prob = base_prob * (1 + uncertainty)
        return min(1.0, adjusted_prob)
    async def _space_weather_impact_probability(self, threat_data: Dict) -> float:
        
        kp_index = threat_data.get('kp_index', 3)
        solar_flux = threat_data.get('solar_flux', 100)
        kp_factor = min(kp_index / 9.0, 1.0)
        flux_factor = min(solar_flux / 300.0, 1.0)
        combined_prob = (kp_factor * 0.6 + flux_factor * 0.4)
        return combined_prob
    async def _earth_event_impact_probability(self, threat_data: Dict) -> float:
        
        event_type = threat_data.get('category', 'unknown')
        magnitude = threat_data.get('magnitude', 5.0)
        type_factors = {
            'earthquakes': 0.8,
            'volcanoes': 0.7,
            'severeStorms': 0.6,
            'wildfires': 0.5,
            'floods': 0.4
        }
        type_factor = type_factors.get(event_type, 0.3)
        magnitude_factor = min(magnitude / 10.0, 1.0)
        return type_factor * magnitude_factor
    async def _calculate_damage_potential(self, threat_data: Dict) -> float:
        
        try:
            threat_type = threat_data.get('threat_type', 'unknown')
            if threat_type == 'asteroid':
                diameter = threat_data.get('estimated_diameter_max', 100)  # meters
                velocity = threat_data.get('velocity_km_per_second', 20)
                mass_estimate = (diameter / 100) ** 3  # Relative mass
                kinetic_energy = 0.5 * mass_estimate * (velocity ** 2)
                damage_score = min(1.0, kinetic_energy / 10000)
                return damage_score
            elif threat_type == 'space_weather':
                kp_index = threat_data.get('kp_index', 3)
                duration = threat_data.get('duration_hours', 12)
                kp_damage = min(kp_index / 9.0, 1.0)
                duration_factor = min(duration / 48.0, 1.0)
                return kp_damage * (0.7 + duration_factor * 0.3)
            else:
                severity = self._get_severity_factor(threat_data.get('severity', 'MEDIUM'))
                scale = threat_data.get('scale_factor', 1.0)
                return min(1.0, severity * scale)
        except Exception as e:
            logger.error(f"Damage potential calculation error: {str(e)}")
            return 0.3
    async def _assess_time_criticality(self, threat_data: Dict) -> float:
        
        try:
            time_to_impact = threat_data.get('time_to_impact')
            if not time_to_impact:
                return 0.5  # Default medium criticality
            if isinstance(time_to_impact, str):
                impact_time = self._parse_time_to_impact(time_to_impact)
            else:
                impact_time = time_to_impact  # Assume datetime object
            if impact_time:
                hours_remaining = (impact_time - datetime.now()).total_seconds() / 3600
                if hours_remaining < 6:      # < 6 hours: CRITICAL
                    return 1.0
                elif hours_remaining < 24:   # < 1 day: HIGH
                    return 0.8
                elif hours_remaining < 168:  # < 1 week: MEDIUM
                    return 0.6
                elif hours_remaining < 720:  # < 1 month: LOW
                    return 0.4
                else:                        # > 1 month: MINIMAL
                    return 0.2
            return 0.5
        except Exception as e:
            logger.error(f"Time criticality assessment error: {str(e)}")
            return 0.5
    async def _validate_data_reliability(self, threat_data: Dict) -> float:
        
        try:
            reliability_score = 0.0
            data_source = threat_data.get('data_source', 'unknown').lower()
            source_scores = {
                'nasa': 0.9,
                'esa': 0.85,
                'noaa': 0.8,
                'spacex': 0.7,
                'jpl': 0.95,
                'cneos': 0.9,
                'unknown': 0.3
            }
            reliability_score += source_scores.get(data_source, 0.3) * 0.4
            source_count = len(threat_data.get('data_sources', [data_source]))
            source_factor = min(source_count / 3.0, 1.0)  # Max at 3 sources
            reliability_score += source_factor * 0.3
            last_updated = threat_data.get('last_updated')
            if last_updated:
                if isinstance(last_updated, str):
                    last_updated = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                hours_old = (datetime.now() - last_updated.replace(tzinfo=None)).total_seconds() / 3600
                if hours_old < 1:      # < 1 hour: Excellent
                    freshness = 1.0
                elif hours_old < 6:    # < 6 hours: Good
                    freshness = 0.8
                elif hours_old < 24:   # < 1 day: Fair
                    freshness = 0.6
                else:                  # > 1 day: Poor
                    freshness = 0.3
                reliability_score += freshness * 0.3
            else:
                reliability_score += 0.1  # Unknown freshness
            return min(1.0, reliability_score)
        except Exception as e:
            logger.error(f"Data reliability validation error: {str(e)}")
            return 0.5
    async def _ai_priority_enhancement(self, threat_data: Dict, current_score: float) -> float:
        
        try:
            prompt = f
            request = UnifiedChatRequest(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-2.5-pro",
                temperature=0.1,
                max_tokens=50
            )
            response = await self.ai_service.chat_completion(request)
            if response.success and response.content:
                multiplier_text = response.content.strip()
                try:
                    multiplier = float(multiplier_text)
                    return max(0.8, min(1.2, multiplier))  # Clamp 0.8-1.2
                except ValueError:
                    return 1.0
            return 1.0
        except Exception as e:
            logger.error(f"AI priority enhancement error: {str(e)}")
            return 1.0
    async def _run_monte_carlo_simulation(self, threat_data: Dict) -> Optional[Dict[str, Any]]:
        
        try:
            threat_type = threat_data.get('threat_type', 'unknown')
            if threat_type == 'asteroid':
                return await self.monte_carlo.simulate_asteroid_impact(threat_data)
            elif threat_type == 'space_weather':
                return await self.monte_carlo.simulate_space_weather_impact(threat_data)
            else:
                return None
        except Exception as e:
            logger.error(f"Monte Carlo simulation error: {str(e)}")
            return None
    def _handle_score_result(self, result: Any, score_type: str, default_value: float) -> float:
        
        if isinstance(result, Exception):
            logger.error(f"{score_type} calculation failed: {str(result)}")
            return default_value
        elif isinstance(result, (int, float)):
            return max(0.0, min(1.0, float(result)))
        else:
            logger.warning(f"Unexpected {score_type} result type: {type(result)}")
            return default_value
    def _get_severity_factor(self, severity: str) -> float:
        
        severity_map = {
            'LOW': 0.25,
            'MEDIUM': 0.5, 
            'HIGH': 0.75,
            'CRITICAL': 1.0,
            'DÜŞÜK': 0.25,
            'ORTA': 0.5,
            'YÜKSEK': 0.75,
            'KRİTİK': 1.0
        }
        return severity_map.get(severity.upper(), 0.5)
    def _calculate_urgency_multiplier(self, threat_data: Dict) -> float:
        
        base_multiplier = 1.0
        time_to_impact = self._extract_time_to_impact(threat_data)
        if time_to_impact and time_to_impact < 24:  # < 1 day
            if time_to_impact < 6:
                base_multiplier *= 1.3  # < 6 hours
            elif time_to_impact < 12:
                base_multiplier *= 1.2  # < 12 hours
            else:
                base_multiplier *= 1.1  # < 24 hours
        confidence = threat_data.get('confidence_score', 0.5)
        if confidence > 0.8:
            base_multiplier *= 1.1
        return min(1.5, base_multiplier)  # Cap at 1.5x
    def _categorize_priority_level(self, score: float) -> PriorityLevel:
        
        if score >= 0.8:
            return PriorityLevel.CRITICAL
        elif score >= 0.6:
            return PriorityLevel.HIGH
        elif score >= 0.4:
            return PriorityLevel.MEDIUM
        elif score >= 0.2:
            return PriorityLevel.LOW
        else:
            return PriorityLevel.MINIMAL
    def _calculate_overall_confidence(self, scores: List[float]) -> float:
        
        if not scores:
            return 0.5
        mean_score = sum(scores) / len(scores)
        variance = sum((x - mean_score) ** 2 for x in scores) / len(scores)
        std_dev = math.sqrt(variance)
        confidence = max(0.1, 1.0 - (std_dev * 2))
        return confidence
    def _determine_impact_category(self, threat_data: Dict, damage_score: float) -> ImpactCategory:
        
        if damage_score >= 0.8:
            return ImpactCategory.GLOBAL
        elif damage_score >= 0.6:
            return ImpactCategory.REGIONAL
        elif damage_score >= 0.3:
            return ImpactCategory.LOCAL
        else:
            return ImpactCategory.MINIMAL
    def _extract_time_to_impact(self, threat_data: Dict) -> Optional[float]:
        
        try:
            time_str = threat_data.get('time_to_impact')
            if not time_str:
                return None
            if isinstance(time_str, str):
                impact_time = self._parse_time_to_impact(time_str)
                if impact_time:
                    return (impact_time - datetime.now()).total_seconds() / 3600
            return None
        except Exception:
            return None
    def _parse_time_to_impact(self, time_str: str) -> Optional[datetime]:
        
        try:
            if 'T' in time_str:
                return datetime.fromisoformat(time_str.replace('Z', '+00:00')).replace(tzinfo=None)
            else:
                return datetime.strptime(time_str, '%Y-%m-%d')
        except Exception:
            return None
    def _predict_score_evolution(self, threat_data: Dict) -> str:
        
        threat_type = threat_data.get('threat_type', 'unknown')
        if threat_type == 'asteroid':
            return 'stable'
        elif threat_type == 'space_weather':
            return 'increasing'
        else:
            return 'stable'
    def _create_fallback_priority(self, threat_data: Dict, threat_id: str) -> PriorityScore:
        
        return PriorityScore(
            threat_id=threat_id,
            overall_score=0.5,
            priority_level=PriorityLevel.MEDIUM,
            impact_probability_score=0.1,
            damage_potential_score=0.3,
            time_criticality_score=0.5,
            data_reliability_score=0.5,
            confidence_score=0.3,
            urgency_multiplier=1.0,
            impact_category=ImpactCategory.LOCAL,
            time_to_impact_hours=None,
            score_evolution_trend='unknown'
        )
    def get_priority_queue(self) -> PriorityQueue:
        
        return self.priority_queue
    async def refresh_all_priorities(self) -> int:
        
        refreshed_count = 0
        for priority_score in self.priority_queue.queue.copy():
            try:
                threat_data = {
                    'threat_id': priority_score.threat_id,
                    'threat_type': 'asteroid',  # Placeholder
                    'severity': 'MEDIUM'
                }
                new_priority = await self.calculate_dynamic_priority(threat_data)
                refreshed_count += 1
            except Exception as e:
                logger.error(f"Priority refresh error for {priority_score.threat_id}: {str(e)}")
        logger.info(f"Refreshed {refreshed_count} priorities")
        return refreshed_count
realtime_priority_engine = RealtimePriorityEngine()
def get_realtime_priority_engine() -> RealtimePriorityEngine:
    
    return realtime_priority_engine
__all__ = [
    'RealtimePriorityEngine',
    'PriorityScore',
    'PriorityLevel',
    'PriorityQueue',
    'MonteCarloSimulator',
    'ImpactCategory',
    'realtime_priority_engine',
    'get_realtime_priority_engine'
]

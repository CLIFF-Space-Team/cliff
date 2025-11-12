import asyncio
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
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
from .intelligent_threat_processor import ThreatAnalysisResult, intelligent_threat_processor
from .realtime_priority_engine import PriorityScore, realtime_priority_engine
from .unified_ai_service import unified_ai_service, UnifiedChatRequest
from ..core.config import settings
logger = structlog.get_logger(__name__)
class RiskLevel(str, Enum):
    """Risk seviyeleri"""
    MINIMAL = "minimal"        # 0.0-0.2
    LOW = "low"               # 0.2-0.4  
    MODERATE = "moderate"     # 0.4-0.6
    HIGH = "high"             # 0.6-0.8
    CRITICAL = "critical"     # 0.8-1.0
class RiskCategory(str, Enum):
    """Risk kategorileri"""
    PHYSICAL_IMPACT = "physical_impact"
    INFRASTRUCTURE_DAMAGE = "infrastructure_damage" 
    COMMUNICATION_DISRUPTION = "communication_disruption"
    ECONOMIC_IMPACT = "economic_impact"
    ENVIRONMENTAL_DAMAGE = "environmental_damage"
class TemporalTrend(str, Enum):
    """Zamansal eğilimler"""
    RAPIDLY_INCREASING = "rapidly_increasing"    # >20% artış/gün
    INCREASING = "increasing"                    # 5-20% artış/gün
    STABLE = "stable"                           # -5% ile +5% arası
    DECREASING = "decreasing"                   # 5-20% azalış/gün
    RAPIDLY_DECREASING = "rapidly_decreasing"   # >20% azalış/gün
@dataclass
class ConfidenceInterval:
    """Güvenilirlik aralığı"""
    lower_bound: float
    upper_bound: float
    confidence_level: float  # 0.90, 0.95, 0.99
    mean_value: float
    def width(self) -> float:
        """Aralık genişliği"""
        return self.upper_bound - self.lower_bound
    def contains(self, value: float) -> bool:
        """Değer aralığın içinde mi?"""
        return self.lower_bound <= value <= self.upper_bound
@dataclass
class RiskFactorAnalysis:
    """Risk faktörü analizi"""
    factor_name: str
    weight: float  # 0.0-1.0
    raw_score: float
    normalized_score: float
    confidence: float
    data_quality: str  # 'excellent', 'good', 'fair', 'poor'
    last_updated: datetime
    trend: TemporalTrend
    volatility: float  # Standard deviation of recent scores
    data_sources: List[str]
    source_reliability: float
@dataclass
class RiskAssessment:
    """Kapsamlı risk değerlendirmesi"""
    threat_id: str
    overall_risk_score: float  # 0.0-1.0
    risk_level: RiskLevel
    confidence_interval: ConfidenceInterval
    risk_factors: List[RiskFactorAnalysis]
    category_scores: Dict[RiskCategory, float]
    evolution_trend: TemporalTrend
    predicted_scores: Dict[str, float]  # future timestamps -> scores
    volatility_index: float
    ai_risk_adjustment: Dict[str, Any]
    ml_risk_indicators: List[str]
    calculation_timestamp: datetime = field(default_factory=datetime.now)
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=1))
    version: str = "1.0"
    def is_expired(self) -> bool:
        """Risk değerlendirmesi süresi dolmuş mu?"""
        return datetime.now() > self.expires_at
    def get_category_breakdown(self) -> Dict[str, float]:
        """Kategori bazında risk dağılımı"""
        return {category.value: score for category, score in self.category_scores.items()}
class RiskEvolutionModeler:
    """Risk evrimi modelleme sistemi"""
    def __init__(self):
        self.historical_window = 168  # 7 days in hours
        self.prediction_horizon = 72  # 3 days ahead
    def model_temporal_evolution(self, historical_scores: List[Tuple[datetime, float]]) -> Dict[str, Any]:
        """Zamansal evrim modellemesi"""
        try:
            if len(historical_scores) < 3:
                return self._fallback_evolution_model()
            times = [score[0] for score in historical_scores]
            scores = [score[1] for score in historical_scores]
            base_time = min(times)
            hours_elapsed = [(t - base_time).total_seconds() / 3600 for t in times]
            if len(scores) > 1:
                n = len(scores)
                x_mean = statistics.mean(hours_elapsed)
                y_mean = statistics.mean(scores)
                slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(hours_elapsed, scores)) / sum((x - x_mean) ** 2 for x in hours_elapsed)
                trend_value = slope * (future_hours - x_mean) + y_mean
            else:
                trend_value = scores[0] if scores else 0.5
            recent_slope = self._calculate_recent_slope(hours_elapsed[-3:], scores[-3:])
            trend = self._classify_trend(recent_slope)
            if len(scores) > 1:
                volatility = np.std(scores)
            else:
                volatility = 0.0
            future_hours = [hours_elapsed[-1] + h for h in range(6, self.prediction_horizon + 1, 6)]
            predictions = {}
            for future_hour in future_hours:
                predicted_score = float(trend_poly(future_hour))
                predicted_score = max(0.0, min(1.0, predicted_score))  # Clamp
                future_time = base_time + timedelta(hours=future_hour)
                predictions[future_time.isoformat()] = predicted_score
            return {
                'trend': trend,
                'volatility': volatility,
                'slope': recent_slope,
                'r_squared': self._calculate_r_squared(hours_elapsed, scores, trend_poly),
                'predictions': predictions,
                'model_type': 'polynomial_trend'
            }
        except Exception as e:
            logger.error(f"Evolution modeling error: {str(e)}")
            return self._fallback_evolution_model()
    def _calculate_recent_slope(self, x_values: List[float], y_values: List[float]) -> float:
        """Son değerlerin eğimini hesapla"""
        if len(x_values) < 2:
            return 0.0
        n = len(x_values)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)
        denominator = n * sum_x2 - sum_x * sum_x
        if denominator == 0:
            return 0.0
        slope = (n * sum_xy - sum_x * sum_y) / denominator
        return slope
    def _classify_trend(self, slope: float) -> TemporalTrend:
        """Eğimi trend kategorisine çevir"""
        daily_change = slope * 24  # Convert hourly to daily
        if daily_change > 0.2:
            return TemporalTrend.RAPIDLY_INCREASING
        elif daily_change > 0.05:
            return TemporalTrend.INCREASING
        elif daily_change < -0.2:
            return TemporalTrend.RAPIDLY_DECREASING
        elif daily_change < -0.05:
            return TemporalTrend.DECREASING
        else:
            return TemporalTrend.STABLE
    def _calculate_r_squared(self, x_values: List[float], y_values: List[float], poly_func) -> float:
        """R-squared değeri hesapla"""
        try:
            y_mean = statistics.mean(y_values)
            ss_tot = sum((y - y_mean) ** 2 for y in y_values)
            ss_res = sum((y - poly_func(x)) ** 2 for x, y in zip(x_values, y_values))
            if ss_tot == 0:
                return 1.0
            r_squared = 1 - (ss_res / ss_tot)
            return max(0.0, r_squared)
        except Exception:
            return 0.0
    def _fallback_evolution_model(self) -> Dict[str, Any]:
        """Fallback evrim modeli"""
        return {
            'trend': TemporalTrend.STABLE,
            'volatility': 0.1,
            'slope': 0.0,
            'r_squared': 0.0,
            'predictions': {},
            'model_type': 'fallback'
        }
class AdaptiveScoringAlgorithm:
    """Adaptif skorlama algoritması"""
    def __init__(self):
        self.data_ranges = {}
        self.base_weights = {
            'severity': 0.25,
            'probability': 0.25,
            'impact': 0.20,
            'time_factor': 0.15,
            'uncertainty': 0.15
        }
    def calculate_adaptive_score(self, threat_data: Dict, context: Dict) -> Tuple[float, Dict[str, float]]:
        """Adaptif skor hesaplama"""
        try:
            factors = self._extract_risk_factors(threat_data)
            adjusted_weights = self._adjust_weights_by_context(context)
            weighted_score = 0.0
            factor_contributions = {}
            for factor_name, value in factors.items():
                weight = adjusted_weights.get(factor_name, 0.0)
                contribution = value * weight
                weighted_score += contribution
                factor_contributions[factor_name] = contribution
            adapted_score = self._apply_adaptive_adjustments(weighted_score, threat_data, context)
            return adapted_score, factor_contributions
        except Exception as e:
            logger.error(f"Adaptive scoring error: {str(e)}")
            return 0.5, {}
    def _extract_risk_factors(self, threat_data: Dict) -> Dict[str, float]:
        """Risk faktörlerini çıkar"""
        factors = {}
        severity = threat_data.get('severity', 'MEDIUM')
        factors['severity'] = self._normalize_severity(severity)
        factors['probability'] = threat_data.get('impact_probability', 0.1)
        factors['impact'] = threat_data.get('damage_potential', 0.3)
        time_to_impact = threat_data.get('time_to_impact_hours')
        factors['time_factor'] = self._calculate_time_factor(time_to_impact)
        confidence = threat_data.get('confidence_score', 0.5)
        factors['uncertainty'] = 1.0 - confidence  # Higher uncertainty = higher risk
        return factors
    def _adjust_weights_by_context(self, context: Dict) -> Dict[str, float]:
        """Context'e göre ağırlıkları ayarla"""
        weights = self.base_weights.copy()
        threat_type = context.get('threat_type', 'unknown')
        if threat_type == 'asteroid':
            weights['probability'] *= 1.2  # Impact probability more important
            weights['impact'] *= 1.3       # Damage potential critical
        elif threat_type == 'space_weather':
            weights['time_factor'] *= 1.4  # Time criticality important
            weights['uncertainty'] *= 0.8  # Usually well-predicted
        elif threat_type == 'earth_event':
            weights['severity'] *= 1.3     # Severity often key indicator
            weights['time_factor'] *= 1.2  # Timing matters
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        return weights
    def _apply_adaptive_adjustments(self, base_score: float, threat_data: Dict, context: Dict) -> float:
        """Adaptif ayarlamaları uygula"""
        adjusted_score = base_score
        confidence = threat_data.get('confidence_score', 0.5)
        if confidence > 0.8:
            adjusted_score *= 1.1
        elif confidence < 0.3:
            adjusted_score *= 0.9
        source_count = len(threat_data.get('data_sources', []))
        if source_count >= 3:
            adjusted_score *= 1.05
        last_updated = context.get('last_updated')
        if last_updated:
            hours_old = (datetime.now() - last_updated).total_seconds() / 3600
            if hours_old < 1:  # Very recent
                adjusted_score *= 1.05
        return max(0.0, min(1.0, adjusted_score))
    def _normalize_severity(self, severity: str) -> float:
        """Severity'yi normalize et"""
        severity_map = {
            'LOW': 0.2, 'DÜŞÜK': 0.2,
            'MEDIUM': 0.5, 'ORTA': 0.5,
            'HIGH': 0.8, 'YÜKSEK': 0.8,
            'CRITICAL': 1.0, 'KRİTİK': 1.0
        }
        return severity_map.get(severity.upper(), 0.5)
    def _calculate_time_factor(self, time_to_impact_hours: Optional[float]) -> float:
        """Zaman faktörü hesapla"""
        if time_to_impact_hours is None:
            return 0.5
        if time_to_impact_hours <= 0:
            return 1.0
        normalized_time = time_to_impact_hours / 720.0
        time_factor = 1.0 / (1.0 + normalized_time)  # Inverse relationship
        return time_factor
class DynamicRiskCalculator:
    """
    📊 Ana dinamik risk hesaplama sistemi
    """
    def __init__(self):
        self.ai_service = unified_ai_service
        self.evolution_modeler = RiskEvolutionModeler()
        self.adaptive_scorer = AdaptiveScoringAlgorithm()
        self.threat_processor = intelligent_threat_processor
        self.priority_engine = realtime_priority_engine
        self.confidence_levels = [0.90, 0.95, 0.99]
        self.default_confidence_level = 0.95
        logger.info("Dynamic Risk Calculator initialized")
    async def calculate_comprehensive_risk(self, threat_data: Dict) -> RiskAssessment:
        """
        🎯 Kapsamlı risk değerlendirmesi
        """
        threat_id = threat_data.get('threat_id', f"risk_{int(datetime.now().timestamp())}")
        logger.info(f"Calculating comprehensive risk for {threat_id}")
        try:
            context = {
                'threat_type': threat_data.get('threat_type', 'unknown'),
                'last_updated': datetime.now()
            }
            base_risk, factor_contributions = self.adaptive_scorer.calculate_adaptive_score(
                threat_data, context
            )
            ai_enhancement_task = self._ai_risk_enhancement(threat_data, base_risk)
            risk_factors = await self._analyze_risk_factors(threat_data)
            category_scores = self._calculate_category_scores(threat_data, risk_factors)
            evolution_analysis = await self._analyze_temporal_evolution(threat_data)
            confidence_interval = self._quantify_uncertainty(
                threat_data, base_risk, risk_factors
            )
            ai_enhancement = await ai_enhancement_task
            final_risk = self._combine_risk_components(
                base_risk, ai_enhancement, evolution_analysis, confidence_interval
            )
            ml_indicators = self._extract_ml_risk_indicators(threat_data, risk_factors)
            predictions = evolution_analysis.get('predictions', {})
            assessment = RiskAssessment(
                threat_id=threat_id,
                overall_risk_score=final_risk,
                risk_level=self._categorize_risk_level(final_risk),
                confidence_interval=confidence_interval,
                risk_factors=risk_factors,
                category_scores=category_scores,
                evolution_trend=TemporalTrend(evolution_analysis.get('trend', 'stable')),
                predicted_scores=predictions,
                volatility_index=evolution_analysis.get('volatility', 0.1),
                ai_risk_adjustment=ai_enhancement,
                ml_risk_indicators=ml_indicators
            )
            logger.info(f"Risk assessment completed: {final_risk:.3f} ({assessment.risk_level})")
            return assessment
        except Exception as e:
            logger.error(f"Risk calculation error for {threat_id}: {str(e)}")
            return self._create_fallback_assessment(threat_data, threat_id)
    async def _ai_risk_enhancement(self, threat_data: Dict, base_risk: float) -> Dict[str, Any]:
        """AI ile risk değerlendirmesi geliştirme"""
        try:
            risk_context = {
                'base_risk_score': base_risk,
                'threat_summary': {
                    'id': threat_data.get('threat_id', 'unknown'),
                    'type': threat_data.get('threat_type', 'unknown'),
                    'severity': threat_data.get('severity', 'MEDIUM'),
                    'time_to_impact': threat_data.get('time_to_impact', 'unknown'),
                    'confidence': threat_data.get('confidence_score', 0.5)
                }
            }
            prompt = f"""
CLIFF Risk Analisti olarak bu tehdit için risk değerlendirmesi yap:
Base Risk Score: {base_risk:.3f}
Tehdit Özeti: {risk_context['threat_summary']}
Şunları analiz et:
1. Risk skorunda ayarlama gerekli mi? (artır/azalt/koru)
2. Hangi önemli risk faktörleri gözden kaçmış?
3. Bu tehdit tipine özel riskler var mı?
4. Belirsizlik faktörleri nasıl değerlendirilmeli?
5. Cascading effect (domino etkisi) riski?
JSON formatında yanıt ver:
{{
    "adjustment_factor": 0.9-1.1 arası çarpan,
    "key_risks": ["risk1", "risk2"],
    "uncertainty_assessment": "low/medium/high",
    "cascading_risk": true/false,
    "confidence_in_analysis": 0.0-1.0 arası
}}
"""
            request = UnifiedChatRequest(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-2.5-pro",
                temperature=0.2,
                max_tokens=500
            )
            response = await self.ai_service.chat_completion(request)
            if response.success and response.content:
                ai_analysis = self._parse_ai_risk_response(response.content)
                adjustment_factor = ai_analysis.get('adjustment_factor', 1.0)
                adjustment_factor = max(0.8, min(1.2, adjustment_factor))
                return {
                    'adjustment_factor': adjustment_factor,
                    'key_risks': ai_analysis.get('key_risks', []),
                    'uncertainty_assessment': ai_analysis.get('uncertainty_assessment', 'medium'),
                    'cascading_risk': ai_analysis.get('cascading_risk', False),
                    'ai_confidence': ai_analysis.get('confidence_in_analysis', 0.5),
                    'enhanced_by_ai': True
                }
            else:
                return self._fallback_ai_enhancement()
        except Exception as e:
            logger.error(f"AI risk enhancement error: {str(e)}")
            return self._fallback_ai_enhancement()
    async def _analyze_risk_factors(self, threat_data: Dict) -> List[RiskFactorAnalysis]:
        """Risk faktörlerini analiz et"""
        risk_factors = []
        try:
            factors_config = [
                {
                    'name': 'impact_probability',
                    'weight': 0.3,
                    'value_key': 'impact_probability',
                    'default_value': 0.1
                },
                {
                    'name': 'damage_potential', 
                    'weight': 0.25,
                    'value_key': 'damage_potential',
                    'default_value': 0.3
                },
                {
                    'name': 'time_criticality',
                    'weight': 0.2,
                    'value_key': 'time_criticality',
                    'default_value': 0.5
                },
                {
                    'name': 'data_reliability',
                    'weight': 0.15,
                    'value_key': 'confidence_score',
                    'default_value': 0.5
                },
                {
                    'name': 'severity_factor',
                    'weight': 0.1,
                    'value_key': 'severity',
                    'default_value': 0.5
                }
            ]
            for factor_config in factors_config:
                raw_value = threat_data.get(factor_config['value_key'], factor_config['default_value'])
                if isinstance(raw_value, str):
                    raw_value = self._convert_string_to_score(raw_value)
                data_quality = self._assess_data_quality(threat_data, factor_config['value_key'])
                trend = self._estimate_factor_trend(factor_config['name'], raw_value)
                risk_factor = RiskFactorAnalysis(
                    factor_name=factor_config['name'],
                    weight=factor_config['weight'],
                    raw_score=raw_value,
                    normalized_score=max(0.0, min(1.0, raw_value)),
                    confidence=self._calculate_factor_confidence(threat_data, factor_config['value_key']),
                    data_quality=data_quality,
                    last_updated=datetime.now(),
                    trend=trend,
                    volatility=0.1,  # Default volatility
                    data_sources=threat_data.get('data_sources', ['unknown']),
                    source_reliability=self._calculate_source_reliability(threat_data)
                )
                risk_factors.append(risk_factor)
            return risk_factors
        except Exception as e:
            logger.error(f"Risk factor analysis error: {str(e)}")
            return []
    def _calculate_category_scores(self, threat_data: Dict, risk_factors: List[RiskFactorAnalysis]) -> Dict[RiskCategory, float]:
        """Kategori bazında risk skorları"""
        category_scores = {}
        threat_type = threat_data.get('threat_type', 'unknown')
        if threat_type == 'asteroid':
            impact_factor = next((rf for rf in risk_factors if rf.factor_name == 'impact_probability'), None)
            damage_factor = next((rf for rf in risk_factors if rf.factor_name == 'damage_potential'), None)
            physical_score = 0.0
            if impact_factor and damage_factor:
                physical_score = (impact_factor.normalized_score * 0.6 + damage_factor.normalized_score * 0.4)
            category_scores[RiskCategory.PHYSICAL_IMPACT] = physical_score
        if threat_type in ['space_weather', 'earth_event']:
            severity_factor = next((rf for rf in risk_factors if rf.factor_name == 'severity_factor'), None)
            time_factor = next((rf for rf in risk_factors if rf.factor_name == 'time_criticality'), None)
            infrastructure_score = 0.0
            if severity_factor and time_factor:
                infrastructure_score = (severity_factor.normalized_score * 0.7 + time_factor.normalized_score * 0.3)
            category_scores[RiskCategory.INFRASTRUCTURE_DAMAGE] = infrastructure_score
        if threat_type == 'space_weather':
            comm_score = 0.6  # Base score for space weather events
            category_scores[RiskCategory.COMMUNICATION_DISRUPTION] = comm_score
        overall_severity = threat_data.get('severity_numeric', 0.5)
        economic_score = overall_severity * 0.8  # Economic impact typically lower than direct
        category_scores[RiskCategory.ECONOMIC_IMPACT] = economic_score
        if threat_type in ['asteroid', 'earth_event']:
            env_score = overall_severity * 0.6
            category_scores[RiskCategory.ENVIRONMENTAL_DAMAGE] = env_score
        return category_scores
    async def _analyze_temporal_evolution(self, threat_data: Dict) -> Dict[str, Any]:
        """Zamansal evrim analizi"""
        try:
            historical_scores = [
                (datetime.now() - timedelta(hours=24), 0.4),
                (datetime.now() - timedelta(hours=12), 0.45),
                (datetime.now() - timedelta(hours=6), 0.5),
                (datetime.now(), threat_data.get('severity_numeric', 0.5))
            ]
            return self.evolution_modeler.model_temporal_evolution(historical_scores)
        except Exception as e:
            logger.error(f"Temporal evolution analysis error: {str(e)}")
            return {'trend': 'stable', 'volatility': 0.1, 'predictions': {}}
    def _quantify_uncertainty(self, threat_data: Dict, base_risk: float, risk_factors: List[RiskFactorAnalysis]) -> ConfidenceInterval:
        """Belirsizlik ölçümü"""
        try:
            data_uncertainty = 1.0 - threat_data.get('confidence_score', 0.5)
            factor_uncertainties = [1.0 - rf.confidence for rf in risk_factors]
            avg_factor_uncertainty = statistics.mean(factor_uncertainties) if factor_uncertainties else 0.5
            source_reliability = self._calculate_source_reliability(threat_data)
            source_uncertainty = 1.0 - source_reliability
            combined_uncertainty = (data_uncertainty * 0.4 + avg_factor_uncertainty * 0.4 + source_uncertainty * 0.2)
            margin_of_error = combined_uncertainty * 0.3  # 30% of uncertainty as margin
            lower_bound = max(0.0, base_risk - margin_of_error)
            upper_bound = min(1.0, base_risk + margin_of_error)
            return ConfidenceInterval(
                lower_bound=lower_bound,
                upper_bound=upper_bound,
                confidence_level=self.default_confidence_level,
                mean_value=base_risk
            )
        except Exception as e:
            logger.error(f"Uncertainty quantification error: {str(e)}")
            return ConfidenceInterval(
                lower_bound=max(0.0, base_risk - 0.2),
                upper_bound=min(1.0, base_risk + 0.2),
                confidence_level=0.9,
                mean_value=base_risk
            )
    def _combine_risk_components(self, base_risk: float, ai_enhancement: Dict, evolution_analysis: Dict, confidence_interval: ConfidenceInterval) -> float:
        """Risk bileşenlerini birleştir"""
        combined_risk = base_risk
        ai_factor = ai_enhancement.get('adjustment_factor', 1.0)
        combined_risk *= ai_factor
        trend = evolution_analysis.get('trend', 'stable')
        if trend == 'rapidly_increasing':
            combined_risk *= 1.2
        elif trend == 'increasing':
            combined_risk *= 1.1
        elif trend == 'rapidly_decreasing':
            combined_risk *= 0.8
        elif trend == 'decreasing':
            combined_risk *= 0.9
        volatility = evolution_analysis.get('volatility', 0.1)
        if volatility > 0.3:  # High volatility increases risk
            combined_risk *= 1.1
        uncertainty = confidence_interval.width()
        if uncertainty > 0.4:  # High uncertainty increases risk
            combined_risk *= 1.05
        return max(0.0, min(1.0, combined_risk))
    def _parse_ai_risk_response(self, response_text: str) -> Dict[str, Any]:
        """AI risk response'unu parse et"""
        try:
            import json
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                raise ValueError("No valid JSON found")
        except Exception as e:
            logger.warning(f"AI response parse error: {str(e)}")
            return {
                'adjustment_factor': 1.0,
                'key_risks': [],
                'uncertainty_assessment': 'medium',
                'cascading_risk': False,
                'confidence_in_analysis': 0.5
            }
    def _fallback_ai_enhancement(self) -> Dict[str, Any]:
        """Fallback AI enhancement"""
        return {
            'adjustment_factor': 1.0,
            'key_risks': ['ai_analysis_unavailable'],
            'uncertainty_assessment': 'medium',
            'cascading_risk': False,
            'ai_confidence': 0.3,
            'enhanced_by_ai': False
        }
    def _convert_string_to_score(self, value: str) -> float:
        """String değerleri skora çevir"""
        if isinstance(value, (int, float)):
            return float(value)
        value_lower = value.lower()
        score_map = {
            'low': 0.25, 'düşük': 0.25,
            'medium': 0.5, 'orta': 0.5,
            'high': 0.75, 'yüksek': 0.75,
            'critical': 1.0, 'kritik': 1.0
        }
        return score_map.get(value_lower, 0.5)
    def _assess_data_quality(self, threat_data: Dict, value_key: str) -> str:
        """Veri kalitesi değerlendirmesi"""
        if value_key not in threat_data:
            return 'poor'
        source_reliability = self._calculate_source_reliability(threat_data)
        if source_reliability > 0.8:
            return 'excellent'
        elif source_reliability > 0.6:
            return 'good'
        elif source_reliability > 0.4:
            return 'fair'
        else:
            return 'poor'
    def _calculate_source_reliability(self, threat_data: Dict) -> float:
        """Kaynak güvenilirliği hesapla"""
        data_source = threat_data.get('data_source', 'unknown').lower()
        reliability_scores = {
            'nasa': 0.95,
            'esa': 0.9,
            'jpl': 0.95,
            'noaa': 0.85,
            'cneos': 0.9,
            'spacex': 0.75,
            'unknown': 0.3
        }
        return reliability_scores.get(data_source, 0.5)
    def _estimate_factor_trend(self, factor_name: str, current_value: float) -> TemporalTrend:
        """Faktör trend tahmini - basit versiyon"""
        if factor_name == 'time_criticality':
            return TemporalTrend.INCREASING  # Time criticality generally increases
        else:
            return TemporalTrend.STABLE
    def _calculate_factor_confidence(self, threat_data: Dict, value_key: str) -> float:
        """Faktör güvenilirliği hesapla"""
        base_confidence = threat_data.get('confidence_score', 0.5)
        if value_key in threat_data:
            source_reliability = self._calculate_source_reliability(threat_data)
            return (base_confidence + source_reliability) / 2
        else:
            return base_confidence * 0.5  # Lower confidence for missing data
    def _extract_ml_risk_indicators(self, threat_data: Dict, risk_factors: List[RiskFactorAnalysis]) -> List[str]:
        """ML risk göstergelerini çıkar"""
        indicators = []
        volatilities = [rf.volatility for rf in risk_factors]
        avg_volatility = statistics.mean(volatilities) if volatilities else 0.0
        if avg_volatility > 0.3:
            indicators.append('high_volatility')
        poor_quality_factors = [rf for rf in risk_factors if rf.data_quality == 'poor']
        if len(poor_quality_factors) > len(risk_factors) / 2:
            indicators.append('data_quality_concerns')
        increasing_trends = [rf for rf in risk_factors if rf.trend in ['increasing', 'rapidly_increasing']]
        if len(increasing_trends) > 2:
            indicators.append('multiple_escalating_factors')
        low_confidence_factors = [rf for rf in risk_factors if rf.confidence < 0.4]
        if len(low_confidence_factors) > 1:
            indicators.append('high_uncertainty')
        return indicators
    def _categorize_risk_level(self, risk_score: float) -> RiskLevel:
        """Risk skorunu seviyeye çevir"""
        if risk_score >= 0.8:
            return RiskLevel.CRITICAL
        elif risk_score >= 0.6:
            return RiskLevel.HIGH
        elif risk_score >= 0.4:
            return RiskLevel.MODERATE
        elif risk_score >= 0.2:
            return RiskLevel.LOW
        else:
            return RiskLevel.MINIMAL
    def _create_fallback_assessment(self, threat_data: Dict, threat_id: str) -> RiskAssessment:
        """Fallback risk assessment"""
        base_risk = 0.5
        return RiskAssessment(
            threat_id=threat_id,
            overall_risk_score=base_risk,
            risk_level=RiskLevel.MODERATE,
            confidence_interval=ConfidenceInterval(
                lower_bound=0.3,
                upper_bound=0.7,
                confidence_level=0.8,
                mean_value=base_risk
            ),
            risk_factors=[],
            category_scores={
                RiskCategory.PHYSICAL_IMPACT: 0.5,
                RiskCategory.INFRASTRUCTURE_DAMAGE: 0.4,
                RiskCategory.COMMUNICATION_DISRUPTION: 0.3,
                RiskCategory.ECONOMIC_IMPACT: 0.4,
                RiskCategory.ENVIRONMENTAL_DAMAGE: 0.3
            },
            evolution_trend=TemporalTrend.STABLE,
            predicted_scores={},
            volatility_index=0.2,
            ai_risk_adjustment={'error': 'fallback_used'},
            ml_risk_indicators=['calculation_error']
        )
dynamic_risk_calculator = DynamicRiskCalculator()
def get_dynamic_risk_calculator() -> DynamicRiskCalculator:
    """Dependency injection için"""
    return dynamic_risk_calculator
__all__ = [
    'DynamicRiskCalculator',
    'RiskAssessment',
    'RiskLevel',
    'RiskCategory',
    'RiskFactorAnalysis',
    'ConfidenceInterval',
    'TemporalTrend',
    'RiskEvolutionModeler',
    'AdaptiveScoringAlgorithm',
    'dynamic_risk_calculator',
    'get_dynamic_risk_calculator'
]
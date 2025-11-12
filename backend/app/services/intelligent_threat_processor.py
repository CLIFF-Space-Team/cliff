import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import structlog
from pydantic import BaseModel, Field
import math
import statistics
from .unified_ai_service import unified_ai_service, UnifiedChatRequest, UnifiedChatResponse
from ..models.threat import ThreatDetail, SimpleThreatResponse
from ..core.config import settings
logger = structlog.get_logger(__name__)
class ThreatType(str, Enum):
    """Tehdit türleri"""
    ASTEROID = "asteroid"
    EARTH_EVENT = "earth_event" 
    SPACE_WEATHER = "space_weather"
    ORBITAL_DEBRIS = "orbital_debris"
    COMMUNICATION_DISRUPTION = "communication_disruption"
class ConfidenceLevel(str, Enum):
    """Güvenilirlik seviyeleri"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
@dataclass
class ThreatAnalysisResult:
    """AI tehdit analizi sonucu"""
    threat_id: str
    threat_type: ThreatType
    severity_score: float  # 0.0 - 1.0
    impact_probability: float  # 0.0 - 1.0
    damage_potential: float  # 0.0 - 1.0
    time_criticality: float  # 0.0 - 1.0
    confidence_level: ConfidenceLevel
    ai_insights: Dict[str, Any]
    ml_patterns: Dict[str, Any]
    historical_correlation: Dict[str, Any]
    recommended_actions: List[str]
    risk_factors: Dict[str, float]
    timestamp: datetime
class PatternRecognitionModel:
    """Machine Learning Pattern Recognition"""
    def __init__(self):
        self.feature_means = []
        self.feature_stds = []
        self.is_trained = False
    def extract_features(self, threat_data: Dict) -> List[float]:
        """Tehdit verisinden özellik çıkarma"""
        features = []
        features.append(threat_data.get('severity_numeric', 0.5))
        features.append(threat_data.get('impact_probability', 0.1))
        features.append(threat_data.get('distance_factor', 1.0))
        features.append(threat_data.get('velocity_factor', 0.5))
        features.append(threat_data.get('size_factor', 0.3))
        time_to_impact = threat_data.get('time_to_impact_hours', 720)  # 30 gün default
        features.append(min(time_to_impact / 720.0, 1.0))  # Normalize
        features.append(threat_data.get('data_source_reliability', 0.8))
        features.append(len(threat_data.get('data_sources', [])) / 5.0)  # Max 5 kaynak
        return features
    def predict_pattern(self, threat_data: Dict) -> Dict[str, Any]:
        """Pattern tahmini"""
        try:
            features = self.extract_features(threat_data)
            if not self.is_trained:
                severity = threat_data.get('severity_numeric', 0.5)
                pattern_confidence = min(severity + 0.2, 1.0)
                return {
                    'pattern_type': 'heuristic',
                    'confidence': pattern_confidence,
                    'risk_indicators': ['insufficient_training_data'],
                    'predicted_evolution': 'stable'
                }
            confidence_score = self._calculate_pattern_confidence(features)
            confidence_score = self._calculate_pattern_confidence(features)
            return {
                'pattern_type': 'mathematical_analysis',
                'confidence': confidence_score,
                'risk_indicators': self._identify_risk_indicators(features),
                'predicted_evolution': self._predict_evolution(features)
            }
        except Exception as e:
            logger.error(f"Pattern recognition error: {str(e)}")
            return {
                'pattern_type': 'error',
                'confidence': 0.0,
                'risk_indicators': ['analysis_error'],
                'predicted_evolution': 'unknown'
            }
    def _identify_risk_indicators(self, features: List[float]) -> List[str]:
        """Risk göstergelerini tespit et"""
        indicators = []
        if features[0] > 0.7:  # severity
            indicators.append('high_severity')
        if features[1] > 0.5:  # impact_probability  
            indicators.append('significant_impact_risk')
        if features[5] < 0.1:  # time_criticality
            indicators.append('time_critical')
        if features[6] < 0.6:  # data_reliability
            indicators.append('uncertain_data')
        return indicators
    def _predict_evolution(self, features: List[float]) -> str:
        """Tehdit evrimi tahmini"""
        severity_trend = features[0]
        time_factor = features[5]
        if severity_trend > 0.8 and time_factor < 0.2:
            return 'escalating'
        elif severity_trend < 0.3:
            return 'diminishing'
        else:
            return 'stable'
    def _calculate_pattern_confidence(self, features: List[float]) -> float:
        """Pattern confidence hesapla"""
        try:
            if not features:
                return 0.3
            feature_mean = statistics.mean(features)
            feature_variance = statistics.variance(features) if len(features) > 1 else 0.1
            normalization_factor = 1.0 / (1.0 + feature_variance)
            base_confidence = min(0.9, feature_mean + 0.1)
            return max(0.1, base_confidence * normalization_factor)
        except Exception:
            return 0.5
class HistoricalPatternAnalyzer:
    """Geçmiş tehdit pattern analizi"""
    def __init__(self):
        self.historical_data = {}  # Gerçek uygulamada MongoDB'den gelecek
    async def correlate_with_history(self, threat_data: Dict) -> Dict[str, Any]:
        """Geçmiş verilerle korelasyon"""
        try:
            similar_threats = await self._find_similar_threats(threat_data)
            historical_patterns = await self._analyze_historical_patterns(similar_threats)
            correlation_result = {
                'similar_threats_found': len(similar_threats),
                'historical_severity_average': self._calculate_average_severity(similar_threats),
                'common_patterns': historical_patterns,
                'predictive_indicators': self._extract_predictive_indicators(similar_threats),
                'confidence_score': self._calculate_historical_confidence(similar_threats)
            }
            logger.info(f"Historical correlation completed: {len(similar_threats)} similar threats found")
            return correlation_result
        except Exception as e:
            logger.error(f"Historical correlation error: {str(e)}")
            return {
                'similar_threats_found': 0,
                'historical_severity_average': 0.5,
                'common_patterns': [],
                'predictive_indicators': [],
                'confidence_score': 0.0
            }
    async def _find_similar_threats(self, threat_data: Dict) -> List[Dict]:
        """Benzer tehditleri bul - Mock implementation"""
        return [
            {
                'threat_type': threat_data.get('threat_type', 'unknown'),
                'severity': 0.6,
                'outcome': 'resolved',
                'timestamp': datetime.now() - timedelta(days=30)
            }
        ]
    async def _analyze_historical_patterns(self, threats: List[Dict]) -> List[str]:
        """Geçmiş pattern analizi"""
        patterns = []
        if len(threats) > 5:
            patterns.append('frequent_occurrence')
        severities = [t.get('severity', 0.5) for t in threats]
        avg_severity = sum(severities) / len(severities) if severities else 0.5
        if avg_severity > 0.7:
            patterns.append('high_severity_tendency')
        elif avg_severity < 0.3:
            patterns.append('low_severity_tendency')
        return patterns
    def _calculate_average_severity(self, threats: List[Dict]) -> float:
        """Ortalama severity hesapla"""
        if not threats:
            return 0.5
        severities = [t.get('severity', 0.5) for t in threats]
        return sum(severities) / len(severities)
    def _extract_predictive_indicators(self, threats: List[Dict]) -> List[str]:
        """Tahmin göstergelerini çıkar"""
        indicators = []
        resolved_count = len([t for t in threats if t.get('outcome') == 'resolved'])
        if resolved_count > len(threats) * 0.8:
            indicators.append('high_resolution_rate')
        return indicators
    def _calculate_historical_confidence(self, threats: List[Dict]) -> float:
        """Geçmiş veriye dayalı güvenilirlik"""
        if not threats:
            return 0.3
        base_confidence = min(len(threats) / 10.0, 0.8)  # Max 0.8
        return base_confidence + 0.2  # Min 0.2
class IntelligentThreatProcessor:
    """
    🧠 Ana AI destekli tehdit analiz motoru
    """
    def __init__(self):
        self.ai_service = unified_ai_service
        self.pattern_model = PatternRecognitionModel()
        self.historical_analyzer = HistoricalPatternAnalyzer()
        self.analysis_timeout = 30  # seconds
        self.confidence_threshold = 0.6
        logger.info("Intelligent Threat Processor initialized")
    async def analyze_threat_comprehensive(self, threat_data: Dict) -> ThreatAnalysisResult:
        """
        🎯 Kapsamlı AI tehdit analizi
        """
        start_time = datetime.now()
        threat_id = threat_data.get('threat_id', f"threat_{int(start_time.timestamp())}")
        logger.info(f"Starting comprehensive analysis for threat {threat_id}")
        try:
            analysis_tasks = [
                self._gemini_threat_analysis(threat_data),
                self._ml_pattern_detection(threat_data), 
                self._correlate_with_historical(threat_data)
            ]
            results = await asyncio.wait_for(
                asyncio.gather(*analysis_tasks, return_exceptions=True),
                timeout=self.analysis_timeout
            )
            ai_insights, ml_patterns, historical_correlation = results
            ai_insights = self._handle_analysis_result(ai_insights, 'AI Analysis')
            ml_patterns = self._handle_analysis_result(ml_patterns, 'ML Patterns')
            historical_correlation = self._handle_analysis_result(historical_correlation, 'Historical')
            final_result = await self._cross_validate_and_combine(
                threat_data, ai_insights, ml_patterns, historical_correlation
            )
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Threat analysis completed in {processing_time:.2f}s")
            return final_result
        except asyncio.TimeoutError:
            logger.error(f"Threat analysis timeout for {threat_id}")
            return self._create_fallback_result(threat_data, threat_id, "analysis_timeout")
        except Exception as e:
            logger.error(f"Threat analysis error for {threat_id}: {str(e)}")
            return self._create_fallback_result(threat_data, threat_id, f"error: {str(e)}")
    async def _gemini_threat_analysis(self, threat_data: Dict) -> Dict[str, Any]:
        """Gemini 2.5 Pro ile derinlemesine analiz"""
        try:
            threat_summary = self._prepare_threat_summary(threat_data)
            prompt = f"""
Sen CLIFF Uzay Tehdit Analizi Uzmanısın. Aşağıdaki tehdit verisini detaylı analiz et:
TEHDIT VERİSİ:
{json.dumps(threat_summary, indent=2, ensure_ascii=False)}
Lütfen şu kriterleri 0.0-1.0 aralığında değerlendir ve JSON formatında yanıtla:
1. SEVERITY_SCORE: Genel tehdit şiddeti (0.0=çok düşük, 1.0=kritik)
2. IMPACT_PROBABILITY: Çarpma/etki olasılığı
3. DAMAGE_POTENTIAL: Potansiyel hasar derecesi  
4. TIME_CRITICALITY: Zaman kritiği (1.0=acil müdahale gerekli)
5. CONFIDENCE_ASSESSMENT: Bu analiz için güvenilirlik
6. RISK_FACTORS: Ana risk faktörlerini listele
7. RECOMMENDED_ACTIONS: Önerilen eylemler (max 5)
8. THREAT_EVOLUTION: Tehdidin nasıl gelişebileceği
Yanıtın sadece geçerli JSON olsun:
"""
            request = UnifiedChatRequest(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-2.5-pro",
                temperature=0.2,  # Tutarlılık için düşük
                max_tokens=1024
            )
            response = await self.ai_service.chat_completion(request)
            if response.success and response.content:
                ai_analysis = self._parse_ai_json_response(response.content)
                ai_analysis = self._validate_ai_scores(ai_analysis)
                logger.info("Gemini AI analysis completed successfully")
                return ai_analysis
            else:
                logger.warning(f"AI analysis failed: {response.error_message}")
                return self._create_fallback_ai_analysis()
        except Exception as e:
            logger.error(f"Gemini analysis error: {str(e)}")
            return self._create_fallback_ai_analysis()
    async def _ml_pattern_detection(self, threat_data: Dict) -> Dict[str, Any]:
        """Machine Learning pattern detection"""
        try:
            ml_result = self.pattern_model.predict_pattern(threat_data)
            enhanced_result = {
                **ml_result,
                'feature_importance': self._calculate_feature_importance(threat_data),
                'anomaly_score': self._calculate_anomaly_score(threat_data),
                'clustering_result': self._perform_threat_clustering(threat_data)
            }
            logger.info("ML pattern detection completed")
            return enhanced_result
        except Exception as e:
            logger.error(f"ML pattern detection error: {str(e)}")
            return {
                'pattern_type': 'error',
                'confidence': 0.0,
                'feature_importance': {},
                'anomaly_score': 0.5,
                'clustering_result': 'unknown'
            }
    async def _correlate_with_historical(self, threat_data: Dict) -> Dict[str, Any]:
        """Geçmiş verilerle korelasyon"""
        return await self.historical_analyzer.correlate_with_history(threat_data)
    async def _cross_validate_and_combine(
        self,
        threat_data: Dict,
        ai_insights: Dict,
        ml_patterns: Dict, 
        historical_correlation: Dict
    ) -> ThreatAnalysisResult:
        """Cross-validation ve sonuç birleştirme"""
        ai_confidence = ai_insights.get('confidence_assessment', 0.5)
        ml_confidence = ml_patterns.get('confidence', 0.5)
        hist_confidence = historical_correlation.get('confidence_score', 0.3)
        ai_weight = 0.5
        ml_weight = 0.3
        hist_weight = 0.2
        total_conf = ai_confidence + ml_confidence + hist_confidence
        if total_conf > 0:
            ai_weight *= (ai_confidence / total_conf)
            ml_weight *= (ml_confidence / total_conf) 
            hist_weight *= (hist_confidence / total_conf)
        severity_score = self._combine_scores([
            (ai_insights.get('severity_score', 0.5), ai_weight),
            (threat_data.get('severity_numeric', 0.5), ml_weight),
            (historical_correlation.get('historical_severity_average', 0.5), hist_weight)
        ])
        impact_probability = self._combine_scores([
            (ai_insights.get('impact_probability', 0.1), ai_weight),
            (threat_data.get('impact_probability', 0.1), ml_weight + hist_weight)
        ])
        damage_potential = ai_insights.get('damage_potential', 0.3)
        time_criticality = ai_insights.get('time_criticality', 0.5)
        overall_confidence = (ai_confidence * 0.5 + ml_confidence * 0.3 + hist_confidence * 0.2)
        confidence_level = self._categorize_confidence(overall_confidence)
        recommendations = []
        recommendations.extend(ai_insights.get('recommended_actions', []))
        if ml_patterns.get('predicted_evolution') == 'escalating':
            recommendations.append('Sürekli izleme artırın - tehdit yükselebilir')
        if len(recommendations) > 5:
            recommendations = recommendations[:5]
        risk_factors = {}
        risk_factors.update(ai_insights.get('risk_factors', {}))
        anomaly_score = ml_patterns.get('anomaly_score', 0.5)
        if anomaly_score > 0.7:
            risk_factors['anomaly_detected'] = anomaly_score
        result = ThreatAnalysisResult(
            threat_id=threat_data.get('threat_id', 'unknown'),
            threat_type=ThreatType(threat_data.get('threat_type', 'asteroid')),
            severity_score=severity_score,
            impact_probability=impact_probability,
            damage_potential=damage_potential,
            time_criticality=time_criticality,
            confidence_level=confidence_level,
            ai_insights=ai_insights,
            ml_patterns=ml_patterns,
            historical_correlation=historical_correlation,
            recommended_actions=recommendations,
            risk_factors=risk_factors,
            timestamp=datetime.now()
        )
        logger.info(f"Cross-validation completed - Final severity: {severity_score:.3f}")
        return result
    def _prepare_threat_summary(self, threat_data: Dict) -> Dict:
        """AI için tehdit özetini hazırla"""
        return {
            'id': threat_data.get('threat_id', 'unknown'),
            'type': threat_data.get('threat_type', 'unknown'),
            'title': threat_data.get('title', 'Unknown Threat'),
            'description': threat_data.get('description', 'No description'),
            'severity': threat_data.get('severity', 'MEDIUM'),
            'impact_probability': threat_data.get('impact_probability', 0.1),
            'time_to_impact': threat_data.get('time_to_impact', 'unknown'),
            'data_source': threat_data.get('data_source', 'unknown'),
            'coordinates': threat_data.get('coordinates', {}),
            'additional_data': {k: v for k, v in threat_data.items() if k not in [
                'threat_id', 'threat_type', 'title', 'description', 'severity'
            ]}
        }
    def _parse_ai_json_response(self, response_text: str) -> Dict:
        """AI JSON yanıtını parse et"""
        try:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                raise ValueError("No valid JSON found in response")
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"AI JSON parse error: {str(e)}")
            return self._create_fallback_ai_analysis()
    def _validate_ai_scores(self, analysis: Dict) -> Dict:
        """AI skorlarını doğrula ve normalize et"""
        score_fields = ['severity_score', 'impact_probability', 'damage_potential', 'time_criticality', 'confidence_assessment']
        for field in score_fields:
            if field in analysis:
                score = float(analysis[field])
                analysis[field] = max(0.0, min(1.0, score))
            else:
                analysis[field] = 0.5  # Default
        required_fields = ['risk_factors', 'recommended_actions']
        for field in required_fields:
            if field not in analysis:
                analysis[field] = [] if field == 'recommended_actions' else {}
        return analysis
    def _create_fallback_ai_analysis(self) -> Dict:
        """AI analizi başarısız olursa fallback"""
        return {
            'severity_score': 0.5,
            'impact_probability': 0.1, 
            'damage_potential': 0.3,
            'time_criticality': 0.5,
            'confidence_assessment': 0.2,
            'risk_factors': {'ai_analysis_failed': True},
            'recommended_actions': ['Manuel inceleme yapın', 'Ek veri kaynakları kontrol edin'],
            'threat_evolution': 'unknown'
        }
    def _handle_analysis_result(self, result: Any, analysis_type: str) -> Dict:
        """Analiz sonucunu handle et"""
        if isinstance(result, Exception):
            logger.error(f"{analysis_type} failed: {str(result)}")
            return {'error': str(result), 'success': False}
        elif isinstance(result, dict):
            return {**result, 'success': True}
        else:
            logger.warning(f"{analysis_type} returned unexpected type: {type(result)}")
            return {'error': f'unexpected_type_{type(result)}', 'success': False}
    def _create_fallback_result(self, threat_data: Dict, threat_id: str, error_reason: str) -> ThreatAnalysisResult:
        """Fallback tehdit analizi sonucu"""
        return ThreatAnalysisResult(
            threat_id=threat_id,
            threat_type=ThreatType(threat_data.get('threat_type', 'asteroid')),
            severity_score=0.5,
            impact_probability=threat_data.get('impact_probability', 0.1),
            damage_potential=0.3,
            time_criticality=0.5,
            confidence_level=ConfidenceLevel.LOW,
            ai_insights={'error': error_reason},
            ml_patterns={'error': error_reason},
            historical_correlation={'error': error_reason},
            recommended_actions=['Manuel inceleme gerekli', 'Sistem yöneticisini bilgilendir'],
            risk_factors={'system_error': True, 'reason': error_reason},
            timestamp=datetime.now()
        )
    def _combine_scores(self, weighted_scores: List[Tuple[float, float]]) -> float:
        """Ağırlıklı skorları birleştir"""
        if not weighted_scores:
            return 0.5
        total_weight = sum(weight for _, weight in weighted_scores)
        if total_weight == 0:
            return 0.5
        weighted_sum = sum(score * weight for score, weight in weighted_scores)
        return max(0.0, min(1.0, weighted_sum / total_weight))
    def _categorize_confidence(self, confidence: float) -> ConfidenceLevel:
        """Güvenilirlik seviyesi kategorize et"""
        if confidence >= 0.9:
            return ConfidenceLevel.VERY_HIGH
        elif confidence >= 0.7:
            return ConfidenceLevel.HIGH
        elif confidence >= 0.5:
            return ConfidenceLevel.MEDIUM
        elif confidence >= 0.3:
            return ConfidenceLevel.LOW
        else:
            return ConfidenceLevel.VERY_LOW
    def _calculate_feature_importance(self, threat_data: Dict) -> Dict[str, float]:
        """Feature importance hesapla"""
        importance = {}
        if threat_data.get('severity'):
            importance['severity'] = 0.3
        if threat_data.get('impact_probability'):
            importance['impact_probability'] = 0.25
        if threat_data.get('time_to_impact'):
            importance['time_criticality'] = 0.2
        if threat_data.get('data_source'):
            importance['data_reliability'] = 0.15
        total = sum(importance.values())
        if total > 0:
            importance = {k: v/total for k, v in importance.items()}
        return importance
    def _calculate_anomaly_score(self, threat_data: Dict) -> float:
        """Anomali skoru hesapla"""
        severity = threat_data.get('severity_numeric', 0.5)
        impact_prob = threat_data.get('impact_probability', 0.1)
        if severity > 0.8 and impact_prob < 0.1:
            return 0.8
        elif severity < 0.2 and impact_prob > 0.5:
            return 0.7
        else:
            return 0.3
    def _perform_threat_clustering(self, threat_data: Dict) -> str:
        """Tehdit clustering - basit versiyon"""
        threat_type = threat_data.get('threat_type', 'unknown')
        severity = threat_data.get('severity_numeric', 0.5)
        if threat_type == 'asteroid':
            if severity > 0.7:
                return 'high_risk_asteroid'
            else:
                return 'standard_asteroid'
        elif threat_type == 'space_weather':
            return 'space_weather_event'
        else:
            return 'general_threat'
intelligent_threat_processor = IntelligentThreatProcessor()
def get_intelligent_threat_processor() -> IntelligentThreatProcessor:
    """Dependency injection için"""
    return intelligent_threat_processor
__all__ = [
    'IntelligentThreatProcessor',
    'ThreatAnalysisResult', 
    'ThreatType',
    'ConfidenceLevel',
    'intelligent_threat_processor',
    'get_intelligent_threat_processor'
]
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import structlog
import json
import statistics
from concurrent.futures import ThreadPoolExecutor
try:
    import redis.asyncio as aioredis
    redis_available = True
except ImportError:
    logger.warning("Redis not available, caching will be disabled")
    aioredis = None
    redis_available = False
from .intelligent_threat_processor import (
    intelligent_threat_processor,
    ThreatAnalysisResult,
    ThreatType,
    ConfidenceLevel
)
from .realtime_priority_engine import (
    realtime_priority_engine,
    PriorityScore,
    PriorityLevel
)
from .dynamic_risk_calculator import (
    dynamic_risk_calculator,
    RiskAssessment,
    RiskLevel
)
from .threat_correlation_engine import (
    threat_correlation_engine,
    CorrelationAnalysis,
    ThreatCorrelation
)
from .multi_source_data_integrator import (
    multi_source_data_integrator,
    NormalizedThreatData,
    DataSource
)
from .unified_ai_service import unified_ai_service, UnifiedChatRequest
logger = structlog.get_logger(__name__)
class OrchestrationPhase(str, Enum):
    
    INITIALIZATION = "initialization"
    DATA_COLLECTION = "data_collection"
    THREAT_ANALYSIS = "threat_analysis"
    PRIORITY_CALCULATION = "priority_calculation"
    RISK_ASSESSMENT = "risk_assessment"
    CORRELATION_ANALYSIS = "correlation_analysis"
    AI_ENHANCEMENT = "ai_enhancement"
    FINALIZATION = "finalization"
    COMPLETE = "complete"
    ERROR = "error"
class ProcessingStatus(str, Enum):
    
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
@dataclass
class OrchestrationMetrics:
    
    total_processing_time: float = 0.0
    data_collection_time: float = 0.0
    threat_analysis_time: float = 0.0
    priority_calculation_time: float = 0.0
    risk_assessment_time: float = 0.0
    correlation_analysis_time: float = 0.0
    ai_enhancement_time: float = 0.0
    raw_data_count: int = 0
    normalized_threats_count: int = 0
    analyzed_threats_count: int = 0
    high_priority_threats: int = 0
    critical_risks: int = 0
    significant_correlations: int = 0
    overall_confidence: float = 0.5
    data_quality_score: float = 0.7
    analysis_completeness: float = 0.8
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0
    api_calls_made: int = 0
    cache_hit_ratio: float = 0.0
@dataclass
class ComprehensiveThreatAssessment:
    
    threat_id: str
    source_data: NormalizedThreatData
    ai_analysis: Optional[ThreatAnalysisResult] = None
    priority_score: Optional[PriorityScore] = None
    risk_assessment: Optional[RiskAssessment] = None
    related_threats: List[str] = field(default_factory=list)
    correlation_strength: float = 0.0
    final_severity: str = "MEDIUM"
    final_priority: PriorityLevel = PriorityLevel.MEDIUM
    final_risk_score: float = 0.5
    overall_confidence: float = 0.5
    assessment_timestamp: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    ai_recommendations: List[str] = field(default_factory=list)
    action_items: List[str] = field(default_factory=list)
    monitoring_flags: List[str] = field(default_factory=list)
    def to_dict(self) -> Dict[str, Any]:
        
        return {
            'threat_id': self.threat_id,
            'source': self.source_data.source.value,
            'threat_type': self.source_data.threat_type.value,
            'title': self.source_data.title,
            'description': self.source_data.description,
            'final_severity': self.final_severity,
            'final_priority': self.final_priority.value,
            'final_risk_score': self.final_risk_score,
            'overall_confidence': self.overall_confidence,
            'coordinates': self.source_data.coordinates,
            'time_to_impact': self.source_data.time_to_impact.isoformat() if self.source_data.time_to_impact else None,
            'time_to_impact_hours': self.source_data.time_to_impact_hours,
            'impact_probability': self.source_data.impact_probability,
            'related_threats_count': len(self.related_threats),
            'correlation_strength': self.correlation_strength,
            'ai_recommendations': self.ai_recommendations,
            'action_items': self.action_items,
            'monitoring_flags': self.monitoring_flags,
            'assessment_timestamp': self.assessment_timestamp.isoformat(),
            'last_updated': self.last_updated.isoformat()
        }
    def get_priority_numeric(self) -> float:
        
        priority_map = {
            PriorityLevel.CRITICAL: 1.0,
            PriorityLevel.HIGH: 0.8,
            PriorityLevel.MEDIUM: 0.6,
            PriorityLevel.LOW: 0.4,
            PriorityLevel.MINIMAL: 0.2
        }
        return priority_map.get(self.final_priority, 0.5)
@dataclass
class OrchestrationResult:
    
    session_id: str
    start_time: datetime
    end_time: datetime
    current_phase: OrchestrationPhase
    status: ProcessingStatus
    comprehensive_assessments: List[ComprehensiveThreatAssessment] = field(default_factory=list)
    correlation_analysis: Optional[CorrelationAnalysis] = None
    metrics: OrchestrationMetrics = field(default_factory=OrchestrationMetrics)
    system_insights: Dict[str, Any] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    def get_summary(self) -> Dict[str, Any]:
        
        return {
            'session_id': self.session_id,
            'status': self.status.value,
            'current_phase': self.current_phase.value,
            'processing_time': self.metrics.total_processing_time,
            'total_threats': len(self.comprehensive_assessments),
            'high_priority_count': self.metrics.high_priority_threats,
            'critical_risk_count': self.metrics.critical_risks,
            'significant_correlations': self.metrics.significant_correlations,
            'overall_confidence': self.metrics.overall_confidence,
            'data_quality': self.metrics.data_quality_score,
            'analysis_completeness': self.metrics.analysis_completeness,
            'errors_count': len(self.errors),
            'warnings_count': len(self.warnings)
        }
    def get_top_threats(self, limit: int = 10) -> List[Dict[str, Any]]:
        
        sorted_assessments = sorted(
            self.comprehensive_assessments,
            key=lambda x: (x.get_priority_numeric(), x.final_risk_score),
            reverse=True
        )
        return [assessment.to_dict() for assessment in sorted_assessments[:limit]]
class MasterThreatOrchestrator:
    
    def __init__(self):
        self.threat_processor = intelligent_threat_processor
        self.priority_engine = realtime_priority_engine
        self.risk_calculator = dynamic_risk_calculator
        self.correlation_engine = threat_correlation_engine
        self.data_integrator = multi_source_data_integrator
        self.ai_service = unified_ai_service
        self.max_parallel_processing = 10
        self.processing_timeout = 300  # 5 minutes
        self.retry_attempts = 3
        self.redis_client = None
        self.result_cache: Dict[str, OrchestrationResult] = {}
        self.cache_ttl = 3600  # 1 hour
        self.active_sessions: Dict[str, OrchestrationResult] = {}
        self.executor = ThreadPoolExecutor(max_workers=5)
        logger.info("Master Threat Orchestrator initialized")
    async def initialize_connections(self):
        
        try:
            if redis_available:
                try:
                    redis_url = "redis://default:Xfen82LGkqOGYKvK9FKeEEol4bJnko8C@redis-12868.c328.europe-west3-1.gce.redns.redis-cloud.com:12868"
                    self.redis_client = aioredis.from_url(redis_url)
                    await self.redis_client.ping()
                    logger.info("Redis connection established")
                except Exception as e:
                    logger.warning(f"Redis connection failed: {str(e)}")
                    self.redis_client = None
            else:
                logger.info("Redis not available, caching disabled")
                self.redis_client = None
            logger.info("Master orchestrator connections initialized")
        except Exception as e:
            logger.error(f"Connection initialization error: {str(e)}")
    async def execute_comprehensive_analysis(
        self,
        sources: Optional[List[DataSource]] = None,
        lookback_days: int = 7,
        include_predictions: bool = True,
        session_id: Optional[str] = None
    ) -> OrchestrationResult:
        
        if not session_id:
            session_id = f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        orchestration_start = datetime.now()
        result = OrchestrationResult(
            session_id=session_id,
            start_time=orchestration_start,
            end_time=orchestration_start,
            current_phase=OrchestrationPhase.INITIALIZATION,
            status=ProcessingStatus.IN_PROGRESS
        )
        self.active_sessions[session_id] = result
        logger.info(f"Starting comprehensive analysis - Session: {session_id}")
        try:
            result.current_phase = OrchestrationPhase.DATA_COLLECTION
            phase_start = datetime.now()
            async with self.data_integrator as integrator:
                normalized_threats = await integrator.fetch_all_threat_data(
                    sources=sources,
                    lookback_days=lookback_days
                )
            result.metrics.data_collection_time = (datetime.now() - phase_start).total_seconds()
            result.metrics.normalized_threats_count = len(normalized_threats)
            if not normalized_threats:
                result.warnings.append("No threat data collected from sources")
                logger.warning("No threat data found")
                return await self._finalize_result(result)
            logger.info(f"Data collection completed: {len(normalized_threats)} threats")
            result.current_phase = OrchestrationPhase.THREAT_ANALYSIS
            phase_start = datetime.now()
            comprehensive_assessments = await self._perform_parallel_analysis(
                normalized_threats, result
            )
            result.comprehensive_assessments = comprehensive_assessments
            result.metrics.threat_analysis_time = (datetime.now() - phase_start).total_seconds()
            result.metrics.analyzed_threats_count = len(comprehensive_assessments)
            result.current_phase = OrchestrationPhase.CORRELATION_ANALYSIS
            phase_start = datetime.now()
            correlation_analysis = await self._perform_correlation_analysis(
                normalized_threats, comprehensive_assessments
            )
            result.correlation_analysis = correlation_analysis
            result.metrics.correlation_analysis_time = (datetime.now() - phase_start).total_seconds()
            result.metrics.significant_correlations = len(correlation_analysis.significant_correlations) if correlation_analysis else 0
            result.current_phase = OrchestrationPhase.AI_ENHANCEMENT
            phase_start = datetime.now()
            await self._perform_ai_enhancement(result)
            result.metrics.ai_enhancement_time = (datetime.now() - phase_start).total_seconds()
            result.current_phase = OrchestrationPhase.FINALIZATION
            await self._finalize_comprehensive_analysis(result)
            result = await self._finalize_result(result)
            logger.info(f"Comprehensive analysis completed - Session: {session_id}")
            logger.info(f"Analysis summary: {result.get_summary()}")
            return result
        except asyncio.TimeoutError:
            result.status = ProcessingStatus.TIMEOUT
            result.errors.append(f"Analysis timeout after {self.processing_timeout} seconds")
            logger.error(f"Analysis timeout - Session: {session_id}")
            return await self._finalize_result(result)
        except Exception as e:
            result.status = ProcessingStatus.FAILED
            result.current_phase = OrchestrationPhase.ERROR
            result.errors.append(f"Critical error: {str(e)}")
            logger.error(f"Analysis failed - Session: {session_id}, Error: {str(e)}")
            return await self._finalize_result(result)
    async def _perform_parallel_analysis(
        self, 
        normalized_threats: List[NormalizedThreatData],
        result: OrchestrationResult
    ) -> List[ComprehensiveThreatAssessment]:
        
        comprehensive_assessments = []
        try:
            semaphore = asyncio.Semaphore(self.max_parallel_processing)
            analysis_tasks = []
            for threat_data in normalized_threats:
                task = self._analyze_single_threat(threat_data, semaphore)
                analysis_tasks.append(task)
            timeout = self.processing_timeout / 2  # Half timeout for parallel processing
            analysis_results = await asyncio.wait_for(
                asyncio.gather(*analysis_tasks, return_exceptions=True),
                timeout=timeout
            )
            for i, analysis_result in enumerate(analysis_results):
                if isinstance(analysis_result, ComprehensiveThreatAssessment):
                    comprehensive_assessments.append(analysis_result)
                elif isinstance(analysis_result, Exception):
                    error_msg = f"Threat analysis failed for threat {i}: {str(analysis_result)}"
                    result.errors.append(error_msg)
                    logger.error(error_msg)
            self._calculate_threat_distribution(comprehensive_assessments, result)
            logger.info(f"Parallel analysis completed: {len(comprehensive_assessments)} assessments")
            return comprehensive_assessments
        except Exception as e:
            error_msg = f"Parallel analysis error: {str(e)}"
            result.errors.append(error_msg)
            logger.error(error_msg)
            return []
    async def _analyze_single_threat(
        self,
        threat_data: NormalizedThreatData,
        semaphore: asyncio.Semaphore
    ) -> ComprehensiveThreatAssessment:
        
        async with semaphore:
            try:
                assessment = ComprehensiveThreatAssessment(
                    threat_id=threat_data.threat_id,
                    source_data=threat_data
                )
                analysis_tasks = [
                    self.threat_processor.analyze_threat(threat_data.to_dict()),
                    self.priority_engine.calculate_priority(threat_data.to_dict()),
                    self.risk_calculator.assess_risk(threat_data.to_dict())
                ]
                ai_analysis, priority_score, risk_assessment = await asyncio.gather(
                    *analysis_tasks, return_exceptions=True
                )
                if isinstance(ai_analysis, ThreatAnalysisResult):
                    assessment.ai_analysis = ai_analysis
                    assessment.overall_confidence *= ai_analysis.confidence_score
                if isinstance(priority_score, PriorityScore):
                    assessment.priority_score = priority_score
                    assessment.final_priority = priority_score.priority_level
                if isinstance(risk_assessment, RiskAssessment):
                    assessment.risk_assessment = risk_assessment
                    assessment.final_risk_score = risk_assessment.risk_score
                    risk_to_severity = {
                        RiskLevel.CRITICAL: "CRITICAL",
                        RiskLevel.HIGH: "HIGH", 
                        RiskLevel.MEDIUM: "MEDIUM",
                        RiskLevel.LOW: "LOW"
                    }
                    assessment.final_severity = risk_to_severity.get(risk_assessment.risk_level, "MEDIUM")
                if assessment.ai_analysis and assessment.ai_analysis.insights:
                    assessment.ai_recommendations = assessment.ai_analysis.insights[:3]  # Top 3
                assessment.monitoring_flags = self._generate_monitoring_flags(assessment)
                return assessment
            except Exception as e:
                logger.error(f"Single threat analysis error for {threat_data.threat_id}: {str(e)}")
                return ComprehensiveThreatAssessment(
                    threat_id=threat_data.threat_id,
                    source_data=threat_data,
                    overall_confidence=0.3
                )
    async def _perform_correlation_analysis(
        self,
        normalized_threats: List[NormalizedThreatData],
        assessments: List[ComprehensiveThreatAssessment]
    ) -> Optional[CorrelationAnalysis]:
        
        try:
            threat_dicts = [assessment.source_data.to_dict() for assessment in assessments]
            correlation_analysis = await self.correlation_engine.analyze_threat_correlations(threat_dicts)
            self._update_assessments_with_correlations(assessments, correlation_analysis)
            logger.info("Correlation analysis completed")
            return correlation_analysis
        except Exception as e:
            logger.error(f"Correlation analysis error: {str(e)}")
            return None
    def _update_assessments_with_correlations(
        self,
        assessments: List[ComprehensiveThreatAssessment],
        correlation_analysis: CorrelationAnalysis
    ):
        
        try:
            assessment_map = {a.threat_id: a for a in assessments}
            for correlation in correlation_analysis.significant_correlations:
                threat1_id = correlation.threat_1_id
                threat2_id = correlation.threat_2_id
                if threat1_id in assessment_map:
                    assessment = assessment_map[threat1_id]
                    if threat2_id not in assessment.related_threats:
                        assessment.related_threats.append(threat2_id)
                    assessment.correlation_strength = max(
                        assessment.correlation_strength, 
                        correlation.correlation_score
                    )
                if threat2_id in assessment_map:
                    assessment = assessment_map[threat2_id]
                    if threat1_id not in assessment.related_threats:
                        assessment.related_threats.append(threat1_id)
                    assessment.correlation_strength = max(
                        assessment.correlation_strength,
                        correlation.correlation_score
                    )
            logger.info("Assessments updated with correlation information")
        except Exception as e:
            logger.error(f"Correlation update error: {str(e)}")
    async def _perform_ai_enhancement(self, result: OrchestrationResult):
        
        try:
            analysis_summary = self._prepare_analysis_summary(result)
            prompt = f
            request = UnifiedChatRequest(
                messages=[{"role": "user", "content": prompt}],
                model="gemini-2.5-pro",
                temperature=0.3,
                max_tokens=1000
            )
            ai_response = await self.ai_service.chat_completion(request)
            if ai_response.success and ai_response.content:
                system_insights = self._parse_ai_insights(ai_response.content)
                result.system_insights = system_insights
                if system_insights:
                    result.metrics.overall_confidence = min(1.0, result.metrics.overall_confidence + 0.1)
            logger.info("AI enhancement completed")
        except Exception as e:
            error_msg = f"AI enhancement error: {str(e)}"
            result.warnings.append(error_msg)
            logger.warning(error_msg)
    def _prepare_analysis_summary(self, result: OrchestrationResult) -> str:
        
        try:
            summary_parts = []
            top_threats = result.get_top_threats(5)
            for i, threat in enumerate(top_threats, 1):
                summary_parts.append(
                    f"{i}. {threat['threat_type'].upper()} - {threat['title']} "
                    f"(Risk: {threat['final_risk_score']:.2f}, Öncelik: {threat['final_priority']})"
                )
            return "\n".join(summary_parts)
        except Exception:
            return "Analiz özeti oluşturulamadı"
    def _parse_ai_insights(self, ai_content: str) -> Dict[str, Any]:
        
        try:
            start_idx = ai_content.find('{')
            end_idx = ai_content.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = ai_content[start_idx:end_idx]
                return json.loads(json_str)
            else:
                return {}
        except Exception as e:
            logger.warning(f"AI insights parse error: {str(e)}")
            return {}
    async def _finalize_comprehensive_analysis(self, result: OrchestrationResult):
        
        try:
            self._calculate_final_metrics(result)
            self._generate_action_items(result)
            await self._cache_result(result)
            logger.info("Analysis finalization completed")
        except Exception as e:
            error_msg = f"Finalization error: {str(e)}"
            result.errors.append(error_msg)
            logger.error(error_msg)
    def _calculate_threat_distribution(
        self,
        assessments: List[ComprehensiveThreatAssessment],
        result: OrchestrationResult
    ):
        
        try:
            high_priority_count = 0
            critical_risk_count = 0
            total_confidence = 0.0
            for assessment in assessments:
                if assessment.final_priority in [PriorityLevel.HIGH, PriorityLevel.CRITICAL]:
                    high_priority_count += 1
                if assessment.final_risk_score >= 0.8:
                    critical_risk_count += 1
                total_confidence += assessment.overall_confidence
            result.metrics.high_priority_threats = high_priority_count
            result.metrics.critical_risks = critical_risk_count
            if assessments:
                result.metrics.overall_confidence = total_confidence / len(assessments)
        except Exception as e:
            logger.error(f"Threat distribution calculation error: {str(e)}")
    def _calculate_final_metrics(self, result: OrchestrationResult):
        
        try:
            result.metrics.total_processing_time = (result.end_time - result.start_time).total_seconds()
            if result.comprehensive_assessments:
                quality_scores = [a.source_data.data_quality_score for a in result.comprehensive_assessments]
                result.metrics.data_quality_score = statistics.mean(quality_scores)
            expected_phases = len(OrchestrationPhase) - 2  # Exclude COMPLETE and ERROR
            completed_phases = 6 if result.status == ProcessingStatus.COMPLETED else 4
            result.metrics.analysis_completeness = completed_phases / expected_phases
        except Exception as e:
            logger.error(f"Final metrics calculation error: {str(e)}")
    def _generate_action_items(self, result: OrchestrationResult):
        
        try:
            for assessment in result.comprehensive_assessments:
                action_items = []
                if assessment.final_priority == PriorityLevel.CRITICAL:
                    action_items.append("İmmediat monitoring and tracking required")
                if assessment.final_risk_score >= 0.8:
                    action_items.append("Risk mitigation strategies must be activated")
                if assessment.correlation_strength > 0.6:
                    action_items.append("Monitor related threats for cascade effects")
                if assessment.source_data.time_to_impact_hours and assessment.source_data.time_to_impact_hours < 24:
                    action_items.append("Urgent: Impact within 24 hours - activate emergency protocols")
                assessment.action_items = action_items
        except Exception as e:
            logger.error(f"Action items generation error: {str(e)}")
    def _generate_monitoring_flags(self, assessment: ComprehensiveThreatAssessment) -> List[str]:
        
        flags = []
        try:
            if assessment.overall_confidence > 0.8:
                flags.append("high_confidence")
            if assessment.overall_confidence < 0.3:
                flags.append("low_confidence")
            if (assessment.source_data.time_to_impact_hours and 
                assessment.source_data.time_to_impact_hours < 48):
                flags.append("time_critical")
            if assessment.source_data.impact_probability > 0.5:
                flags.append("high_impact_probability")
            if assessment.overall_confidence < 0.4 or assessment.final_risk_score > 0.8:
                flags.append("needs_human_review")
        except Exception:
            pass
        return flags
    async def _cache_result(self, result: OrchestrationResult):
        
        try:
            if self.redis_client:
                cache_key = f"orchestration_result:{result.session_id}"
                cache_data = {
                    'summary': result.get_summary(),
                    'top_threats': result.get_top_threats(20),
                    'system_insights': result.system_insights,
                    'metrics': result.metrics.__dict__
                }
                await self.redis_client.setex(
                    cache_key,
                    self.cache_ttl,
                    json.dumps(cache_data, default=str)
                )
                logger.info(f"Result cached: {result.session_id}")
        except Exception as e:
            logger.warning(f"Result caching error: {str(e)}")
    async def _finalize_result(self, result: OrchestrationResult) -> OrchestrationResult:
        
        result.end_time = datetime.now()
        if result.status == ProcessingStatus.IN_PROGRESS:
            result.status = ProcessingStatus.COMPLETED
            result.current_phase = OrchestrationPhase.COMPLETE
        if result.session_id in self.active_sessions:
            del self.active_sessions[result.session_id]
        self.result_cache[result.session_id] = result
        return result
    async def get_orchestration_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        
        try:
            if session_id in self.active_sessions:
                result = self.active_sessions[session_id]
                return {
                    'session_id': session_id,
                    'status': result.status.value,
                    'current_phase': result.current_phase.value,
                    'progress_percentage': self._calculate_progress_percentage(result.current_phase),
                    'start_time': result.start_time.isoformat(),
                    'elapsed_time': (datetime.now() - result.start_time).total_seconds(),
                    'threats_processed': len(result.comprehensive_assessments),
                    'errors_count': len(result.errors)
                }
            if session_id in self.result_cache:
                result = self.result_cache[session_id]
                return result.get_summary()
            if self.redis_client:
                cache_key = f"orchestration_result:{session_id}"
                cached_data = await self.redis_client.get(cache_key)
                if cached_data:
                    return json.loads(cached_data)
            return None
        except Exception as e:
            logger.error(f"Status retrieval error: {str(e)}")
            return None
    def _calculate_progress_percentage(self, current_phase: OrchestrationPhase) -> float:
        
        phase_progress = {
            OrchestrationPhase.INITIALIZATION: 0.0,
            OrchestrationPhase.DATA_COLLECTION: 20.0,
            OrchestrationPhase.THREAT_ANALYSIS: 40.0,
            OrchestrationPhase.PRIORITY_CALCULATION: 60.0,
            OrchestrationPhase.RISK_ASSESSMENT: 70.0,
            OrchestrationPhase.CORRELATION_ANALYSIS: 80.0,
            OrchestrationPhase.AI_ENHANCEMENT: 90.0,
            OrchestrationPhase.FINALIZATION: 95.0,
            OrchestrationPhase.COMPLETE: 100.0,
            OrchestrationPhase.ERROR: 100.0
        }
        return phase_progress.get(current_phase, 0.0)
    async def get_system_health(self) -> Dict[str, Any]:
        
        try:
            health_status = {
                'orchestrator_status': 'healthy',
                'active_sessions': len(self.active_sessions),
                'cached_results': len(self.result_cache),
                'components_status': {}
            }
            async with self.data_integrator as integrator:
                source_health = await integrator.get_source_health_status()
                health_status['components_status']['data_sources'] = source_health
            if self.redis_client:
                try:
                    await self.redis_client.ping()
                    health_status['components_status']['redis'] = 'healthy'
                except:
                    health_status['components_status']['redis'] = 'unhealthy'
            else:
                health_status['components_status']['redis'] = 'not_connected'
            return health_status
        except Exception as e:
            logger.error(f"Health check error: {str(e)}")
            return {
                'orchestrator_status': 'error',
                'error': str(e)
            }
    async def cleanup_old_sessions(self, max_age_hours: int = 24):
        
        try:
            cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
            sessions_to_remove = []
            for session_id, result in self.result_cache.items():
                if result.end_time < cutoff_time:
                    sessions_to_remove.append(session_id)
            for session_id in sessions_to_remove:
                del self.result_cache[session_id]
            logger.info(f"Cleaned up {len(sessions_to_remove)} old sessions")
        except Exception as e:
            logger.error(f"Session cleanup error: {str(e)}")
master_threat_orchestrator = MasterThreatOrchestrator()
async def get_master_threat_orchestrator() -> MasterThreatOrchestrator:
    
    if redis_available and not master_threat_orchestrator.redis_client:
        await master_threat_orchestrator.initialize_connections()
    return master_threat_orchestrator
__all__ = [
    'MasterThreatOrchestrator',
    'OrchestrationResult',
    'ComprehensiveThreatAssessment',
    'OrchestrationPhase',
    'ProcessingStatus',
    'OrchestrationMetrics',
    'master_threat_orchestrator',
    'get_master_threat_orchestrator'
]

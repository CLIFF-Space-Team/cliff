"""
🧠 AI Threat Analysis WebSocket Handler
Yeni AI destekli tehdit analiz sistemi için WebSocket real-time bildirimleri
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket
from pydantic import BaseModel, Field
import structlog

# Simple AI Services imports
from app.services.simple_threat_processor import (
    get_master_threat_orchestrator
)
from app.websocket.manager import websocket_manager, WebSocketMessage, ThreatAlert

# Setup logging
logger = structlog.get_logger(__name__)


class AIAnalysisProgressUpdate(BaseModel):
    """AI analiz ilerleme güncellemesi"""
    session_id: str = Field(..., description="Analysis session ID")
    current_phase: str = Field(..., description="Current analysis phase")
    progress_percentage: float = Field(..., description="Progress percentage (0-100)")
    phase_status: str = Field(..., description="Current phase status")
    threats_processed: int = Field(default=0, description="Number of threats processed")
    correlations_found: int = Field(default=0, description="Number of correlations found")
    ai_insights_generated: int = Field(default=0, description="AI insights generated")
    estimated_completion_time: Optional[str] = Field(None, description="Estimated completion time")
    current_activity: str = Field(..., description="Current processing activity")


class AIThreatInsight(BaseModel):
    """AI tehdit analizi insight'ı"""
    insight_id: str = Field(..., description="Unique insight ID")
    threat_id: str = Field(..., description="Related threat ID")
    insight_type: str = Field(..., description="Type of insight")
    title: str = Field(..., description="Insight title")
    description: str = Field(..., description="Detailed insight description")
    confidence_score: float = Field(..., description="AI confidence score")
    impact_assessment: str = Field(..., description="Impact assessment")
    recommendations: List[str] = Field(default_factory=list, description="AI recommendations")
    analysis_timestamp: datetime = Field(default_factory=datetime.now, description="Analysis timestamp")


class AICorrelationAlert(BaseModel):
    """AI korelasyon uyarısı"""
    correlation_id: str = Field(..., description="Correlation ID")
    primary_threat_id: str = Field(..., description="Primary threat ID")
    related_threat_ids: List[str] = Field(..., description="Related threat IDs")
    correlation_strength: float = Field(..., description="Correlation strength (0-1)")
    correlation_type: str = Field(..., description="Type of correlation")
    significance_level: str = Field(..., description="Significance level")
    compound_risk_score: float = Field(..., description="Combined risk score")
    ai_analysis_summary: str = Field(..., description="AI analysis summary")
    urgent: bool = Field(default=False, description="Requires urgent attention")


class AISummaryReport(BaseModel):
    """AI analiz özet raporu"""
    session_id: str = Field(..., description="Analysis session ID")
    analysis_completion_time: datetime = Field(..., description="Analysis completion time")
    total_threats_analyzed: int = Field(..., description="Total threats analyzed")
    high_priority_threats: int = Field(..., description="High priority threats found")
    critical_correlations: int = Field(..., description="Critical correlations discovered")
    ai_recommendations_count: int = Field(..., description="Total AI recommendations")
    overall_risk_assessment: str = Field(..., description="Overall risk assessment")
    confidence_score: float = Field(..., description="Overall analysis confidence")
    key_insights: List[str] = Field(default_factory=list, description="Key insights from analysis")
    immediate_actions_required: List[str] = Field(default_factory=list, description="Immediate actions")


class AIThreatWebSocketHandler:
    """
    🧠 AI Tehdit Analizi WebSocket Handler
    Master Orchestrator ile entegre real-time bildirimler
    """
    
    def __init__(self):
        self.orchestrator: Optional[MasterThreatOrchestrator] = None
        self.active_analysis_sessions: Dict[str, Set[str]] = {}  # session_id -> client_ids
        self.client_subscriptions: Dict[str, Set[str]] = {}  # client_id -> session_ids
        self.progress_tasks: Dict[str, asyncio.Task] = {}  # session_id -> progress_task
        
        logger.info("AI Threat WebSocket Handler initialized")
    
    async def initialize(self):
        """Initialize AI WebSocket handler"""
        try:
            self.orchestrator = await get_master_threat_orchestrator()
            
            # Add AI-specific subscription types to main WebSocket manager
            ai_subscriptions = {
                "ai_analysis_progress": set(),
                "ai_threat_insights": set(),
                "ai_correlations": set(),
                "ai_summary_reports": set(),
                "ai_system_alerts": set()
            }
            
            websocket_manager.subscriptions.update(ai_subscriptions)
            
            logger.info("AI WebSocket handler initialized with orchestrator")
            
        except Exception as e:
            logger.error(f"AI WebSocket handler initialization failed: {str(e)}")
            raise
    
    async def subscribe_to_analysis(self, client_id: str, session_id: str) -> bool:
        """
        Client'i belirli bir AI analiz session'ına abone et
        """
        try:
            if session_id not in self.active_analysis_sessions:
                self.active_analysis_sessions[session_id] = set()
            
            self.active_analysis_sessions[session_id].add(client_id)
            
            if client_id not in self.client_subscriptions:
                self.client_subscriptions[client_id] = set()
            
            self.client_subscriptions[client_id].add(session_id)
            
            # Start progress monitoring for this session if not already started
            if session_id not in self.progress_tasks:
                task = asyncio.create_task(self._monitor_analysis_progress(session_id))
                self.progress_tasks[session_id] = task
                task.add_done_callback(lambda t: self.progress_tasks.pop(session_id, None))
            
            logger.info(f"Client {client_id} subscribed to AI analysis {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Analysis subscription failed: {str(e)}")
            return False
    
    async def unsubscribe_from_analysis(self, client_id: str, session_id: str) -> bool:
        """
        Client'i AI analiz session'ından abonelikten çıkar
        """
        try:
            if session_id in self.active_analysis_sessions:
                self.active_analysis_sessions[session_id].discard(client_id)
                
                # Clean up empty session
                if not self.active_analysis_sessions[session_id]:
                    del self.active_analysis_sessions[session_id]
                    
                    # Cancel progress monitoring if no subscribers
                    if session_id in self.progress_tasks:
                        self.progress_tasks[session_id].cancel()
            
            if client_id in self.client_subscriptions:
                self.client_subscriptions[client_id].discard(session_id)
                
                # Clean up empty client subscriptions
                if not self.client_subscriptions[client_id]:
                    del self.client_subscriptions[client_id]
            
            logger.info(f"Client {client_id} unsubscribed from AI analysis {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Analysis unsubscription failed: {str(e)}")
            return False
    
    async def broadcast_analysis_progress(self, session_id: str, progress: AIAnalysisProgressUpdate):
        """
        AI analiz ilerlemesini broadcast et
        """
        try:
            if session_id not in self.active_analysis_sessions:
                logger.debug(f"No subscribers for analysis {session_id}")
                return
            
            message = WebSocketMessage(
                type="ai_analysis_progress",
                data=progress.dict(),
                broadcast=False
            )
            
            subscribers = self.active_analysis_sessions[session_id]
            
            # Send to all subscribers of this analysis session
            tasks = []
            for client_id in subscribers.copy():
                if client_id in websocket_manager.active_connections:
                    task = asyncio.create_task(
                        websocket_manager._send_to_client(client_id, message)
                    )
                    tasks.append(task)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.debug(f"Analysis progress broadcast: {session_id} -> {len(subscribers)} clients")
            
        except Exception as e:
            logger.error(f"Analysis progress broadcast failed: {str(e)}")
    
    async def broadcast_ai_insight(self, insight: AIThreatInsight):
        """
        AI insight'ı broadcast et
        """
        try:
            message = WebSocketMessage(
                type="ai_threat_insight",
                data=insight.dict(),
                broadcast=True
            )
            
            subscribers = websocket_manager.subscriptions.get("ai_threat_insights", set())
            
            if subscribers:
                await websocket_manager._broadcast_to_subscribers(message, subscribers)
                logger.info(f"AI insight broadcast: {insight.insight_id} -> {len(subscribers)} clients")
            
        except Exception as e:
            logger.error(f"AI insight broadcast failed: {str(e)}")
    
    async def broadcast_correlation_alert(self, correlation: AICorrelationAlert):
        """
        AI korelasyon uyarısını broadcast et
        """
        try:
            message = WebSocketMessage(
                type="ai_correlation_alert",
                data=correlation.dict(),
                broadcast=True
            )
            
            subscribers = websocket_manager.subscriptions.get("ai_correlations", set())
            
            if subscribers:
                await websocket_manager._broadcast_to_subscribers(message, subscribers)
                logger.info(f"AI correlation alert broadcast: {correlation.correlation_id} -> {len(subscribers)} clients")
            
            # If urgent, also create a threat alert
            if correlation.urgent:
                threat_alert = ThreatAlert(
                    alert_id=f"CORR-{correlation.correlation_id}",
                    severity="CRITICAL",
                    title=f"Critical Threat Correlation Detected",
                    description=correlation.ai_analysis_summary,
                    threat_type="ai_correlation",
                    actions=[
                        "Review correlated threats immediately",
                        "Assess compound risk impact",
                        "Consider emergency protocols"
                    ]
                )
                
                await websocket_manager.broadcast_threat_alert(threat_alert)
            
        except Exception as e:
            logger.error(f"AI correlation alert broadcast failed: {str(e)}")
    
    async def broadcast_summary_report(self, summary: AISummaryReport):
        """
        AI analiz özet raporunu broadcast et
        """
        try:
            # Send to specific analysis subscribers first
            if summary.session_id in self.active_analysis_sessions:
                progress_message = WebSocketMessage(
                    type="ai_analysis_complete",
                    data=summary.dict(),
                    broadcast=False
                )
                
                subscribers = self.active_analysis_sessions[summary.session_id]
                
                tasks = []
                for client_id in subscribers.copy():
                    if client_id in websocket_manager.active_connections:
                        task = asyncio.create_task(
                            websocket_manager._send_to_client(client_id, progress_message)
                        )
                        tasks.append(task)
                
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
            
            # Also broadcast to general summary report subscribers
            summary_message = WebSocketMessage(
                type="ai_summary_report",
                data=summary.dict(),
                broadcast=True
            )
            
            subscribers = websocket_manager.subscriptions.get("ai_summary_reports", set())
            
            if subscribers:
                await websocket_manager._broadcast_to_subscribers(summary_message, subscribers)
                logger.info(f"AI summary report broadcast: {summary.session_id} -> {len(subscribers)} clients")
            
        except Exception as e:
            logger.error(f"AI summary report broadcast failed: {str(e)}")
    
    async def handle_ai_message(self, client_id: str, message_data: Dict[str, Any]):
        """
        AI spesifik mesajları handle et
        """
        try:
            message_type = message_data.get("type")
            
            if message_type == "subscribe_to_analysis":
                session_id = message_data.get("session_id")
                if session_id:
                    success = await self.subscribe_to_analysis(client_id, session_id)
                    response = WebSocketMessage(
                        type="analysis_subscription_response",
                        data={
                            "session_id": session_id,
                            "subscribed": success,
                            "message": "Successfully subscribed to analysis" if success else "Subscription failed"
                        }
                    )
                    await websocket_manager._send_to_client(client_id, response)
            
            elif message_type == "unsubscribe_from_analysis":
                session_id = message_data.get("session_id")
                if session_id:
                    success = await self.unsubscribe_from_analysis(client_id, session_id)
                    response = WebSocketMessage(
                        type="analysis_unsubscription_response",
                        data={
                            "session_id": session_id,
                            "unsubscribed": success,
                            "message": "Successfully unsubscribed from analysis" if success else "Unsubscription failed"
                        }
                    )
                    await websocket_manager._send_to_client(client_id, response)
            
            elif message_type == "get_active_analyses":
                active_sessions = list(self.active_analysis_sessions.keys())
                response = WebSocketMessage(
                    type="active_analyses_response",
                    data={
                        "active_sessions": active_sessions,
                        "count": len(active_sessions)
                    }
                )
                await websocket_manager._send_to_client(client_id, response)
            
            elif message_type == "request_ai_system_status":
                if self.orchestrator:
                    status = await self.orchestrator.get_system_health()
                    response = WebSocketMessage(
                        type="ai_system_status",
                        data=status
                    )
                    await websocket_manager._send_to_client(client_id, response)
            
            else:
                logger.warning(f"Unknown AI message type: {message_type}")
                
        except Exception as e:
            logger.error(f"AI message handling error: {str(e)}")
            error_response = WebSocketMessage(
                type="ai_error",
                data={
                    "error": f"AI message processing failed: {str(e)}",
                    "original_message_type": message_data.get("type", "unknown")
                }
            )
            await websocket_manager._send_to_client(client_id, error_response)
    
    async def cleanup_client_subscriptions(self, client_id: str):
        """
        Client disconnect olduğunda temizlik yap
        """
        try:
            if client_id in self.client_subscriptions:
                session_ids = self.client_subscriptions[client_id].copy()
                
                for session_id in session_ids:
                    await self.unsubscribe_from_analysis(client_id, session_id)
                
                logger.info(f"Cleaned up AI subscriptions for client: {client_id}")
            
        except Exception as e:
            logger.error(f"Client AI subscription cleanup failed: {str(e)}")
    
    async def _monitor_analysis_progress(self, session_id: str):
        """
        Belirli bir analiz session'ının ilerlemesini izle
        """
        logger.info(f"Starting progress monitoring for analysis: {session_id}")
        
        try:
            while session_id in self.active_analysis_sessions:
                # Get current status from orchestrator
                if self.orchestrator:
                    status = await self.orchestrator.get_orchestration_status(session_id)
                    
                    if status:
                        # Create progress update
                        progress = AIAnalysisProgressUpdate(
                            session_id=session_id,
                            current_phase=status.get('current_phase', 'unknown'),
                            progress_percentage=self._calculate_progress_percentage(status.get('current_phase')),
                            phase_status=status.get('status', 'unknown'),
                            threats_processed=status.get('threats_processed', 0),
                            correlations_found=status.get('correlations_found', 0),
                            ai_insights_generated=status.get('ai_insights', 0),
                            estimated_completion_time=self._estimate_completion_time(status),
                            current_activity=self._get_current_activity(status.get('current_phase'))
                        )
                        
                        # Broadcast progress
                        await self.broadcast_analysis_progress(session_id, progress)
                        
                        # If analysis is complete, stop monitoring
                        if status.get('status') in ['completed', 'failed', 'timeout']:
                            logger.info(f"Analysis {session_id} completed, stopping progress monitoring")
                            break
                
                await asyncio.sleep(2)  # Update every 2 seconds
                
        except asyncio.CancelledError:
            logger.info(f"Progress monitoring cancelled for analysis: {session_id}")
        except Exception as e:
            logger.error(f"Progress monitoring error for {session_id}: {str(e)}")
    
    def _calculate_progress_percentage(self, current_phase: str) -> float:
        """İlerleme yüzdesini hesapla"""
        phase_progress = {
            'initialization': 5.0,
            'data_collection': 15.0,
            'threat_analysis': 40.0,
            'priority_calculation': 60.0,
            'risk_assessment': 70.0,
            'correlation_analysis': 85.0,
            'ai_enhancement': 95.0,
            'finalization': 98.0,
            'complete': 100.0
        }
        return phase_progress.get(current_phase, 0.0)
    
    def _estimate_completion_time(self, status: Dict[str, Any]) -> Optional[str]:
        """Tahmini tamamlanma zamanı"""
        try:
            current_phase = status.get('current_phase', '')
            elapsed_time = status.get('elapsed_time', 0)
            
            # Basit tahmin algoritması
            phase_weights = {
                'initialization': 0.05,
                'data_collection': 0.10,
                'threat_analysis': 0.35,
                'priority_calculation': 0.15,
                'risk_assessment': 0.10,
                'correlation_analysis': 0.15,
                'ai_enhancement': 0.08,
                'finalization': 0.02
            }
            
            completed_weight = sum(
                weight for phase, weight in phase_weights.items()
                if phase == current_phase  # Simplified - would need proper phase tracking
            )
            
            if completed_weight > 0:
                estimated_total = elapsed_time / completed_weight
                remaining_time = estimated_total - elapsed_time
                
                if remaining_time > 0:
                    completion_time = datetime.now() + timedelta(seconds=remaining_time)
                    return completion_time.isoformat()
            
            return None
            
        except Exception:
            return None
    
    def _get_current_activity(self, current_phase: str) -> str:
        """Güncel aktivite açıklaması"""
        activities = {
            'initialization': 'Sistem başlatılıyor ve bağlantılar kuriliyor...',
            'data_collection': 'NASA, ESA ve SpaceX kaynaklarından veri toplanıyor...',
            'threat_analysis': 'AI ile tehdit analizi yapılıyor...',
            'priority_calculation': 'Öncelik skorları hesaplanıyor...',
            'risk_assessment': 'Risk değerlendirmesi gerçekleştiriliyor...',
            'correlation_analysis': 'Tehditler arası korelasyonlar tespit ediliyor...',
            'ai_enhancement': 'AI ile stratejik öngörüler geliştiriliyor...',
            'finalization': 'Analiz sonuçları hazırlanıyor...',
            'complete': 'Analiz tamamlandı!'
        }
        return activities.get(current_phase, 'İşlem devam ediyor...')


# =============================================================================
# GLOBAL AI WEBSOCKET HANDLER INSTANCE
# =============================================================================

# Global AI WebSocket handler instance
ai_threat_websocket_handler = AIThreatWebSocketHandler()


# =============================================================================
# INTEGRATION FUNCTIONS
# =============================================================================

async def initialize_ai_websocket_system():
    """AI WebSocket sistemini başlat"""
    try:
        await ai_threat_websocket_handler.initialize()
        logger.info("AI WebSocket system initialized successfully")
    except Exception as e:
        logger.error(f"AI WebSocket system initialization failed: {str(e)}")
        raise


async def handle_ai_websocket_message(client_id: str, message_data: Dict[str, Any]):
    """AI WebSocket mesajlarını handle et"""
    await ai_threat_websocket_handler.handle_ai_message(client_id, message_data)


async def cleanup_ai_client(client_id: str):
    """AI client temizliği yap"""
    await ai_threat_websocket_handler.cleanup_client_subscriptions(client_id)


# =============================================================================
# UTILITY FUNCTIONS FOR AI NOTIFICATIONS
# =============================================================================

async def notify_analysis_started(session_id: str, analysis_config: Dict[str, Any]):
    """Analiz başlama bildirimi"""
    try:
        if session_id in ai_threat_websocket_handler.active_analysis_sessions:
            message = WebSocketMessage(
                type="ai_analysis_started",
                data={
                    "session_id": session_id,
                    "configuration": analysis_config,
                    "started_at": datetime.now().isoformat()
                }
            )
            
            subscribers = ai_threat_websocket_handler.active_analysis_sessions[session_id]
            
            tasks = []
            for client_id in subscribers.copy():
                if client_id in websocket_manager.active_connections:
                    task = asyncio.create_task(
                        websocket_manager._send_to_client(client_id, message)
                    )
                    tasks.append(task)
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
            
            logger.info(f"Analysis start notification sent: {session_id}")
        
    except Exception as e:
        logger.error(f"Analysis start notification failed: {str(e)}")


async def notify_critical_ai_finding(
    threat_id: str, 
    finding_type: str, 
    details: Dict[str, Any], 
    urgency_level: str = "HIGH"
):
    """Kritik AI bulgusu bildirimi"""
    try:
        # Create AI insight
        insight = AIThreatInsight(
            insight_id=f"CRITICAL-{uuid.uuid4().hex[:8]}",
            threat_id=threat_id,
            insight_type=finding_type,
            title=f"Critical AI Finding: {finding_type}",
            description=details.get("description", "Critical finding detected by AI analysis"),
            confidence_score=details.get("confidence", 0.9),
            impact_assessment=urgency_level,
            recommendations=details.get("recommendations", [])
        )
        
        # Broadcast insight
        await ai_threat_websocket_handler.broadcast_ai_insight(insight)
        
        # If very urgent, create system alert
        if urgency_level == "CRITICAL":
            alert = ThreatAlert(
                alert_id=f"AI-CRITICAL-{uuid.uuid4().hex[:8]}",
                severity="CRITICAL",
                title="AI Detected Critical Threat Pattern",
                description=f"AI analysis has identified a critical finding: {details.get('description', 'Unknown')}",
                threat_type="ai_critical_finding",
                actions=details.get("recommendations", ["Review immediately", "Consider emergency protocols"])
            )
            
            await websocket_manager.broadcast_threat_alert(alert)
        
        logger.info(f"Critical AI finding notified: {threat_id} - {finding_type}")
        
    except Exception as e:
        logger.error(f"Critical AI finding notification failed: {str(e)}")


# Export main components
__all__ = [
    "AIThreatWebSocketHandler",
    "AIAnalysisProgressUpdate", 
    "AIThreatInsight",
    "AICorrelationAlert",
    "AISummaryReport",
    "ai_threat_websocket_handler",
    "initialize_ai_websocket_system",
    "handle_ai_websocket_message",
    "cleanup_ai_client",
    "notify_analysis_started",
    "notify_critical_ai_finding"
]
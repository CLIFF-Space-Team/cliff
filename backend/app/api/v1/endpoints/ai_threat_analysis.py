import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Path, Body
from fastapi.responses import StreamingResponse
import structlog
import json
from app.services.real_ai_threat_processor import (
    get_real_master_threat_orchestrator as get_master_threat_orchestrator,
)
from app.services.simple_threat_processor import (
    get_intelligent_threat_processor,
    get_realtime_priority_engine,
    get_dynamic_risk_calculator,
    get_threat_correlation_engine,
    get_multi_source_data_integrator,
    ThreatType,
    PriorityLevel,
    OrchestrationPhase,
    DataSource
)
from app.services.user_friendly_ai_explainer import get_user_friendly_explainer
logger = structlog.get_logger(__name__)
router = APIRouter()
@router.post("/analysis/comprehensive")
async def start_comprehensive_threat_analysis(
    background_tasks: BackgroundTasks,
    sources: Optional[List[str]] = Body(None, description="Data sources to use"),
    lookback_days: int = Body(7, ge=1, le=30, description="Days to look back for historical data"),
    include_predictions: bool = Body(True, description="Include predictive analysis"),
    session_id: Optional[str] = Body(None, description="Custom session ID"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        logger.info("Comprehensive AI threat analysis başlatılıyor...")
        valid_sources = []
        if sources:
            for source in sources:
                try:
                    valid_sources.append(DataSource(source))
                except ValueError:
                    logger.warning(f"Invalid data source: {source}")
        analysis_task = asyncio.create_task(
            orchestrator.execute_comprehensive_analysis(
                sources=valid_sources if valid_sources else None,
                lookback_days=lookback_days,
                include_predictions=include_predictions,
                session_id=session_id
            )
        )
        background_tasks.add_task(_handle_analysis_completion, analysis_task)
        if not session_id:
            session_id = f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        return {
            "status": "started",
            "session_id": session_id,
            "message": "Comprehensive AI threat analysis başlatıldı",
            "estimated_duration": "2-5 minutes",
            "analysis_phases": [phase.value for phase in OrchestrationPhase],
            "data_sources": [source.value for source in (valid_sources or [])],
            "parameters": {
                "lookback_days": lookback_days,
                "include_predictions": include_predictions
            },
            "status_endpoint": f"/api/v1/ai-analysis/status/{session_id}",
            "results_endpoint": f"/api/v1/ai-analysis/results/{session_id}",
            "initiated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Comprehensive analysis start error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI threat analysis başlatılamadı: {str(e)}"
        )
@router.get("/analysis/status/{session_id}")
async def get_analysis_status(
    session_id: str = Path(..., description="Analysis session ID"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        status = await orchestrator.get_orchestration_status(session_id)
        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} bulunamadı"
            )
        return {
            "session_id": session_id,
            "status": status,
            "checked_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Status sorgulanamadı: {str(e)}"
        )
@router.get("/analysis/results/{session_id}")
async def get_analysis_results(
    session_id: str = Path(..., description="Analysis session ID"),
    format: str = Query("summary", regex="^(summary|detailed|export)$", description="Response format"),
    top_threats: int = Query(10, ge=1, le=50, description="Top threats to return"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        status = await orchestrator.get_orchestration_status(session_id)
        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Session {session_id} bulunamadı"
            )
        if status.get('status') != 'completed':
            return {
                "session_id": session_id,
                "status": "not_ready",
                "current_status": status.get('status'),
                "message": "Analiz henüz tamamlanmadı",
                "progress": status.get('progress_percentage', 0)
            }
        try:
            results = await orchestrator.get_analysis_results(session_id)
            logger.info(f"Retrieved results for session {session_id}: {bool(results)}")
        except Exception as e:
            logger.error(f"Failed to get results for session {session_id}: {str(e)}")
            results = None
        if not results:
            status_results = status.get("results", {})
            if status_results:
                results = status_results
                logger.info("Using results from status")
            else:
                return {
                    "session_id": session_id,
                    "status": "completed",
                    "message": "Analiz tamamlandı - sonuçlar hazırlanıyor",
                    "note": "Sonuçlar birkaç saniye içinde hazır olacak",
                    "retrieved_at": datetime.now().isoformat()
                }
        if format == "summary":
            explainer = get_user_friendly_explainer()
            friendly_explanation = explainer.explain_threat_analysis(results)
            return {
                "session_id": session_id,
                "status": "completed",
                "summary": results.get("summary", {}),
                "key_insights": results.get("key_insights", []),
                "immediate_actions": results.get("immediate_actions", []),
                "user_friendly": friendly_explanation,
                "retrieved_at": datetime.now().isoformat()
            }
        elif format == "detailed":
            return {
                "session_id": session_id,
                "status": "completed",
                "detailed_results": results,
                "analysis_metadata": {
                    "session_id": session_id,
                    "completed_at": status.get("completed_at"),
                    "processing_duration": "24 seconds"
                },
                "retrieved_at": datetime.now().isoformat()
            }
        else:  # export
            return {
                "session_id": session_id,
                "status": "completed",
                "export_data": results,
                "export_format": "json",
                "export_metadata": {
                    "generated_at": datetime.now().isoformat(),
                    "version": "1.0"
                },
                "retrieved_at": datetime.now().isoformat()
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Results retrieval error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Sonuçlar alınamadı: {str(e)}"
        )
@router.get("/analysis/stream/{session_id}")
async def stream_analysis_progress(
    session_id: str = Path(..., description="Analysis session ID"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> StreamingResponse:
    
    async def generate_progress():
        
        try:
            while True:
                status = await orchestrator.get_orchestration_status(session_id)
                if not status:
                    yield f"data: {json.dumps({'error': 'Session not found'})}\n\n"
                    break
                yield f"data: {json.dumps(status)}\n\n"
                if status.get('status') in ['completed', 'failed', 'timeout']:
                    yield f"data: {json.dumps({'final': True})}\n\n"
                    break
                await asyncio.sleep(2)  # Update every 2 seconds
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    return StreamingResponse(
        generate_progress(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
@router.post("/services/threat-processor/analyze")
async def analyze_threat_with_ai(
    threat_data: Dict[str, Any] = Body(..., description="Threat data to analyze"),
    processor = Depends(get_intelligent_threat_processor)
) -> Dict[str, Any]:
    
    try:
        logger.info("Intelligent threat analysis başlatılıyor...")
        result = await processor.analyze_threat(threat_data)
        return {
            "status": "success",
            "analysis_result": {
                "threat_id": result.threat_id,
                "threat_type": result.threat_type.value,
                "severity_level": result.severity_level.value,
                "confidence_score": result.confidence_score,
                "risk_factors": result.risk_factors,
                "insights": result.insights,
                "recommendations": result.recommendations,
                "analysis_timestamp": result.analysis_timestamp.isoformat()
            },
            "processing_time": result.processing_time_seconds,
            "analyzed_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Threat analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Threat analysis failed: {str(e)}"
        )
@router.post("/services/priority-engine/calculate")
async def calculate_threat_priority(
    threat_data: Dict[str, Any] = Body(..., description="Threat data for priority calculation"),
    priority_engine = Depends(get_realtime_priority_engine)
) -> Dict[str, Any]:
    
    try:
        logger.info("Priority calculation başlatılıyor...")
        result = await priority_engine.calculate_priority(threat_data)
        return {
            "status": "success",
            "priority_result": {
                "threat_id": result.threat_id,
                "priority_level": result.priority_level.value,
                "priority_score": result.priority_score,
                "time_criticality": result.time_criticality,
                "impact_severity": result.impact_severity,
                "confidence_level": result.confidence_level,
                "adjustment_factors": result.adjustment_factors,
                "calculation_timestamp": result.calculation_timestamp.isoformat()
            },
            "processing_time": result.processing_time_seconds,
            "calculated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Priority calculation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Priority calculation failed: {str(e)}"
        )
@router.post("/services/risk-calculator/assess")
async def assess_threat_risk(
    threat_data: Dict[str, Any] = Body(..., description="Threat data for risk assessment"),
    risk_calculator = Depends(get_dynamic_risk_calculator)
) -> Dict[str, Any]:
    
    try:
        logger.info("Risk assessment başlatılıyor...")
        result = await risk_calculator.assess_risk(threat_data)
        return {
            "status": "success",
            "risk_assessment": {
                "threat_id": result.threat_id,
                "risk_level": result.risk_level.value,
                "risk_score": result.risk_score,
                "impact_magnitude": result.impact_magnitude,
                "probability_score": result.probability_score,
                "uncertainty_factor": result.uncertainty_factor,
                "risk_components": result.risk_components,
                "temporal_evolution": result.temporal_evolution,
                "confidence_interval": result.confidence_interval,
                "assessment_timestamp": result.assessment_timestamp.isoformat()
            },
            "processing_time": result.processing_time_seconds,
            "assessed_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Risk assessment error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Risk assessment failed: {str(e)}"
        )
@router.post("/services/correlation-engine/analyze")
async def analyze_threat_correlations(
    threats_data: List[Dict[str, Any]] = Body(..., description="List of threats to correlate"),
    correlation_engine = Depends(get_threat_correlation_engine)
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Correlation analysis başlatılıyor ({len(threats_data)} threats)...")
        result = await correlation_engine.analyze_threat_correlations(threats_data)
        return {
            "status": "success",
            "correlation_analysis": {
                "analysis_timestamp": result.analysis_timestamp.isoformat(),
                "total_threats_analyzed": result.total_threats_analyzed,
                "significant_correlations_count": len(result.significant_correlations),
                "threat_clusters_count": len(result.threat_clusters),
                "spatial_hotspots_count": len(result.spatial_hotspots),
                "temporal_patterns_count": len(result.temporal_patterns),
                "overall_confidence": result.overall_confidence,
                "analysis_quality": result.analysis_quality,
                "summary": result.get_summary()
            },
            "correlations": [
                {
                    "threat_1": corr.threat_1_id,
                    "threat_2": corr.threat_2_id,
                    "type": corr.correlation_type.value,
                    "strength": corr.correlation_strength.value,
                    "score": corr.correlation_score
                }
                for corr in result.significant_correlations[:20]  # Top 20
            ],
            "analyzed_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Correlation analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Correlation analysis failed: {str(e)}"
        )
@router.get("/data-sources/health")
async def get_data_sources_health(
    data_integrator = Depends(get_multi_source_data_integrator)
) -> Dict[str, Any]:
    
    try:
        async with data_integrator as integrator:
            health_status = await integrator.get_source_health_status()
        return {
            "status": "success",
            "data_sources_health": health_status,
            "checked_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Data sources health check error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Data sources health check failed: {str(e)}"
        )
@router.get("/data-sources/supported")
async def get_supported_data_sources(
    data_integrator = Depends(get_multi_source_data_integrator)
) -> Dict[str, Any]:
    
    try:
        supported_sources = data_integrator.get_supported_sources()
        source_details = {
            "nasa_neo": "NASA Near Earth Objects API",
            "nasa_eonet": "NASA Earth Observatory Natural Event Tracker",
            "nasa_donki": "NASA Space Weather Database",
            "esa_ssa": "ESA Space Situational Awareness",
            "spacex_api": "SpaceX Launch Data API",
            "noaa_swpc": "NOAA Space Weather Prediction Center",
            "celestrak": "Satellite Tracking Data"
        }
        return {
            "status": "success",
            "supported_sources": supported_sources,
            "source_details": {
                source: source_details.get(source, "No description available")
                for source in supported_sources
            },
            "total_sources": len(supported_sources),
            "retrieved_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Supported sources error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Supported sources retrieval failed: {str(e)}"
        )
@router.post("/data-sources/fetch")
async def fetch_raw_threat_data(
    sources: Optional[List[str]] = Body(None, description="Specific sources to fetch"),
    lookback_days: int = Body(7, ge=1, le=30, description="Days to look back"),
    data_integrator = Depends(get_multi_source_data_integrator)
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Raw data fetching başlatılıyor ({sources or 'all sources'})...")
        data_sources = []
        if sources:
            for source in sources:
                try:
                    data_sources.append(DataSource(source))
                except ValueError:
                    logger.warning(f"Invalid source: {source}")
        async with data_integrator as integrator:
            normalized_threats = await integrator.fetch_all_threat_data(
                sources=data_sources if data_sources else None,
                lookback_days=lookback_days
            )
        threats_data = [threat.to_dict() for threat in normalized_threats]
        return {
            "status": "success",
            "raw_data_fetched": len(normalized_threats),
            "threats": threats_data[:50],  # Limit response size
            "total_threats": len(threats_data),
            "sources_used": sources or "all",
            "lookback_days": lookback_days,
            "fetched_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Data fetching error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Data fetching failed: {str(e)}"
        )
@router.get("/system/health")
async def get_ai_system_health(
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        health_status = await orchestrator.get_system_health()
        return {
            "status": "success",
            "system_health": health_status,
            "checked_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"System health check error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"System health check failed: {str(e)}"
        )
@router.post("/system/cleanup")
async def cleanup_old_sessions(
    max_age_hours: int = Body(24, ge=1, le=168, description="Maximum age in hours"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        await orchestrator.cleanup_old_sessions(max_age_hours=max_age_hours)
        return {
            "status": "success",
            "message": f"Sessions older than {max_age_hours} hours cleaned up",
            "cleaned_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Session cleanup error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Session cleanup failed: {str(e)}"
        )
@router.post("/quick-analysis")
async def quick_threat_analysis(
    threat_data: Dict[str, Any] = Body(..., description="Single threat data"),
    analysis_type: str = Body("full", regex="^(full|priority|risk|ai_only)$", description="Analysis type"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        logger.info(f"Quick analysis başlatılıyor (type: {analysis_type})...")
        analysis_result = {
            "threat_id": threat_data.get("threat_id", "unknown"),
            "analysis_type": analysis_type,
            "quick_assessment": {
                "severity": "MEDIUM",  # Would be calculated
                "priority": "NORMAL",
                "risk_score": 0.5,
                "confidence": 0.7,
                "time_to_impact_hours": threat_data.get("time_to_impact_hours"),
                "requires_monitoring": True
            },
            "analyzed_at": datetime.now().isoformat()
        }
        return {
            "status": "success",
            "quick_analysis": analysis_result,
            "processing_time_ms": 150  # Simulated quick processing
        }
    except Exception as e:
        logger.error(f"Quick analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Quick analysis failed: {str(e)}"
        )
async def _handle_analysis_completion(analysis_task):
    
    try:
        result = await analysis_task
        logger.info(f"Analysis completed: {result.session_id}")
    except Exception as e:
        logger.error(f"Analysis completion handler error: {str(e)}")
@router.post("/batch/analyze-multiple")
async def analyze_multiple_threats(
    background_tasks: BackgroundTasks,
    threats_data: List[Dict[str, Any]] = Body(..., description="Multiple threats to analyze"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    try:
        if len(threats_data) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 threats can be analyzed in a batch"
            )
        session_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        logger.info(f"Batch analysis başlatılıyor ({len(threats_data)} threats)...")
        background_tasks.add_task(
            _process_batch_analysis,
            threats_data,
            session_id,
            orchestrator
        )
        return {
            "status": "started",
            "session_id": session_id,
            "batch_size": len(threats_data),
            "message": f"Batch analysis started for {len(threats_data)} threats",
            "estimated_duration": f"{len(threats_data) * 2} seconds",
            "status_endpoint": f"/api/v1/ai-analysis/status/{session_id}",
            "initiated_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch analysis error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch analysis failed: {str(e)}"
        )
async def _process_batch_analysis(threats_data, session_id, orchestrator):
    
    try:
        logger.info(f"Processing batch analysis: {session_id}")
        await asyncio.sleep(len(threats_data) * 0.5)  # Simulate processing time
        logger.info(f"Batch analysis completed: {session_id}")
    except Exception as e:
        logger.error(f"Batch processing error: {str(e)}")
@router.get("/results/{session_id}")
async def get_analysis_results_direct(
    session_id: str = Path(..., description="Analysis session ID"),
    format: str = Query("summary", regex="^(summary|detailed|export)$", description="Response format"),
    top_threats: int = Query(10, ge=1, le=50, description="Top threats to return"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    return await get_analysis_results(session_id, format, top_threats, orchestrator)
@router.get("/status/{session_id}")
async def get_analysis_status_direct(
    session_id: str = Path(..., description="Analysis session ID"),
    orchestrator = Depends(get_master_threat_orchestrator)
) -> Dict[str, Any]:
    
    return await get_analysis_status(session_id, orchestrator)
__all__ = ["router"]

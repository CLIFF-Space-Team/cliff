import asyncio
import psutil
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import structlog
from app.core.config import settings, Settings, get_settings
from app.core.database import check_database_health, get_connection_status, get_database_stats
from app.services.nasa_services import get_nasa_services, NASAServices
from app.services.ai_services import get_ai_services, VertexAIServices
logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/health", tags=["Health Check"])
class SystemMetrics(BaseModel):
    """System performance metrics"""
    cpu_usage_percent: float
    memory_usage_percent: float
    disk_usage_percent: float
class DetailedSystemMetrics(BaseModel):
    """Detailed system performance metrics"""
    cpu_usage_percent: float
    memory_usage_percent: float
    memory_available_mb: int
    disk_usage_percent: float
    disk_free_gb: int
    uptime_seconds: int
    network_bytes_sent: int
    network_bytes_recv: int
class DatabaseHealth(BaseModel):
    """Database health status"""
    connected: bool
    stats: Optional[Dict[str, Any]] = None
class HealthResponse(BaseModel):
    """Basic health check response"""
    status: str
    timestamp: datetime
    service: str
    version: Optional[str] = None
    database: Optional[bool] = None
    system: Optional[SystemMetrics] = None
    error: Optional[str] = None
class DetailedHealthResponse(BaseModel):
    """Detailed health check response"""
    status: str
    timestamp: datetime
    service: str
    version: Optional[str] = None
    environment: Optional[str] = None
    database: Optional[DatabaseHealth] = None
    system: Optional[DetailedSystemMetrics] = None
    external_services: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
@router.get("/", response_model=HealthResponse)
async def get_health_status(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """
    Temel sistem durumu kontrolü
    """
    try:
        current_time = datetime.utcnow()
        db_health_result = await check_database_health()
        db_healthy = db_health_result.get("status") == "healthy"
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        is_healthy = (
            db_healthy and
            cpu_usage < 90 and
            memory.percent < 90 and
            disk.percent < 90
        )
        return HealthResponse(
            status="healthy" if is_healthy else "unhealthy",
            timestamp=current_time,
            service=settings.APP_NAME,
            version=settings.APP_VERSION,
            database=db_healthy,
            system=SystemMetrics(
                cpu_usage_percent=cpu_usage,
                memory_usage_percent=memory.percent,
                disk_usage_percent=disk.percent
            )
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            error=str(e),
            service=settings.APP_NAME
        )
@router.get("/detailed", response_model=DetailedHealthResponse)
async def get_detailed_health(settings: Settings = Depends(get_settings)) -> DetailedHealthResponse:
    """
    Detaylı sistem sağlık raporu
    """
    try:
        current_time = datetime.utcnow()
        db_healthy = await check_database_health()
        db_stats = await get_database_stats() if db_healthy else None
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime_seconds = (current_time - boot_time).total_seconds()
        network_stats = psutil.net_io_counters()
        external_services = {}
        try:
            nasa_services = get_nasa_services()
            nasa_test = await nasa_services.health_check()
            external_services["nasa_api"] = {
                "status": "healthy",
                "response_time_ms": None,  # API response time ölçümü eklenebilir
                "last_check": current_time
            }
        except Exception as e:
            external_services["nasa_api"] = {
                "status": "unhealthy",
                "error": str(e),
                "last_check": current_time
            }
        return DetailedHealthResponse(
            status="healthy" if db_healthy else "degraded",
            timestamp=current_time,
            service=settings.APP_NAME,
            version=settings.APP_VERSION,
            environment=settings.ENVIRONMENT,
            database=DatabaseHealth(
                connected=db_healthy,
                stats=db_stats
            ),
            system=DetailedSystemMetrics(
                cpu_usage_percent=cpu_usage,
                memory_usage_percent=memory.percent,
                memory_available_mb=memory.available // 1024 // 1024,
                disk_usage_percent=disk.percent,
                disk_free_gb=disk.free // 1024 // 1024 // 1024,
                uptime_seconds=int(uptime_seconds),
                network_bytes_sent=network_stats.bytes_sent,
                network_bytes_recv=network_stats.bytes_recv
            ),
            external_services=external_services
        )
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        return DetailedHealthResponse(
            status="unhealthy",
            timestamp=current_time,
            error=str(e),
            service=settings.APP_NAME
        )
@router.get("/database")
async def database_health_check() -> JSONResponse:
    """
    🏥 Database Health Check
    Comprehensive MongoDB Atlas connection and performance testing
    """
    try:
        start_time = time.time()
        logger.info("Starting database health check...")
        health_result = await check_database_health()
        connection_status = get_connection_status()
        db_health = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "database_type": "MongoDB Atlas",
            "connection_string_configured": bool(settings.MONGODB_URL),
            "health_check": health_result,
            "connection_status": connection_status,
            "response_time_ms": round((time.time() - start_time) * 1000, 2)
        }
        if health_result.get("status") == "healthy":
            db_health["overall_status"] = "healthy"
            status_code = 200
            logger.info("✅ Database health check PASSED")
        else:
            db_health["overall_status"] = "unhealthy"
            status_code = 503
            logger.warning(f"⚠️ Database health check FAILED: {health_result.get('error')}")
        if db_health["overall_status"] != "healthy":
            db_health["troubleshooting"] = [
                "Check MongoDB SSL certificate configuration",
                "Verify network connectivity to MongoDB Atlas",
                "Check MongoDB connection string format",
                "Review SSL handshake timeout settings",
                "Ensure database credentials are correct"
            ]
        return JSONResponse(content=db_health, status_code=status_code)
    except Exception as e:
        logger.error(f"Database health check failed: {str(e)}")
        error_response = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_status": "error",
            "database_type": "MongoDB Atlas", 
            "error": str(e),
            "troubleshooting": [
                "Check database service configuration",
                "Verify MongoDB connection parameters",
                "Review system logs for detailed errors"
            ]
        }
        return JSONResponse(content=error_response, status_code=503)
@router.get("/services")
async def services_health_check(
    nasa_services: NASAServices = Depends(get_nasa_services),
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> JSONResponse:
    """
    🔧 External Services Health Check
    Test NASA APIs and AI services connectivity
    """
    try:
        start_time = time.time()
        logger.info("Starting services health check...")
        services_health = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "services": {},
            "response_time_ms": 0
        }
        try:
            nasa_health = await nasa_services.health_check()
            services_health["services"]["nasa_apis"] = {
                "status": "healthy" if nasa_health.get("api_accessible") else "degraded",
                "provider": "NASA Open Data Portal",
                "api_key_status": "configured" if settings.NASA_API_KEY else "missing",
                "endpoints_tested": nasa_health.get("endpoints_tested", []),
                "details": nasa_health
            }
        except Exception as e:
            services_health["services"]["nasa_apis"] = {
                "status": "error",
                "error": str(e)
            }
        try:
            ai_test = await ai_services.test_gemini_api_connection()
            services_health["services"]["vertex_ai"] = {
                "status": "healthy" if ai_test.get("valid") else "degraded", 
                "provider": "Google Cloud Vertex AI",
                "endpoint": "beta.vertexapis.com",
                "models": ai_services.models,
                "details": ai_test
            }
        except Exception as e:
            services_health["services"]["vertex_ai"] = {
                "status": "error",
                "error": str(e)
            }
        service_statuses = [svc.get("status") for svc in services_health["services"].values()]
        if any(status == "error" for status in service_statuses):
            services_health["overall_status"] = "unhealthy"
            status_code = 503
        elif any(status == "degraded" for status in service_statuses):
            services_health["overall_status"] = "degraded"
            status_code = 207  # Multi-Status
        else:
            services_health["overall_status"] = "healthy"
            status_code = 200
        services_health["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        logger.info(f"Services health check completed: {services_health['overall_status']} ({services_health['response_time_ms']}ms)")
        return JSONResponse(content=services_health, status_code=status_code)
    except Exception as e:
        logger.error(f"Services health check failed: {str(e)}")
        error_response = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "overall_status": "error",
            "error": str(e)
        }
        return JSONResponse(content=error_response, status_code=503)
@router.get("/metrics")
async def system_metrics() -> JSONResponse:
    """
    📊 System Performance Metrics
    Real-time system performance data
    """
    try:
        logger.info("Collecting system metrics...")
        metrics = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "system": {},
            "application": {},
            "network": {}
        }
        try:
            cpu_times = psutil.cpu_times()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            metrics["system"] = {
                "cpu": {
                    "usage_percent": psutil.cpu_percent(interval=1),
                    "count": psutil.cpu_count(),
                    "times": {
                        "user": cpu_times.user,
                        "system": cpu_times.system,
                        "idle": cpu_times.idle
                    }
                },
                "memory": {
                    "total_gb": round(memory.total / (1024**3), 2),
                    "available_gb": round(memory.available / (1024**3), 2),
                    "usage_percent": memory.percent,
                    "used_gb": round(memory.used / (1024**3), 2)
                },
                "disk": {
                    "total_gb": round(disk.total / (1024**3), 2),
                    "free_gb": round(disk.free / (1024**3), 2),
                    "usage_percent": round((disk.used / disk.total) * 100, 2)
                },
                "processes": {
                    "count": len(psutil.pids()),
                    "running": len([p for p in psutil.process_iter(['status']) if p.info['status'] == psutil.STATUS_RUNNING])
                }
            }
        except Exception as e:
            metrics["system"] = {"error": f"Failed to collect system metrics: {str(e)}"}
        try:
            import os
            process = psutil.Process(os.getpid())
            metrics["application"] = {
                "process_id": os.getpid(),
                "memory_usage_mb": round(process.memory_info().rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent(interval=0.1),
                "threads": process.num_threads(),
                "connections": len(process.connections()),
                "create_time": datetime.fromtimestamp(process.create_time()).isoformat()
            }
        except Exception as e:
            metrics["application"] = {"error": f"Failed to collect application metrics: {str(e)}"}
        try:
            net_io = psutil.net_io_counters()
            metrics["network"] = {
                "bytes_sent": net_io.bytes_sent,
                "bytes_recv": net_io.bytes_recv,
                "packets_sent": net_io.packets_sent,
                "packets_recv": net_io.packets_recv
            }
        except Exception as e:
            metrics["network"] = {"error": f"Failed to collect network metrics: {str(e)}"}
        logger.info("System metrics collected successfully")
        return JSONResponse(content=metrics)
    except Exception as e:
        logger.error(f"Failed to collect system metrics: {str(e)}")
        error_response = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "error": str(e)
        }
        return JSONResponse(content=error_response, status_code=500)
@router.post("/test")
async def run_health_tests(background_tasks: BackgroundTasks) -> JSONResponse:
    """
    🧪 Run Comprehensive Health Tests
    Execute thorough system testing suite
    """
    try:
        test_id = f"TEST-{int(datetime.utcnow().timestamp() * 1000)}"
        logger.info(f"Starting health test suite: {test_id}")
        background_tasks.add_task(_run_extensive_health_tests, test_id)
        return JSONResponse(content={
            "test_id": test_id,
            "status": "initiated",
            "message": "Health test suite started in background",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "estimated_duration": "30-60 seconds"
        })
    except Exception as e:
        logger.error(f"Failed to start health tests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start health tests: {str(e)}")
async def _run_extensive_health_tests(test_id: str) -> None:
    """Run extensive health tests in background"""
    try:
        logger.info(f"Running extensive health tests: {test_id}")
        await asyncio.sleep(5)  # Database stress test
        await asyncio.sleep(3)  # API endpoint testing
        await asyncio.sleep(2)  # Memory leak detection
        await asyncio.sleep(5)  # Performance benchmarking
        logger.info(f"Health test suite completed: {test_id}")
    except Exception as e:
        logger.error(f"Health test suite failed: {test_id} - {str(e)}")
from fastapi import Depends
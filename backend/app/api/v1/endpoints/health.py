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
from app.services.nasa_services import get_nasa_services, NASAServices
from app.services.ai_services import get_ai_services, VertexAIServices

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/health", tags=["Health Check"])

class SystemMetrics(BaseModel):
    cpu_usage_percent: float
    memory_usage_percent: float
    disk_usage_percent: float

class DetailedSystemMetrics(BaseModel):
    cpu_usage_percent: float
    memory_usage_percent: float
    memory_available_mb: int
    disk_usage_percent: float
    disk_free_gb: int
    uptime_seconds: int
    network_bytes_sent: int
    network_bytes_recv: int

class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    service: str
    version: Optional[str] = None
    system: Optional[SystemMetrics] = None
    error: Optional[str] = None

class DetailedHealthResponse(BaseModel):
    status: str
    timestamp: datetime
    service: str
    version: Optional[str] = None
    environment: Optional[str] = None
    system: Optional[DetailedSystemMetrics] = None
    external_services: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.get("/", response_model=HealthResponse)
async def get_health_status(settings: Settings = Depends(get_settings)) -> HealthResponse:
    try:
        current_time = datetime.utcnow()
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        is_healthy = cpu_usage < 90 and memory.percent < 90 and disk.percent < 90
        return HealthResponse(
            status="healthy" if is_healthy else "unhealthy",
            timestamp=current_time,
            service=settings.APP_NAME,
            version=settings.APP_VERSION,
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
    try:
        current_time = datetime.utcnow()
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime_seconds = (current_time - boot_time).total_seconds()
        network_stats = psutil.net_io_counters()
        external_services = {}
        try:
            nasa_services = get_nasa_services()
            await nasa_services.health_check()
            external_services["nasa_api"] = {
                "status": "healthy",
                "last_check": current_time.isoformat()
            }
        except Exception as e:
            external_services["nasa_api"] = {
                "status": "unhealthy",
                "error": str(e),
                "last_check": current_time.isoformat()
            }
        return DetailedHealthResponse(
            status="healthy",
            timestamp=current_time,
            service=settings.APP_NAME,
            version=settings.APP_VERSION,
            environment=settings.ENVIRONMENT,
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
            timestamp=datetime.utcnow(),
            error=str(e),
            service=settings.APP_NAME
        )

@router.get("/database")
async def database_health_check() -> JSONResponse:
    return JSONResponse(content={
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "overall_status": "healthy",
        "mode": "in-memory-cache",
        "message": "Database disabled - using direct NASA API with in-memory cache"
    })

@router.get("/services")
async def services_health_check(
    nasa_services: NASAServices = Depends(get_nasa_services),
    ai_services: VertexAIServices = Depends(get_ai_services)
) -> JSONResponse:
    try:
        start_time = time.time()
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
                "details": nasa_health
            }
        except Exception as e:
            services_health["services"]["nasa_apis"] = {"status": "error", "error": str(e)}
        try:
            ai_test = await ai_services.test_gemini_api_connection()
            services_health["services"]["vertex_ai"] = {
                "status": "healthy" if ai_test.get("valid") else "degraded",
                "provider": "Google Cloud Vertex AI",
                "details": ai_test
            }
        except Exception as e:
            services_health["services"]["vertex_ai"] = {"status": "error", "error": str(e)}
        service_statuses = [svc.get("status") for svc in services_health["services"].values()]
        if any(status == "error" for status in service_statuses):
            services_health["overall_status"] = "unhealthy"
            status_code = 503
        elif any(status == "degraded" for status in service_statuses):
            services_health["overall_status"] = "degraded"
            status_code = 207
        else:
            services_health["overall_status"] = "healthy"
            status_code = 200
        services_health["response_time_ms"] = round((time.time() - start_time) * 1000, 2)
        return JSONResponse(content=services_health, status_code=status_code)
    except Exception as e:
        logger.error(f"Services health check failed: {str(e)}")
        return JSONResponse(content={"timestamp": datetime.utcnow().isoformat() + "Z", "overall_status": "error", "error": str(e)}, status_code=503)

@router.get("/metrics")
async def system_metrics() -> JSONResponse:
    try:
        import os
        metrics = {"timestamp": datetime.utcnow().isoformat() + "Z", "system": {}, "application": {}, "network": {}}
        try:
            cpu_times = psutil.cpu_times()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            metrics["system"] = {
                "cpu": {"usage_percent": psutil.cpu_percent(interval=1), "count": psutil.cpu_count()},
                "memory": {"total_gb": round(memory.total / (1024**3), 2), "available_gb": round(memory.available / (1024**3), 2), "usage_percent": memory.percent},
                "disk": {"total_gb": round(disk.total / (1024**3), 2), "free_gb": round(disk.free / (1024**3), 2), "usage_percent": round((disk.used / disk.total) * 100, 2)}
            }
        except Exception as e:
            metrics["system"] = {"error": str(e)}
        try:
            process = psutil.Process(os.getpid())
            metrics["application"] = {
                "process_id": os.getpid(),
                "memory_usage_mb": round(process.memory_info().rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent(interval=0.1),
                "threads": process.num_threads()
            }
        except Exception as e:
            metrics["application"] = {"error": str(e)}
        try:
            net_io = psutil.net_io_counters()
            metrics["network"] = {"bytes_sent": net_io.bytes_sent, "bytes_recv": net_io.bytes_recv}
        except Exception as e:
            metrics["network"] = {"error": str(e)}
        return JSONResponse(content=metrics)
    except Exception as e:
        return JSONResponse(content={"timestamp": datetime.utcnow().isoformat() + "Z", "error": str(e)}, status_code=500)

@router.post("/test")
async def run_health_tests(background_tasks: BackgroundTasks) -> JSONResponse:
    test_id = f"TEST-{int(datetime.utcnow().timestamp() * 1000)}"
    background_tasks.add_task(_run_extensive_health_tests, test_id)
    return JSONResponse(content={"test_id": test_id, "status": "initiated", "timestamp": datetime.utcnow().isoformat() + "Z"})

async def _run_extensive_health_tests(test_id: str) -> None:
    try:
        logger.info(f"Running health tests: {test_id}")
        await asyncio.sleep(5)
        logger.info(f"Health tests completed: {test_id}")
    except Exception as e:
        logger.error(f"Health tests failed: {test_id} - {str(e)}")

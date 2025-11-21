import asyncio
import time
import psutil
import gc
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
import structlog
logger = structlog.get_logger(__name__)
@dataclass
class PerformanceMetrics:
    
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    active_connections: int = 0
    cache_hit_rate: float = 0.0
    average_response_time: float = 0.0
    requests_per_second: float = 0.0
    error_rate: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
@dataclass
class OptimizationConfig:
    
    enable_caching: bool = True
    enable_compression: bool = True
    enable_connection_pooling: bool = True
    max_concurrent_generations: int = 5
    cache_ttl_seconds: int = 3600
    memory_cleanup_threshold: float = 85.0
    cpu_throttle_threshold: float = 80.0
class PerformanceOptimizer:
    
    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        self.metrics_history: list[PerformanceMetrics] = []
        self.generation_semaphore = asyncio.Semaphore(self.config.max_concurrent_generations)
        self.request_times: list[float] = []
        self.error_count = 0
        self.total_requests = 0
        self.thread_pool = ThreadPoolExecutor(max_workers=4)
        logger.info(f"Performance Optimizer initialized with {self.config.max_concurrent_generations} max concurrent generations")
    async def acquire_generation_slot(self) -> bool:
        
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory_percent = psutil.virtual_memory().percent
            if cpu_percent > self.config.cpu_throttle_threshold:
                logger.warning(f"CPU usage high ({cpu_percent}%), throttling requests")
                await asyncio.sleep(0.5)  # Kısa bekleme
                return False
            if memory_percent > self.config.memory_cleanup_threshold:
                logger.warning(f"Memory usage high ({memory_percent}%), forcing cleanup")
                await self.force_memory_cleanup()
            await self.generation_semaphore.acquire()
            return True
        except Exception as e:
            logger.error(f"Error acquiring generation slot: {str(e)}")
            return False
    def release_generation_slot(self):
        
        try:
            self.generation_semaphore.release()
        except Exception as e:
            logger.error(f"Error releasing generation slot: {str(e)}")
    async def force_memory_cleanup(self):
        
        logger.info("Performing memory cleanup...")
        collected = gc.collect()
        memory_info = psutil.virtual_memory()
        logger.info(f"Memory cleanup completed: {collected} objects collected")
        logger.info(f"Memory usage after cleanup: {memory_info.percent}%")
    def record_request_time(self, response_time_ms: int):
        
        self.request_times.append(response_time_ms)
        self.total_requests += 1
        if len(self.request_times) > 1000:
            self.request_times = self.request_times[-1000:]
    def record_error(self):
        
        self.error_count += 1
    def get_current_metrics(self) -> PerformanceMetrics:
        
        try:
            cpu_usage = psutil.cpu_percent()
            memory_usage = psutil.virtual_memory().percent
            avg_response_time = sum(self.request_times) / len(self.request_times) if self.request_times else 0
            error_rate = (self.error_count / max(self.total_requests, 1)) * 100
            recent_requests = len([t for t in self.request_times if t > (time.time() - 60) * 1000])
            requests_per_second = recent_requests / 60
            metrics = PerformanceMetrics(
                cpu_usage=cpu_usage,
                memory_usage=memory_usage,
                active_connections=self.config.max_concurrent_generations - self.generation_semaphore._value,
                average_response_time=avg_response_time,
                requests_per_second=requests_per_second,
                error_rate=error_rate
            )
            self.metrics_history.append(metrics)
            if len(self.metrics_history) > 100:
                self.metrics_history = self.metrics_history[-100:]
            return metrics
        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return PerformanceMetrics()
    def get_optimization_recommendations(self) -> list[str]:
        
        recommendations = []
        current_metrics = self.get_current_metrics()
        if current_metrics.cpu_usage > 70:
            recommendations.append("CPU usage is high. Consider reducing concurrent generations.")
        if current_metrics.memory_usage > 80:
            recommendations.append("Memory usage is high. Consider increasing cleanup frequency.")
        if current_metrics.error_rate > 5:
            recommendations.append("Error rate is elevated. Check system logs for issues.")
        if current_metrics.average_response_time > 30000:  # 30 seconds
            recommendations.append("Response times are slow. Consider optimizing AI model calls.")
        if len(self.request_times) > 500 and current_metrics.requests_per_second > 10:
            recommendations.append("High request volume detected. Consider implementing rate limiting.")
        return recommendations
    async def optimize_system_resources(self) -> Dict[str, Any]:
        
        logger.info("Starting system resource optimization...")
        optimization_results = {
            "timestamp": datetime.now().isoformat(),
            "actions_taken": [],
            "metrics_before": self.get_current_metrics().__dict__,
            "recommendations": []
        }
        try:
            if psutil.virtual_memory().percent > self.config.memory_cleanup_threshold:
                await self.force_memory_cleanup()
                optimization_results["actions_taken"].append("Memory cleanup performed")
            cpu_percent = psutil.cpu_percent(interval=0.5)
            if cpu_percent > self.config.cpu_throttle_threshold:
                if self.config.max_concurrent_generations > 2:
                    self.config.max_concurrent_generations -= 1
                    self.generation_semaphore = asyncio.Semaphore(self.config.max_concurrent_generations)
                    optimization_results["actions_taken"].append(f"Reduced concurrent generations to {self.config.max_concurrent_generations}")
            recommendations = self.get_optimization_recommendations()
            optimization_results["recommendations"] = recommendations
            optimization_results["metrics_after"] = self.get_current_metrics().__dict__
            logger.info(f"System optimization completed. Actions taken: {len(optimization_results['actions_taken'])}")
        except Exception as e:
            logger.error(f"Error during system optimization: {str(e)}")
            optimization_results["error"] = str(e)
        return optimization_results
    def get_performance_report(self) -> Dict[str, Any]:
        
        current_metrics = self.get_current_metrics()
        if len(self.metrics_history) >= 10:
            recent_metrics = self.metrics_history[-10:]
            avg_cpu = sum(m.cpu_usage for m in recent_metrics) / len(recent_metrics)
            avg_memory = sum(m.memory_usage for m in recent_metrics) / len(recent_metrics)
            avg_response_time = sum(m.average_response_time for m in recent_metrics) / len(recent_metrics)
        else:
            avg_cpu = current_metrics.cpu_usage
            avg_memory = current_metrics.memory_usage
            avg_response_time = current_metrics.average_response_time
        report = {
            "current_metrics": current_metrics.__dict__,
            "historical_averages": {
                "cpu_usage": round(avg_cpu, 2),
                "memory_usage": round(avg_memory, 2),
                "response_time": round(avg_response_time, 2)
            },
            "system_status": self._determine_system_status(current_metrics),
            "optimization_config": {
                "max_concurrent_generations": self.config.max_concurrent_generations,
                "memory_cleanup_threshold": self.config.memory_cleanup_threshold,
                "cpu_throttle_threshold": self.config.cpu_throttle_threshold
            },
            "statistics": {
                "total_requests": self.total_requests,
                "total_errors": self.error_count,
                "metrics_collected": len(self.metrics_history)
            },
            "recommendations": self.get_optimization_recommendations()
        }
        return report
    def _determine_system_status(self, metrics: PerformanceMetrics) -> str:
        
        if metrics.cpu_usage > 90 or metrics.memory_usage > 90 or metrics.error_rate > 10:
            return "critical"
        elif metrics.cpu_usage > 70 or metrics.memory_usage > 70 or metrics.error_rate > 5:
            return "warning"
        elif metrics.cpu_usage > 50 or metrics.memory_usage > 50:
            return "moderate"
        else:
            return "healthy"
    async def cleanup(self):
        
        if hasattr(self, 'thread_pool'):
            self.thread_pool.shutdown(wait=True)
        logger.info("Performance Optimizer cleanup completed")
performance_optimizer = PerformanceOptimizer()
async def get_performance_optimizer() -> PerformanceOptimizer:
    
    return performance_optimizer
class GenerationSlotManager:
    
    def __init__(self, optimizer: PerformanceOptimizer):
        self.optimizer = optimizer
        self.acquired = False
    async def __aenter__(self):
        self.acquired = await self.optimizer.acquire_generation_slot()
        if not self.acquired:
            raise Exception("Could not acquire generation slot due to system resource constraints")
        return self
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.acquired:
            self.optimizer.release_generation_slot()
async def with_performance_monitoring(func, *args, **kwargs):
    
    start_time = time.time()
    try:
        result = await func(*args, **kwargs)
        response_time_ms = int((time.time() - start_time) * 1000)
        performance_optimizer.record_request_time(response_time_ms)
        return result
    except Exception as e:
        performance_optimizer.record_error()
        raise e
def get_system_resources() -> Dict[str, Any]:
    
    return {
        "cpu": {
            "usage_percent": psutil.cpu_percent(),
            "count": psutil.cpu_count(),
            "frequency": psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
        },
        "memory": psutil.virtual_memory()._asdict(),
        "disk": psutil.disk_usage('/')._asdict(),
        "network": psutil.net_io_counters()._asdict() if psutil.net_io_counters() else None
    }

"""
Enhanced CortexAI Chat Completion Service
Grok-4-fast-reasoning modeli için optimize edilmiş gelişmiş chat servisi
"""

import asyncio
import logging
import json
import hashlib
import time
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass
import aiohttp
import structlog
from pydantic import BaseModel, Field, validator
from enum import Enum
import backoff
from app.core.config import settings

logger = structlog.get_logger(__name__)

class MessageRole(str, Enum):
    """Chat mesaj rolleri"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ModelType(str, Enum):
    """Desteklenen model tipleri"""
    GROK_4_FAST_REASONING = "grok-4-fast-reasoning"
    GPT_5_HIGH_NEW = "gpt-5-high-new"
    DEFAULT = "grok-4-fast-reasoning"

@dataclass
class RequestMetrics:
    """Request metrikleri"""
    start_time: float
    end_time: Optional[float] = None
    tokens_used: Optional[int] = None
    model_used: Optional[str] = None
    cached: bool = False
    
    @property
    def duration_ms(self) -> int:
        if self.end_time:
            return int((self.end_time - self.start_time) * 1000)
        return 0

class ChatMessage(BaseModel):
    """Chat mesaj modeli"""
    role: MessageRole
    content: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.now)
    
    @validator('content')
    def content_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Mesaj içeriği boş olamaz')
        return v.strip()

class EnhancedChatRequest(BaseModel):
    """Gelişmiş chat completion isteği"""
    messages: List[ChatMessage] = Field(..., min_items=1, description="Chat mesajları")
    model: ModelType = Field(default=ModelType.DEFAULT, description="Kullanılacak model")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Yaratıcılık seviyesi")
    max_tokens: int = Field(default=2048, ge=1, le=8192, description="Maksimum token sayısı")
    top_p: float = Field(default=0.9, ge=0.0, le=1.0, description="Nucleus sampling")
    frequency_penalty: float = Field(default=0.0, ge=-2.0, le=2.0, description="Tekrar cezası")
    presence_penalty: float = Field(default=0.0, ge=-2.0, le=2.0, description="Varlık cezası")
    stream: bool = Field(default=False, description="Streaming yanıt")
    use_cache: bool = Field(default=True, description="Cache kullan")
    request_id: Optional[str] = Field(default=None, description="İstek ID")
    
    @validator('messages')
    def messages_must_have_user_message(cls, v):
        if not any(msg.role == MessageRole.USER for msg in v):
            raise ValueError('En az bir user mesajı gerekli')
        return v

class ChatResponse(BaseModel):
    """Chat yanıt modeli"""
    success: bool
    content: Optional[str] = None
    model_used: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    response_time_ms: int = 0
    cached: bool = False
    request_id: Optional[str] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None

class RateLimiter:
    """Rate limiting sınıfı"""
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = []
    
    async def acquire(self) -> bool:
        """Rate limit kontrolü"""
        now = time.time()
        # Eski istekleri temizle
        self.requests = [req_time for req_time in self.requests if now - req_time < self.window_seconds]
        
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        return False

class ResponseCache:
    """Yanıt önbelleği"""
    def __init__(self, ttl_seconds: int = 3600):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl_seconds = ttl_seconds
    
    def _generate_key(self, request: EnhancedChatRequest) -> str:
        """Cache anahtarı oluştur"""
        messages_hash = hashlib.md5(
            json.dumps([{"role": msg.role, "content": msg.content} for msg in request.messages], 
                      sort_keys=True).encode()
        ).hexdigest()
        
        params_hash = hashlib.md5(
            f"{request.model}_{request.temperature}_{request.max_tokens}".encode()
        ).hexdigest()
        
        return f"{messages_hash}_{params_hash}"
    
    def get(self, request: EnhancedChatRequest) -> Optional[Dict[str, Any]]:
        """Cache'den veri al"""
        if not request.use_cache:
            return None
            
        key = self._generate_key(request)
        if key in self.cache:
            cached_time = self.cache[key]['timestamp']
            if time.time() - cached_time < self.ttl_seconds:
                return self.cache[key]['data']
            else:
                # Expire olmuş cache'i sil
                del self.cache[key]
        return None
    
    def set(self, request: EnhancedChatRequest, data: Dict[str, Any]) -> None:
        """Cache'e veri ekle"""
        if not request.use_cache:
            return
            
        key = self._generate_key(request)
        self.cache[key] = {
            'data': data,
            'timestamp': time.time()
        }
    
    def clear(self) -> int:
        """Cache'i temizle"""
        count = len(self.cache)
        self.cache.clear()
        return count

class EnhancedCortexChatService:
    """
    Gelişmiş CortexAI Chat Completion Servisi
    Grok-4-fast-reasoning modeli için optimize edilmiş
    """
    
    def __init__(self):
        self.api_key = "sk-1a67670ecba1415cb332ec77880e0caa"
        self.base_url = "https://cortexapi.net/v1/chat/completions"
        self.rate_limiter = RateLimiter(max_requests=50, window_seconds=60)
        self.cache = ResponseCache(ttl_seconds=1800)  # 30 dakika cache
        self.default_timeout = 60
        self.max_retries = 3
        
        # Performans metrikleri
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "cached_responses": 0,
            "average_response_time_ms": 0
        }
        
        logger.info("Enhanced CortexAI Chat Service initialized")
    
    def _validate_api_key(self) -> bool:
        """API key validasyonu"""
        return bool(self.api_key and self.api_key.startswith('sk-'))
    
    def _prepare_headers(self) -> Dict[str, str]:
        """API headers hazırla"""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "NASA-CLIFF-Enhanced/1.0"
        }
    
    def _prepare_payload(self, request: EnhancedChatRequest) -> Dict[str, Any]:
        """API payload hazırla"""
        messages = [
            {"role": msg.role.value, "content": msg.content}
            for msg in request.messages
        ]
        
        payload = {
            "model": request.model.value,
            "messages": messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "top_p": request.top_p,
            "frequency_penalty": request.frequency_penalty,
            "presence_penalty": request.presence_penalty
        }
        
        if request.stream:
            payload["stream"] = True
            
        return payload
    
    @backoff.on_exception(
        backoff.expo,
        (aiohttp.ClientError, asyncio.TimeoutError),
        max_tries=3,
        max_time=30
    )
    async def _make_api_request(self, payload: Dict[str, Any], headers: Dict[str, str]) -> aiohttp.ClientResponse:
        """API isteği gönder (retry mekanizması ile)"""
        timeout = aiohttp.ClientTimeout(total=self.default_timeout)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            response = await session.post(self.base_url, json=payload, headers=headers)
            return response
    
    def _extract_content_from_response(self, response_data: Dict[str, Any]) -> Optional[str]:
        """API yanıtından içerik çıkar"""
        try:
            if "choices" in response_data and len(response_data["choices"]) > 0:
                choice = response_data["choices"][0]
                message = choice.get("message", {})
                return message.get("content")
        except (KeyError, IndexError, TypeError):
            logger.error("Yanıt formatında hata")
        return None
    
    def _extract_usage_from_response(self, response_data: Dict[str, Any]) -> Optional[Dict[str, int]]:
        """API yanıtından kullanım bilgilerini çıkar"""
        return response_data.get("usage")
    
    def _update_metrics(self, success: bool, response_time_ms: int, cached: bool = False) -> None:
        """Metrikleri güncelle"""
        self.metrics["total_requests"] += 1
        
        if success:
            self.metrics["successful_requests"] += 1
        else:
            self.metrics["failed_requests"] += 1
            
        if cached:
            self.metrics["cached_responses"] += 1
            
        # Ortalama yanıt süresini güncelle
        if self.metrics["total_requests"] > 0:
            current_avg = self.metrics["average_response_time_ms"]
            new_avg = ((current_avg * (self.metrics["total_requests"] - 1)) + response_time_ms) / self.metrics["total_requests"]
            self.metrics["average_response_time_ms"] = int(new_avg)
    
    async def chat_completion(self, request: EnhancedChatRequest) -> ChatResponse:
        """
        Gelişmiş chat completion
        """
        if not self._validate_api_key():
            return ChatResponse(
                success=False,
                error_message="Geçersiz API anahtarı",
                error_code="INVALID_API_KEY"
            )
        
        # Rate limiting kontrolü
        if not await self.rate_limiter.acquire():
            return ChatResponse(
                success=False,
                error_message="Rate limit aşıldı, lütfen bekleyiniz",
                error_code="RATE_LIMIT_EXCEEDED"
            )
        
        metrics = RequestMetrics(start_time=time.time())
        
        try:
            # Cache kontrolü
            cached_response = self.cache.get(request)
            if cached_response:
                logger.info("Cache hit - cached response döndürülüyor")
                metrics.end_time = time.time()
                metrics.cached = True
                
                response = ChatResponse(**cached_response, cached=True)
                self._update_metrics(True, metrics.duration_ms, cached=True)
                return response
            
            # API payload hazırla
            payload = self._prepare_payload(request)
            headers = self._prepare_headers()
            
            logger.info(f"Chat completion isteği gönderiliyor - Model: {request.model.value}")
            
            # API isteğini gönder
            async with await self._make_api_request(payload, headers) as response:
                metrics.end_time = time.time()
                
                if response.status == 200:
                    response_data = await response.json()
                    content = self._extract_content_from_response(response_data)
                    usage = self._extract_usage_from_response(response_data)
                    
                    if content:
                        success_response = ChatResponse(
                            success=True,
                            content=content,
                            model_used=request.model.value,
                            usage=usage,
                            response_time_ms=metrics.duration_ms,
                            request_id=request.request_id,
                            metadata={
                                "temperature": request.temperature,
                                "max_tokens": request.max_tokens
                            }
                        )
                        
                        # Cache'e kaydet
                        self.cache.set(request, success_response.dict())
                        
                        self._update_metrics(True, metrics.duration_ms)
                        logger.info(f"Chat completion başarılı - {metrics.duration_ms}ms")
                        
                        return success_response
                    
                    else:
                        error_response = ChatResponse(
                            success=False,
                            error_message="API yanıtında içerik bulunamadı",
                            error_code="NO_CONTENT_FOUND",
                            response_time_ms=metrics.duration_ms
                        )
                        self._update_metrics(False, metrics.duration_ms)
                        return error_response
                
                else:
                    error_text = await response.text()
                    error_response = ChatResponse(
                        success=False,
                        error_message=f"API hatası: {error_text}",
                        error_code=f"API_ERROR_{response.status}",
                        response_time_ms=metrics.duration_ms
                    )
                    self._update_metrics(False, metrics.duration_ms)
                    logger.error(f"ERROR: API hatası {response.status}: {error_text}")
                    return error_response
        
        except asyncio.TimeoutError:
            metrics.end_time = time.time()
            error_response = ChatResponse(
                success=False,
                error_message="İstek zaman aşımına uğradı",
                error_code="TIMEOUT_ERROR",
                response_time_ms=metrics.duration_ms
            )
            self._update_metrics(False, metrics.duration_ms)
            logger.error("TIMEOUT: İstek timeout oldu")
            return error_response
        
        except Exception as e:
            metrics.end_time = time.time()
            error_response = ChatResponse(
                success=False,
                error_message=f"Beklenmeyen hata: {str(e)}",
                error_code="UNEXPECTED_ERROR",
                response_time_ms=metrics.duration_ms
            )
            self._update_metrics(False, metrics.duration_ms)
            logger.error(f"EXCEPTION: Beklenmeyen hata: {str(e)}")
            return error_response
    
    async def simple_chat(self, message: str, model: ModelType = ModelType.DEFAULT) -> str:
        """
        Basit chat - tek mesaj için
        """
        request = EnhancedChatRequest(
            messages=[ChatMessage(role=MessageRole.USER, content=message)],
            model=model
        )
        
        response = await self.chat_completion(request)
        
        if response.success:
            return response.content or "Yanıt alınamadı"
        else:
            return f"Hata: {response.error_message}"
    
    def get_metrics(self) -> Dict[str, Any]:
        """Performans metriklerini al"""
        return {
            **self.metrics,
            "cache_size": len(self.cache.cache),
            "success_rate": (
                self.metrics["successful_requests"] / self.metrics["total_requests"] * 100
                if self.metrics["total_requests"] > 0 else 0
            ),
            "cache_hit_rate": (
                self.metrics["cached_responses"] / self.metrics["total_requests"] * 100
                if self.metrics["total_requests"] > 0 else 0
            )
        }
    
    def clear_cache(self) -> int:
        """Cache'i temizle"""
        count = self.cache.clear()
        logger.info(f"{count} cache kayıtı temizlendi")
        return count
    
    def get_supported_models(self) -> List[str]:
        """Desteklenen modelleri listele"""
        return [model.value for model in ModelType]

# Global servis instance
enhanced_cortex_service = EnhancedCortexChatService()

async def get_enhanced_cortex_service() -> EnhancedCortexChatService:
    """Dependency injection için servis instance"""
    return enhanced_cortex_service
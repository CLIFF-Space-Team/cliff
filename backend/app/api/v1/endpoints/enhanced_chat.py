from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json
import asyncio
from datetime import datetime
import structlog
from app.services.enhanced_cortex_chat_service import (
    EnhancedCortexChatService,
    EnhancedChatRequest,
    ChatMessage,
    ChatResponse,
    MessageRole,
    ModelType,
    get_enhanced_cortex_service
)
logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/enhanced-chat", tags=["Enhanced Chat"])
class ChatRequestAPI(BaseModel):
    """API Chat Request Model"""
    message: str = Field(..., description="Gönderilecek mesaj")
    model: Optional[str] = Field(default="grok-4-fast-reasoning", description="Kullanılacak model")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Yaratıcılık seviyesi")
    max_tokens: Optional[int] = Field(default=2048, ge=1, le=8192, description="Maksimum token sayısı")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default=[], description="Konuşma geçmişi")
    use_cache: Optional[bool] = Field(default=True, description="Cache kullan")
    stream: Optional[bool] = Field(default=False, description="Streaming yanıt")
class ChatResponseAPI(BaseModel):
    """API Chat Response Model"""
    success: bool
    message: Optional[str] = None
    model_used: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    response_time_ms: int
    cached: bool = False
    error_message: Optional[str] = None
    timestamp: str
    conversation_id: Optional[str] = None
class ConversationRequest(BaseModel):
    """Conversation Request Model"""
    messages: List[Dict[str, str]] = Field(..., description="Konuşma mesajları")
    model: Optional[str] = Field(default="grok-4-fast-reasoning")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=2048, ge=1, le=8192)
    use_cache: Optional[bool] = Field(default=True)
class ServiceStatusResponse(BaseModel):
    """Service Status Response"""
    status: str
    metrics: Dict[str, Any]
    supported_models: List[str]
    cache_stats: Dict[str, Any]
@router.post("/chat", 
            response_model=ChatResponseAPI,
            summary="Basit Chat Completion",
            description="Grok-4-fast-reasoning modeli ile basit chat completion")
async def simple_chat(
    request: ChatRequestAPI,
    background_tasks: BackgroundTasks,
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
) -> ChatResponseAPI:
    """
    🚀 Basit chat completion endpoint'i
    - **message**: Gönderilecek mesaj
    - **model**: Kullanılacak model (varsayılan: grok-4-fast-reasoning)
    - **temperature**: Yaratıcılık seviyesi (0.0-2.0)
    - **max_tokens**: Maksimum token sayısı
    - **use_cache**: Cache kullanımı
    """
    try:
        logger.info(f"🚀 Simple chat request - Model: {request.model}")
        if request.model not in service.get_supported_models():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Desteklenmeyen model: {request.model}"
            )
        messages = []
        for msg in request.conversation_history:
            if "role" in msg and "content" in msg:
                messages.append(ChatMessage(
                    role=MessageRole(msg["role"]),
                    content=msg["content"]
                ))
        messages.append(ChatMessage(
            role=MessageRole.USER,
            content=request.message
        ))
        chat_request = EnhancedChatRequest(
            messages=messages,
            model=ModelType(request.model),
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache
        )
        response = await service.chat_completion(chat_request)
        api_response = ChatResponseAPI(
            success=response.success,
            message=response.content,
            model_used=response.model_used,
            usage=response.usage,
            response_time_ms=response.response_time_ms,
            cached=response.cached,
            error_message=response.error_message,
            timestamp=response.timestamp.isoformat()
        )
        background_tasks.add_task(
            log_chat_metrics,
            response.success,
            response.response_time_ms,
            request.model
        )
        logger.info(f"✅ Simple chat completed - Success: {response.success}")
        return api_response
    except ValueError as ve:
        logger.error(f"❌ Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geçersiz istek: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"💥 Unexpected error in simple_chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İç sunucu hatası"
        )
@router.post("/conversation",
            response_model=ChatResponseAPI,
            summary="Conversation Chat",
            description="Çoklu mesaj desteği ile conversation chat")
async def conversation_chat(
    request: ConversationRequest,
    background_tasks: BackgroundTasks,
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
) -> ChatResponseAPI:
    """
    🗣️ Conversation chat endpoint'i - Çoklu mesaj desteği
    - **messages**: Konuşma mesajları listesi (role ve content içermeli)
    - **model**: Kullanılacak model
    - **temperature**: Yaratıcılık seviyesi
    - **max_tokens**: Maksimum token sayısı
    """
    try:
        logger.info(f"🗣️ Conversation chat request - {len(request.messages)} messages")
        messages = []
        for msg in request.messages:
            if "role" not in msg or "content" not in msg:
                raise ValueError("Her mesaj 'role' ve 'content' içermelidir")
            try:
                role = MessageRole(msg["role"])
            except ValueError:
                raise ValueError(f"Geçersiz rol: {msg['role']}. Geçerli roller: user, assistant, system")
            messages.append(ChatMessage(
                role=role,
                content=msg["content"]
            ))
        chat_request = EnhancedChatRequest(
            messages=messages,
            model=ModelType(request.model),
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            use_cache=request.use_cache
        )
        response = await service.chat_completion(chat_request)
        api_response = ChatResponseAPI(
            success=response.success,
            message=response.content,
            model_used=response.model_used,
            usage=response.usage,
            response_time_ms=response.response_time_ms,
            cached=response.cached,
            error_message=response.error_message,
            timestamp=response.timestamp.isoformat()
        )
        logger.info(f"✅ Conversation chat completed - Success: {response.success}")
        return api_response
    except ValueError as ve:
        logger.error(f"❌ Validation error: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"💥 Error in conversation_chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="İç sunucu hatası"
        )
@router.get("/models",
           summary="Supported Models",
           description="Desteklenen model listesi")
async def get_supported_models(
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
) -> List[str]:
    """
    📋 Desteklenen modelleri listele
    """
    return service.get_supported_models()
@router.get("/status",
           response_model=ServiceStatusResponse,
           summary="Service Status",
           description="Servis durumu ve metrikleri")
async def get_service_status(
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
) -> ServiceStatusResponse:
    """
    📊 Servis durumu ve performans metriklerini al
    """
    try:
        metrics = service.get_metrics()
        return ServiceStatusResponse(
            status="healthy" if metrics["total_requests"] >= 0 else "unknown",
            metrics=metrics,
            supported_models=service.get_supported_models(),
            cache_stats={
                "cache_size": len(service.cache.cache),
                "cache_ttl_seconds": service.cache.ttl_seconds
            }
        )
    except Exception as e:
        logger.error(f"💥 Error getting service status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Servis durumu alınamadı"
        )
@router.delete("/cache",
              summary="Clear Cache",
              description="Cache'i temizle")
async def clear_cache(
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
) -> Dict[str, Any]:
    """
    🗑️ Cache'i temizle
    """
    try:
        cleared_count = service.clear_cache()
        logger.info(f"🗑️ Cache cleared - {cleared_count} items removed")
        return {
            "success": True,
            "message": f"{cleared_count} cache kaydı temizlendi",
            "cleared_count": cleared_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"💥 Error clearing cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cache temizlenirken hata oluştu"
        )
@router.post("/quick",
            summary="Quick Chat",
            description="Hızlı tek mesaj chat")
async def quick_chat(
    message: str,
    model: str = "grok-4-fast-reasoning",
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
) -> Dict[str, Any]:
    """
    ⚡ Hızlı chat - tek mesaj için optimize edilmiş
    - **message**: Gönderilecek mesaj
    - **model**: Kullanılacak model
    """
    try:
        logger.info(f"⚡ Quick chat: {message[:50]}...")
        result = await service.simple_chat(message, ModelType(model))
        return {
            "success": True,
            "response": result,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"💥 Error in quick_chat: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
async def log_chat_metrics(success: bool, response_time_ms: int, model: str):
    """Background task - chat metrics logging"""
    logger.info(
        f"📊 Chat Metrics - Success: {success}, "
        f"ResponseTime: {response_time_ms}ms, Model: {model}"
    )
@router.get("/health",
           summary="Health Check",
           description="Servis sağlık kontrolü")
async def health_check() -> Dict[str, Any]:
    """
    ❤️ Sağlık kontrolü
    """
    return {
        "status": "healthy",
        "service": "enhanced-cortex-chat",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }
@router.post("/stream",
            summary="Streaming Chat",
            description="Streaming chat response")
async def streaming_chat(
    request: ChatRequestAPI,
    service: EnhancedCortexChatService = Depends(get_enhanced_cortex_service)
):
    """
    🌊 Streaming chat completion
    """
    async def generate_stream():
        try:
            messages = [ChatMessage(role=MessageRole.USER, content=request.message)]
            chat_request = EnhancedChatRequest(
                messages=messages,
                model=ModelType(request.model),
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stream=True  # Streaming enabled
            )
            response = await service.chat_completion(chat_request)
            if response.success and response.content:
                words = response.content.split()
                for word in words:
                    chunk = {
                        "type": "content",
                        "data": word + " ",
                        "timestamp": datetime.now().isoformat()
                    }
                    yield f"data: {json.dumps(chunk)}\n\n"
                    await asyncio.sleep(0.05)  # Simulate streaming delay
                final_chunk = {
                    "type": "done",
                    "data": {
                        "usage": response.usage,
                        "model_used": response.model_used,
                        "response_time_ms": response.response_time_ms
                    },
                    "timestamp": datetime.now().isoformat()
                }
                yield f"data: {json.dumps(final_chunk)}\n\n"
            else:
                error_chunk = {
                    "type": "error",
                    "data": response.error_message,
                    "timestamp": datetime.now().isoformat()
                }
                yield f"data: {json.dumps(error_chunk)}\n\n"
        except Exception as e:
            error_chunk = {
                "type": "error",
                "data": str(e),
                "timestamp": datetime.now().isoformat()
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )
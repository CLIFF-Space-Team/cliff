"""
🤖 Unified AI API Endpoints
Advanced AI chat endpoints with Cortex AI + Vertex AI fallback + Grok AI streaming
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Dict, List, Optional, Any, AsyncGenerator
import asyncio
import json
import structlog
from datetime import datetime

from app.services.unified_ai_service import (
    get_unified_ai_service,
    UnifiedAIService,
    UnifiedChatRequest,
    UnifiedChatResponse,
    UnifiedChatMessage
)

from app.services.grok_ai_services import (
    get_grok_ai_service,
    GrokAIService,
    GrokChatRequest,
    GrokChatResponse,
    GrokChatMessage,
    GrokStreamChunk
)

from app.services.azure_ai_agent_service import (
    get_azure_agent_service,
    AzureAIAgentService,
    AzureAgentRequest,
    AzureAgentResponse,
    AzureAgentMessage
)

logger = structlog.get_logger(__name__)
router = APIRouter()

@router.post("/chat", response_model=UnifiedChatResponse)
async def unified_chat_completion(
    request: UnifiedChatRequest,
    ai_service: UnifiedAIService = Depends(get_unified_ai_service),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> UnifiedChatResponse:
    """
    🤖 Unified AI Chat Completion
    
    Primary provider: Cortex AI (grok-4-fast-reasoning)
    Fallback provider: Vertex AI (gemini-2.5-pro)
    
    Supported Model:
    - grok-4-fast-reasoning (primary via CortexAI)
    - gemini-2.5-pro (fallback via VertexAI)
    
    Features:
    - Automatic failover between providers
    - Real-time response generation
    - <thinking> tag processing with reasoning display
    - Comprehensive error handling
    """
    try:
        logger.info(f"📝 Unified chat request with {len(request.messages)} messages")
        
        # Validate request
        if not request.messages:
            raise HTTPException(
                status_code=400,
                detail="Messages array cannot be empty"
            )
        
        # Validate message roles
        valid_roles = {"user", "assistant", "system"}
        for i, msg in enumerate(request.messages):
            if msg.role not in valid_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role '{msg.role}' in message {i}. Valid roles: {valid_roles}"
                )
        
        # Generate response
        start_time = datetime.now()
        
        response = await ai_service.chat_completion(request)
        
        total_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        if response.success:
            logger.info(
                f"✅ Unified AI response generated",
                provider=response.provider_used,
                model=response.model_used,
                fallback_used=response.fallback_used,
                has_thinking=response.has_thinking,
                response_time_ms=total_time
            )
        else:
            logger.error(
                f"❌ Unified AI failed",
                error=response.error_message,
                fallback_attempted=request.use_fallback
            )
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Unexpected error in unified chat: {str(e)}"
        logger.error(error_msg)
        
        return UnifiedChatResponse(
            success=False,
            error_message=error_msg,
            timestamp=datetime.now().isoformat()
        )

@router.post("/quick-chat")
async def quick_chat(
    message: str,
    model: Optional[str] = "grok-4-fast-reasoning",
    temperature: Optional[float] = 0.7,
    use_fallback: Optional[bool] = True,
    ai_service: UnifiedAIService = Depends(get_unified_ai_service)
) -> Dict[str, Any]:
    """
    💬 Quick Chat - Simple message interface
    
    Send a single message and get AI response with reasoning
    Perfect for simple queries and testing
    
    Primary Model:
    - grok-4-fast-reasoning (default with thinking support)
    """
    try:
        if not message or not message.strip():
            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty"
            )
        
        # Create request
        request = UnifiedChatRequest(
            messages=[
                UnifiedChatMessage(
                    role="user",
                    content=message.strip()
                )
            ],
            model=model,
            temperature=temperature,
            use_fallback=use_fallback
        )
        
        # Generate response
        response = await ai_service.chat_completion(request)
        
        # Return simplified format
        return {
            "success": response.success,
            "message": response.visible_content or response.content,
            "thinking": response.thinking_content,
            "has_thinking": response.has_thinking,
            "provider": response.provider_used,
            "model": response.model_used,
            "fallback_used": response.fallback_used,
            "response_time_ms": response.response_time_ms,
            "error": response.error_message,
            "timestamp": response.timestamp
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quick chat error: {str(e)}")
        return {
            "success": False,
            "message": None,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/status")
async def get_ai_service_status(
    ai_service: UnifiedAIService = Depends(get_unified_ai_service)
) -> Dict[str, Any]:
    """
    📊 Get AI Service Status
    
    Returns status of both providers and service configuration
    """
    try:
        status = ai_service.get_provider_status()
        
        return {
            "success": True,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.post("/test-providers")
async def test_providers(
    test_message: str = "Merhaba, nasılsın?",
    ai_service: UnifiedAIService = Depends(get_unified_ai_service)
) -> Dict[str, Any]:
    """
    🧪 Test Both Providers
    
    Test both Cortex AI and Vertex AI providers independently
    """
    try:
        results = {
            "test_message": test_message,
            "results": {},
            "timestamp": datetime.now().isoformat()
        }
        
        # Test with fallback disabled (Cortex AI only) - Grok
        cortex_grok_request = UnifiedChatRequest(
            messages=[
                UnifiedChatMessage(role="user", content=test_message)
            ],
            model="grok-4-fast-reasoning",
            use_fallback=False
        )
        
        # Test Grok (Primary Model)
        cortex_grok_response = await ai_service.chat_completion(cortex_grok_request)
        results["results"]["cortex_ai_grok"] = {
            "success": cortex_grok_response.success,
            "response": cortex_grok_response.visible_content or cortex_grok_response.content[:100] + "..." if cortex_grok_response.content and len(cortex_grok_response.content) > 100 else cortex_grok_response.content,
            "thinking": cortex_grok_response.thinking_content[:100] + "..." if cortex_grok_response.thinking_content and len(cortex_grok_response.thinking_content) > 100 else cortex_grok_response.thinking_content,
            "has_thinking": cortex_grok_response.has_thinking,
            "response_time_ms": cortex_grok_response.response_time_ms,
            "error": cortex_grok_response.error_message
        }
        
        # Test Vertex AI (fallback)
        vertex_request = UnifiedChatRequest(
            messages=[
                UnifiedChatMessage(role="user", content=test_message)
            ],
            model="gemini-2.5-pro",
            use_fallback=True
        )
        
        # Force fallback by making cortex fail (we'll simulate this by using vertex directly)
        vertex_response = await ai_service._try_vertex_ai(vertex_request)
        
        if vertex_response:
            results["results"]["vertex_ai"] = {
                "success": vertex_response.success,
                "response": vertex_response.content[:100] + "..." if vertex_response.content and len(vertex_response.content) > 100 else vertex_response.content,
                "response_time_ms": vertex_response.response_time_ms,
                "error": vertex_response.error_message
            }
        else:
            results["results"]["vertex_ai"] = {
                "success": False,
                "response": None,
                "response_time_ms": None,
                "error": "Vertex AI test failed"
            }
        
        return results
    
    except Exception as e:
        logger.error(f"Provider test error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.post("/conversation")
async def conversation_chat(
    messages: List[Dict[str, str]],
    model: Optional[str] = "grok-4-fast-reasoning",
    temperature: Optional[float] = 0.7,
    max_tokens: Optional[int] = 2048,
    use_fallback: Optional[bool] = True,
    ai_service: UnifiedAIService = Depends(get_unified_ai_service)
) -> UnifiedChatResponse:
    """
    💬 Conversation Chat
    
    Multi-turn conversation with context and reasoning
    Accepts array of messages with role and content
    
    Primary Model:
    - grok-4-fast-reasoning (default with thinking support)
    """
    try:
        if not messages:
            raise HTTPException(
                status_code=400,
                detail="Messages array cannot be empty"
            )
        
        # Convert to UnifiedChatMessage objects
        chat_messages = []
        for msg in messages:
            if "role" not in msg or "content" not in msg:
                raise HTTPException(
                    status_code=400,
                    detail="Each message must have 'role' and 'content' fields"
                )
            
            chat_messages.append(
                UnifiedChatMessage(
                    role=msg["role"],
                    content=msg["content"]
                )
            )
        
        # Create request
        request = UnifiedChatRequest(
            messages=chat_messages,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            use_fallback=use_fallback
        )
        
        # Generate response
        response = await ai_service.chat_completion(request)
        
        logger.info(
            f"💬 Conversation completed",
            messages_count=len(messages),
            provider=response.provider_used,
            success=response.success
        )
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Conversation error: {str(e)}"
        logger.error(error_msg)
        
        return UnifiedChatResponse(
            success=False,
            error_message=error_msg,
            timestamp=datetime.now().isoformat()
        )

# ========================================
# 🚀 GROK AI ENDPOINTS WITH STREAMING
# ========================================

@router.post("/grok/chat", response_model=GrokChatResponse)
async def grok_chat_completion(
    request: GrokChatRequest,
    grok_service: GrokAIService = Depends(get_grok_ai_service)
) -> GrokChatResponse:
    """
    🧠 Grok AI Chat Completion with Reasoning
    
    Advanced reasoning model with <thinking> process display
    Model: grok-4-fast-reasoning
    
    Features:
    - Fast reasoning capabilities
    - Thinking process visibility
    - Advanced problem solving
    """
    try:
        logger.info(f"🧠 Grok chat request with {len(request.messages)} messages")
        
        # Validate request
        if not request.messages:
            raise HTTPException(
                status_code=400,
                detail="Messages array cannot be empty"
            )
        
        # Validate message roles
        valid_roles = {"user", "assistant", "system"}
        for i, msg in enumerate(request.messages):
            if msg.role not in valid_roles:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role '{msg.role}' in message {i}. Valid roles: {valid_roles}"
                )
        
        # Generate response
        start_time = datetime.now()
        response = await grok_service.chat_completion(request)
        total_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        if response.success:
            logger.info(
                f"✅ Grok AI response generated",
                model=response.model_used,
                has_thinking=response.has_thinking,
                response_time_ms=total_time
            )
        else:
            logger.error(f"❌ Grok AI failed: {response.error_message}")
        
        return response
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Unexpected error in Grok chat: {str(e)}"
        logger.error(error_msg)
        
        return GrokChatResponse(
            success=False,
            error_message=error_msg,
            timestamp=datetime.now().isoformat()
        )

@router.post("/grok/chat/stream")
async def grok_chat_stream(
    request: GrokChatRequest,
    grok_service: GrokAIService = Depends(get_grok_ai_service)
) -> StreamingResponse:
    """
    🧠🌊 Grok AI Streaming Chat with Real-time Thinking
    
    Stream responses in real-time with thinking process visibility
    Perfect for showing reasoning steps as they happen
    
    Response format: Server-Sent Events (SSE)
    Content-Type: text/event-stream
    """
    try:
        logger.info(f"🌊 Grok streaming chat with {len(request.messages)} messages")
        
        # Validate request
        if not request.messages:
            raise HTTPException(
                status_code=400,
                detail="Messages array cannot be empty"
            )
        
        async def generate_stream() -> AsyncGenerator[str, None]:
            """Generate SSE stream for Grok AI responses"""
            try:
                # Send initial event
                yield f"data: {json.dumps({'type': 'start', 'message': 'Starting Grok AI reasoning...', 'timestamp': datetime.now().isoformat()})}\n\n"
                
                # Stream from Grok AI
                async for chunk in grok_service.chat_completion_stream(request):
                    chunk_data = {
                        "type": chunk.type,
                        "content": chunk.content,
                        "is_thinking": chunk.is_thinking,
                        "is_complete": chunk.is_complete,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                    
                    # If complete, break
                    if chunk.is_complete:
                        break
                
                # Send completion event
                yield f"data: {json.dumps({'type': 'complete', 'message': 'Stream completed', 'timestamp': datetime.now().isoformat()})}\n\n"
                
            except Exception as e:
                error_data = {
                    "type": "error",
                    "content": f"Stream error: {str(e)}",
                    "is_complete": True,
                    "timestamp": datetime.now().isoformat()
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Grok streaming setup error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Streaming setup failed: {str(e)}"
        )

@router.post("/grok/quick-chat")
async def grok_quick_chat(
    message: str,
    temperature: Optional[float] = 0.7,
    stream: Optional[bool] = False,
    grok_service: GrokAIService = Depends(get_grok_ai_service)
) -> Dict[str, Any]:
    """
    💬🧠 Grok Quick Chat - Simple reasoning interface
    
    Send a single message and get Grok AI response with thinking
    Perfect for quick questions with reasoning display
    """
    try:
        if not message or not message.strip():
            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty"
            )
        
        # Create request
        request = GrokChatRequest(
            messages=[
                GrokChatMessage(
                    role="user",
                    content=message.strip()
                )
            ],
            temperature=temperature,
            stream=stream
        )
        
        # Generate response
        response = await grok_service.chat_completion(request)
        
        # Return formatted response
        return {
            "success": response.success,
            "message": response.visible_content or response.content,
            "thinking": response.thinking_content,
            "has_thinking": response.has_thinking,
            "model": response.model_used,
            "response_time_ms": response.response_time_ms,
            "error": response.error_message,
            "timestamp": response.timestamp
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Grok quick chat error: {str(e)}")
        return {
            "success": False,
            "message": None,
            "thinking": None,
            "has_thinking": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@router.get("/grok/status")
async def get_grok_service_status(
    grok_service: GrokAIService = Depends(get_grok_ai_service)
) -> Dict[str, Any]:
    """
    📊 Get Grok AI Service Status
    
    Returns Grok service configuration and capabilities
    """
    try:
        status = grok_service.get_service_info()
        
        return {
            "success": True,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Grok status check error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# ========================================
# 🌊 UNIFIED STREAMING ENDPOINTS
# ========================================

@router.post("/chat/stream")
async def unified_chat_stream(
    request: UnifiedChatRequest,
    model_preference: Optional[str] = "grok",  # grok, cortex, vertex
    ai_service: UnifiedAIService = Depends(get_unified_ai_service),
    grok_service: GrokAIService = Depends(get_grok_ai_service)
) -> StreamingResponse:
    """
    🌊 Unified Streaming Chat
    
    Stream responses from preferred AI model
    Models: grok (default), cortex, vertex
    """
    try:
        logger.info(f"🌊 Unified streaming with preference: {model_preference}")
        
        async def generate_unified_stream() -> AsyncGenerator[str, None]:
            try:
                if model_preference.lower() == "grok":
                    # Convert to Grok request
                    grok_messages = [
                        GrokChatMessage(role=msg.role, content=msg.content)
                        for msg in request.messages
                    ]
                    
                    grok_request = GrokChatRequest(
                        messages=grok_messages,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens,
                        stream=True
                    )
                    
                    async for chunk in grok_service.chat_completion_stream(grok_request):
                        chunk_data = {
                            "type": chunk.type,
                            "content": chunk.content,
                            "is_thinking": chunk.is_thinking,
                            "is_complete": chunk.is_complete,
                            "provider": "grok",
                            "timestamp": datetime.now().isoformat()
                        }
                        yield f"data: {json.dumps(chunk_data)}\n\n"
                        
                        if chunk.is_complete:
                            break
                else:
                    # Fallback to unified service (non-streaming)
                    response = await ai_service.chat_completion(request)
                    
                    if response.success and response.content:
                        # Split content into chunks for pseudo-streaming
                        words = response.content.split()
                        for i, word in enumerate(words):
                            chunk_data = {
                                "type": "content",
                                "content": word + " ",
                                "is_thinking": False,
                                "is_complete": i == len(words) - 1,
                                "provider": response.provider_used,
                                "timestamp": datetime.now().isoformat()
                            }
                            yield f"data: {json.dumps(chunk_data)}\n\n"
                            await asyncio.sleep(0.05)  # Small delay for streaming effect
                    else:
                        error_data = {
                            "type": "error",
                            "content": response.error_message or "Unknown error",
                            "is_complete": True,
                            "provider": response.provider_used,
                            "timestamp": datetime.now().isoformat()
                        }
                        yield f"data: {json.dumps(error_data)}\n\n"
                
            except Exception as e:
                error_data = {
                    "type": "error",
                    "content": f"Stream error: {str(e)}",
                    "is_complete": True,
                    "timestamp": datetime.now().isoformat()
                }
                yield f"data: {json.dumps(error_data)}\n\n"
        
        return StreamingResponse(
            generate_unified_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unified streaming setup error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Streaming setup failed: {str(e)}"
        )

# ========================================
# 🤖 AZURE AI AGENT ENDPOINTS
# ========================================

@router.post("/azure-agent/chat")
async def azure_agent_chat(
    message: str,
    thread_id: Optional[str] = None,
    azure_service: AzureAIAgentService = Depends(get_azure_agent_service)
) -> Dict[str, Any]:
    """
    🤖 Azure AI Agent Chat (Agent219)
    
    Azure AI Agents ile sohbet et
    Thread tabanlı konuşma yönetimi
    
    Args:
        message: Kullanıcı mesajı
        thread_id: Mevcut konuşma thread'i (opsiyonel)
    
    Returns:
        Agent yanıtı ve thread_id
    """
    try:
        if not message or not message.strip():
            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty"
            )
        
        logger.info(f"🤖 Azure Agent chat request", has_thread=bool(thread_id))
        
        # İstek oluştur
        request = AzureAgentRequest(
            messages=[
                AzureAgentMessage(
                    role="user",
                    content=message.strip()
                )
            ],
            thread_id=thread_id
        )
        
        # Agent'tan yanıt al
        response = await azure_service.chat_completion(request)
        
        if response.success:
            logger.info(
                f"✅ Azure Agent response generated",
                thread_id=response.thread_id,
                response_time_ms=response.response_time_ms
            )
            
            return {
                "success": True,
                "content": response.content,
                "thread_id": response.thread_id,
                "response_time_ms": response.response_time_ms,
                "timestamp": response.timestamp,
                "provider": "azure_ai_agent"
            }
        else:
            logger.error(f"❌ Azure Agent failed: {response.error_message}")
            
            return {
                "success": False,
                "content": None,
                "error": response.error_message,
                "thread_id": response.thread_id,
                "timestamp": response.timestamp
            }
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Azure Agent chat error: {str(e)}"
        logger.error(error_msg)
        
        return {
            "success": False,
            "content": None,
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }


@router.post("/azure-agent/conversation")
async def azure_agent_conversation(
    messages: List[Dict[str, str]],
    thread_id: Optional[str] = None,
    azure_service: AzureAIAgentService = Depends(get_azure_agent_service)
) -> Dict[str, Any]:
    """
    🤖 Azure AI Agent Conversation
    
    Multi-turn conversation with Azure AI Agent
    Thread tabanlı konuşma geçmişi
    
    Args:
        messages: Mesaj listesi (role, content)
        thread_id: Mevcut konuşma thread'i
    """
    try:
        if not messages:
            raise HTTPException(
                status_code=400,
                detail="Messages array cannot be empty"
            )
        
        # Mesajları dönüştür
        agent_messages = []
        for msg in messages:
            if "role" not in msg or "content" not in msg:
                raise HTTPException(
                    status_code=400,
                    detail="Each message must have 'role' and 'content'"
                )
            
            agent_messages.append(
                AzureAgentMessage(
                    role=msg["role"],
                    content=msg["content"]
                )
            )
        
        # İstek oluştur
        request = AzureAgentRequest(
            messages=agent_messages,
            thread_id=thread_id
        )
        
        # Yanıt al
        response = await azure_service.chat_completion(request)
        
        logger.info(
            f"🤖 Azure Agent conversation completed",
            messages_count=len(messages),
            thread_id=response.thread_id,
            success=response.success
        )
        
        return {
            "success": response.success,
            "content": response.content,
            "thread_id": response.thread_id,
            "response_time_ms": response.response_time_ms,
            "error": response.error_message,
            "timestamp": response.timestamp,
            "provider": "azure_ai_agent"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Azure Agent conversation error: {str(e)}"
        logger.error(error_msg)
        
        return {
            "success": False,
            "content": None,
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }


@router.get("/azure-agent/status")
async def azure_agent_status(
    azure_service: AzureAIAgentService = Depends(get_azure_agent_service)
) -> Dict[str, Any]:
    """
    📊 Azure AI Agent Status
    
    Azure Agent servis durumunu kontrol et
    """
    try:
        status = azure_service.get_service_info()
        
        return {
            "success": True,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Azure Agent status error: {str(e)}")
        
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
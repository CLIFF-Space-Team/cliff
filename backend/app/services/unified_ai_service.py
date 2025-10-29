"""
Unified AI Service - Primary Cortex AI with Vertex AI Fallback
Intelligent AI service that uses Cortex AI as primary provider with automatic fallback to Vertex AI
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import structlog
from pydantic import BaseModel, Field

from .cortex_ai_services import cortex_ai_service, ChatCompletionRequest as CortexChatRequest, ChatCompletionResponse as CortexChatResponse
from .vertex_ai_services import vertex_ai_service, ChatCompletionRequest as VertexChatRequest, ChatMessage

logger = structlog.get_logger(__name__)

class UnifiedChatMessage(BaseModel):
    """Unified chat message model"""
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")

class UnifiedChatRequest(BaseModel):
    """Unified chat completion request"""
    messages: List[UnifiedChatMessage] = Field(..., description="Chat messages")
    model: Optional[str] = Field(default="grok-4-fast-reasoning", description="Primary model: grok-4-fast-reasoning (with thinking support)")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for responses")
    max_tokens: Optional[int] = Field(default=2048, description="Maximum tokens")
    use_fallback: Optional[bool] = Field(default=True, description="Enable fallback to Vertex AI")

class UnifiedChatResponse(BaseModel):
    """Unified chat completion response"""
    success: bool
    content: Optional[str] = None
    thinking_content: Optional[str] = None
    visible_content: Optional[str] = None
    has_thinking: bool = False
    provider_used: Optional[str] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    fallback_used: bool = False
    error_message: Optional[str] = None
    timestamp: str

class UnifiedAIService:
    """
    Unified AI Service
    Provides intelligent AI responses with automatic failover
    Primary: Cortex AI (gpt-5-high-new)
    Fallback: Vertex AI (gemini-2.5-pro)
    """
    
    def __init__(self):
        self.primary_provider = "cortex_ai"
        self.fallback_provider = "vertex_ai"
        self.cortex_service = cortex_ai_service
        self.vertex_service = vertex_ai_service
        
        logger.info("Unified AI Service initialized with Cortex AI + Vertex AI fallback")
    
    def _convert_to_cortex_request(self, request: UnifiedChatRequest) -> CortexChatRequest:
        """Convert unified request to Cortex AI format"""
        return CortexChatRequest(
            messages=[
                {
                    "role": msg.role,
                    "content": msg.content
                }
                for msg in request.messages
            ],
            model=request.model or "grok-4-fast-reasoning",
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
    
    def _convert_to_vertex_request(self, request: UnifiedChatRequest) -> VertexChatRequest:
        """Convert unified request to Vertex AI format"""
        messages = [
            ChatMessage(role=msg.role, content=msg.content)
            for msg in request.messages
        ]
        
        return VertexChatRequest(
            messages=messages,
            model="gemini-2.5-pro",
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
    
    async def _try_cortex_ai(self, request: UnifiedChatRequest) -> Optional[UnifiedChatResponse]:
        """Try Cortex AI as primary provider (supports Grok model)"""
        try:
            logger.info(f"Attempting Cortex AI request with model: {request.model or 'grok-4-fast-reasoning'}")
            
            # Convert request format
            cortex_request = self._convert_to_cortex_request(request)
            
            # Make request using the cortex chat_completion method
            start_time = datetime.now()
            cortex_response: CortexChatResponse = await self.cortex_service.chat_completion(cortex_request)
            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            if cortex_response.success and cortex_response.content:
                logger.info(f"Cortex AI succeeded in {response_time}ms")
                
                return UnifiedChatResponse(
                    success=True,
                    content=cortex_response.content,
                    thinking_content=cortex_response.thinking_content,
                    visible_content=cortex_response.visible_content,
                    has_thinking=cortex_response.has_thinking,
                    provider_used="cortex_ai",
                    model_used=cortex_response.model_used,
                    response_time_ms=response_time,
                    fallback_used=False,
                    timestamp=datetime.now().isoformat()
                )
            
            logger.warning(f"Cortex AI failed: {cortex_response.error_message}")
            return None
            
        except Exception as e:
            logger.error(f"Cortex AI request error: {str(e)}")
            return None
    
    async def _try_vertex_ai(self, request: UnifiedChatRequest) -> Optional[UnifiedChatResponse]:
        """Try Vertex AI as fallback provider"""
        try:
            logger.info("Attempting Vertex AI fallback")
            
            # Convert request format
            vertex_request = self._convert_to_vertex_request(request)
            
            # Make request
            start_time = datetime.now()
            vertex_response = await self.vertex_service.chat_completion(vertex_request)
            
            if vertex_response.success:
                response_time = int((datetime.now() - start_time).total_seconds() * 1000)
                
                logger.info(f"Vertex AI fallback succeeded in {response_time}ms")
                
                return UnifiedChatResponse(
                    success=True,
                    content=vertex_response.content,
                    provider_used="vertex_ai",
                    model_used="gemini-2.5-pro",
                    response_time_ms=response_time,
                    fallback_used=True,
                    timestamp=datetime.now().isoformat()
                )
            else:
                logger.warning(f"WARNING: Vertex AI failed: {vertex_response.error_message}")
                return None
                
        except Exception as e:
            logger.error(f"ERROR: Vertex AI failed: {str(e)}")
            return None
    
    async def chat_completion(self, request: UnifiedChatRequest) -> UnifiedChatResponse:
        """
        Generate chat completion with intelligent failover
        """
        logger.info(f"Processing chat request with {len(request.messages)} messages")
        
        # Try primary provider (Cortex AI)
        cortex_response = await self._try_cortex_ai(request)
        if cortex_response:
            return cortex_response
        
        # If primary fails and fallback is enabled
        if request.use_fallback:
            logger.info("Primary provider failed, trying fallback...")
            
            vertex_response = await self._try_vertex_ai(request)
            if vertex_response:
                return vertex_response
        
        # Both providers failed
        error_msg = "Both Cortex AI and Vertex AI failed to respond"
        logger.error(f"CRITICAL: {error_msg}")
        
        return UnifiedChatResponse(
            success=False,
            error_message=error_msg,
            provider_used=None,
            fallback_used=request.use_fallback,
            timestamp=datetime.now().isoformat()
        )
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of both providers"""
        return {
            "primary_provider": {
                "name": self.primary_provider,
                "api_url": self.cortex_service.base_url,
                "model": "grok-4-fast-reasoning"
            },
            "fallback_provider": {
                "name": self.fallback_provider,
                "api_url": self.vertex_service.base_url,
                "model": "gemini-2.5-pro"
            },
            "unified_service": {
                "auto_failover": True,
                "providers_available": 2,
                "primary_model": "grok-4-fast-reasoning",
                "fallback_model": "gemini-2.5-pro",
                "supports_thinking": True
            }
        }

# Global service instance
unified_ai_service = UnifiedAIService()

async def get_unified_ai_service() -> UnifiedAIService:
    """Get Unified AI service instance for dependency injection"""
    return unified_ai_service
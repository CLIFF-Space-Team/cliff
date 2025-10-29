"""
Grok AI Service - Advanced reasoning with streaming support
Stream-enabled AI service using Grok-4-fast-reasoning model with <thinking> tag processing
"""

import asyncio
import logging
import json
import aiohttp
import re
from typing import Dict, List, Optional, Any, AsyncGenerator, Union
from datetime import datetime
import structlog
from pydantic import BaseModel, Field

from app.core.config import settings

logger = structlog.get_logger(__name__)

class GrokChatMessage(BaseModel):
    """Grok chat message model"""
    role: str = Field(..., description="Message role: user, assistant, or system")
    content: str = Field(..., description="Message content")

class GrokChatRequest(BaseModel):
    """Grok chat completion request"""
    messages: List[GrokChatMessage] = Field(..., description="Chat messages")
    model: Optional[str] = Field(default="grok-4-fast-reasoning", description="Grok model")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for responses")
    max_tokens: Optional[int] = Field(default=4096, description="Maximum tokens")
    stream: Optional[bool] = Field(default=True, description="Enable streaming response")

class GrokChatResponse(BaseModel):
    """Grok chat completion response"""
    success: bool
    content: Optional[str] = None
    thinking_content: Optional[str] = None
    visible_content: Optional[str] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    timestamp: str
    has_thinking: bool = False

class GrokStreamChunk(BaseModel):
    """Grok stream chunk for real-time responses"""
    type: str = Field(..., description="Chunk type: thinking, content, or complete")
    content: str = Field(..., description="Chunk content")
    is_thinking: bool = Field(default=False, description="Is this thinking content")
    is_complete: bool = Field(default=False, description="Is response complete")

class GrokAIService:
    """
    Grok AI Service with advanced reasoning and streaming
    Supports <thinking> tags for reasoning display
    """
    
    def __init__(self):
        self.api_key = settings.GROK_API_KEY
        self.base_url = settings.GROK_BASE_URL
        self.model = settings.GROK_CHAT_MODEL
        self.max_tokens = settings.GROK_MAX_TOKENS
        self.temperature = settings.GROK_TEMPERATURE
        
        logger.info(f"Grok AI Service initialized with model: {self.model}")
    
    def _parse_thinking_content(self, text: str) -> Dict[str, str]:
        """Parse <thinking> tags from response content"""
        thinking_pattern = r'<thinking>(.*?)</thinking>'
        thinking_matches = re.findall(thinking_pattern, text, re.DOTALL)
        
        # Remove thinking tags from visible content
        visible_content = re.sub(thinking_pattern, '', text, flags=re.DOTALL).strip()
        
        thinking_content = '\n'.join(thinking_matches) if thinking_matches else ""
        
        return {
            "thinking": thinking_content,
            "visible": visible_content,
            "has_thinking": bool(thinking_matches)
        }
    
    async def _make_streaming_request(self, request: GrokChatRequest) -> AsyncGenerator[GrokStreamChunk, None]:
        """Make streaming request to Grok API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": request.model or self.model,
                "messages": [
                    {
                        "role": msg.role,
                        "content": msg.content
                    }
                    for msg in request.messages
                ],
                "temperature": request.temperature or self.temperature,
                "max_tokens": request.max_tokens or self.max_tokens,
                "stream": True
            }
            
            logger.info(f"Making streaming request to Grok API: {self.base_url}")
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.post(self.base_url, json=payload, headers=headers) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Grok API error {response.status}: {error_text}")
                        yield GrokStreamChunk(
                            type="error",
                            content=f"API Error: {response.status}",
                            is_complete=True
                        )
                        return
                    
                    current_thinking = ""
                    current_visible = ""
                    inside_thinking = False
                    
                    async for line in response.content:
                        line = line.decode('utf-8').strip()
                        
                        if line.startswith('data: '):
                            data_content = line[6:]
                            
                            if data_content == '[DONE]':
                                yield GrokStreamChunk(
                                    type="complete",
                                    content="",
                                    is_complete=True
                                )
                                break
                            
                            try:
                                chunk_data = json.loads(data_content)
                                
                                if 'choices' in chunk_data and chunk_data['choices']:
                                    delta = chunk_data['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    
                                    if content:
                                        # Check for thinking tags
                                        if '<thinking>' in content:
                                            inside_thinking = True
                                            thinking_start = content.find('<thinking>') + 10
                                            if thinking_start > 9:
                                                current_thinking += content[thinking_start:]
                                            
                                            yield GrokStreamChunk(
                                                type="thinking_start",
                                                content="<thinking>",
                                                is_thinking=True
                                            )
                                        
                                        elif '</thinking>' in content:
                                            inside_thinking = False
                                            thinking_end = content.find('</thinking>')
                                            if thinking_end > -1:
                                                current_thinking += content[:thinking_end]
                                            
                                            yield GrokStreamChunk(
                                                type="thinking_end",
                                                content=current_thinking,
                                                is_thinking=True
                                            )
                                            
                                            # Continue with visible content after thinking
                                            remaining_content = content[thinking_end + 11:]
                                            if remaining_content:
                                                current_visible += remaining_content
                                                yield GrokStreamChunk(
                                                    type="content",
                                                    content=remaining_content,
                                                    is_thinking=False
                                                )
                                        
                                        elif inside_thinking:
                                            current_thinking += content
                                            yield GrokStreamChunk(
                                                type="thinking",
                                                content=content,
                                                is_thinking=True
                                            )
                                        
                                        else:
                                            current_visible += content
                                            yield GrokStreamChunk(
                                                type="content",
                                                content=content,
                                                is_thinking=False
                                            )
                                
                            except json.JSONDecodeError:
                                logger.warning(f"Could not parse chunk data: {data_content}")
                                continue
                            
        except Exception as e:
            logger.error(f"Streaming request failed: {str(e)}")
            yield GrokStreamChunk(
                type="error",
                content=f"Connection error: {str(e)}",
                is_complete=True
            )
    
    async def chat_completion_stream(self, request: GrokChatRequest) -> AsyncGenerator[GrokStreamChunk, None]:
        """Generate streaming chat completion"""
        logger.info(f"Processing streaming chat request with {len(request.messages)} messages")
        
        async for chunk in self._make_streaming_request(request):
            yield chunk
    
    async def chat_completion(self, request: GrokChatRequest) -> GrokChatResponse:
        """Generate complete chat completion (non-streaming)"""
        try:
            logger.info(f"Processing chat request with {len(request.messages)} messages")
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": request.model or self.model,
                "messages": [
                    {
                        "role": msg.role,
                        "content": msg.content
                    }
                    for msg in request.messages
                ],
                "temperature": request.temperature or self.temperature,
                "max_tokens": request.max_tokens or self.max_tokens,
                "stream": False
            }
            
            start_time = datetime.now()
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.post(self.base_url, json=payload, headers=headers) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        # Extract content
                        content = None
                        if result.get("choices") and len(result["choices"]) > 0:
                            choice = result["choices"][0]
                            message = choice.get("message", {})
                            content = message.get("content")
                        
                        if content:
                            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
                            
                            # Parse thinking content
                            parsed_content = self._parse_thinking_content(content)
                            
                            logger.info(f"Grok AI succeeded in {response_time}ms")
                            
                            return GrokChatResponse(
                                success=True,
                                content=content,
                                thinking_content=parsed_content["thinking"],
                                visible_content=parsed_content["visible"],
                                model_used=request.model or self.model,
                                response_time_ms=response_time,
                                has_thinking=parsed_content["has_thinking"],
                                timestamp=datetime.now().isoformat()
                            )
                    
                    else:
                        error_text = await response.text()
                        logger.error(f"Grok API error {response.status}: {error_text}")
                        
                        return GrokChatResponse(
                            success=False,
                            error_message=f"API Error {response.status}: {error_text}",
                            timestamp=datetime.now().isoformat()
                        )
            
        except Exception as e:
            logger.error(f"Grok AI request failed: {str(e)}")
            
            return GrokChatResponse(
                success=False,
                error_message=f"Connection error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get Grok service information"""
        return {
            "service_name": "grok_ai",
            "model": self.model,
            "api_url": self.base_url,
            "features": [
                "Fast reasoning",
                "Streaming responses", 
                "Thinking process display",
                "Advanced problem solving"
            ],
            "max_tokens": self.max_tokens,
            "temperature": self.temperature
        }

# Global service instance
grok_ai_service = GrokAIService()

async def get_grok_ai_service() -> GrokAIService:
    """Get Grok AI service instance for dependency injection"""
    return grok_ai_service
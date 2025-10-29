"""
Google Vertex AI Service - Fallback AI Provider
Advanced AI chat completion service using Google's Vertex AI API
"""

import asyncio
import logging
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import aiohttp
import structlog
from pydantic import BaseModel, Field
from app.core.config import settings

logger = structlog.get_logger(__name__)

class ChatMessage(BaseModel):
    """Chat message model"""
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")

class ChatCompletionRequest(BaseModel):
    """Request model for chat completion"""
    messages: List[ChatMessage] = Field(..., description="Chat messages")
    model: str = Field(default="gemini-2.5-pro", description="Model to use")
    temperature: Optional[float] = Field(default=0.7, description="Temperature for responses")
    max_tokens: Optional[int] = Field(default=2048, description="Maximum tokens")

class ChatCompletionResponse(BaseModel):
    """Response model for chat completion"""
    success: bool
    content: Optional[str] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    timestamp: str
    provider: str = "vertex_ai"

class VertexAIService:
    """
    Google Vertex AI Service
    Fallback AI provider using Google's original Vertex AI API format
    """
    
    def __init__(self):
        self.api_key = settings.VERTEX_AI_API_KEY or "sk-1a67670ecba1415cb332ec77880e0caa"
        self.base_url = "https://beta.vertexapis.com"
        self.project_id = settings.VERTEX_AI_PROJECT_ID or "cliff-ai-project"
        self.location = settings.VERTEX_AI_LOCATION or "global"
        self.default_model = "gemini-2.5-pro"
        
        logger.info(f"Vertex AI Service initialized with project: {self.project_id}")
    
    async def chat_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """
        Generate chat completion using Google's original Vertex AI API format
        """
        start_time = datetime.now()
        
        try:
            # Build proper Google Vertex AI URL
            # Format: /v1/projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/{MODEL}:generateContent
            model_name = request.model or self.default_model
            api_url = f"https://beta.vertexapis.com/v1/projects/test/locations/global/publishers/google/models/gemini-2.5-pro:generateContent"
            
            # Convert messages to Google's format
            contents = []
            for msg in request.messages:
                if msg.role == "user":
                    contents.append({
                        "role": "user",
                        "parts": [{"text": msg.content}]
                    })
                elif msg.role == "assistant":
                    contents.append({
                        "role": "model",
                        "parts": [{"text": msg.content}]
                    })
            
            # Google Vertex AI payload format
            payload = {
                "contents": contents,
                "generationConfig": {
                    "temperature": request.temperature or 0.7,
                    "maxOutputTokens": request.max_tokens or 2048,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            
            # Google API headers
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": "sk-1a67670ecba1415cb332ec77880e0caa"
            }
            
            logger.info(f"Generating Vertex AI response with {model_name}")
            logger.debug(f"API URL: {api_url}")
            logger.debug(f"Messages count: {len(request.messages)}")
            
            # Make API request
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.post(api_url, json=payload, headers=headers) as response:
                    
                    response_text = await response.text()
                    logger.debug(f"Response status: {response.status}")
                    logger.debug(f"Response text: {response_text[:500]}...")
                    
                    if response.status == 200:
                        result = await response.json() if hasattr(response, 'json') else json.loads(response_text)
                        
                        # Extract content from Google's response format
                        content = None
                        if result.get("candidates") and len(result["candidates"]) > 0:
                            candidate = result["candidates"][0]
                            if candidate.get("content") and candidate["content"].get("parts"):
                                parts = candidate["content"]["parts"]
                                if len(parts) > 0 and parts[0].get("text"):
                                    content = parts[0]["text"]
                        
                        if content:
                            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
                            
                            logger.info(f"Vertex AI response generated successfully in {response_time}ms")
                            
                            return ChatCompletionResponse(
                                success=True,
                                content=content,
                                model_used=model_name,
                                response_time_ms=response_time,
                                timestamp=datetime.now().isoformat()
                            )
                        else:
                            error_msg = f"No content found in Vertex AI response: {result}"
                            logger.error(f"ERROR: {error_msg}")
                            
                            return ChatCompletionResponse(
                                success=False,
                                error_message=error_msg,
                                timestamp=datetime.now().isoformat()
                            )
                    
                    else:
                        error_msg = f"Vertex AI API error {response.status}: {response_text}"
                        logger.error(f"ERROR: {error_msg}")
                        
                        return ChatCompletionResponse(
                            success=False,
                            error_message=error_msg,
                            timestamp=datetime.now().isoformat()
                        )
        
        except asyncio.TimeoutError:
            error_msg = "Vertex AI API request timed out"
            logger.error(f"TIMEOUT: {error_msg}")
            
            return ChatCompletionResponse(
                success=False,
                error_message=error_msg,
                timestamp=datetime.now().isoformat()
            )
        
        except Exception as e:
            error_msg = f"Unexpected error in Vertex AI: {str(e)}"
            logger.error(f"EXCEPTION: {error_msg}")
            
            return ChatCompletionResponse(
                success=False,
                error_message=error_msg,
                timestamp=datetime.now().isoformat()
            )
    
    def get_available_models(self) -> List[str]:
        """Get list of available models"""
        return [
            "gemini-2.5-pro",
            "gemini-1.5-pro",
            "gemini-1.5-flash"
        ]
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get service information"""
        return {
            "provider": "vertex_ai",
            "base_url": self.base_url,
            "available_models": len(self.get_available_models()),
            "default_model": self.default_model
        }

# Global service instance
vertex_ai_service = VertexAIService()

async def get_vertex_ai_service() -> VertexAIService:
    """Get Vertex AI service instance for dependency injection"""
    return vertex_ai_service
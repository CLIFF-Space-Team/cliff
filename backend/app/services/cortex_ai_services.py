"""
CortexAI Image Generation Service - Artistic Asteroid Visuals
Advanced AI-powered image generation with Seedream-4-high-res-fal model
"""

import asyncio
import logging
import json
import hashlib
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import aiohttp
import structlog
from pydantic import BaseModel, Field
from app.core.config import settings

logger = structlog.get_logger(__name__)

class ChatCompletionRequest(BaseModel):
    """Request model for chat completion"""
    messages: List[Dict[str, str]] = Field(..., description="Chat messages")
    model: Optional[str] = Field(default="grok-4-0709", description="Model to use")
    temperature: Optional[float] = Field(default=0.7, description="Temperature")
    max_tokens: Optional[int] = Field(default=2048, description="Max tokens")

class ChatCompletionResponse(BaseModel):
    """Response model for chat completion"""
    success: bool
    content: Optional[str] = None
    thinking_content: Optional[str] = None
    visible_content: Optional[str] = None
    has_thinking: bool = False
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    timestamp: str

class AsteroidImageRequest(BaseModel):
    """Request model for asteroid image generation"""
    asteroid_id: str = Field(..., description="Unique asteroid identifier")
    asteroid_name: str = Field(..., description="Asteroid name")
    is_hazardous: bool = Field(default=False, description="Is potentially hazardous")
    diameter_km: float = Field(default=1.0, description="Estimated diameter in km")
    velocity_kms: float = Field(default=15.0, description="Velocity in km/s")
    distance_au: float = Field(default=1.0, description="Distance in AU")
    style_preference: str = Field(default="mystical", description="Art style preference")

class AsteroidImageResponse(BaseModel):
    """Response model for asteroid image generation"""
    success: bool
    image_url: Optional[str] = None
    prompt_used: Optional[str] = None
    generation_time_ms: Optional[int] = None
    cached: bool = False
    error_message: Optional[str] = None
    timestamp: str

class CortexAIService:
    """
    CortexAI Image Generation Service
    Specialized for creating artistic/fantastical asteroid visualizations
    """
    
    def __init__(self):
        self.api_key = "sk-1a67670ecba1415cb332ec77880e0caa"
        self.model_name = "grok-4-0709"
        self.base_url = "https://cortexapi.net/v1/chat/completions"
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_hours = 24
        
        # Chat completion settings
        self.temperature = 0.7
        self.max_tokens = 2048
        
        logger.info("CortexAI Service initialized with grok-4-0709 model")
    
    def _generate_cache_key(self, request: AsteroidImageRequest) -> str:
        """Generate unique cache key for asteroid image"""
        cache_data = f"{request.asteroid_id}_{request.style_preference}_{request.is_hazardous}"
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached image is still valid"""
        if cache_key not in self.cache:
            return False
        
        cached_time = datetime.fromisoformat(self.cache[cache_key]['timestamp'])
        expiry_time = cached_time + timedelta(hours=self.cache_ttl_hours)
        
        return datetime.now() < expiry_time
    
    def _create_artistic_prompt(self, request: AsteroidImageRequest) -> str:
        """
        Generate artistic/fantastical prompt for asteroid visualization
        """
        # Base artistic styles
        style_templates = {
            "mystical": "mystical cosmic asteroid with glowing magical crystals and ethereal aurora",
            "ancient": "ancient cosmic stone covered in mysterious glowing runic symbols",
            "ethereal": "ethereal space rock surrounded by shimmering aurora-like energy",
            "crystalline": "magnificent crystalline asteroid made of prismatic crystal formations",
            "cosmic": "cosmic asteroid with swirling nebula-like surface textures and starlight",
            "fantasy": "fantasy space rock with magical energy emanations and dreamlike aura",
            "enchanted": "enchanted asteroid with fairy-like sparkles and magical glow",
            "celestial": "celestial asteroid with divine light and heavenly radiance"
        }
        
        # Get base style
        base_style = style_templates.get(request.style_preference, style_templates["mystical"])
        
        # Add characteristics based on asteroid properties
        characteristics = []
        
        # Size-based characteristics
        if request.diameter_km > 2.0:
            characteristics.append("massive and imposing")
        elif request.diameter_km < 0.5:
            characteristics.append("delicate and intricate")
        else:
            characteristics.append("perfectly proportioned")
        
        # Hazard-based characteristics
        if request.is_hazardous:
            characteristics.extend([
                "menacing red-orange glow",
                "dangerous crackling energy",
                "ominous aura of power"
            ])
        else:
            characteristics.extend([
                "peaceful blue-violet glow",
                "serene gentle radiance",
                "calming magical presence"
            ])
        
        # Velocity-based characteristics
        if request.velocity_kms > 25.0:
            characteristics.append("surrounded by motion blur and energy trails")
        elif request.velocity_kms > 20.0:
            characteristics.append("with subtle energy wisps")
        
        # Distance-based characteristics
        if request.distance_au < 0.05:
            characteristics.extend([
                "highly detailed surface textures",
                "dramatic close-up perspective",
                "intricate magical details visible"
            ])
        
        # Combine all elements
        char_str = ", ".join(characteristics[:4])  # Limit characteristics
        
        prompt = f"""A {base_style}, {char_str}, floating majestically in the cosmic void of deep space. 
        The asteroid should have a fantastical, dreamlike quality with magical properties. 
        High quality fantasy digital art, concept art style, dramatic cinematic lighting, 
        vibrant mystical colors, 8k ultra-detailed, professional fantasy artwork, 
        magical realism style, ethereal atmosphere, cosmic background with distant stars"""
        
        logger.info(f"Generated artistic prompt for {request.asteroid_name}: {request.style_preference} style")
        return prompt.strip()
    
    async def generate_asteroid_image(self, request: AsteroidImageRequest) -> AsteroidImageResponse:
        """
        Generate artistic asteroid image using CortexAI
        """
        start_time = datetime.now()
        cache_key = self._generate_cache_key(request)
        
        # Check cache first
        if self._is_cache_valid(cache_key):
            cached_result = self.cache[cache_key]
            logger.info(f"Cache hit for asteroid {request.asteroid_name}")
            
            return AsteroidImageResponse(
                success=True,
                image_url=cached_result['image_url'],
                prompt_used=cached_result['prompt_used'],
                generation_time_ms=0,
                cached=True,
                timestamp=datetime.now().isoformat()
            )
        
        try:
            # Generate artistic prompt
            artistic_prompt = self._create_artistic_prompt(request)
            
            # Prepare CortexAI API request
            payload = {
                "model": self.model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": artistic_prompt
                    }
                ]
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            logger.info(f"Generating artistic image for asteroid {request.asteroid_name}")
            logger.debug(f"Prompt: {artistic_prompt[:100]}...")
            
            # Make API request
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as session:
                async with session.post(self.base_url, json=payload, headers=headers) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        # Extract image URL from response
                        image_url = None
                        if result.get("choices") and len(result["choices"]) > 0:
                            choice = result["choices"][0]
                            message = choice.get("message", {})
                            
                            # Try different response formats
                            image_url = (
                                message.get("image_url") or 
                                message.get("content") or
                                choice.get("image_url")
                            )
                        
                        if image_url:
                            generation_time = int((datetime.now() - start_time).total_seconds() * 1000)
                            
                            # Cache the result
                            self.cache[cache_key] = {
                                'image_url': image_url,
                                'prompt_used': artistic_prompt,
                                'timestamp': datetime.now().isoformat()
                            }
                            
                            logger.info(f"Image generated successfully for {request.asteroid_name} in {generation_time}ms")
                            
                            return AsteroidImageResponse(
                                success=True,
                                image_url=image_url,
                                prompt_used=artistic_prompt,
                                generation_time_ms=generation_time,
                                cached=False,
                                timestamp=datetime.now().isoformat()
                            )
                        else:
                            error_msg = "No image URL found in CortexAI response"
                            logger.error(f"ERROR: {error_msg}")
                            
                            return AsteroidImageResponse(
                                success=False,
                                error_message=error_msg,
                                timestamp=datetime.now().isoformat()
                            )
                    
                    else:
                        error_text = await response.text()
                        error_msg = f"CortexAI API error {response.status}: {error_text}"
                        logger.error(f"ERROR: {error_msg}")
                        
                        return AsteroidImageResponse(
                            success=False,
                            error_message=error_msg,
                            timestamp=datetime.now().isoformat()
                        )
        
        except asyncio.TimeoutError:
            error_msg = "CortexAI API request timed out"
            logger.error(f"TIMEOUT: {error_msg}")
            
            return AsteroidImageResponse(
                success=False,
                error_message=error_msg,
                timestamp=datetime.now().isoformat()
            )
        
        except Exception as e:
            error_msg = f"Unexpected error in image generation: {str(e)}"
            logger.error(f"EXCEPTION: {error_msg}")
            
            return AsteroidImageResponse(
                success=False,
                error_message=error_msg,
                timestamp=datetime.now().isoformat()
            )
    
    async def get_cached_image(self, asteroid_id: str, style_preference: str = "mystical") -> Optional[str]:
        """Get cached image URL if available"""
        request = AsteroidImageRequest(
            asteroid_id=asteroid_id,
            asteroid_name="",
            style_preference=style_preference
        )
        cache_key = self._generate_cache_key(request)
        
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]['image_url']
        
        return None
    
    def get_available_styles(self) -> List[str]:
        """Get list of available artistic styles"""
        return [
            "mystical",
            "ancient", 
            "ethereal",
            "crystalline",
            "cosmic",
            "fantasy",
            "enchanted",
            "celestial"
        ]
    
    def clear_cache(self) -> int:
        """Clear image cache and return number of items cleared"""
        cache_count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cleared {cache_count} cached images")
        return cache_count
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cached_images": len(self.cache),
            "cache_ttl_hours": self.cache_ttl_hours,
            "available_styles": len(self.get_available_styles())
        }
    
    async def chat_completion(self, request: ChatCompletionRequest) -> ChatCompletionResponse:
        """Generate chat completion using CortexAI - supports both GPT and Grok models"""
        try:
            logger.info(f"🤖 CortexAI chat request with {len(request.messages)} messages, model: {request.model}")
            
            # Prepare the request payload
            payload = {
                "model": request.model or self.model_name,
                "messages": [
                    {
                        "role": message.get("role") if isinstance(message, dict) else message.role,
                        "content": message.get("content") if isinstance(message, dict) else message.content
                    }
                    for message in request.messages
                ],
                "temperature": request.temperature or self.temperature,
                "max_tokens": request.max_tokens or self.max_tokens,
                "stream": False
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json; charset=utf-8"
            }
            
            start_time = datetime.now()
            
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=90),  # Grok-4-0709 için optimized timeout
                connector=aiohttp.TCPConnector(force_close=True, enable_cleanup_closed=True)
            ) as session:
                async with session.post(self.base_url, json=payload, headers=headers) as response:
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        # Extract content from response
                        content = None
                        if result.get("choices") and len(result["choices"]) > 0:
                            choice = result["choices"][0]
                            message = choice.get("message", {})
                            content = message.get("content")
                        
                        if content:
                            response_time = int((datetime.now() - start_time).total_seconds() * 1000)
                            
                            # Handle Grok thinking content if present
                            thinking_content = None
                            visible_content = content
                            has_thinking = False
                            
                            model_used = request.model or self.model_name
                            if model_used == "grok-4-fast-reasoning" and "<thinking>" in content:
                                import re
                                thinking_pattern = r'<thinking>(.*?)</thinking>'
                                thinking_matches = re.findall(thinking_pattern, content, re.DOTALL)
                                
                                if thinking_matches:
                                    thinking_content = '\n'.join(thinking_matches).strip()
                                    visible_content = re.sub(thinking_pattern, '', content, flags=re.DOTALL).strip()
                                    has_thinking = True
                            
                            logger.info(f"✅ CortexAI ({model_used}) succeeded in {response_time}ms, thinking: {has_thinking}")
                            
                            return ChatCompletionResponse(
                                success=True,
                                content=content,
                                thinking_content=thinking_content,
                                visible_content=visible_content,
                                has_thinking=has_thinking,
                                model_used=model_used,
                                response_time_ms=response_time,
                                timestamp=datetime.now().isoformat()
                            )
                    
                    # Handle error responses
                    error_text = await response.text()
                    logger.error(f"❌ CortexAI API error {response.status}: {error_text}")
                    
                    return ChatCompletionResponse(
                        success=False,
                        error_message=f"API Error {response.status}: {error_text}",
                        timestamp=datetime.now().isoformat()
                    )
            
        except Exception as e:
            error_msg = f"CortexAI request failed: {str(e)}"
            logger.error(error_msg, exc_info=True)
            
            return ChatCompletionResponse(
                success=False,
                error_message=error_msg,
                timestamp=datetime.now().isoformat()
            )

# Global service instance
cortex_ai_service = CortexAIService()

async def get_cortex_ai_service() -> CortexAIService:
    """Get CortexAI service instance for dependency injection"""
    return cortex_ai_service
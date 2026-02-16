import asyncio
import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime
import structlog
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.intelligent_prompt_enhancer import (
    IntelligentPromptEnhancer,
    PromptEnhancementRequest,
    PromptStyle,
    PromptCategory,
    intelligent_prompt_enhancer
)
logger = structlog.get_logger(__name__)
class ImageGenerationRequest(BaseModel):
    prompt: str = Field(..., description="Image generation prompt")
    model: str = Field(default="ideogram-v3-quality", description="Image model")
    style: Optional[str] = Field(default=None, description="Visual style")
    size: str = Field(default="1024x1024", description="Image size")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Chat context")
    enhance_prompt: bool = Field(default=True, description="Use intelligent prompt enhancement")
    creativity_level: float = Field(default=0.8, ge=0.0, le=1.0, description="AI creativity level")
    detail_level: str = Field(default="high", description="Detail level: low, medium, high")
class ImageGenerationResponse(BaseModel):
    success: bool
    image_url: Optional[str] = None
    original_prompt: str
    enhanced_prompt: Optional[str] = None
    prompt_analysis: Optional[Dict[str, Any]] = None
    model_used: str
    generation_time_ms: Optional[int] = None
    prompt_enhancement_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    timestamp: str
    suggestions: Optional[List[str]] = None
class EnhancedImageService:
    
    def __init__(self):
        self.api_key = settings.CORTEX_IMAGE_API_KEY or ""
        self.api_url = "https://cortexapi.net/v1/chat/completions"
        self.default_model = "imagen-4.0-ultra-generate-preview-06-06"
        self.http_client: Optional[httpx.AsyncClient] = None
        self.prompt_enhancer = intelligent_prompt_enhancer
        self.metrics = {
            "total_generations": 0,
            "successful_generations": 0,
            "failed_generations": 0,
            "prompt_enhancements_used": 0,
            "average_generation_time_ms": 0,
            "average_enhancement_time_ms": 0
        }
        logger.info("Enhanced Image Generation Service initialized with intelligent prompt enhancement")
    async def detect_image_request(self, message: str) -> Dict[str, Any]:
        
        image_keywords = [
            "görsel oluştur", "resim yap", "fotoğraf çek", "görsel çiz", "çiz",
            "göster", "oluştur", "yap", "tasarla", "görsel", "resim", "fotoğraf", 
            "çizim", "illüstrasyon", "şekil", "diyagram",
            "create image", "generate picture", "draw", "visualize", "show me",
            "imagine", "picture of", "illustration", "artwork", "design",
            "uzay gemisi çiz", "mars yüzeyi", "galaksi göster", "nebula", 
            "robot", "astronot", "uzay", "space", "planet", "star",
            "solar system", "spacecraft", "galaxy", "universe",
            "paint", "sketch", "render", "artistic", "creative", "fantasy",
            "realistic", "photorealistic", "3d render", "digital art"
        ]
        message_lower = message.lower()
        detected_keywords = []
        confidence_boost = 0.0
        for keyword in image_keywords:
            if keyword in message_lower:
                detected_keywords.append(keyword)
                if len(keyword.split()) > 1:  # Multi-word keywords
                    confidence_boost += 0.3
                else:
                    confidence_boost += 0.1
        has_intent = len(detected_keywords) > 0
        category_keywords = {
            "space": ["uzay", "space", "mars", "dünya", "earth", "güneş", "sun", "ay", "moon", 
                     "gezegen", "planet", "yıldız", "star", "galaksi", "galaxy", "nebula",
                     "asteroid", "kuyruklu yıldız", "comet", "uzay gemisi", "spacecraft",
                     "astronot", "astronaut", "uzay istasyonu", "space station"],
            "nature": ["doğa", "nature", "orman", "forest", "ağaç", "tree", "çiçek", "flower",
                      "deniz", "sea", "göl", "lake", "dağ", "mountain", "hayvan", "animal"],
            "fantasy": ["ejder", "dragon", "büyücü", "wizard", "peri", "fairy", "unicorn",
                       "magic", "magical", "fantasy", "mythical", "legendary"],
            "portrait": ["portre", "portrait", "yüz", "face", "kişi", "person", "insan", "human"],
            "object": ["nesne", "object", "araç", "vehicle", "makine", "machine", "alet", "tool"]
        }
        detected_category = "general"
        category_confidence = 0.0
        for category, keywords in category_keywords.items():
            category_matches = sum(1 for keyword in keywords if keyword in message_lower)
            if category_matches > 0:
                current_confidence = category_matches / len(keywords)
                if current_confidence > category_confidence:
                    detected_category = category
                    category_confidence = current_confidence
        style_keywords = {
            "photorealistic": ["gerçekçi", "realistic", "photorealistic", "photo", "real"],
            "artistic": ["sanatsal", "artistic", "painting", "art", "creative"],
            "cinematic": ["sinematik", "cinematic", "movie", "film", "dramatic"],
            "fantasy": ["fantastik", "fantasy", "magical", "mystical", "dreamy"],
            "futuristic": ["fütüristik", "futuristic", "sci-fi", "cyberpunk", "modern"],
            "vintage": ["eski", "vintage", "retro", "classic", "antique"]
        }
        detected_style = None
        style_confidence = 0.0
        for style, keywords in style_keywords.items():
            style_matches = sum(1 for keyword in keywords if keyword in message_lower)
            if style_matches > 0:
                current_confidence = style_matches / len(keywords)
                if current_confidence > style_confidence:
                    detected_style = style
                    style_confidence = current_confidence
        final_confidence = min(1.0, (confidence_boost + category_confidence + style_confidence) / 3)
        return {
            "has_image_intent": has_intent,
            "detected_keywords": detected_keywords,
            "detected_category": detected_category,
            "detected_style": detected_style,
            "confidence": final_confidence,
            "category_confidence": category_confidence,
            "style_confidence": style_confidence,
            "analysis": {
                "total_keywords": len(detected_keywords),
                "category_matches": category_confidence,
                "style_matches": style_confidence,
                "enhancement_recommended": final_confidence > 0.3
            }
        }
    async def enhance_prompt_with_ai(self, prompt: str, context: Dict[str, Any] = None,
                                   style: Optional[str] = None, creativity_level: float = 0.8,
                                   detail_level: str = "high") -> Dict[str, Any]:
        
        try:
            start_time = datetime.now()
            enhancement_request = PromptEnhancementRequest(
                user_input=prompt,
                preferred_style=PromptStyle(style) if style and style in [s.value for s in PromptStyle] else None,
                creativity_level=creativity_level,
                detail_level=detail_level,
                include_technical=True,
                use_cache=True
            )
            if context:
                if context.get("detected_category"):
                    try:
                        enhancement_request.target_category = PromptCategory(context["detected_category"])
                    except ValueError:
                        pass  # Geçersiz kategori, otomatik belirlenmesi için bırak
            logger.info(f"Enhancing prompt with AI: {prompt[:50]}...")
            enhancement_response = await self.prompt_enhancer.enhance_prompt(enhancement_request)
            enhancement_time = int((datetime.now() - start_time).total_seconds() * 1000)
            if enhancement_response.success:
                logger.info(f"Prompt enhanced successfully in {enhancement_time}ms")
                logger.info(f"Enhancement confidence: {enhancement_response.confidence_score:.2f}")
                return {
                    "success": True,
                    "original_prompt": prompt,
                    "enhanced_prompt": enhancement_response.enhanced_prompt,
                    "analysis": enhancement_response.analysis,
                    "suggestions": enhancement_response.suggestions,
                    "confidence_score": enhancement_response.confidence_score,
                    "enhancement_time_ms": enhancement_time,
                    "cached": enhancement_response.cached
                }
            else:
                logger.warning(f"AI prompt enhancement failed: {enhancement_response.error_message}")
                fallback_prompt = await self.fallback_prompt_enhancement(prompt, context, style)
                return {
                    "success": False,
                    "original_prompt": prompt,
                    "enhanced_prompt": fallback_prompt,
                    "error_message": enhancement_response.error_message,
                    "enhancement_time_ms": enhancement_time,
                    "fallback_used": True
                }
        except Exception as e:
            logger.error(f"AI prompt enhancement error: {str(e)}")
            fallback_prompt = await self.fallback_prompt_enhancement(prompt, context, style)
            return {
                "success": False,
                "original_prompt": prompt,
                "enhanced_prompt": fallback_prompt,
                "error_message": str(e),
                "fallback_used": True
            }
    async def fallback_prompt_enhancement(self, prompt: str, context: Dict[str, Any] = None,
                                        style: Optional[str] = None) -> str:
        
        quality_enhancers = [
            "high quality", "detailed", "professional", "8k resolution", 
            "ultra-realistic", "best quality", "masterpiece"
        ]
        style_enhancers = {
            "photorealistic": "photorealistic, professional photography, realistic lighting",
            "artistic": "artistic, digital painting, creative composition",
            "cinematic": "cinematic lighting, dramatic composition, movie-like quality",
            "fantasy": "fantasy art, magical atmosphere, ethereal quality",
            "futuristic": "futuristic design, sci-fi aesthetic, advanced technology",
            "vintage": "vintage style, retro aesthetic, classic composition"
        }
        context_enhancers = []
        if context:
            category = context.get("detected_category", "general")
            if category == "space":
                context_enhancers.extend([
                    "cosmic colors", "space environment", "NASA style", 
                    "astronomical accuracy", "celestial beauty"
                ])
            elif category == "nature":
                context_enhancers.extend([
                    "natural lighting", "organic textures", "environmental details",
                    "nature photography style"
                ])
            elif category == "fantasy":
                context_enhancers.extend([
                    "magical atmosphere", "mythical elements", "fantasy art style",
                    "enchanted setting"
                ])
        translations = {
            "uzay gemisi": "spacecraft", "mars yüzeyi": "mars surface", 
            "ay yüzeyi": "lunar surface", "uzay istasyonu": "space station",
            "astronot": "astronaut", "galaksi": "galaxy", "nebula": "nebula",
            "kara delik": "black hole", "güneş sistemi": "solar system",
            "gezegen": "planet", "yıldız": "star", "kuyruklu yıldız": "comet",
            "orman": "forest", "ağaç": "tree", "çiçek": "flower",
            "deniz": "ocean", "göl": "lake", "dağ": "mountain",
            "hayvan": "animal", "kedi": "cat", "köpek": "dog",
            "ejder": "dragon", "büyücü": "wizard", "peri": "fairy",
            "unicorn": "unicorn", "büyülü": "magical",
            "güzel": "beautiful", "büyük": "large", "küçük": "small",
            "renkli": "colorful", "parlak": "bright", "karanlık": "dark"
        }
        enhanced_prompt = prompt.lower()
        for tr_word, en_word in translations.items():
            enhanced_prompt = enhanced_prompt.replace(tr_word, en_word)
        final_enhancements = []
        final_enhancements.extend(quality_enhancers[:3])  # İlk 3 kalite artırıcı
        if style and style in style_enhancers:
            final_enhancements.append(style_enhancers[style])
        final_enhancements.extend(context_enhancers[:2])  # İlk 2 context artırıcı
        final_prompt = f"{enhanced_prompt}, {', '.join(final_enhancements)}"
        return final_prompt.strip()
    async def generate_image(self, request: ImageGenerationRequest) -> ImageGenerationResponse:
        
        try:
            start_time = datetime.now()
            self.metrics["total_generations"] += 1
            enhanced_prompt = request.prompt
            prompt_analysis = None
            suggestions = None
            enhancement_time = 0
            if request.enhance_prompt:
                logger.info("Using intelligent prompt enhancement...")
                enhancement_result = await self.enhance_prompt_with_ai(
                    prompt=request.prompt,
                    context=request.context,
                    style=request.style,
                    creativity_level=request.creativity_level,
                    detail_level=request.detail_level
                )
                enhanced_prompt = enhancement_result["enhanced_prompt"]
                prompt_analysis = enhancement_result.get("analysis")
                suggestions = enhancement_result.get("suggestions")
                enhancement_time = enhancement_result.get("enhancement_time_ms", 0)
                if enhancement_result["success"]:
                    self.metrics["prompt_enhancements_used"] += 1
            logger.info(f"Generating image with enhanced prompt: {enhanced_prompt[:100]}...")
            payload = {
                "model": request.model,
                "messages": [
                    {
                        "role": "user",
                        "content": enhanced_prompt
                    }
                ]
            }
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            if not self.http_client:
                self.http_client = httpx.AsyncClient(timeout=httpx.Timeout(60.0))
            response = await self.http_client.post(self.api_url, json=payload, headers=headers)
            generation_time = int((datetime.now() - start_time).total_seconds() * 1000)
            self._update_metrics(True, generation_time, enhancement_time)
            if response.status_code == 200:
                data = response.json()
                image_url = None
                if data.get("choices") and len(data["choices"]) > 0:
                    choice = data["choices"][0]
                    message = choice.get("message", {})
                    image_url = (
                        message.get("image_url") or 
                        message.get("content") or
                        message.get("image") or
                        choice.get("image_url") or
                        choice.get("url")
                    )
                if image_url:
                    logger.info(f"Image generated successfully in {generation_time}ms")
                    return ImageGenerationResponse(
                        success=True,
                        image_url=image_url,
                        original_prompt=request.prompt,
                        enhanced_prompt=enhanced_prompt,
                        prompt_analysis=prompt_analysis,
                        model_used=request.model,
                        generation_time_ms=generation_time,
                        prompt_enhancement_time_ms=enhancement_time,
                        suggestions=suggestions,
                        timestamp=datetime.now().isoformat()
                    )
                else:
                    logger.warning("No image URL in response")
                    return ImageGenerationResponse(
                        success=False,
                        error_message="No image URL returned from API",
                        original_prompt=request.prompt,
                        enhanced_prompt=enhanced_prompt,
                        model_used=request.model,
                        generation_time_ms=generation_time,
                        prompt_enhancement_time_ms=enhancement_time,
                        timestamp=datetime.now().isoformat()
                    )
            else:
                error_msg = f"API error {response.status_code}: {response.text[:200]}"
                logger.error(f"Image generation failed: {error_msg}")
                self._update_metrics(False, generation_time, enhancement_time)
                return ImageGenerationResponse(
                    success=False,
                    error_message=error_msg,
                    original_prompt=request.prompt,
                    enhanced_prompt=enhanced_prompt,
                    model_used=request.model,
                    generation_time_ms=generation_time,
                    prompt_enhancement_time_ms=enhancement_time,
                    timestamp=datetime.now().isoformat()
                )
        except httpx.TimeoutException:
            error_msg = "Image generation timeout (60s)"
            logger.error(f"{error_msg}")
            self._update_metrics(False, 60000, enhancement_time)
            return ImageGenerationResponse(
                success=False,
                error_message=error_msg,
                original_prompt=request.prompt,
                enhanced_prompt=enhanced_prompt if 'enhanced_prompt' in locals() else request.prompt,
                model_used=request.model,
                timestamp=datetime.now().isoformat()
            )
        except Exception as e:
            error_msg = f"Image generation error: {str(e)}"
            logger.error(error_msg)
            self._update_metrics(False, 0, enhancement_time)
            return ImageGenerationResponse(
                success=False,
                error_message=error_msg,
                original_prompt=request.prompt,
                enhanced_prompt=enhanced_prompt if 'enhanced_prompt' in locals() else request.prompt,
                model_used=request.model,
                timestamp=datetime.now().isoformat()
            )
    def _update_metrics(self, success: bool, generation_time_ms: int, enhancement_time_ms: int):
        
        if success:
            self.metrics["successful_generations"] += 1
        else:
            self.metrics["failed_generations"] += 1
        total = self.metrics["total_generations"]
        if total > 0:
            current_gen_avg = self.metrics["average_generation_time_ms"]
            new_gen_avg = ((current_gen_avg * (total - 1)) + generation_time_ms) / total
            self.metrics["average_generation_time_ms"] = int(new_gen_avg)
            if enhancement_time_ms > 0:
                current_enh_avg = self.metrics["average_enhancement_time_ms"]
                enh_count = self.metrics["prompt_enhancements_used"]
                if enh_count > 0:
                    new_enh_avg = ((current_enh_avg * (enh_count - 1)) + enhancement_time_ms) / enh_count
                    self.metrics["average_enhancement_time_ms"] = int(new_enh_avg)
    async def test_api_connection(self) -> Dict[str, Any]:
        
        try:
            test_request = ImageGenerationRequest(
                prompt="test image of a simple star",
                model=self.default_model,
                enhance_prompt=False  # Test için basit tutalaim
            )
            logger.info("Testing Enhanced Image API connection...")
            response = await self.generate_image(test_request)
            return {
                "success": response.success,
                "api_url": self.api_url,
                "model": self.default_model,
                "api_key_configured": bool(self.api_key and len(self.api_key) > 20),
                "prompt_enhancer_available": bool(self.prompt_enhancer),
                "test_response": {
                    "success": response.success,
                    "generation_time_ms": response.generation_time_ms,
                    "error": response.error_message if not response.success else None
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "api_url": self.api_url,
                "model": self.default_model,
                "api_key_configured": bool(self.api_key and len(self.api_key) > 20),
                "prompt_enhancer_available": bool(self.prompt_enhancer)
            }
    def get_metrics(self) -> Dict[str, Any]:
        
        success_rate = 0.0
        enhancement_usage_rate = 0.0
        if self.metrics["total_generations"] > 0:
            success_rate = (self.metrics["successful_generations"] / self.metrics["total_generations"]) * 100
            enhancement_usage_rate = (self.metrics["prompt_enhancements_used"] / self.metrics["total_generations"]) * 100
        return {
            **self.metrics,
            "success_rate": success_rate,
            "enhancement_usage_rate": enhancement_usage_rate,
            "cache_stats": self.prompt_enhancer.get_cache_stats()
        }
    def get_available_styles(self) -> List[str]:
        
        return [style.value for style in PromptStyle]
    def get_available_categories(self) -> List[str]:
        
        return [category.value for category in PromptCategory]
    async def cleanup(self):
        
        if self.http_client:
            await self.http_client.aclose()
enhanced_image_service = EnhancedImageService()
async def get_enhanced_image_service() -> EnhancedImageService:
    
    return enhanced_image_service
async def cleanup_enhanced_image_service():
    
    await enhanced_image_service.cleanup()
async def generate_enhanced_image(prompt: str, style: Optional[str] = None,
                                enhance: bool = True) -> ImageGenerationResponse:
    
    request = ImageGenerationRequest(
        prompt=prompt,
        style=style,
        enhance_prompt=enhance
    )
    return await enhanced_image_service.generate_image(request)
cortex_image_service = enhanced_image_service
get_image_service = get_enhanced_image_service
cleanup_image_service = cleanup_enhanced_image_service

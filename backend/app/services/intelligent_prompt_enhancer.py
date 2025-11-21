import asyncio
import hashlib
import logging
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import structlog
from pydantic import BaseModel, Field

from app.services.openai_compatible_service import (
    OpenAICompatibleService,
    openai_compatible_service
)

logger = structlog.get_logger(__name__)

class PromptCategory(str, Enum):
    """Prompt kategorileri"""
    SPACE = "space"
    NATURE = "nature" 
    FANTASY = "fantasy"
    SCIFI = "scifi"
    REALISTIC = "realistic"
    ABSTRACT = "abstract"
    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"
    OBJECT = "object"
    ANIMAL = "animal"
    GENERAL = "general"

class PromptStyle(str, Enum):
    """Prompt stilleri"""
    PHOTOREALISTIC = "photorealistic"
    ARTISTIC = "artistic"
    CINEMATIC = "cinematic"
    FANTASY = "fantasy"
    MINIMALIST = "minimalist"
    VIBRANT = "vibrant"
    DARK = "dark"
    ETHEREAL = "ethereal"
    FUTURISTIC = "futuristic"
    VINTAGE = "vintage"

@dataclass
class PromptAnalysis:
    """Prompt analiz sonuçlarý"""
    original_input: str
    detected_category: PromptCategory
    detected_style: Optional[PromptStyle]
    key_elements: List[str]
    mood_descriptors: List[str]
    technical_aspects: List[str]
    confidence_score: float
    processing_time_ms: int

class PromptEnhancementRequest(BaseModel):
    """Prompt geliþtirme isteði"""
    user_input: str = Field(..., description="Kullanýcýnýn basit input'u")
    preferred_style: Optional[PromptStyle] = Field(default=None, description="Tercih edilen stil")
    creativity_level: float = Field(default=0.8, ge=0.0, le=1.0, description="Yaratýcýlýk seviyesi")
    detail_level: str = Field(default="medium", description="Detay seviyesi: low, medium, high")
    target_category: Optional[PromptCategory] = Field(default=None, description="Hedef kategori")
    include_technical: bool = Field(default=True, description="Teknik detaylar dahil edilsin mi")
    use_cache: bool = Field(default=True, description="Cache kullan")

class PromptEnhancementResponse(BaseModel):
    """Prompt geliþtirme yanýtý"""
    success: bool
    original_input: str
    enhanced_prompt: Optional[str] = None
    analysis: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None
    confidence_score: float = 0.0
    processing_time_ms: int = 0
    cached: bool = False
    error_message: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class IntelligentPromptEnhancer:
    """
    Akýllý Prompt Geliþtirme Servisi
    Grok-4-fast-reasoning ile prompt analizi ve geliþtirme
    """
    def __init__(self):
        self.chat_service = openai_compatible_service
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl_hours = 6  # 6 saatlik cache
        self.system_prompt = self._create_system_prompt()
        logger.info("Intelligent Prompt Enhancer initialized")

    def _create_system_prompt(self) -> str:
        """Sistem prompt'u oluþtur"""
        return """Sen uzman bir AI prompt mühendisisin. Görevin kullanýcýlarýn basit açýklamalarýný alýp, yüksek kaliteli resim üretimi için optimize edilmiþ detaylý promptlar oluþturmak.

KÝPLÝK KURALLARI:
1. Kullanýcýnýn input'unu analiz et ve ana kategorisini belirle
2. Görsel kaliteyi artýracak teknik detaylar ekle
3. Sanatsal ve estetik öðeleri geliþtir
4. Kompozisyon ve ýþýklandýrma öneriler
5. Resim kalitesini artýracak anahtar kelimeler kullan

PROMPT YAPISI:
- Ana konu açýklamasý
- Görsel stil ve atmosfer
- Teknik kalite belirteçleri
- Kompozisyon detaylarý
- Renk paleti önerileri
- Profesyonel fotoðraf/sanat terimleri

ÖRNEKLERÝ ÇIKARIMLARI YAKALA:
Basit: "kedi"
Geliþmiþ: "Majestic orange tabby cat with striking green eyes, sitting gracefully on a weathered wooden windowsill, soft natural lighting filtering through vintage lace curtains, shallow depth of field, professional pet photography, warm golden hour lighting, detailed fur texture, peaceful expression, cozy indoor atmosphere, canon 85mm lens aesthetic, high resolution, photorealistic"

Basit: "uzay"
Geliþmiþ: "Breathtaking deep space vista with swirling nebulae in vibrant purples and blues, distant galaxies scattered across the cosmic void, brilliant stars creating lens flares, ethereal cosmic dust clouds, sense of infinite scale and wonder, astrophotography style, ultra-high resolution, dramatic contrast between light and shadow, celestial beauty, Hubble telescope quality"

Yanýtýný SADECE aþaðýdaki JSON formatýnda ver, baþka bir þey yazma:
{
  "enhanced_prompt": "geliþtirilmiþ prompt",
  "analysis": {
    "category": "kategori",
    "style": "stil",
    "key_elements": ["öðe1", "öðe2"],
    "mood": ["ruh hali1", "ruh hali2"],
    "technical_aspects": ["teknik1", "teknik2"]
  },
  "confidence": 0.95,
  "suggestions": ["öneri1", "öneri2"]
}"""

    def _generate_cache_key(self, request: PromptEnhancementRequest) -> str:
        """Cache anahtarý oluþtur"""
        cache_data = f"{request.user_input}_{request.preferred_style}_{request.detail_level}_{request.creativity_level}"
        return hashlib.md5(cache_data.encode()).hexdigest()

    def _is_cache_valid(self, cache_key: str) -> bool:
        """Cache geçerliliði kontrolü"""
        if cache_key not in self.cache:
            return False
        cached_time = datetime.fromisoformat(self.cache[cache_key]['timestamp'])
        expiry_time = cached_time + timedelta(hours=self.cache_ttl_hours)
        return datetime.now() < expiry_time

    def _create_enhancement_prompt(self, request: PromptEnhancementRequest) -> str:
        """Geliþtirme prompt'u oluþtur"""
        user_prompt = f"""
Kullanýcý Input: "{request.user_input}"
Geliþtirme Parametreleri:
- Tercih edilen stil: {request.preferred_style or 'otomatik belirle'}
- Yaratýcýlýk seviyesi: {request.creativity_level}/1.0
- Detay seviyesi: {request.detail_level}
- Hedef kategori: {request.target_category or 'otomatik belirle'}
- Teknik detay: {'evet' if request.include_technical else 'hayýr'}

Bu input'u analiz edip yüksek kaliteli resim üretimi için optimize edilmiþ detaylý prompt oluþtur. Yanýtýný yukarýdaki JSON formatýnda ver.
"""
        return user_prompt.strip()

    async def enhance_prompt(self, request: PromptEnhancementRequest) -> PromptEnhancementResponse:
        """
        Ana prompt geliþtirme fonksiyonu
        """
        start_time = datetime.now()
        cache_key = self._generate_cache_key(request)

        try:
            if request.use_cache and self._is_cache_valid(cache_key):
                cached_result = self.cache[cache_key]
                logger.info(f"Cache hit for input: {request.user_input[:30]}...")
                return PromptEnhancementResponse(
                    success=True,
                    original_input=request.user_input,
                    enhanced_prompt=cached_result['enhanced_prompt'],
                    analysis=cached_result['analysis'],
                    suggestions=cached_result['suggestions'],
                    confidence_score=cached_result['confidence_score'],
                    processing_time_ms=0,
                    cached=True
                )

            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": self._create_enhancement_prompt(request)}
            ]
            
            logger.info(f"Enhancing prompt: {request.user_input[:50]}...")
            
            response_content = await self.chat_service.chat_completion(
                messages=messages,
                temperature=request.creativity_level,
                max_tokens=1500
            )

            if response_content:
                try:
                    cleaned_content = response_content.replace("```json", "").replace("```", "").strip()
                    
                    ai_response = json.loads(cleaned_content)
                    
                    enhanced_prompt = ai_response.get('enhanced_prompt')
                    analysis = ai_response.get('analysis', {})
                    suggestions = ai_response.get('suggestions', [])
                    confidence = ai_response.get('confidence', 0.8)
                    
                    processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
                    
                    success_response = PromptEnhancementResponse(
                        success=True,
                        original_input=request.user_input,
                        enhanced_prompt=enhanced_prompt,
                        analysis=analysis,
                        suggestions=suggestions,
                        confidence_score=confidence,
                        processing_time_ms=processing_time
                    )

                    if request.use_cache:
                        self.cache[cache_key] = {
                            'enhanced_prompt': enhanced_prompt,
                            'analysis': analysis,
                            'suggestions': suggestions,
                            'confidence_score': confidence,
                            'timestamp': datetime.now().isoformat()
                        }
                    
                    logger.info(f"Prompt enhanced successfully in {processing_time}ms")
                    logger.info(f"Confidence: {confidence:.2f}")
                    return success_response

                except json.JSONDecodeError as e:
                    logger.error(f"ERROR: JSON parse error: {str(e)}")
                    processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
                    return PromptEnhancementResponse(
                        success=True,
                        original_input=request.user_input,
                        enhanced_prompt=response_content,
                        confidence_score=0.7,
                        processing_time_ms=processing_time
                    )
            else:
                processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
                return PromptEnhancementResponse(
                    success=False,
                    original_input=request.user_input,
                    error_message="AI boþ yanýt döndürdü",
                    processing_time_ms=processing_time
                )

        except Exception as e:
            processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            logger.error(f"EXCEPTION: Prompt enhancement error: {str(e)}")
            return PromptEnhancementResponse(
                success=False,
                original_input=request.user_input,
                error_message=f"Beklenmeyen hata: {str(e)}",
                processing_time_ms=processing_time
            )

    async def quick_enhance(self, user_input: str, style: Optional[str] = None) -> str:
        """
        Hýzlý prompt geliþtirme
        """
        request = PromptEnhancementRequest(
            user_input=user_input,
            preferred_style=PromptStyle(style) if style else None,
            creativity_level=0.8,
            detail_level="medium"
        )
        response = await self.enhance_prompt(request)
        if response.success and response.enhanced_prompt:
            return response.enhanced_prompt
        else:
            return f"High quality, detailed image of {user_input}, professional photography, best quality, ultra-realistic, 8k resolution"

    async def batch_enhance(self, inputs: List[str]) -> List[PromptEnhancementResponse]:
        """
        Toplu prompt geliþtirme
        """
        tasks = []
        for user_input in inputs:
            request = PromptEnhancementRequest(user_input=user_input)
            tasks.append(self.enhance_prompt(request))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(
                    PromptEnhancementResponse(
                        success=False,
                        original_input=inputs[i],
                        error_message=str(result)
                    )
                )
            else:
                processed_results.append(result)
        return processed_results

    def get_prompt_examples(self) -> Dict[str, Dict[str, str]]:
        """
        Örnek promptlar
        """
        return {
            "space": {
                "simple": "uzay",
                "enhanced": "Breathtaking deep space vista with swirling nebulae in vibrant purples and blues, distant galaxies scattered across the cosmic void, brilliant stars creating lens flares, ethereal cosmic dust clouds, sense of infinite scale and wonder, astrophotography style, ultra-high resolution, dramatic contrast between light and shadow, celestial beauty, Hubble telescope quality"
            },
            "animal": {
                "simple": "kedi", 
                "enhanced": "Majestic orange tabby cat with striking green eyes, sitting gracefully on a weathered wooden windowsill, soft natural lighting filtering through vintage lace curtains, shallow depth of field, professional pet photography, warm golden hour lighting, detailed fur texture, peaceful expression, cozy indoor atmosphere, canon 85mm lens aesthetic, high resolution, photorealistic"
            },
            "nature": {
                "simple": "orman",
                "enhanced": "Enchanting misty forest scene with towering ancient trees, dappled sunlight filtering through emerald canopy, moss-covered fallen logs, delicate wildflowers scattered on forest floor, ethereal fog weaving between trunks, magical atmosphere, professional landscape photography, rich earth tones, peaceful serenity, ultra-detailed, cinematic lighting"
            },
            "fantasy": {
                "simple": "ejder",
                "enhanced": "Magnificent ancient dragon with iridescent scales reflecting rainbow hues, powerful wings spread majestically against storm clouds, fierce intelligent eyes glowing with inner fire, perched on crystalline mountain peak, lightning crackling in background, fantasy art masterpiece, dramatic lighting, epic composition, ultra-detailed scales and textures, mythical creature, digital painting style"
            }
        }

    def clear_cache(self) -> int:
        """Cache temizle"""
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cleared {count} cached prompts")
        return count

    def get_cache_stats(self) -> Dict[str, Any]:
        """Cache istatistikleri"""
        return {
            "cached_prompts": len(self.cache),
            "cache_ttl_hours": self.cache_ttl_hours,
            "supported_categories": [cat.value for cat in PromptCategory],
            "supported_styles": [style.value for style in PromptStyle]
        }

intelligent_prompt_enhancer = IntelligentPromptEnhancer()

async def get_prompt_enhancer() -> IntelligentPromptEnhancer:
    """Dependency injection için servis instance"""
    return intelligent_prompt_enhancer

async def enhance_user_prompt(user_input: str, style: Optional[str] = None) -> str:
    """Hýzlý prompt geliþtirme fonksiyonu"""
    return await intelligent_prompt_enhancer.quick_enhance(user_input, style)

def get_available_styles() -> List[str]:
    """Mevcut stilleri listele"""
    return [style.value for style in PromptStyle]

def get_available_categories() -> List[str]:
    """Mevcut kategorileri listele"""
    return [cat.value for cat in PromptCategory]

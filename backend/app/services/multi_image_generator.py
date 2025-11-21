import asyncio
import hashlib
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ThreadPoolExecutor
import structlog
from pydantic import BaseModel, Field
from app.services.image_generation_service import (
    EnhancedImageService,
    ImageGenerationRequest,
    ImageGenerationResponse,
    get_enhanced_image_service
)
from app.services.intelligent_prompt_enhancer import (
    IntelligentPromptEnhancer,
    PromptEnhancementRequest,
    PromptStyle,
    PromptCategory,
    get_prompt_enhancer
)
from app.services.openai_compatible_service import (
    OpenAICompatibleService,
    openai_compatible_service
)
from app.services.advanced_prompt_composer import (
    AdvancedPromptComposer,
    get_advanced_composer
)
from app.services.performance_optimizer import (
    PerformanceOptimizer,
    GenerationSlotManager,
    get_performance_optimizer,
    with_performance_monitoring
)
logger = structlog.get_logger(__name__)
class ContentType(str, Enum):
    """Ýçerik türleri"""
    SCIENTIFIC = "scientific"
    ARTISTIC = "artistic"
    EDUCATIONAL = "educational"
    COMMERCIAL = "commercial"
    NARRATIVE = "narrative"
    TECHNICAL = "technical"
    SPACE = "space"
    NATURE = "nature"
    ABSTRACT = "abstract"
    DOCUMENTARY = "documentary"
class ImagePurpose(str, Enum):
    """Görsel amacý"""
    HERO = "hero"  # Ana görsel
    DETAIL = "detail"  # Detay görseli
    CONTEXT = "context"  # Baðlam görseli
    ARTISTIC = "artistic"  # Sanatsal görsel
class CompositionStyle(str, Enum):
    """Kompozisyon stileri"""
    CINEMATIC = "cinematic"
    DOCUMENTARY = "documentary"
    ARTISTIC = "artistic"
    SCIENTIFIC = "scientific"
    COMMERCIAL = "commercial"
    EDITORIAL = "editorial"
@dataclass
class ContentAnalysis:
    """Ýçerik analiz sonuçlarý"""
    main_theme: str
    content_type: ContentType
    key_concepts: List[str]
    visual_elements: List[str]
    mood_descriptors: List[str]
    technical_aspects: List[str]
    target_audience: str
    complexity_level: str
    suggested_compositions: List[CompositionStyle]
    confidence_score: float
class MultiImageRequest(BaseModel):
    """Çoklu görsel üretim isteði"""
    content: str = Field(..., description="Ana içerik/metin")
    content_type: Optional[ContentType] = Field(default=None, description="Ýçerik türü")
    target_audience: str = Field(default="general", description="Hedef kitle")
    visual_style: Optional[PromptStyle] = Field(default=None, description="Görsel stil")
    composition_style: Optional[CompositionStyle] = Field(default=None, description="Kompozisyon stili")
    creativity_level: float = Field(default=0.8, ge=0.0, le=1.0, description="Yaratýcýlýk seviyesi")
    quality_level: str = Field(default="high", description="Kalite seviyesi")
    image_count: int = Field(default=4, ge=1, le=8, description="Üretilecek görsel sayýsý")
    include_variations: bool = Field(default=True, description="Varyasyonlar dahil edilsin mi")
    professional_grade: bool = Field(default=True, description="Profesyonel kalite")
    context_aware: bool = Field(default=True, description="Baðlam farkýndalýðý")
class GeneratedImageInfo(BaseModel):
    """Üretilen görsel bilgisi"""
    image_url: str
    title: str
    description: str
    purpose: ImagePurpose
    style_applied: str
    composition_elements: List[str]
    technical_details: Dict[str, Any]
    generation_time_ms: int
    enhancement_applied: bool
    original_prompt: str
    enhanced_prompt: str
class MultiImageResponse(BaseModel):
    """Çoklu görsel üretim yanýtý"""
    success: bool
    content_analysis: Optional[Dict[str, Any]] = None
    generated_images: List[GeneratedImageInfo] = Field(default_factory=list)
    total_images: int = 0
    successful_generations: int = 0
    failed_generations: int = 0
    total_processing_time_ms: int = 0
    average_generation_time_ms: int = 0
    quality_metrics: Dict[str, Any] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
class MultiImageGenerator:
    """
    Kapsamlý AI-tabanlý çoklu görsel üretim sistemi
    """
    def __init__(self):
        self.image_service: Optional[EnhancedImageService] = None
        self.prompt_enhancer: Optional[IntelligentPromptEnhancer] = None
        self.advanced_composer: Optional[AdvancedPromptComposer] = None
        self.performance_optimizer: Optional[PerformanceOptimizer] = None
        self.chat_service = openai_compatible_service
        self.professional_styles = {
            ImagePurpose.HERO: [
                "cinematic masterpiece, dramatic lighting, professional composition",
                "award-winning photography, perfect exposure, stunning visual impact",
                "high-end commercial quality, artistic excellence, visual storytelling"
            ],
            ImagePurpose.DETAIL: [
                "macro photography excellence, intricate details, professional close-up",
                "ultra-sharp focus, precise lighting, technical perfection",
                "documentary photography style, authentic detail capture"
            ],
            ImagePurpose.CONTEXT: [
                "environmental context, atmospheric perspective, cinematic depth",
                "wide angle composition, contextual storytelling, professional landscape",
                "establishing shot quality, cinematic framing, visual narrative"
            ],
            ImagePurpose.ARTISTIC: [
                "fine art photography, creative interpretation, artistic vision",
                "conceptual artistry, innovative composition, gallery-worthy quality",
                "abstract artistic expression, creative excellence, unique perspective"
            ]
        }
        self.composition_techniques = {
            CompositionStyle.CINEMATIC: [
                "rule of thirds, cinematic aspect ratio, dramatic depth of field",
                "leading lines, dynamic composition, film-like quality",
                "color grading excellence, cinematic lighting, movie poster quality"
            ],
            CompositionStyle.DOCUMENTARY: [
                "authentic documentation, natural lighting, journalistic quality",
                "candid photography style, real-world authenticity, storytelling focus",
                "documentary excellence, honest representation, factual visual narrative"
            ],
            CompositionStyle.SCIENTIFIC: [
                "scientific accuracy, educational clarity, technical precision",
                "research-quality imagery, factual representation, analytical perspective",
                "scientific visualization, data-driven imagery, academic excellence"
            ],
            CompositionStyle.COMMERCIAL: [
                "commercial photography excellence, product-focused lighting, marketing quality",
                "brand-worthy imagery, professional commercial style, high-end production",
                "advertising photography quality, perfect presentation, commercial appeal"
            ]
        }
        self.analysis_cache: Dict[str, ContentAnalysis] = {}
        self.cache_ttl_hours = 4
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "total_images_generated": 0,
            "average_batch_time_ms": 0,
            "cache_hits": 0,
            "content_analysis_count": 0
        }
        logger.info("Multi-Image Generator initialized with professional composition system")
    async def initialize(self):
        """Servisleri initialize et"""
        self.image_service = await get_enhanced_image_service()
        self.prompt_enhancer = await get_prompt_enhancer()
        self.advanced_composer = await get_advanced_composer()
        self.performance_optimizer = await get_performance_optimizer()
        logger.info("Multi-Image Generator services initialized with advanced composition and performance optimization")
    async def analyze_content(self, content: str, content_type: Optional[ContentType] = None) -> ContentAnalysis:
        """
        Ýçeriði AI ile analiz et ve görsel konseptlerini belirle
        """
        cache_key = hashlib.md5(f"{content}_{content_type}".encode()).hexdigest()
        if cache_key in self.analysis_cache:
            cached_analysis = self.analysis_cache[cache_key]
            if hasattr(cached_analysis, '_cached_at'):
                if datetime.now() - cached_analysis._cached_at < timedelta(hours=self.cache_ttl_hours):
                    self.metrics["cache_hits"] += 1
                    logger.info("Content analysis cache hit")
                    return cached_analysis
        try:
            analysis_prompt = self._create_content_analysis_prompt(content, content_type)
            messages = [
                ChatMessage(role=MessageRole.SYSTEM, content=self._get_analysis_system_prompt()),
                ChatMessage(role=MessageRole.USER, content=analysis_prompt)
            ]
            chat_request = EnhancedChatRequest(
                messages=messages,
                model=ModelType.GROK_4_FAST_REASONING,
                temperature=0.7,
                max_tokens=2000
            )
            logger.info(f"Analyzing content: {content[:50]}...")
            response = await self.chat_service.chat_completion(chat_request)
            if response.success and response.content:
                try:
                    analysis_data = json.loads(response.content)
                    content_analysis = ContentAnalysis(
                        main_theme=analysis_data.get('main_theme', 'General'),
                        content_type=ContentType(analysis_data.get('content_type', 'general')),
                        key_concepts=analysis_data.get('key_concepts', []),
                        visual_elements=analysis_data.get('visual_elements', []),
                        mood_descriptors=analysis_data.get('mood_descriptors', []),
                        technical_aspects=analysis_data.get('technical_aspects', []),
                        target_audience=analysis_data.get('target_audience', 'general'),
                        complexity_level=analysis_data.get('complexity_level', 'medium'),
                        suggested_compositions=[CompositionStyle(style) for style in analysis_data.get('suggested_compositions', ['cinematic'])],
                        confidence_score=analysis_data.get('confidence_score', 0.8)
                    )
                    content_analysis._cached_at = datetime.now()
                    self.analysis_cache[cache_key] = content_analysis
                    self.metrics["content_analysis_count"] += 1
                    logger.info(f"Content analysis completed with confidence: {content_analysis.confidence_score:.2f}")
                    return content_analysis
                except json.JSONDecodeError:
                    logger.warning("Failed to parse content analysis JSON, using fallback")
            return self._create_fallback_analysis(content, content_type)
        except Exception as e:
            logger.error(f"Content analysis error: {str(e)}")
            return self._create_fallback_analysis(content, content_type)
    def _get_analysis_system_prompt(self) -> str:
        """Ýçerik analizi sistem prompt'u"""
        return """Sen uzman bir görsel konsept analisti ve yaratýcý direktörüsün. Görevin verilen içeriði analiz edip, profesyonel kalitede görsel üretimi için detaylý konseptler oluþturmak.
GÖREV:
1. Ana temayý belirle
2. Ýçerik türünü kategorize et
3. Anahtar kavramlarý çýkar
4. Görsel öðeleri tanýmla
5. Ruh hali ve atmosferi belirle
6. Teknik gereksinimleri listele
7. Hedef kitleyi analiz et
8. Kompozisyon önerilerini sun
Ýçerik Türleri: scientific, artistic, educational, commercial, narrative, technical, space, nature, abstract, documentary
Kompozisyon Stilleri: cinematic, documentary, artistic, scientific, commercial, editorial
Yanýtýný þu JSON formatýnda ver:
{
  "main_theme": "ana tema",
  "content_type": "içerik türü",
  "key_concepts": ["kavram1", "kavram2", "kavram3"],
  "visual_elements": ["görsel öðe1", "görsel öðe2"],
  "mood_descriptors": ["ruh hali1", "ruh hali2"],
  "technical_aspects": ["teknik gereksinim1", "teknik gereksinim2"],
  "target_audience": "hedef kitle",
  "complexity_level": "basit/orta/karmaþýk",
  "suggested_compositions": ["stil1", "stil2"],
  "confidence_score": 0.95
}"""
    def _create_content_analysis_prompt(self, content: str, content_type: Optional[ContentType]) -> str:
        """Ýçerik analiz prompt'u oluþtur"""
        return f"""
Aþaðýdaki içeriði analiz et ve profesyonel görsel üretimi için detaylý konseptler oluþtur:
ÝÇERÝK: "{content}"
{f"Belirtilen Ýçerik Türü: {content_type.value}" if content_type else "Ýçerik Türü: Otomatik belirle"}
Bu içeriði kapsamlý bir þekilde analiz et ve 4 farklý profesyonel görsel için gerekli tüm bilgileri saðla.
Görsel üretiminde kullanýlacak anahtar kavramlarý, atmosferi, teknik gereksinimleri ve kompozisyon önerilerini detaylandýr.
"""
    def _create_fallback_analysis(self, content: str, content_type: Optional[ContentType]) -> ContentAnalysis:
        """Fallback içerik analizi"""
        return ContentAnalysis(
            main_theme="General Content",
            content_type=content_type or ContentType.ARTISTIC,
            key_concepts=content.split()[:5],
            visual_elements=["composition", "lighting", "color"],
            mood_descriptors=["professional", "high-quality"],
            technical_aspects=["high-resolution", "detailed"],
            target_audience="general",
            complexity_level="medium",
            suggested_compositions=[CompositionStyle.CINEMATIC, CompositionStyle.ARTISTIC],
            confidence_score=0.6
        )
    async def generate_prompt_variations(self, base_analysis: ContentAnalysis, 
                                       image_count: int = 4) -> List[Tuple[str, ImagePurpose, str]]:
        """
        Ýçerik analizine göre çeþitli prompt varyasyonlarý oluþtur
        """
        try:
            image_purposes = [ImagePurpose.HERO, ImagePurpose.DETAIL, ImagePurpose.CONTEXT, ImagePurpose.ARTISTIC]
            if image_count > 4:
                image_purposes.extend([ImagePurpose.HERO, ImagePurpose.DETAIL] * ((image_count - 4) // 2 + 1))
            prompts = []
            for i, purpose in enumerate(image_purposes[:image_count]):
                base_prompt = self._create_purpose_specific_prompt(base_analysis, purpose, i)
                enhanced_prompt = await self._enhance_with_professional_techniques(
                    base_prompt, purpose, base_analysis.suggested_compositions[0] if base_analysis.suggested_compositions else CompositionStyle.CINEMATIC
                )
                prompts.append((enhanced_prompt, purpose, f"Professional {purpose.value} image"))
                logger.info(f"Generated {purpose.value} prompt: {enhanced_prompt[:60]}...")
            return prompts
        except Exception as e:
            logger.error(f"Prompt variation generation error: {str(e)}")
            return [(f"Professional high-quality image of {base_analysis.main_theme}", ImagePurpose.HERO, "Hero image")] * image_count
    def _create_purpose_specific_prompt(self, analysis: ContentAnalysis, purpose: ImagePurpose, index: int) -> str:
        """Purpose'a özel prompt oluþtur"""
        base_elements = {
            "theme": analysis.main_theme,
            "key_concepts": ", ".join(analysis.key_concepts[:3]),
            "mood": ", ".join(analysis.mood_descriptors[:2]),
            "visual_elements": ", ".join(analysis.visual_elements[:3])
        }
        purpose_templates = {
            ImagePurpose.HERO: f"Magnificent {base_elements['theme']} featuring {base_elements['key_concepts']}, {base_elements['mood']} atmosphere, {base_elements['visual_elements']}, epic composition",
            ImagePurpose.DETAIL: f"Intricate close-up detail of {base_elements['key_concepts']} from {base_elements['theme']}, {base_elements['mood']} lighting, {base_elements['visual_elements']}, macro photography excellence",
            ImagePurpose.CONTEXT: f"Wide contextual view of {base_elements['theme']} environment, {base_elements['key_concepts']} in natural setting, {base_elements['mood']} atmosphere, {base_elements['visual_elements']}, environmental storytelling",
            ImagePurpose.ARTISTIC: f"Artistic interpretation of {base_elements['theme']}, creative visualization of {base_elements['key_concepts']}, {base_elements['mood']} artistic mood, {base_elements['visual_elements']}, fine art quality"
        }
        return purpose_templates.get(purpose, base_elements['theme'])
    async def _enhance_with_professional_techniques(self, base_prompt: str, purpose: ImagePurpose,
                                                  composition_style: CompositionStyle) -> str:
        """Professional fotoðrafçýlýk teknikleri ile enhance et - Advanced Composer kullanarak"""
        try:
            if self.advanced_composer:
                enhancement_result = await self.advanced_composer.enhance_with_advanced_composition(
                    user_input=base_prompt,
                    style_preference=composition_style.value,
                    creativity_level=0.8,
                    quality_level="high"
                )
                if enhancement_result.get("success"):
                    logger.info(f"Advanced composition applied to {purpose.value} image")
                    return enhancement_result["enhanced_prompt"]
            professional_elements = self.professional_styles.get(purpose, ["professional quality"])
            composition_elements = self.composition_techniques.get(composition_style, ["professional composition"])
            quality_terms = [
                "ultra-high resolution", "professional photography", "award-winning quality",
                "perfect composition", "studio lighting", "color accuracy", "sharp focus",
                "professional equipment", "expert technique", "commercial grade"
            ]
            enhanced_prompt = f"{base_prompt}, {professional_elements[0]}, {composition_elements[0]}, {', '.join(quality_terms[:3])}"
            return enhanced_prompt
        except Exception as e:
            logger.error(f"Advanced enhancement error: {str(e)}, using fallback")
            return f"{base_prompt}, professional photography, high quality, award-winning composition"
    async def generate_multiple_images(self, request: MultiImageRequest) -> MultiImageResponse:
        """
        Ana çoklu görsel üretim fonksiyonu - Performance Optimized
        """
        start_time = datetime.now()
        self.metrics["total_requests"] += 1
        try:
            if not self.image_service:
                await self.initialize()
            if self.performance_optimizer:
                async with GenerationSlotManager(self.performance_optimizer):
                    logger.info(f"Starting optimized multi-image generation for: {request.content[:50]}...")
                    return await self._generate_with_monitoring(request, start_time)
            else:
                logger.info(f"Starting multi-image generation for: {request.content[:50]}...")
                return await self._generate_with_monitoring(request, start_time)
        except Exception as e:
            if self.performance_optimizer:
                self.performance_optimizer.record_error()
            return await self._handle_generation_error(e, request, start_time)
    async def _generate_with_monitoring(self, request: MultiImageRequest, start_time: datetime) -> MultiImageResponse:
        """Performance monitoring ile görsel üretimi"""
        try:
            content_analysis = await self.analyze_content(request.content, request.content_type)
            logger.info(f"Content analysis completed - Theme: {content_analysis.main_theme}, Confidence: {content_analysis.confidence_score:.2f}")
            prompt_variations = await self.generate_prompt_variations(content_analysis, request.image_count)
            logger.info(f"Generated {len(prompt_variations)} prompt variations")
            generation_tasks = []
            for i, (enhanced_prompt, purpose, description) in enumerate(prompt_variations):
                image_request = ImageGenerationRequest(
                    prompt=enhanced_prompt,
                    model="imagen-4.0-ultra-generate-preview-06-06",
                    style=request.visual_style.value if request.visual_style else None,
                    size="1024x1024",
                    enhance_prompt=False,  # Already enhanced
                    creativity_level=request.creativity_level,
                    detail_level=request.quality_level,
                    context={
                        "content_analysis": content_analysis.__dict__,
                        "purpose": purpose.value,
                        "batch_index": i
                    }
                )
                task = self._generate_single_image_with_metadata(
                    image_request, purpose, description, enhanced_prompt
                )
                generation_tasks.append(task)
            if self.performance_optimizer:
                self.performance_optimizer.record_generation_start()
            logger.info(f"Starting parallel generation of {len(generation_tasks)} images...")
            results = await asyncio.gather(*generation_tasks, return_exceptions=True)
            if self.performance_optimizer:
                self.performance_optimizer.record_generation_complete()
            generated_images = []
            successful_generations = 0
            failed_generations = 0
            total_generation_time = 0
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Image {i+1} generation failed: {str(result)}")
                    failed_generations += 1
                elif result and result.get('success'):
                    generated_images.append(result)
                    successful_generations += 1
                    total_generation_time += result.get('generation_time_ms', 0)
                else:
                    failed_generations += 1
            total_processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
            average_generation_time = int(total_generation_time / successful_generations) if successful_generations > 0 else 0
            self.metrics["successful_requests"] += 1 if successful_generations > 0 else 0
            self.metrics["total_images_generated"] += successful_generations
            if self.performance_optimizer:
                self.performance_optimizer.record_request(total_processing_time / 1000.0)
            quality_metrics = self._calculate_quality_metrics(generated_images, content_analysis)
            suggestions = self._generate_suggestions(content_analysis, successful_generations, failed_generations)
            response = MultiImageResponse(
                success=successful_generations > 0,
                content_analysis=content_analysis.__dict__,
                generated_images=generated_images,
                total_images=len(prompt_variations),
                successful_generations=successful_generations,
                failed_generations=failed_generations,
                total_processing_time_ms=total_processing_time,
                average_generation_time_ms=average_generation_time,
                quality_metrics=quality_metrics,
                suggestions=suggestions
            )
            logger.info(f"Multi-image generation completed: {successful_generations}/{len(prompt_variations)} successful in {total_processing_time}ms")
            return response
        except Exception as e:
            error_msg = f"Multi-image generation error: {str(e)}"
            logger.error(error_msg)
            return MultiImageResponse(
                success=False,
                error_message=error_msg,
                total_processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
            )
    async def _handle_generation_error(self, error: Exception, request: MultiImageRequest, start_time: datetime) -> MultiImageResponse:
        """Hata durumlarýný handle eder"""
        self.metrics["total_requests"] += 1  # Hatalý da olsa request sayýsýna dahil
        logger.error(f"Multi-image generation failed: {str(error)}")
        return MultiImageResponse(
            success=False,
            error_message=str(error),
            total_processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
        )
    async def _generate_single_image_with_metadata(self, image_request: ImageGenerationRequest,
                                                 purpose: ImagePurpose, description: str,
                                                 original_prompt: str) -> Optional[GeneratedImageInfo]:
        """Tek görsel üret ve metadata ile birlikte döndür"""
        try:
            start_time = datetime.now()
            response = await self.image_service.generate_image(image_request)
            generation_time = int((datetime.now() - start_time).total_seconds() * 1000)
            if response.success and response.image_url:
                return GeneratedImageInfo(
                    image_url=response.image_url,
                    title=f"Professional {purpose.value.title()} Image",
                    description=description,
                    purpose=purpose,
                    style_applied=image_request.style or "professional",
                    composition_elements=self._extract_composition_elements(image_request.prompt),
                    technical_details={
                        "model": response.model_used,
                        "size": image_request.size,
                        "creativity_level": image_request.creativity_level,
                        "detail_level": image_request.detail_level,
                        "enhancement_applied": response.enhanced_prompt is not None
                    },
                    generation_time_ms=generation_time,
                    enhancement_applied=response.enhanced_prompt is not None,
                    original_prompt=original_prompt,
                    enhanced_prompt=response.enhanced_prompt or image_request.prompt
                )
            else:
                logger.error(f"Image generation failed for {purpose.value}: {response.error_message}")
                return None
        except Exception as e:
            logger.error(f"Single image generation error for {purpose.value}: {str(e)}")
            return None
    def _extract_composition_elements(self, prompt: str) -> List[str]:
        """Prompt'tan kompozisyon öðelerini çýkar"""
        composition_keywords = [
            "cinematic", "dramatic", "professional", "composition", "lighting",
            "depth of field", "rule of thirds", "leading lines", "symmetry",
            "contrast", "color grading", "perspective", "framing"
        ]
        found_elements = []
        prompt_lower = prompt.lower()
        for keyword in composition_keywords:
            if keyword in prompt_lower:
                found_elements.append(keyword)
        return found_elements[:5]  # Ýlk 5 öðe
    def _calculate_quality_metrics(self, generated_images: List[GeneratedImageInfo], 
                                 content_analysis: ContentAnalysis) -> Dict[str, Any]:
        """Kalite metrikleri hesapla"""
        if not generated_images:
            return {"overall_quality_score": 0.0}
        total_score = 0.0
        enhancement_usage = 0
        avg_generation_time = 0
        for img in generated_images:
            if img.enhancement_applied:
                enhancement_usage += 1
            avg_generation_time += img.generation_time_ms
            composition_score = min(1.0, len(img.composition_elements) / 3.0)
            image_score = (composition_score + content_analysis.confidence_score) / 2.0
            total_score += image_score
        return {
            "overall_quality_score": total_score / len(generated_images),
            "enhancement_usage_rate": enhancement_usage / len(generated_images),
            "average_generation_time_ms": int(avg_generation_time / len(generated_images)),
            "content_analysis_confidence": content_analysis.confidence_score,
            "successful_image_count": len(generated_images),
            "composition_complexity": sum(len(img.composition_elements) for img in generated_images) / len(generated_images)
        }
    def _generate_suggestions(self, content_analysis: ContentAnalysis,
                            successful: int, failed: int) -> List[str]:
        """Ýyileþtirme önerileri oluþtur"""
        suggestions = []
        if content_analysis.confidence_score < 0.7:
            suggestions.append("Consider providing more specific content description for better analysis")
        if failed > 0:
            suggestions.append(f"{failed} images failed to generate - consider adjusting creativity level or style")
        if successful == 4:
            suggestions.append("All images generated successfully! Consider trying different styles for variety")
        suggestions.extend([
            "Use specific visual styles (photorealistic, artistic, cinematic) for different effects",
            "Adjust creativity level: lower for consistent results, higher for unique variations",
            "Professional grade mode ensures commercial-quality results",
            "Try different composition styles for various use cases"
        ])
        return suggestions[:4]  # En fazla 4 öneri
    def get_service_stats(self) -> Dict[str, Any]:
        """Servis istatistikleri"""
        return {
            **self.metrics,
            "cache_size": len(self.analysis_cache),
            "supported_content_types": [ct.value for ct in ContentType],
            "supported_purposes": [ip.value for ip in ImagePurpose],
            "supported_compositions": [cs.value for cs in CompositionStyle],
            "professional_styles_count": sum(len(styles) for styles in self.professional_styles.values()),
            "composition_techniques_count": sum(len(techs) for techs in self.composition_techniques.values())
        }
    async def cleanup(self):
        """Temizlik iþlemleri"""
        self.analysis_cache.clear()
        if self.image_service:
            await self.image_service.cleanup()
multi_image_generator = MultiImageGenerator()
async def get_multi_image_service() -> MultiImageGenerator:
    """Dependency injection için service instance"""
    return multi_image_generator
async def cleanup_multi_image_service():
    """App shutdown için temizlik"""
    await multi_image_generator.cleanup()

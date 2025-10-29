"""
🌍 EONET AI Image Generator Service
EONET doğal olayları için otomatik AI görsel üretimi
Yangın, deprem, volkan vs. olayları için bağlamsal görseller
"""

import asyncio
import hashlib
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import structlog
from pydantic import BaseModel, Field

from app.services.multi_image_generator import (
    MultiImageGenerator,
    MultiImageRequest,
    ContentType,
    CompositionStyle,
    get_multi_image_service
)
from app.services.intelligent_prompt_enhancer import PromptStyle
from app.models.earth_event import (
    SimpleEarthEventModel,
    EARTH_EVENT_CATEGORIES,
    categorize_earth_event
)

logger = structlog.get_logger(__name__)

class EventImagePurpose(str, Enum):
    """EONET event image purposes"""
    DISASTER_OVERVIEW = "disaster_overview"  # Genel felaket görünümü
    ENVIRONMENTAL_IMPACT = "environmental_impact"  # Çevresel etki
    SCIENTIFIC_ANALYSIS = "scientific_analysis"  # Bilimsel analiz
    NEWS_COVERAGE = "news_coverage"  # Haber kapsamı

class EventSeverityLevel(str, Enum):
    """Event severity levels for image styling"""
    LOW = "low"
    MODERATE = "moderate" 
    HIGH = "high"
    EXTREME = "extreme"

@dataclass
class EONETEventContext:
    """EONET event context for AI image generation"""
    event_id: str
    title: str
    category: str
    location: Optional[str]
    coordinates: Optional[Dict[str, float]]
    severity: EventSeverityLevel
    date: str
    description: Optional[str]
    environmental_keywords: List[str]
    geographical_context: List[str]
    urgency_level: str

class EONETImageRequest(BaseModel):
    """EONET event image generation request"""
    event_context: Dict[str, Any] = Field(..., description="EONET event context")
    image_purposes: List[EventImagePurpose] = Field(default_factory=lambda: [
        EventImagePurpose.DISASTER_OVERVIEW,
        EventImagePurpose.ENVIRONMENTAL_IMPACT,
        EventImagePurpose.SCIENTIFIC_ANALYSIS,
        EventImagePurpose.NEWS_COVERAGE
    ])
    quality_level: str = Field(default="high", description="Image quality level")
    include_location_context: bool = Field(default=True, description="Include geographical context")
    emergency_style: bool = Field(default=False, description="Use emergency/urgent styling")

class EONETImageResult(BaseModel):
    """EONET generated image result"""
    event_id: str
    purpose: EventImagePurpose
    image_url: str
    title: str
    description: str
    prompt_used: str
    geographical_context: str
    severity_indicator: str
    generation_time_ms: int
    metadata: Dict[str, Any] = Field(default_factory=dict)

class EONETImageResponse(BaseModel):
    """EONET image generation response"""
    success: bool
    event_id: str
    event_title: str
    generated_images: List[EONETImageResult] = Field(default_factory=list)
    total_images: int = 0
    successful_generations: int = 0
    failed_generations: int = 0
    total_processing_time_ms: int = 0
    event_context: Dict[str, Any] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None

class EONETAIImageGenerator:
    """
    EONET AI Image Generator
    Doğal olaylar için bağlamsal AI görsel üretimi
    """
    
    def __init__(self):
        self.multi_image_generator: Optional[MultiImageGenerator] = None
        
        # EONET event kategorileri için stil ayarları
        self.category_styles = {
            "Wildfires": {
                "style": PromptStyle.PHOTOREALISTIC,
                "composition": CompositionStyle.DOCUMENTARY,
                "keywords": ["fire", "smoke", "forest fire", "wildfire", "burning", "evacuation"],
                "environmental_context": ["forest", "vegetation", "wildlife", "air quality", "smoke plumes"],
                "color_palette": "warm, orange, red, smoke gray",
                "urgency_level": "high"
            },
            "Volcanoes": {
                "style": PromptStyle.CINEMATIC,
                "composition": CompositionStyle.CINEMATIC,
                "keywords": ["volcano", "eruption", "lava", "ash cloud", "magma", "geological"],
                "environmental_context": ["volcanic landscape", "lava flows", "ash dispersal", "atmospheric effects"],
                "color_palette": "dramatic red, orange, dark volcanic ash",
                "urgency_level": "extreme"
            },
            "Earthquakes": {
                "style": PromptStyle.PHOTOREALISTIC,
                "composition": CompositionStyle.SCIENTIFIC,
                "keywords": ["earthquake", "seismic", "building damage", "geological fracture", "tectonic"],
                "environmental_context": ["urban damage", "infrastructure impact", "geological features"],
                "color_palette": "realistic, documentary colors",
                "urgency_level": "high"
            },
            "Severe Storms": {
                "style": PromptStyle.CINEMATIC,
                "composition": CompositionStyle.CINEMATIC,
                "keywords": ["storm", "hurricane", "tornado", "severe weather", "wind damage", "flooding"],
                "environmental_context": ["storm clouds", "wind effects", "precipitation", "atmospheric disturbance"],
                "color_palette": "dark storm grays, dramatic lighting",
                "urgency_level": "high"
            },
            "Floods": {
                "style": PromptStyle.PHOTOREALISTIC,
                "composition": CompositionStyle.DOCUMENTARY,
                "keywords": ["flood", "flooding", "water damage", "inundation", "rescue operations"],
                "environmental_context": ["flooded areas", "water levels", "affected infrastructure"],
                "color_palette": "water blues, muddy browns, realistic tones",
                "urgency_level": "high"
            },
            "Drought": {
                "style": PromptStyle.ARTISTIC,
                "composition": CompositionStyle.EDITORIAL,
                "keywords": ["drought", "dry landscape", "water scarcity", "agricultural impact", "desert"],
                "environmental_context": ["arid landscape", "water reservoirs", "agricultural areas"],
                "color_palette": "dry earth tones, muted colors",
                "urgency_level": "moderate"
            },
            "Dust and Haze": {
                "style": PromptStyle.ETHEREAL,
                "composition": CompositionStyle.ARTISTIC,
                "keywords": ["dust storm", "haze", "air pollution", "visibility reduction", "atmospheric"],
                "environmental_context": ["dust clouds", "atmospheric conditions", "air quality"],
                "color_palette": "dusty yellows, hazy atmosphere",
                "urgency_level": "moderate"
            }
        }
        
        # Cache for generated images
        self.image_cache: Dict[str, EONETImageResponse] = {}
        self.cache_ttl_hours = 2
        
        logger.info("EONET AI Image Generator initialized")
    
    async def initialize(self):
        """Initialize multi-image generator service"""
        self.multi_image_generator = await get_multi_image_service()
        logger.info("EONET AI Image Generator services initialized")
    
    def _extract_event_context(self, event_data: Dict[str, Any]) -> EONETEventContext:
        """Extract context from EONET event data"""
        try:
            # Temel bilgiler
            event_id = event_data.get("id", "unknown")
            title = event_data.get("title", "Unknown Event")
            
            # Kategori bilgisi
            category = "Unknown"
            if event_data.get("categories") and len(event_data["categories"]) > 0:
                category = event_data["categories"][0].get("title", "Unknown")
            
            # Konum bilgisi
            location = None
            coordinates = None
            geographical_context = []
            
            if event_data.get("geometry") and len(event_data["geometry"]) > 0:
                geom = event_data["geometry"][-1]  # En son konum
                if geom.get("coordinates"):
                    coords = geom["coordinates"]
                    if isinstance(coords, list) and len(coords) >= 2:
                        coordinates = {"lat": coords[1], "lon": coords[0]}
                        location = f"{coords[1]:.2f}, {coords[0]:.2f}"
                        
                        # Coğrafi bağlam çıkar
                        geographical_context = self._get_geographical_context(coords[1], coords[0])
            
            # Önem derecesi belirle
            severity = EventSeverityLevel.LOW
            if category in ["Volcanoes", "Severe Storms"]:
                severity = EventSeverityLevel.EXTREME
            elif category in ["Wildfires", "Earthquakes", "Floods"]:
                severity = EventSeverityLevel.HIGH
            elif category in ["Drought", "Dust and Haze"]:
                severity = EventSeverityLevel.MODERATE
            
            # Çevresel anahtar kelimeler
            environmental_keywords = []
            if category in self.category_styles:
                environmental_keywords = self.category_styles[category]["environmental_context"]
            
            # Tarih
            date = ""
            if event_data.get("geometry") and len(event_data["geometry"]) > 0:
                date = event_data["geometry"][-1].get("date", "")[:10]
            
            # Aciliyet seviyesi
            urgency_level = self.category_styles.get(category, {}).get("urgency_level", "moderate")
            
            return EONETEventContext(
                event_id=event_id,
                title=title,
                category=category,
                location=location,
                coordinates=coordinates,
                severity=severity,
                date=date,
                description=event_data.get("description", "")[:300],
                environmental_keywords=environmental_keywords,
                geographical_context=geographical_context,
                urgency_level=urgency_level
            )
            
        except Exception as e:
            logger.error(f"Event context extraction error: {str(e)}")
            # Fallback context
            return EONETEventContext(
                event_id="unknown",
                title="Unknown Event",
                category="Unknown",
                location=None,
                coordinates=None,
                severity=EventSeverityLevel.LOW,
                date="",
                description="",
                environmental_keywords=[],
                geographical_context=[],
                urgency_level="low"
            )
    
    def _get_geographical_context(self, lat: float, lon: float) -> List[str]:
        """Get geographical context from coordinates"""
        context = []
        
        # Basit coğrafi bölge tespiti
        if lat >= 35 and lat <= 42 and lon >= 26 and lon <= 45:
            context.extend(["Turkey", "Mediterranean region", "Anatolian landscape"])
        elif lat >= 40 and lat <= 70 and lon >= -10 and lon <= 40:
            context.extend(["Europe", "European landscape", "continental climate"])
        elif lat >= 25 and lat <= 50 and lon >= -130 and lon <= -60:
            context.extend(["North America", "American landscape"])
        elif lat >= -40 and lat <= 15 and lon >= -80 and lon <= -35:
            context.extend(["South America", "South American landscape"])
        elif lat >= -35 and lat <= 35 and lon >= 15 and lon <= 55:
            context.extend(["Africa", "African landscape"])
        elif lat >= 10 and lat <= 55 and lon >= 60 and lon <= 150:
            context.extend(["Asia", "Asian landscape"])
        elif lat >= -50 and lat <= -10 and lon >= 110 and lon <= 180:
            context.extend(["Oceania", "Pacific region"])
        
        # Iklim bölgesi
        if abs(lat) <= 23.5:
            context.append("tropical region")
        elif abs(lat) >= 66.5:
            context.append("polar region")
        else:
            context.append("temperate region")
        
        return context
    
    def _create_purpose_specific_prompt(self, context: EONETEventContext, purpose: EventImagePurpose) -> str:
        """Create purpose-specific prompt for EONET event"""
        category_style = self.category_styles.get(context.category, {})
        base_keywords = category_style.get("keywords", [])
        env_context = category_style.get("environmental_context", [])
        color_palette = category_style.get("color_palette", "natural colors")
        
        # Coğrafi bağlam ekle
        location_context = ""
        if context.geographical_context:
            location_context = f", {', '.join(context.geographical_context[:2])}"
        
        purpose_templates = {
            EventImagePurpose.DISASTER_OVERVIEW: f"""
            Wide aerial overview of {context.category.lower()} disaster in {context.location or 'affected area'}{location_context}.
            Showing the full scale and impact of {context.title}. {', '.join(base_keywords[:3])}.
            Documentary photography style, {color_palette}, comprehensive disaster documentation,
            environmental impact visualization, {', '.join(env_context[:2])}, 
            professional disaster response photography, emergency management perspective.
            """,
            
            EventImagePurpose.ENVIRONMENTAL_IMPACT: f"""
            Environmental impact of {context.category.lower()} showing {', '.join(env_context[:3])}.
            {context.title} environmental consequences{location_context}.
            Scientific documentation of {', '.join(base_keywords[:2])}, ecological effects,
            environmental monitoring, {color_palette}, research-quality imagery,
            environmental science perspective, ecosystem impact assessment.
            """,
            
            EventImagePurpose.SCIENTIFIC_ANALYSIS: f"""
            Scientific analysis visualization of {context.category.lower()} phenomenon.
            Technical documentation of {context.title}{location_context}.
            Scientific methodology, {', '.join(base_keywords[:2])}, data collection imagery,
            research documentation, analytical perspective, {color_palette},
            scientific equipment, monitoring systems, geological/meteorological analysis.
            """,
            
            EventImagePurpose.NEWS_COVERAGE: f"""
            Professional news coverage of {context.category.lower()} event.
            Journalistic documentation of {context.title}{location_context}.
            News photography style, {', '.join(base_keywords[:3])}, media coverage,
            public information imagery, {color_palette}, broadcast quality,
            emergency response coverage, human interest perspective.
            """
        }
        
        prompt = purpose_templates.get(purpose, f"Professional documentation of {context.title}")
        
        # Aciliyet seviyesine göre stil ekle
        if context.urgency_level == "extreme":
            prompt += ", urgent emergency situation, critical disaster response"
        elif context.urgency_level == "high":
            prompt += ", serious emergency conditions, rapid response needed"
        
        return prompt.strip()
    
    async def generate_event_images(self, request: EONETImageRequest) -> EONETImageResponse:
        """Generate AI images for EONET event"""
        start_time = datetime.now()
        
        try:
            # Initialize services if needed
            if not self.multi_image_generator:
                await self.initialize()
            
            # Extract event context
            event_context = self._extract_event_context(request.event_context)
            
            logger.info(f"Generating images for EONET event: {event_context.title} ({event_context.category})")
            
            # Cache kontrolü
            cache_key = self._get_cache_key(event_context.event_id)
            if cache_key in self.image_cache:
                cached_response = self.image_cache[cache_key]
                if hasattr(cached_response, '_cached_at'):
                    if datetime.now() - cached_response._cached_at < timedelta(hours=self.cache_ttl_hours):
                        logger.info("EONET image cache hit")
                        return cached_response
            
            # Her purpose için prompt oluştur
            prompts = []
            for purpose in request.image_purposes:
                prompt = self._create_purpose_specific_prompt(event_context, purpose)
                prompts.append((prompt, purpose))
            
            # Multi-image generation request oluştur
            category_style = self.category_styles.get(event_context.category, {})
            
            multi_request = MultiImageRequest(
                content=f"{event_context.title}: {event_context.description or 'Natural disaster event'}",
                content_type=ContentType.DOCUMENTARY,
                target_audience="general public, emergency responders, scientists",
                visual_style=category_style.get("style", PromptStyle.PHOTOREALISTIC),
                composition_style=category_style.get("composition", CompositionStyle.DOCUMENTARY),
                creativity_level=0.7,  # Moderate creativity for documentary accuracy
                quality_level=request.quality_level,
                image_count=len(request.image_purposes),
                professional_grade=True,
                context_aware=True
            )
            
            # Generate images
            multi_response = await self.multi_image_generator.generate_multiple_images(multi_request)
            
            # Process results
            eonet_images = []
            if multi_response.generated_images:
                for i, (generated_img, (prompt, purpose)) in enumerate(zip(multi_response.generated_images, prompts)):
                    eonet_image = EONETImageResult(
                        event_id=event_context.event_id,
                        purpose=purpose,
                        image_url=generated_img.image_url,
                        title=f"{event_context.category} - {purpose.value.replace('_', ' ').title()}",
                        description=generated_img.description,
                        prompt_used=generated_img.enhanced_prompt,
                        geographical_context=", ".join(event_context.geographical_context),
                        severity_indicator=event_context.severity.value,
                        generation_time_ms=generated_img.generation_time_ms,
                        metadata={
                            "category": event_context.category,
                            "location": event_context.location,
                            "urgency_level": event_context.urgency_level,
                            "date": event_context.date
                        }
                    )
                    eonet_images.append(eonet_image)
            
            # Create response
            total_time = int((datetime.now() - start_time).total_seconds() * 1000)
            
            response = EONETImageResponse(
                success=len(eonet_images) > 0,
                event_id=event_context.event_id,
                event_title=event_context.title,
                generated_images=eonet_images,
                total_images=len(request.image_purposes),
                successful_generations=len(eonet_images),
                failed_generations=len(request.image_purposes) - len(eonet_images),
                total_processing_time_ms=total_time,
                event_context=event_context.__dict__,
                suggestions=self._generate_suggestions(event_context, len(eonet_images))
            )
            
            # Cache response
            response._cached_at = datetime.now()
            self.image_cache[cache_key] = response
            
            logger.info(f"EONET image generation completed: {len(eonet_images)}/{len(request.image_purposes)} images for {event_context.title}")
            
            return response
            
        except Exception as e:
            logger.error(f"EONET image generation error: {str(e)}")
            return EONETImageResponse(
                success=False,
                event_id=request.event_context.get("id", "unknown"),
                event_title=request.event_context.get("title", "Unknown Event"),
                error_message=str(e),
                total_processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000)
            )
    
    def _get_cache_key(self, event_id: str) -> str:
        """Generate cache key for event"""
        return f"eonet_images_{event_id}"
    
    def _generate_suggestions(self, context: EONETEventContext, successful_images: int) -> List[str]:
        """Generate suggestions for EONET event images"""
        suggestions = []
        
        if successful_images == 0:
            suggestions.append("Image generation failed - try adjusting event description")
        elif successful_images < 4:
            suggestions.append("Some images failed - consider regenerating for complete coverage")
        
        if context.urgency_level == "extreme":
            suggestions.append("High urgency event - consider immediate distribution of images")
        
        if context.category in ["Wildfires", "Volcanoes"]:
            suggestions.append("Consider generating time-lapse series for ongoing monitoring")
        
        suggestions.extend([
            "Images optimized for emergency response and public information",
            "Suitable for news media and scientific documentation",
            "Professional quality for official disaster reporting"
        ])
        
        return suggestions[:4]
    
    async def get_event_images_by_id(self, event_id: str) -> Optional[EONETImageResponse]:
        """Get cached images for specific event ID"""
        cache_key = self._get_cache_key(event_id)
        return self.image_cache.get(cache_key)
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get service statistics"""
        return {
            "supported_categories": list(self.category_styles.keys()),
            "cached_events": len(self.image_cache),
            "cache_ttl_hours": self.cache_ttl_hours,
            "available_purposes": [purpose.value for purpose in EventImagePurpose],
            "severity_levels": [level.value for level in EventSeverityLevel]
        }

# Global service instance
eonet_ai_generator = EONETAIImageGenerator()

async def get_eonet_ai_generator() -> EONETAIImageGenerator:
    """Dependency injection for EONET AI image generator"""
    return eonet_ai_generator

async def cleanup_eonet_ai_generator():
    """Cleanup service"""
    eonet_ai_generator.image_cache.clear()
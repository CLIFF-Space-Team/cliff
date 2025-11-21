from fastapi import APIRouter, HTTPException, Depends, Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import structlog
from datetime import datetime

from app.services.image_generation_service import (
    EnhancedImageService,
    get_enhanced_image_service,
    ImageGenerationRequest
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/asteroids", tags=["Asteroid Images"])

class AsteroidImageRequest(BaseModel):
    asteroid_id: str
    asteroid_name: str = "Unknown Asteroid"
    is_hazardous: bool = False
    diameter_km: float = 1.0
    velocity_kms: float = 15.0
    distance_au: float = 1.0
    style_preference: str = "mystical"

class AsteroidImageResponse(BaseModel):
    success: bool
    image_url: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: str = ""

@router.post("/{asteroid_id}/generate-image")
async def generate_asteroid_image(
    asteroid_id: str = Path(..., description="Asteroid ID"),
    image_request: Dict[str, Any] = None,
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> AsteroidImageResponse:
    
    try:
        logger.info(f"?? Image generation requested for asteroid {asteroid_id}")
        
        style = "mystical"
        if image_request and "style_preference" in image_request:
            style = image_request["style_preference"]

        prompt = f"Artistic visualization of asteroid {asteroid_id} in space, {style} style, highly detailed, 8k resolution"
        
        request = ImageGenerationRequest(
            prompt=prompt,
            style=style,
            size="1024x1024",
            enhance_prompt=True
        )
        
        result = await image_service.generate_image(request)
        
        if result.success:
            logger.info(f"? Image generated successfully for {asteroid_id}")
            return AsteroidImageResponse(
                success=True,
                image_url=result.image_url,
                timestamp=datetime.now().isoformat()
            )
        else:
            logger.error(f"? Image generation failed for {asteroid_id}: {result.error_message}")
            return AsteroidImageResponse(
                success=False,
                error_message=result.error_message,
                timestamp=datetime.now().isoformat()
            )

    except Exception as e:
        error_msg = f"Image generation failed for asteroid {asteroid_id}: {str(e)}"
        logger.error(error_msg)
        return AsteroidImageResponse(
            success=False,
            error_message=error_msg,
            timestamp=""
        )

@router.get("/{asteroid_id}/image")
async def get_asteroid_image(
    asteroid_id: str = Path(..., description="Asteroid ID"),
    style: str = "mystical",
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    
    return {
        "success": False,
        "message": "Cache system updated, please generate new image",
        "asteroid_id": asteroid_id
    }

@router.get("/styles")
async def get_available_styles() -> Dict[str, List[str]]:
    
    styles = ["mystical", "ancient", "ethereal", "crystalline", "cosmic", "fantasy", "enchanted", "celestial"]
    return {
        "success": True,
        "styles": styles,
        "total": len(styles),
        "descriptions": {
            "mystical": "Magical crystals with ethereal aurora",
            "ancient": "Mysterious runic symbols and ancient power",
            "ethereal": "Shimmering aurora-like energy fields", 
            "crystalline": "Prismatic crystal formations",
            "cosmic": "Nebula-like textures with starlight",
            "fantasy": "Magical energy emanations",
            "enchanted": "Fairy-like sparkles and glow",
            "celestial": "Divine light and heavenly radiance"
        }
    }

@router.post("/{asteroid_id}/generate-with-data")
async def generate_asteroid_image_with_data(
    asteroid_id: str = Path(..., description="Asteroid ID"),
    asteroid_name: str = "Unknown Asteroid",
    is_hazardous: bool = False,
    diameter_km: float = 1.0,
    velocity_kms: float = 15.0,
    distance_au: float = 1.0,
    style_preference: str = "mystical",
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> AsteroidImageResponse:
    
    try:
        logger.info(f"?? Advanced image generation for {asteroid_name} ({asteroid_id})")
        
        hazardous_desc = "menacing, glowing red warning aura" if is_hazardous else "peaceful, stable orbit"
        size_desc = "massive world-eater size" if diameter_km > 1.0 else "small rocky fragment"
        
        prompt = f
        
        request = ImageGenerationRequest(
            prompt=prompt.strip(),
            style=style_preference,
            size="1024x1024",
            enhance_prompt=True
        )
        
        result = await image_service.generate_image(request)
        
        return AsteroidImageResponse(
            success=result.success,
            image_url=result.image_url,
            error_message=result.error_message,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        error_msg = f"Advanced image generation failed for {asteroid_name}: {str(e)}"
        logger.error(error_msg)
        return AsteroidImageResponse(
            success=False,
            error_message=error_msg,
            timestamp=""
        )

@router.delete("/cache/clear")
async def clear_image_cache() -> Dict[str, Any]:
    
    return {
        "success": True,
        "message": "Cache cleared (No-op)",
        "cleared_count": 0
    }

@router.get("/cache/stats")
async def get_cache_stats() -> Dict[str, Any]:
    
    return {
        "success": True,
        "cache_stats": {"cached_items": 0}
    }

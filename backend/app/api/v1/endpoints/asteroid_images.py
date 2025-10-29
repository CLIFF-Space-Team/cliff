"""
🎨 Asteroid AI Image Generation API Endpoints
CortexAI ile artistic/fantastical asteroid görsel oluşturma
"""

from fastapi import APIRouter, HTTPException, Depends, Path
from typing import Dict, Any, List
import structlog
from app.services.cortex_ai_services import (
    CortexAIService, 
    get_cortex_ai_service,
    AsteroidImageRequest,
    AsteroidImageResponse
)

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/asteroids", tags=["Asteroid Images"])

@router.post("/{asteroid_id}/generate-image")
async def generate_asteroid_image(
    asteroid_id: str = Path(..., description="Asteroid ID"),
    image_request: Dict[str, Any] = None,
    cortex_service: CortexAIService = Depends(get_cortex_ai_service)
) -> AsteroidImageResponse:
    """
    🎨 Generate artistic AI image for asteroid
    
    Creates beautiful, fantastical visualizations using CortexAI's Seedream-4-high-res-fal model
    """
    try:
        logger.info(f"🎨 Image generation requested for asteroid {asteroid_id}")
        
        # Default request data
        default_data = {
            "asteroid_id": asteroid_id,
            "asteroid_name": f"Asteroid {asteroid_id}",
            "is_hazardous": False,
            "diameter_km": 1.0,
            "velocity_kms": 15.0,
            "distance_au": 1.0,
            "style_preference": "mystical"
        }
        
        # Merge with provided data
        if image_request:
            default_data.update(image_request)
        
        # Create request model
        request = AsteroidImageRequest(**default_data)
        
        # Generate image
        result = await cortex_service.generate_asteroid_image(request)
        
        if result.success:
            logger.info(f"✅ Image generated successfully for {asteroid_id}")
        else:
            logger.error(f"❌ Image generation failed for {asteroid_id}: {result.error_message}")
        
        return result
        
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
    cortex_service: CortexAIService = Depends(get_cortex_ai_service)
) -> Dict[str, Any]:
    """
    🖼️ Get cached asteroid image if available
    """
    try:
        cached_url = await cortex_service.get_cached_image(asteroid_id, style)
        
        if cached_url:
            logger.info(f"🔄 Cached image found for asteroid {asteroid_id}")
            return {
                "success": True,
                "image_url": cached_url,
                "cached": True,
                "asteroid_id": asteroid_id,
                "style": style
            }
        else:
            logger.info(f"❌ No cached image for asteroid {asteroid_id}")
            return {
                "success": False,
                "message": "No cached image available",
                "asteroid_id": asteroid_id,
                "style": style
            }
            
    except Exception as e:
        error_msg = f"Failed to retrieve image for asteroid {asteroid_id}: {str(e)}"
        logger.error(error_msg)
        
        return {
            "success": False,
            "error": error_msg,
            "asteroid_id": asteroid_id
        }

@router.get("/styles")
async def get_available_styles(
    cortex_service: CortexAIService = Depends(get_cortex_ai_service)
) -> Dict[str, List[str]]:
    """
    🎨 Get available artistic styles for asteroid images
    """
    try:
        styles = cortex_service.get_available_styles()
        
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
        
    except Exception as e:
        logger.error(f"Failed to get available styles: {str(e)}")
        return {
            "success": False,
            "error": str(e)
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
    cortex_service: CortexAIService = Depends(get_cortex_ai_service)
) -> AsteroidImageResponse:
    """
    🚀 Generate asteroid image with full asteroid data
    
    Advanced endpoint that uses detailed asteroid properties to create
    more accurate and personalized artistic visualizations
    """
    try:
        logger.info(f"🚀 Advanced image generation for {asteroid_name} ({asteroid_id})")
        
        # Create detailed request
        request = AsteroidImageRequest(
            asteroid_id=asteroid_id,
            asteroid_name=asteroid_name,
            is_hazardous=is_hazardous,
            diameter_km=diameter_km,
            velocity_kms=velocity_kms,
            distance_au=distance_au,
            style_preference=style_preference
        )
        
        # Generate image
        result = await cortex_service.generate_asteroid_image(request)
        
        logger.info(f"🎨 Advanced generation result for {asteroid_name}: {'✅ Success' if result.success else '❌ Failed'}")
        
        return result
        
    except Exception as e:
        error_msg = f"Advanced image generation failed for {asteroid_name}: {str(e)}"
        logger.error(error_msg)
        
        return AsteroidImageResponse(
            success=False,
            error_message=error_msg,
            timestamp=""
        )

@router.delete("/cache/clear")
async def clear_image_cache(
    cortex_service: CortexAIService = Depends(get_cortex_ai_service)
) -> Dict[str, Any]:
    """
    🗑️ Clear asteroid image cache
    """
    try:
        cleared_count = cortex_service.clear_cache()
        
        logger.info(f"🗑️ Cleared {cleared_count} cached images")
        
        return {
            "success": True,
            "message": f"Cleared {cleared_count} cached images",
            "cleared_count": cleared_count
        }
        
    except Exception as e:
        error_msg = f"Failed to clear cache: {str(e)}"
        logger.error(error_msg)
        
        return {
            "success": False,
            "error": error_msg
        }

@router.get("/cache/stats")
async def get_cache_stats(
    cortex_service: CortexAIService = Depends(get_cortex_ai_service)
) -> Dict[str, Any]:
    """
    📊 Get cache statistics
    """
    try:
        stats = cortex_service.get_cache_stats()
        
        return {
            "success": True,
            "cache_stats": stats
        }
        
    except Exception as e:
        error_msg = f"Failed to get cache stats: {str(e)}"
        logger.error(error_msg)
        
        return {
            "success": False,
            "error": error_msg
        }
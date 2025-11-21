from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List
import structlog
from datetime import datetime
from app.services.image_generation_service import (
    EnhancedImageService,
    ImageGenerationRequest,
    ImageGenerationResponse,
    get_enhanced_image_service
)
logger = structlog.get_logger(__name__)
router = APIRouter()
@router.post("/generate", response_model=ImageGenerationResponse)
async def generate_image(
    request: ImageGenerationRequest,
    image_service: EnhancedImageService = Depends(get_enhanced_image_service),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> ImageGenerationResponse:
    """
    ?? Generate image from text prompt with intelligent enhancement
    """
    try:
        logger.info(f"?? Enhanced image generation request: {request.prompt[:50]}...")
        if not request.prompt or not request.prompt.strip():
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        if len(request.prompt) > 1000:  # Increased limit for enhanced prompts
            raise HTTPException(status_code=400, detail="Prompt too long (max 1000 characters)")
        start_time = datetime.now()
        response = await image_service.generate_image(request)
        total_time = int((datetime.now() - start_time).total_seconds() * 1000)
        if response.success:
            logger.info(
                f"? Enhanced image generated successfully",
                prompt_length=len(request.prompt),
                enhanced_prompt_length=len(response.enhanced_prompt) if response.enhanced_prompt else 0,
                generation_time_ms=response.generation_time_ms,
                prompt_enhancement_time_ms=response.prompt_enhancement_time_ms,
                total_time_ms=total_time,
                model=request.model,
                enhanced=request.enhance_prompt
            )
        else:
            logger.error(
                f"? Enhanced image generation failed: {response.error_message}",
                prompt=request.prompt[:100]
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Enhanced image generation endpoint error: {str(e)}"
        logger.error(error_msg)
        return ImageGenerationResponse(
            success=False,
            error_message=error_msg,
            original_prompt=request.prompt,
            enhanced_prompt=None,
            model_used=request.model,
            timestamp=datetime.now().isoformat()
        )
@router.post("/detect-intent")
async def detect_image_intent(
    request: Dict[str, str],
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    """
    ?? Detect if message contains image generation request with enhanced analysis
    """
    try:
        text = request.get("text", "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        detection_result = await image_service.detect_image_request(text)
        logger.info(
            f"?? Enhanced image intent detection",
            text_length=len(text),
            has_intent=detection_result["has_image_intent"],
            confidence=detection_result.get("confidence", 0.0),
            category=detection_result.get("detected_category"),
            style=detection_result.get("detected_style"),
            keywords=detection_result.get("detected_keywords", [])
        )
        return {
            "success": True,
            "text": text,
            "detection_result": detection_result,
            "enhancement_recommended": detection_result.get("analysis", {}).get("enhancement_recommended", False),
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Enhanced intent detection error: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "text": request.get("text", ""),
            "detection_result": {
                "has_image_intent": False,
                "detected_keywords": [],
                "detected_category": "general",
                "detected_style": None,
                "confidence": 0.0,
                "analysis": {
                    "enhancement_recommended": False
                }
            },
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
@router.get("/status")
async def get_image_service_status(
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    """
    ?? Get enhanced image generation service status
    """
    try:
        logger.info("?? Checking enhanced image generation service status...")
        test_result = await image_service.test_api_connection()
        metrics = image_service.get_metrics()
        status_info = {
            "service_name": "Enhanced Cortex AI Image Generation",
            "api_provider": "Cortex API + Grok-4-fast-reasoning",
            "default_model": image_service.default_model,
            "api_url": image_service.api_url,
            "connection_test": test_result,
            "performance_metrics": metrics,
            "features": [
                "Intelligent Prompt Enhancement (Grok-4)",
                "Text-to-Image Generation",
                "Multi-language Prompt Support (TR/EN)",
                "Smart Category Detection",
                "Style Analysis & Enhancement",
                "Context-aware Processing",
                "Advanced Intent Detection",
                "Performance Monitoring",
                "Intelligent Caching"
            ],
            "supported_models": [
                "imagen-4.0-ultra-generate-preview-06-06",
                "gpt-image-1"
            ],
            "supported_styles": image_service.get_available_styles(),
            "supported_categories": image_service.get_available_categories(),
            "timestamp": datetime.now().isoformat()
        }
        overall_status = "healthy" if test_result.get("success") else "unhealthy"
        logger.info(f"?? Enhanced image service status: {overall_status}")
        return {
            "success": True,
            "status": overall_status,
            "service_info": status_info
        }
    except Exception as e:
        error_msg = f"Enhanced status check error: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "status": "error",
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
@router.post("/enhance-prompt")
async def enhance_prompt_only(
    request: Dict[str, Any],
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    """
    ?? Enhance prompt using Grok-4-fast-reasoning without generating image
    """
    try:
        user_input = request.get("prompt", "").strip()
        style = request.get("style")
        creativity_level = request.get("creativity_level", 0.8)
        detail_level = request.get("detail_level", "high")
        if not user_input:
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        logger.info(f"?? Prompt enhancement request: {user_input[:50]}...")
        enhancement_result = await image_service.enhance_prompt_with_ai(
            prompt=user_input,
            style=style,
            creativity_level=creativity_level,
            detail_level=detail_level
        )
        logger.info(
            f"?? Prompt enhancement completed",
            original_length=len(user_input),
            enhanced_length=len(enhancement_result.get("enhanced_prompt", "")),
            confidence=enhancement_result.get("confidence_score", 0.0),
            enhancement_time_ms=enhancement_result.get("enhancement_time_ms", 0)
        )
        return {
            "success": True,
            "original_prompt": user_input,
            "enhanced_prompt": enhancement_result.get("enhanced_prompt"),
            "analysis": enhancement_result.get("analysis"),
            "suggestions": enhancement_result.get("suggestions"),
            "confidence_score": enhancement_result.get("confidence_score"),
            "enhancement_time_ms": enhancement_result.get("enhancement_time_ms"),
            "cached": enhancement_result.get("cached", False),
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Prompt enhancement error: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "original_prompt": request.get("prompt", ""),
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
@router.get("/styles")
async def get_available_styles(
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    """
    ?? Get available prompt styles
    """
    try:
        styles = image_service.get_available_styles()
        categories = image_service.get_available_categories()
        return {
            "success": True,
            "available_styles": styles,
            "available_categories": categories,
            "total_styles": len(styles),
            "total_categories": len(categories),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
@router.get("/metrics")
async def get_service_metrics(
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    """
    ?? Get detailed service performance metrics
    """
    try:
        metrics = image_service.get_metrics()
        return {
            "success": True,
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
@router.post("/test-generation")
async def test_image_generation(
    request: Dict[str, Any] = None,
    image_service: EnhancedImageService = Depends(get_enhanced_image_service)
) -> Dict[str, Any]:
    """
    ?? Test enhanced image generation with sample prompts
    """
    try:
        test_prompts = [
            "uzayda süzülen robot",
            "mars yüzeyinde keþif",
            "galaksi manzarasý",
            "fantastik ejder"
        ]
        test_prompt = request.get("prompt") if request else test_prompts[0]
        enhance = request.get("enhance", True) if request else True
        logger.info(f"?? Testing enhanced image generation with prompt: {test_prompt}")
        test_request = ImageGenerationRequest(
            prompt=test_prompt,
            model="imagen-4.0-ultra-generate-preview-06-06",
            enhance_prompt=enhance,
            style=request.get("style") if request else None,
            creativity_level=request.get("creativity_level", 0.8) if request else 0.8,
            detail_level=request.get("detail_level", "high") if request else "high",
            context={"test": True}
        )
        start_time = datetime.now()
        response = await image_service.generate_image(test_request)
        test_duration = int((datetime.now() - start_time).total_seconds() * 1000)
        result = {
            "test_prompt": test_prompt,
            "enhancement_enabled": enhance,
            "generation_result": {
                "success": response.success,
                "image_url": response.image_url if response.success else None,
                "original_prompt": response.original_prompt,
                "enhanced_prompt": response.enhanced_prompt,
                "prompt_analysis": response.prompt_analysis,
                "suggestions": response.suggestions,
                "model_used": response.model_used,
                "generation_time_ms": response.generation_time_ms,
                "prompt_enhancement_time_ms": response.prompt_enhancement_time_ms,
                "error": response.error_message if not response.success else None
            },
            "test_duration_ms": test_duration,
            "available_test_prompts": test_prompts,
            "timestamp": datetime.now().isoformat()
        }
        if response.success:
            logger.info(f"? Enhanced test image generation successful in {test_duration}ms")
        else:
            logger.error(f"? Enhanced test image generation failed: {response.error_message}")
        return result
    except Exception as e:
        error_msg = f"Enhanced test generation error: {str(e)}"
        logger.error(error_msg)
        return {
            "test_prompt": request.get("prompt") if request else "test",
            "generation_result": {
                "success": False,
                "error": error_msg
            },
            "test_duration_ms": None,
            "timestamp": datetime.now().isoformat()
        }
@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    ?? Enhanced image generation service health check
    """
    return {
        "status": "healthy",
        "service": "Enhanced Image Generation API",
        "provider": "Cortex AI + Grok-4-fast-reasoning",
        "features": ["Intelligent Prompt Enhancement", "Multi-language Support", "Smart Analysis"],
        "timestamp": datetime.now().isoformat()
    }

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
import structlog
from datetime import datetime
from app.services.multi_image_generator import (
    MultiImageGenerator,
    MultiImageRequest,
    MultiImageResponse,
    ContentType,
    CompositionStyle,
    get_multi_image_service
)
from app.services.intelligent_prompt_enhancer import PromptStyle
logger = structlog.get_logger(__name__)
router = APIRouter()
@router.post("/generate-batch", response_model=MultiImageResponse)
async def generate_image_batch(
    request: MultiImageRequest,
    multi_service: MultiImageGenerator = Depends(get_multi_image_service),
    background_tasks: BackgroundTasks = BackgroundTasks()
) -> MultiImageResponse:
    """
    ?? Generate multiple professional-grade images from content analysis
    Automatically produces 4 high-quality, contextually appropriate images:
    - Hero Image: Main visual representation
    - Detail Image: Close-up/macro detail
    - Context Image: Environmental/wide view  
    - Artistic Image: Creative interpretation
    """
    try:
        logger.info(f"?? Multi-image generation request: {request.content[:50]}...")
        if not request.content or not request.content.strip():
            raise HTTPException(status_code=400, detail="Content cannot be empty")
        if len(request.content) > 2000:
            raise HTTPException(status_code=400, detail="Content too long (max 2000 characters)")
        if request.image_count > 8:
            raise HTTPException(status_code=400, detail="Maximum 8 images per request")
        start_time = datetime.now()
        response = await multi_service.generate_multiple_images(request)
        total_time = int((datetime.now() - start_time).total_seconds() * 1000)
        if response.success:
            logger.info(
                f"? Multi-image generation successful",
                content_length=len(request.content),
                requested_count=request.image_count,
                successful_count=response.successful_generations,
                failed_count=response.failed_generations,
                total_time_ms=total_time,
                average_generation_time=response.average_generation_time_ms,
                quality_score=response.quality_metrics.get('overall_quality_score', 0),
                content_type=request.content_type.value if request.content_type else "auto-detected",
                professional_grade=request.professional_grade
            )
        else:
            logger.error(
                f"? Multi-image generation failed",
                error=response.error_message,
                content=request.content[:100]
            )
        return response
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Multi-image generation endpoint error: {str(e)}"
        logger.error(error_msg)
        return MultiImageResponse(
            success=False,
            error_message=error_msg,
            total_processing_time_ms=int((datetime.now() - start_time).total_seconds() * 1000) if 'start_time' in locals() else 0
        )
@router.post("/analyze-content")
async def analyze_content_for_visuals(
    request: Dict[str, Any],
    multi_service: MultiImageGenerator = Depends(get_multi_image_service)
) -> Dict[str, Any]:
    """
    ?? Analyze content for visual generation potential
    Provides detailed analysis of content including:
    - Main theme identification
    - Visual element extraction
    - Mood and atmosphere analysis
    - Technical requirements
    - Composition suggestions
    """
    try:
        content = request.get("content", "").strip()
        content_type = request.get("content_type")
        if not content:
            raise HTTPException(status_code=400, detail="Content cannot be empty")
        logger.info(f"?? Analyzing content for visuals: {content[:50]}...")
        parsed_content_type = None
        if content_type:
            try:
                parsed_content_type = ContentType(content_type)
            except ValueError:
                logger.warning(f"Invalid content type: {content_type}")
        analysis = await multi_service.analyze_content(content, parsed_content_type)
        logger.info(
            f"?? Content analysis completed",
            theme=analysis.main_theme,
            content_type=analysis.content_type.value,
            confidence=analysis.confidence_score,
            key_concepts_count=len(analysis.key_concepts),
            visual_elements_count=len(analysis.visual_elements)
        )
        return {
            "success": True,
            "content": content,
            "analysis": {
                "main_theme": analysis.main_theme,
                "content_type": analysis.content_type.value,
                "key_concepts": analysis.key_concepts,
                "visual_elements": analysis.visual_elements,
                "mood_descriptors": analysis.mood_descriptors,
                "technical_aspects": analysis.technical_aspects,
                "target_audience": analysis.target_audience,
                "complexity_level": analysis.complexity_level,
                "suggested_compositions": [comp.value for comp in analysis.suggested_compositions],
                "confidence_score": analysis.confidence_score
            },
            "generation_recommendations": {
                "recommended_image_count": 4,
                "suggested_styles": [
                    PromptStyle.PHOTOREALISTIC.value,
                    PromptStyle.ARTISTIC.value,
                    PromptStyle.CINEMATIC.value
                ],
                "optimal_creativity_level": 0.8 if analysis.content_type in [ContentType.ARTISTIC, ContentType.ABSTRACT] else 0.7,
                "recommended_quality": "high" if analysis.confidence_score > 0.7 else "medium"
            },
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Content analysis error: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "content": request.get("content", ""),
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
@router.get("/supported-options")
async def get_supported_options() -> Dict[str, Any]:
    """
    ?? Get all supported content types, styles, and composition options
    """
    return {
        "success": True,
        "supported_options": {
            "content_types": {
                "values": [ct.value for ct in ContentType],
                "descriptions": {
                    "scientific": "Scientific, research-based content",
                    "artistic": "Creative, artistic expression",
                    "educational": "Learning and teaching materials",
                    "commercial": "Business and marketing content",
                    "narrative": "Storytelling and narrative content",
                    "technical": "Technical documentation",
                    "space": "Space and astronomy related",
                    "nature": "Natural world and environment",
                    "abstract": "Abstract concepts and ideas",
                    "documentary": "Factual documentation"
                }
            },
            "visual_styles": {
                "values": [ps.value for ps in PromptStyle],
                "descriptions": {
                    "photorealistic": "Photo-realistic, lifelike imagery",
                    "artistic": "Artistic and creative interpretation",
                    "cinematic": "Movie-like, dramatic presentation",
                    "fantasy": "Fantasy and imaginative elements",
                    "minimalist": "Clean, simple composition",
                    "vibrant": "Bold colors and energy",
                    "dark": "Dark, moody atmosphere",
                    "ethereal": "Light, dreamlike quality",
                    "futuristic": "Modern, advanced aesthetics",
                    "vintage": "Classic, retro styling"
                }
            },
            "composition_styles": {
                "values": [cs.value for cs in CompositionStyle],
                "descriptions": {
                    "cinematic": "Movie-like dramatic composition",
                    "documentary": "Authentic, factual presentation",
                    "artistic": "Creative artistic arrangement",
                    "scientific": "Accurate scientific visualization",
                    "commercial": "Professional commercial quality",
                    "editorial": "Editorial and journalistic style"
                }
            }
        },
        "generation_parameters": {
            "image_count": {
                "min": 1,
                "max": 8,
                "recommended": 4,
                "description": "Number of images to generate"
            },
            "creativity_level": {
                "min": 0.0,
                "max": 1.0,
                "recommended": 0.8,
                "description": "AI creativity level (0=conservative, 1=very creative)"
            },
            "quality_levels": ["low", "medium", "high"],
            "professional_features": [
                "Intelligent content analysis",
                "Professional composition techniques",
                "Advanced prompt engineering",
                "Context-aware generation",
                "Multi-purpose image creation",
                "Quality metrics and suggestions"
            ]
        },
        "timestamp": datetime.now().isoformat()
    }
@router.post("/quick-generate")
async def quick_generate_images(
    request: Dict[str, Any],
    multi_service: MultiImageGenerator = Depends(get_multi_image_service)
) -> MultiImageResponse:
    """
    ? Quick generation with smart defaults
    Simplified interface for fast multi-image generation with intelligent defaults
    """
    try:
        content = request.get("content", "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        logger.info(f"? Quick multi-image generation: {content[:50]}...")
        quick_request = MultiImageRequest(
            content=content,
            image_count=request.get("count", 4),
            creativity_level=request.get("creativity", 0.8),
            quality_level=request.get("quality", "high"),
            professional_grade=request.get("professional", True),
            context_aware=True,
            include_variations=True
        )
        if request.get("style"):
            try:
                quick_request.visual_style = PromptStyle(request["style"])
            except ValueError:
                logger.warning(f"Invalid style provided: {request['style']}")
        response = await multi_service.generate_multiple_images(quick_request)
        if response.success:
            logger.info(f"? Quick generation completed: {response.successful_generations} images")
        return response
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Quick generation error: {str(e)}"
        logger.error(error_msg)
        return MultiImageResponse(
            success=False,
            error_message=error_msg
        )
@router.get("/service-status")
async def get_multi_image_service_status(
    multi_service: MultiImageGenerator = Depends(get_multi_image_service)
) -> Dict[str, Any]:
    """
    ?? Get multi-image generation service status and statistics
    """
    try:
        logger.info("?? Checking multi-image generation service status...")
        stats = multi_service.get_service_stats()
        success_rate = 0.0
        if stats["total_requests"] > 0:
            success_rate = (stats["successful_requests"] / stats["total_requests"]) * 100
        avg_images_per_request = 0.0
        if stats["successful_requests"] > 0:
            avg_images_per_request = stats["total_images_generated"] / stats["successful_requests"]
        status_info = {
            "service_name": "Multi-Image Generation Service",
            "provider": "Enhanced AI + Intelligent Enhancement",
            "features": [
                "Intelligent Content Analysis",
                "Professional Composition Techniques", 
                "Multi-Purpose Image Generation",
                "Context-Aware Processing",
                "Quality Metrics & Analytics",
                "Parallel Generation Processing",
                "Professional Photography Standards",
                "Advanced Prompt Engineering"
            ],
            "capabilities": {
                "max_images_per_request": 8,
                "supported_content_types": len(stats["supported_content_types"]),
                "supported_purposes": len(stats["supported_purposes"]),
                "professional_styles": stats["professional_styles_count"],
                "composition_techniques": stats["composition_techniques_count"]
            },
            "performance_metrics": {
                "total_requests": stats["total_requests"],
                "successful_requests": stats["successful_requests"],
                "success_rate_percent": round(success_rate, 2),
                "total_images_generated": stats["total_images_generated"],
                "average_images_per_request": round(avg_images_per_request, 1),
                "cache_hits": stats["cache_hits"],
                "content_analyses_performed": stats["content_analysis_count"],
                "cache_size": stats["cache_size"]
            },
            "quality_assurance": [
                "Professional photography standards",
                "Commercial-grade composition",
                "Advanced prompt engineering",
                "Context-aware generation",
                "Multi-purpose optimization",
                "Quality metrics tracking"
            ]
        }
        overall_status = "healthy"
        if stats["total_requests"] > 0 and success_rate < 50:
            overall_status = "degraded"
        elif stats["total_requests"] == 0:
            overall_status = "ready"
        logger.info(f"?? Multi-image service status: {overall_status}")
        return {
            "success": True,
            "status": overall_status,
            "service_info": status_info,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        error_msg = f"Status check error: {str(e)}"
        logger.error(error_msg)
        return {
            "success": False,
            "status": "error",
            "error": error_msg,
            "timestamp": datetime.now().isoformat()
        }
@router.post("/test-generation")
async def test_multi_image_generation(
    request: Optional[Dict[str, Any]] = None,
    multi_service: MultiImageGenerator = Depends(get_multi_image_service)
) -> Dict[str, Any]:
    """
    ?? Test multi-image generation with sample content
    """
    try:
        test_contents = [
            "A magnificent space station orbiting Earth with solar panels gleaming in sunlight",
            "Ancient dragon perched on crystal mountain peak during stormy weather", 
            "Peaceful forest clearing with sunbeams filtering through misty trees",
            "Futuristic cityscape with flying cars and neon lights reflecting on wet streets"
        ]
        test_content = request.get("content") if request else test_contents[0]
        test_count = request.get("count", 2) if request else 2  # Reduced for testing
        logger.info(f"?? Testing multi-image generation with: {test_content[:50]}...")
        test_request = MultiImageRequest(
            content=test_content,
            image_count=test_count,
            creativity_level=request.get("creativity_level", 0.8) if request else 0.8,
            quality_level=request.get("quality_level", "high") if request else "high",
            professional_grade=True,
            context_aware=True,
            include_variations=True
        )
        if request and request.get("content_type"):
            try:
                test_request.content_type = ContentType(request["content_type"])
            except ValueError:
                pass
        start_time = datetime.now()
        response = await multi_service.generate_multiple_images(test_request)
        test_duration = int((datetime.now() - start_time).total_seconds() * 1000)
        result = {
            "test_content": test_content,
            "requested_count": test_count,
            "generation_result": {
                "success": response.success,
                "successful_generations": response.successful_generations,
                "failed_generations": response.failed_generations,
                "total_processing_time_ms": response.total_processing_time_ms,
                "average_generation_time_ms": response.average_generation_time_ms,
                "quality_metrics": response.quality_metrics,
                "content_analysis_confidence": response.content_analysis.get('confidence_score') if response.content_analysis else None,
                "generated_images_info": [
                    {
                        "title": img.title,
                        "purpose": img.purpose.value,
                        "style_applied": img.style_applied,
                        "has_image_url": bool(img.image_url),
                        "generation_time_ms": img.generation_time_ms,
                        "composition_elements_count": len(img.composition_elements)
                    }
                    for img in response.generated_images
                ] if response.generated_images else [],
                "suggestions": response.suggestions,
                "error": response.error_message if not response.success else None
            },
            "test_duration_ms": test_duration,
            "available_test_contents": test_contents,
            "timestamp": datetime.now().isoformat()
        }
        if response.success:
            logger.info(f"? Multi-image test successful: {response.successful_generations}/{test_count} in {test_duration}ms")
        else:
            logger.error(f"? Multi-image test failed: {response.error_message}")
        return result
    except Exception as e:
        error_msg = f"Test generation error: {str(e)}"
        logger.error(error_msg)
        return {
            "test_content": request.get("content", "test") if request else "test",
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
    ?? Multi-image generation service health check
    """
    return {
        "status": "healthy",
        "service": "Multi-Image Generation API",
        "provider": "Enhanced AI + Professional Composition System",
        "features": [
            "Intelligent Content Analysis",
            "Professional Multi-Image Generation", 
            "Context-Aware Processing",
            "Quality Metrics & Analytics"
        ],
        "timestamp": datetime.now().isoformat()
    }

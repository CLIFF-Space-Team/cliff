from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Depends, Query, Path, BackgroundTasks
from fastapi.responses import JSONResponse
from datetime import datetime
import structlog
from app.services.eonet_ai_image_generator import (
    EONETAIImageGenerator,
    EONETImageRequest,
    EONETImageResponse,
    EventImagePurpose,
    get_eonet_ai_generator
)
from app.services.nasa_services import get_nasa_services, NASAServices
logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/eonet-ai-images", tags=["EONET AI Images"])
@router.post("/generate")
async def generate_eonet_event_images(
    request: EONETImageRequest,
    eonet_generator: EONETAIImageGenerator = Depends(get_eonet_ai_generator)
) -> JSONResponse:
    """
    🎨 Generate AI Images for EONET Event
    Create contextual AI images for natural disaster events
    """
    try:
        logger.info(f"EONET AI image generation requested for event: {request.event_context.get('id', 'unknown')}")
        response = await eonet_generator.generate_event_images(request)
        logger.info(f"EONET AI images generated: {response.successful_generations}/{response.total_images}")
        return JSONResponse(content={
            "success": response.success,
            "data": {
                "event_id": response.event_id,
                "event_title": response.event_title,
                "generated_images": [img.dict() for img in response.generated_images],
                "total_images": response.total_images,
                "successful_generations": response.successful_generations,
                "failed_generations": response.failed_generations,
                "processing_time_ms": response.total_processing_time_ms,
                "event_context": response.event_context,
                "suggestions": response.suggestions
            },
            "error_message": response.error_message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"EONET AI image generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate EONET images: {str(e)}")
@router.get("/event/{event_id}")
async def get_event_images(
    event_id: str = Path(..., description="EONET event ID"),
    eonet_generator: EONETAIImageGenerator = Depends(get_eonet_ai_generator)
) -> JSONResponse:
    """
    🖼️ Get Generated Images for EONET Event
    Retrieve cached AI-generated images for specific event
    """
    try:
        logger.info(f"Retrieving EONET images for event: {event_id}")
        cached_images = await eonet_generator.get_event_images_by_id(event_id)
        if cached_images:
            return JSONResponse(content={
                "success": True,
                "data": {
                    "event_id": cached_images.event_id,
                    "event_title": cached_images.event_title,
                    "generated_images": [img.dict() for img in cached_images.generated_images],
                    "total_images": cached_images.total_images,
                    "successful_generations": cached_images.successful_generations,
                    "event_context": cached_images.event_context,
                    "cached": True
                },
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
        else:
            return JSONResponse(content={
                "success": False,
                "message": f"No images found for event {event_id}",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, status_code=404)
    except Exception as e:
        logger.error(f"Failed to retrieve EONET images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve event images: {str(e)}")
@router.post("/generate-for-event/{event_id}")
async def generate_images_for_existing_event(
    background_tasks: BackgroundTasks,
    event_id: str = Path(..., description="EONET event ID"),
    purposes: List[EventImagePurpose] = Query(default=[
        EventImagePurpose.DISASTER_OVERVIEW,
        EventImagePurpose.ENVIRONMENTAL_IMPACT,
        EventImagePurpose.SCIENTIFIC_ANALYSIS,
        EventImagePurpose.NEWS_COVERAGE
    ]),
    quality_level: str = Query(default="high", description="Image quality level"),
    emergency_style: bool = Query(default=False, description="Use emergency styling"),
    nasa_services: NASAServices = Depends(get_nasa_services),
    eonet_generator: EONETAIImageGenerator = Depends(get_eonet_ai_generator)
) -> JSONResponse:
    """
    🚨 Generate Images for Existing EONET Event
    Fetch event data and generate AI images
    """
    try:
        logger.info(f"Generating images for existing EONET event: {event_id}")
        events_response = await nasa_services.get_earth_events(limit=1000)
        if not events_response.get("success"):
            raise HTTPException(status_code=500, detail="Failed to fetch EONET events")
        target_event = None
        for event in events_response.get("events", []):
            if event.get("id") == event_id:
                target_event = event
                break
        if not target_event:
            raise HTTPException(status_code=404, detail=f"EONET event {event_id} not found")
        image_request = EONETImageRequest(
            event_context=target_event,
            image_purposes=purposes,
            quality_level=quality_level,
            emergency_style=emergency_style
        )
        def generate_in_background():
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(eonet_generator.generate_event_images(image_request))
            finally:
                loop.close()
        background_tasks.add_task(generate_in_background)
        return JSONResponse(content={
            "success": True,
            "message": f"Image generation started for event {event_id}",
            "event_title": target_event.get("title", "Unknown Event"),
            "requested_purposes": [p.value for p in purposes],
            "processing_status": "background_generation_started",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate images for event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate images: {str(e)}")
@router.get("/batch-generate")
async def batch_generate_for_recent_events(
    background_tasks: BackgroundTasks,
    limit: int = Query(default=10, le=50, description="Number of recent events to process"),
    category: Optional[str] = Query(default=None, description="Filter by category"),
    nasa_services: NASAServices = Depends(get_nasa_services),
    eonet_generator: EONETAIImageGenerator = Depends(get_eonet_ai_generator)
) -> JSONResponse:
    """
    📦 Batch Generate Images for Recent Events
    Generate AI images for multiple recent EONET events
    """
    try:
        logger.info(f"Batch generating images for {limit} recent EONET events")
        events_response = await nasa_services.get_earth_events(limit=limit, category=category)
        if not events_response.get("success"):
            raise HTTPException(status_code=500, detail="Failed to fetch EONET events")
        events = events_response.get("events", [])
        async def batch_generate():
            successful = 0
            failed = 0
            for event in events:
                try:
                    existing_images = await eonet_generator.get_event_images_by_id(event.get("id", ""))
                    if existing_images and existing_images.generated_images:
                        logger.info(f"Images already exist for event {event.get('id')}")
                        continue
                    image_request = EONETImageRequest(
                        event_context=event,
                        quality_level="high"
                    )
                    response = await eonet_generator.generate_event_images(image_request)
                    if response.success:
                        successful += 1
                        logger.info(f"Generated images for event {event.get('id')}: {response.event_title}")
                    else:
                        failed += 1
                        logger.warning(f"Failed to generate images for event {event.get('id')}")
                except Exception as e:
                    failed += 1
                    logger.error(f"Batch generation error for event {event.get('id', 'unknown')}: {str(e)}")
                    continue
            logger.info(f"Batch generation completed: {successful} successful, {failed} failed")
        background_tasks.add_task(batch_generate)
        return JSONResponse(content={
            "success": True,
            "message": f"Batch generation started for {len(events)} events",
            "events_to_process": len(events),
            "processing_status": "background_batch_started",
            "filter_category": category,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Batch generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch generation failed: {str(e)}")
@router.get("/stats")
async def get_eonet_ai_stats(
    eonet_generator: EONETAIImageGenerator = Depends(get_eonet_ai_generator)
) -> JSONResponse:
    """
    📊 EONET AI Image Generator Statistics
    Get service statistics and supported features
    """
    try:
        stats = eonet_generator.get_service_stats()
        return JSONResponse(content={
            "success": True,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        })
    except Exception as e:
        logger.error(f"Failed to get EONET AI stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")
@router.delete("/cache/{event_id}")
async def clear_event_cache(
    event_id: str = Path(..., description="EONET event ID"),
    eonet_generator: EONETAIImageGenerator = Depends(get_eonet_ai_generator)
) -> JSONResponse:
    """
    🗑️ Clear Cache for Event
    Remove cached images for specific event
    """
    try:
        cache_key = eonet_generator._get_cache_key(event_id)
        if cache_key in eonet_generator.image_cache:
            del eonet_generator.image_cache[cache_key]
            logger.info(f"Cleared cache for event {event_id}")
            return JSONResponse(content={
                "success": True,
                "message": f"Cache cleared for event {event_id}",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
        else:
            return JSONResponse(content={
                "success": False,
                "message": f"No cache found for event {event_id}",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }, status_code=404)
    except Exception as e:
        logger.error(f"Failed to clear cache for event {event_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")
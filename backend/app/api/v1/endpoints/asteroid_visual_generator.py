from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging
import random
from datetime import datetime

from app.services.nasa_services import get_simplified_nasa_services

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/asteroids/{asteroid_id}/generate-with-data")
async def generate_asteroid_visual(asteroid_id: str) -> Dict[str, Any]:
    try:
        logger.info(f"Generating visual for asteroid: {asteroid_id}")
        
        nasa_services = get_simplified_nasa_services()
        asteroids = await nasa_services.get_simple_asteroids(days_ahead=7)
        
        target_asteroid = None
        for asteroid in asteroids:
            if asteroid.id == asteroid_id:
                target_asteroid = asteroid
                break
        
        if not target_asteroid:
            logger.error(f"Asteroid not found: {asteroid_id}")
            raise HTTPException(status_code=404, detail="Asteroid not found")
        
        prompt = generate_asteroid_prompt(target_asteroid)
        image_url = await generate_mock_image()
        
        result = {
            "asteroid_id": asteroid_id,
            "asteroid_name": target_asteroid.name,
            "generated_image_url": image_url,
            "prompt_used": prompt,
            "style": "realistic",
            "generated_at": datetime.now().isoformat(),
            "asteroid_data": {
                "diameter": target_asteroid.diameter_km,
                "is_hazardous": target_asteroid.is_hazardous,
                "distance_km": target_asteroid.distance_km,
                "velocity_kmh": target_asteroid.velocity_kmh,
                "threat_level": target_asteroid.threat_level,
                "approach_date": target_asteroid.approach_date
            }
        }
        
        logger.info(f"Successfully generated visual for asteroid: {asteroid_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating asteroid visual: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def generate_asteroid_prompt(asteroid) -> str:
    name = asteroid.name.replace('(', '').replace(')', '') if asteroid.name else "Unknown Asteroid"
    diameter = asteroid.diameter_km or 0
    is_hazardous = asteroid.is_hazardous
    
    base_prompt = f"Photorealistic space view of asteroid {name}"
    
    if diameter > 1:
        base_prompt += ", large rocky asteroid with detailed surface craters and formations"
    elif diameter > 0.5:
        base_prompt += ", medium-sized asteroid with visible surface details"
    else:
        base_prompt += ", small asteroid with rough rocky surface"
    
    if is_hazardous:
        base_prompt += ", potentially hazardous asteroid with dramatic lighting"
    
    base_prompt += ", deep space background with stars, dramatic lighting, NASA photography style, 8K resolution, cinematic composition"
    
    return base_prompt

async def generate_mock_image() -> str:
    random_seed = random.randint(100000, 999999)
    return f"https://picsum.photos/800/600?random={random_seed}&blur=1"
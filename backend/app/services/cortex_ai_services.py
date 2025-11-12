from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import structlog

logger = structlog.get_logger(__name__)

class AsteroidImageRequest(BaseModel):
    asteroid_id: str
    asteroid_name: str
    is_hazardous: bool = False
    diameter_km: float = 1.0
    velocity_kms: float = 15.0
    distance_au: float = 1.0
    style_preference: str = "mystical"

class AsteroidImageResponse(BaseModel):
    success: bool
    image_url: Optional[str] = None
    error_message: Optional[str] = None
    timestamp: str

class ChatCompletionRequest(BaseModel):
    messages: list
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 2048

class CortexAIService:
    def __init__(self):
        logger.warning("CortexAIService is deprecated")
        pass
    
    async def generate_asteroid_image(self, request: AsteroidImageRequest) -> AsteroidImageResponse:
        return AsteroidImageResponse(
            success=False,
            error_message="Service deprecated",
            timestamp=datetime.now().isoformat()
        )
    
    async def chat_completion(self, request: ChatCompletionRequest) -> Dict[str, Any]:
        return {"success": False, "error": "Service deprecated"}

cortex_ai_service = CortexAIService()

def get_cortex_ai_service() -> CortexAIService:
    return cortex_ai_service


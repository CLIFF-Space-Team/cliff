from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
import structlog

logger = structlog.get_logger(__name__)

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ModelType(str, Enum):
    GROK_4_FAST_REASONING = "grok-4-fast-reasoning"
    GPT_4 = "gpt-4"

class Message(BaseModel):
    role: str
    content: str

class ChatMessage(BaseModel):
    role: str
    content: str

class EnhancedChatRequest(BaseModel):
    messages: List[Message]
    model: Optional[ModelType] = ModelType.GROK_4_FAST_REASONING
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 4096

class EnhancedChatResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    model: Optional[str] = None
    timestamp: str
    error: Optional[str] = None

class EnhancedCortexChatService:
    def __init__(self):
        logger.warning("EnhancedCortexChatService is deprecated")
        pass
    
    async def chat(self, request: EnhancedChatRequest) -> EnhancedChatResponse:
        return EnhancedChatResponse(
            success=False,
            error="Service deprecated",
            timestamp=datetime.now().isoformat()
        )

enhanced_cortex_chat_service = EnhancedCortexChatService()
enhanced_cortex_service = enhanced_cortex_chat_service

def get_enhanced_cortex_chat_service() -> EnhancedCortexChatService:
    return enhanced_cortex_chat_service


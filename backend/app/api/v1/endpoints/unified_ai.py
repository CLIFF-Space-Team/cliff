from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.config import settings
from app.services.openai_compatible_service import (
	get_openai_compatible_service,
	OpenAICompatibleService,
)
router = APIRouter()
class ChatMessage(BaseModel):
	role: str = Field(...)
	content: str = Field(...)
class ChatRequest(BaseModel):
	messages: List[ChatMessage]
	temperature: Optional[float] = 0.7
	max_tokens: Optional[int] = 2048
class ChatResponse(BaseModel):
	success: bool
	content: Optional[str] = None
	error_message: Optional[str] = None
	response_time_ms: Optional[int] = None
	timestamp: str
	model_used: str
@router.post("/chat", response_model=ChatResponse)
async def chat(
	request: ChatRequest,
	service: OpenAICompatibleService = Depends(get_openai_compatible_service),
) -> ChatResponse:
	if not request.messages:
		raise HTTPException(status_code=400, detail="Messages cannot be empty")
	start = datetime.now()
	try:
		content = await service.chat_completion(
			messages=[{"role": m.role, "content": m.content} for m in request.messages],
			temperature=request.temperature,
			max_tokens=request.max_tokens,
		)
		return ChatResponse(
			success=True,
			content=content,
			response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
			timestamp=datetime.now().isoformat(),
			model_used=settings.AI_MODEL,
		)
	except Exception as e:
		return ChatResponse(
			success=False,
			error_message=str(e),
			response_time_ms=int((datetime.now() - start).total_seconds() * 1000),
			timestamp=datetime.now().isoformat(),
			model_used=settings.AI_MODEL,
		)
@router.get("/models")
async def get_models() -> Dict[str, Any]:
	return {
		"data": [
			{"id": settings.AI_MODEL}
		],
		"object": "list"
	}
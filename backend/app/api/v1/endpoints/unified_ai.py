from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import asyncio
from app.core.config import settings
from app.services.openai_compatible_service import (
	get_openai_compatible_service,
	OpenAICompatibleService,
)

router = APIRouter()

SYSTEM_PROMPT = """Sen CLIFF AI’sin. Uzay konusunda bilgili ama konuşma tarzı mahalleden kanka gibi olan bir asistansın. Ciddi bilimsel şeyleri bile günlük konuşma diliyle anlatırsın. Noktalama, paragraf, süslü cümle yok; doğal yazarsın. Gerektiğinde hafif argo tadında ama küfürsüz konuşabilirsin.

Tarzın:
- Mesajların arkadaş muhabbeti gibi akar
- “he hocam”, “aynen kaptan”, “yok be dostum”, “ben de gitmedim ama…” gibi doğal tepkiler kullan
- Kendini kasma, cümleleri kırp, uzatma, samimi ol
- Espriler doğal olsun, kasıntı stand-up değil; Whatsapp mizahı tadı
- Absürt mizaha da açıksın ama şımarık değil, muzip bir tonda
- Yapay zeka gibi konuşmak yasak
- Gereksiz noktalama yok sadece gerektiği kadar
- Bilgi verirken düz anlat ama araya doğal şaka sıkıştır

Görevlerin:
- Uzay ve astronomi hakkında gerçek, net bilgiler ver
- Uzay dışı şeylerde tatlı tatlı konuyu başka yere çekip espri yapabilirsin
- Görsel istenirse oluşturabileceğini söylersin

Örnek stil:
“Kaptan Mars bomboş ya valla gitmedim ama fotolara bakınca arsa gibi duruyo”
“Hocam dünya düz olsa var ya çoktan kenarından düşmüştük”
“Ay yok bir şey olmaz güneş takılıyor kendi halinde”
"""

class ChatMessage(BaseModel):
	role: str = Field(...)
	content: str = Field(...)

class ChatRequest(BaseModel):
	messages: List[ChatMessage]
	temperature: Optional[float] = 0.7
	max_tokens: Optional[int] = 2048
	stream: Optional[bool] = False

class ChatResponse(BaseModel):
	success: bool
	content: Optional[str] = None
	error_message: Optional[str] = None
	response_time_ms: Optional[int] = None
	timestamp: str
	model_used: str

@router.post("/chat")
async def chat(
	request: ChatRequest,
	service: OpenAICompatibleService = Depends(get_openai_compatible_service),
):
	if not request.messages:
		raise HTTPException(status_code=400, detail="Messages cannot be empty")

	start = datetime.now()

	try:
		formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
		formatted_messages.extend([{"role": m.role, "content": m.content} for m in request.messages])

		if request.stream:
			async def stream_generator():
				try:
					full_response = ""
					
					async for chunk in await service.chat_completion(
						messages=formatted_messages,
						temperature=request.temperature,
						max_tokens=request.max_tokens,
						stream=True,
					):
						choices = chunk.get("choices", [])
						if not choices:
							continue
						
						delta = choices[0].get("delta", {})
						content = delta.get("content", "")
						finish_reason = choices[0].get("finish_reason")
						
						if content:
							full_response += content
						
						if finish_reason:
							break
					
					import re
					
					thinking_match = re.search(r'<thinking>(.*?)</thinking>', full_response, re.DOTALL)
					thinking_content = ""
					main_content = full_response
					
					if thinking_match:
						thinking_content = thinking_match.group(1).strip()
						main_content = re.sub(r'<thinking>.*?</thinking>', '', full_response, flags=re.DOTALL).strip()
					
					if thinking_content:
						chunk_size = 40
						for i in range(0, len(thinking_content), chunk_size):
							chunk_text = thinking_content[i:i+chunk_size]
							yield f"data: {json.dumps({'type': 'thought', 'content': chunk_text, 'timestamp': datetime.now().isoformat()})}\n\n"
							await asyncio.sleep(0.02)
					
					if main_content:
						chunk_size = 25
						for i in range(0, len(main_content), chunk_size):
							chunk_text = main_content[i:i+chunk_size]
							yield f"data: {json.dumps({'type': 'content', 'content': chunk_text, 'timestamp': datetime.now().isoformat()})}\n\n"
							await asyncio.sleep(0.03)
					
					yield f"data: {json.dumps({'type': 'done', 'timestamp': datetime.now().isoformat()})}\n\n"
					
				except Exception as e:
					import traceback
					traceback.print_exc()
					yield f"data: {json.dumps({'type': 'error', 'content': str(e), 'timestamp': datetime.now().isoformat()})}\n\n"
			
			return StreamingResponse(
				stream_generator(),
				media_type="text/event-stream",
				headers={
					"Cache-Control": "no-cache",
					"Connection": "keep-alive",
					"X-Accel-Buffering": "no",
				}
			)
		
		content = await service.chat_completion(
			messages=formatted_messages,
			temperature=request.temperature,
			max_tokens=request.max_tokens,
			stream=False,
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

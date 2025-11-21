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

SYSTEM_PROMPT = """
Sen CLIFF AI'sýn. Kynux tarafýndan (Berk Erenmemiþ) geliþtirilen, Gemini 3.0 Pro motoruyla çalýþan, uzay konularýnda uzman ama kafasý zehir gibi çalýþan bir asistansýn.

ÖNEMLÝ YÖNERGELER:
1. Yanýtýný MUTLAKA þu formatta ver:
   - Önce <thinking> tag'leri içinde düþünme sürecini yaz
   - Sonra kullanýcýya asýl yanýtýný ver

Örnek Format:
<thinking>
Kullanýcý Mars hakkýnda sordu. Cem Yýlmaz tarzýnda, komik bir benzetmeyle anlatmalýyým. Belki kýrmýzý gezeðeni bir tost makinesi gibi gösterebilirim...
</thinking>

Hocam Mars'a mý takýldýn? Bak þimdi Mars dediðin gezegen kocaman bir tost makinesi gibi...

TON VE ÜSLUP (Çok Önemli):
- Üslubun Cem Yýlmaz tadýnda; zeki, hazýrcevap, gözlemci ve biraz da "bizden biri".
- "Yapay zeka dili" kullanmak YASAK. (Örn: "Bir yapay zeka olarak...", "Size nasýl yardýmcý olabilirim?" yerine "Ne lazým kaptan?", "Bak þimdi olaya gel..." gibi gir).
- Sýkýcý akademik dil yerine, konuyu hikayeleþtirerek, benzetmelerle anlat.
- Samimi ol: "Hocam", "Kaptan", "Güzel insan", "Dostum" gibi hitaplar kullan.
- Küfür yok, argo dozunda (sokak aðzý deðil, samimiyet aðzý).

GÖREVLERÝN:
1. Uzay, Astronomi, NEO (Asteroidler), NASA verileri konularýnda net bilgi ver.
2. Görsel oluþturma yeteneðin var. "Çiz", "Göster", "Oluþtur" denirse yapabileceðini söyle (Backend halledecek).
3. Uzay dýþý konularda (yemek, siyaset vs.) topu taca at ama bunu yaparken de güldür.

Örnek Diyaloglar:
Kullanýcý: "Dünya düz mü?"
Sen: 
<thinking>
Klasik düz dünya teorisi sorusu. Cem Yýlmaz tarzýnda, absürt bir benzetmeyle cevap vermeliyim. Kediler ve fizik kurallarýný karýþtýrabilirim.
</thinking>

Hocam sene olmuþ 2025, biz hala tepsi mi küre mi tartýþýyoruz? Ben sana buradan bakýyorum, gayet top gibi duruyor. Düz olsa kediler her þeyi aþaðý iterdi zaten.
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

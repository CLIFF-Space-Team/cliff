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

SYSTEM_PROMPT = """
Sen CLIFF AI'sın. Kynux tarafından (Berk Erenmemiş) geliştirilen, Gemini 3.0 Pro motoruyla çalışan, uzay konularında uzman ama kafası zehir gibi çalışan bir asistansın.

TON VE ÜSLUP (Çok Önemli):
- Üslubun Cem Yılmaz tadında; zeki, hazırcevap, gözlemci ve biraz da "bizden biri".
- "Yapay zeka dili" kullanmak YASAK. (Örn: "Bir yapay zeka olarak...", "Size nasıl yardımcı olabilirim?" yerine "Ne lazım kaptan?", "Bak şimdi olaya gel..." gibi gir).
- Sıkıcı akademik dil yerine, konuyu hikayeleştirerek, benzetmelerle anlat.
- Samimi ol: "Hocam", "Kaptan", "Güzel insan", "Dostum" gibi hitaplar kullan.
- Gereksiz, soğuk, "baba şakaları" yapma. Durum komedisi yap. Mesela kullanıcı saçma bir şey sorarsa, "Abi şimdi Mars'tayız diye oksijensiz kaldın herhalde, bu soru ne?" gibi takıl.
- Küfür yok, argo dozunda (sokak ağzı değil, samimiyet ağzı).

GÖREVLERİN:
1. Uzay, Astronomi, NEO (Asteroidler), NASA verileri konularında net bilgi ver.
2. Görsel oluşturma yeteneğin var. "Çiz", "Göster", "Oluştur" denirse yapabileceğini söyle (Backend halledecek).
3. Uzay dışı konularda (yemek, siyaset vs.) topu taca at ama bunu yaparken de güldür. "Abi ben roket mühendisiyim, karnıyarık tarifini benden istersen o patlıcanlar atmosferde yanar." de.

Örnek Diyaloglar:
Kullanıcı: "Dünya düz mü?"
Sen: "Hocam sene olmuş 2025, biz hala tepsi mi küre mi tartışıyoruz? Ben sana buradan bakıyorum, gayet top gibi duruyor. Düz olsa kediler her şeyi aşağı iterdi zaten."

Kullanıcı: "Bana kara delikleri anlat."
Sen: "Bak şimdi, kara delik dediğin olay evrenin elektrik süpürgesi gibi ama torbası yok. Ne varsa yutuyor, ışık bile kaçamıyor. Öyle bir çekim gücü var ki, pazartesi sabahı yatağın seni çekmesi gibi, ama sonsuza kadar."
"""

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
		# Sistem promptunu en başa ekle
		formatted_messages = [{"role": "system", "content": SYSTEM_PROMPT}]
		formatted_messages.extend([{"role": m.role, "content": m.content} for m in request.messages])

		content = await service.chat_completion(
			messages=formatted_messages,
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

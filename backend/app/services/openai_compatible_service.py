import httpx
from typing import List, Dict, Optional
from app.core.config import settings
class OpenAICompatibleService:
	def __init__(self) -> None:
		self.base_url = settings.AI_BASE_URL.rstrip("/")
		self.api_key = getattr(settings, "AI_API_KEY", None)
		self.model = settings.AI_MODEL
	def _headers(self) -> Dict[str, str]:
		headers: Dict[str, str] = {"Content-Type": "application/json"}
		if self.api_key:
			headers["Authorization"] = f"Bearer {self.api_key}"
		return headers
	async def chat_completion(
		self,
		messages: List[Dict[str, str]],
		temperature: Optional[float] = 0.7,
		max_tokens: Optional[int] = 2048,
	) -> str:
		url = f"{self.base_url}/v1/chat/completions"
		payload: Dict[str, object] = {
			"model": self.model,
			"messages": messages,
			"temperature": temperature,
			"max_tokens": max_tokens,
		}
		async with httpx.AsyncClient(timeout=60) as client:
			resp = await client.post(url, json=payload, headers=self._headers())
			resp.raise_for_status()
			data = resp.json()
		choices = data.get("choices") or []
		if not choices:
			raise RuntimeError("Empty choices from AI provider")
		message = choices[0].get("message") or {}
		content = message.get("content")
		if not content:
			raise RuntimeError("No content in AI response")
		return str(content)
	async def list_models(self) -> Dict[str, object]:
		url = f"{self.base_url}/v1/models"
		async with httpx.AsyncClient(timeout=30) as client:
			resp = await client.get(url, headers=self._headers())
			resp.raise_for_status()
			return resp.json()
openai_compatible_service = OpenAICompatibleService()
async def get_openai_compatible_service() -> OpenAICompatibleService:
	return openai_compatible_service

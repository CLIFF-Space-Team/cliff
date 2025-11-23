import httpx
from typing import List, Dict, Optional, Any
from app.core.config import settings
import structlog

logger = structlog.get_logger(__name__)

class GoogleSearchAIService:
    def __init__(self) -> None:
        # Default fallback if config not set
        self.base_url = getattr(settings, "GOOGLE_SEARCH_AI_BASE_URL", "https://xxx.kynux.dev").rstrip("/")
        self.api_key = getattr(settings, "GOOGLE_SEARCH_AI_API_KEY", None)
        # Use existing model or a specific one if needed, but the user example didn't specify a different model name
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
        stream: bool = False,
        google_search: bool = True,
        url_context: bool = True,
    ) -> str:
        url = f"{self.base_url}/v1/chat/completions"
        
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
            "google_search": google_search,
            "url_context": url_context
        }
        
        logger.info(f"Sending request to Google Search AI: {url}", google_search=google_search)
        
        if stream:
            # Not implemented for this use case yet as we need full response for parsing
            raise NotImplementedError("Streaming not supported for this service yet")
        
        async with httpx.AsyncClient(timeout=120) as client:
            try:
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
                
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error from AI service: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Error calling AI service: {str(e)}")
                raise

google_search_ai_service = GoogleSearchAIService()

async def get_google_search_ai_service() -> GoogleSearchAIService:
    return google_search_ai_service


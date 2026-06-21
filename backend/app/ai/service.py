"""High-level AI service — wraps the chat client with prompts + business logic."""

from __future__ import annotations

from typing import Any, AsyncIterator, Dict, List, Optional

from app.ai import prompts
from app.ai.client import TRUSTED_SPACE_DOMAINS, AIClient, get_client
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.domain.risk import RiskRecord
from app.pipeline import risk_store

log = get_logger(__name__)


class AIService:
    def __init__(self, client: Optional[AIClient] = None) -> None:
        self._client = client or get_client()

    async def explain_threat(self, neo_id: str, *, language: str = "tr", with_search: bool = True) -> Dict[str, Any]:
        record = await risk_store.get(neo_id)
        if record is None:
            raise NotFoundError(f"No risk record for NEO {neo_id}", details={"neo_id": neo_id})
        return await self.explain_threat_record(record, language=language, with_search=with_search)

    async def explain_threat_record(
        self,
        record: RiskRecord,
        *,
        language: str = "tr",
        with_search: bool = True,
    ) -> Dict[str, Any]:
        """Produce a threat briefing.

        When `with_search=True` and the upstream supports the Responses API,
        the model is allowed to issue web searches against trusted astronomy
        sources (NASA / JPL / ESA / arXiv) so it can ground its answer in the
        latest observations and discovery notes for THIS specific NEO. The
        returned dict shape mirrors `chat_with_search()`:

            {
                "text":       str,
                "citations":  [{"url": ..., "title": ...}],
                "searched":   bool,   # did the model actually search
                "fallback":   bool,   # True when web_search wasn't available
            }
        """
        messages = [
            {"role": "system", "content": prompts.THREAT_EXPLAINER_SYSTEM},
            {
                "role": "user",
                "content": prompts.threat_explanation_user_prompt(record, language=language),
            },
        ]

        if not with_search or not self._client.supports_web_search:
            text = await self._client.chat(messages, temperature=0.3, max_tokens=2000)
            return {"text": text, "citations": [], "searched": False, "fallback": True}

        return await self._client.chat_with_search(
            messages,
            max_tokens=2000,
            allowed_domains=TRUSTED_SPACE_DOMAINS,
        )

    async def chat(
        self,
        history: List[Dict[str, str]],
        query: str,
        *,
        temperature: float = 0.7,
        with_search: bool = False,
    ) -> str:
        messages = prompts.chat_messages(history, query)
        return await self._client.chat(messages, temperature=temperature, with_search=with_search)

    async def chat_stream(
        self,
        history: List[Dict[str, str]],
        query: str,
        *,
        temperature: float = 0.7,
        with_search: bool = False,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Yield typed events from the upstream stream:
        - {"type": "delta", "content": str}
        - {"type": "citations", "urls": [str, ...]}  (final, optional)
        """
        messages = prompts.chat_messages(history, query)
        async for evt in self._client.stream(messages, temperature=temperature, with_search=with_search):
            yield evt


_singleton: Optional[AIService] = None


def get_service() -> AIService:
    global _singleton
    if _singleton is None:
        _singleton = AIService()
    return _singleton

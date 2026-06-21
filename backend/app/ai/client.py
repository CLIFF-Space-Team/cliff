"""OpenAI-compatible chat completion client.

Handles the GPT-5/o1/o3 family quirk: those models reject `max_tokens` and
custom `temperature`, expecting `max_completion_tokens` instead. We sniff the
model id and adjust the payload.

Also exposes `chat_with_search()` for the Responses API + web_search tool —
used to ground threat-explainer output in fresh NASA / JPL / ESA / arXiv
sources. Falls back to plain Chat Completions if the upstream rejects
Responses-API calls (proxy compatibility).
"""

from __future__ import annotations

import json
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError, UpstreamError
from app.core.logging import get_logger

log = get_logger(__name__)


# Trusted astronomy / space-news domains. The web_search tool is told to
# prefer these so the AI grounds its answers in scientific / official
# sources instead of random blogs.
TRUSTED_SPACE_DOMAINS: List[str] = [
    "nasa.gov",
    "jpl.nasa.gov",
    "cneos.jpl.nasa.gov",
    "ssd.jpl.nasa.gov",
    "minorplanetcenter.net",
    "esa.int",
    "esahubble.org",
    "spaceweather.com",
    "skyandtelescope.org",
    "space.com",
    "universetoday.com",
    "arxiv.org",
    "science.org",
    "nature.com",
    "scientificamerican.com",
    "tubitak.gov.tr",  # TR resmi bilim
    "uzay.gov.tr",
]


class AIClient:
    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ) -> None:
        self.base_url = (base_url or settings.AI_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.AI_API_KEY
        self.model = model or settings.AI_MODEL

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    @property
    def _is_reasoning_family(self) -> bool:
        """GPT-5 / o1 / o3 / o4 reject max_tokens and non-default temperature."""
        if "openai.com" not in self.base_url.lower():
            return False
        m = self.model.lower()
        return m.startswith(("gpt-5", "o1", "o3", "o4"))

    @property
    def supports_responses_api(self) -> bool:
        """Both OpenAI (api.openai.com) and xAI (api.x.ai) expose `/v1/responses`
        with the same OpenAI-compatible `tools=[{type:web_search}]` schema, so
        we route web-search requests there. xAI's older `search_parameters`
        path on chat-completions was deprecated (returns 410 with a pointer
        to the Agent Tools API), so this is the only working option now.
        """
        host = self.base_url.lower()
        return "openai.com" in host or "x.ai" in host

    @property
    def supports_web_search(self) -> bool:
        """Backwards-compatible alias kept so callers don't need to know
        which provider they're hitting."""
        return self.supports_responses_api

    def _build_payload(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: float,
        max_tokens: int,
        stream: bool,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": stream,
        }
        if self._is_reasoning_family:
            payload["max_completion_tokens"] = max_tokens
            # Reasoning models only accept the default temperature; omit it.
        else:
            payload["max_tokens"] = max_tokens
            payload["temperature"] = temperature
        return payload

    async def chat(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        with_search: bool = False,
    ) -> str:
        if not self.configured:
            raise ServiceUnavailableError(
                "AI provider not configured (AI_API_KEY missing)",
                code="AI_NOT_CONFIGURED",
            )

        # Web-search lives on /v1/responses for both OpenAI and xAI; route
        # there and return just the text. Plain chat stays on /v1/chat/completions.
        if with_search and self.supports_responses_api:
            result = await self.chat_with_search(messages, max_tokens=max_tokens)
            return result["text"]

        url = f"{self.base_url}/v1/chat/completions"
        payload = self._build_payload(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self._headers())
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                body_text = ""
                try:
                    body_text = exc.response.text[:600]
                except Exception:
                    body_text = "<unreadable>"
                log.warning(
                    "ai.upstream_error",
                    status=exc.response.status_code,
                    body=body_text,
                    model=self.model,
                )
                raise UpstreamError(
                    f"AI provider returned {exc.response.status_code}",
                    code="AI_UPSTREAM",
                    details={"status": exc.response.status_code, "body": body_text},
                ) from exc
            except httpx.HTTPError as exc:
                raise UpstreamError(f"AI provider unreachable: {exc!r}", code="AI_NETWORK") from exc

        try:
            data = response.json()
            return str(data["choices"][0]["message"]["content"])
        except (KeyError, IndexError, ValueError) as exc:
            raise UpstreamError("AI provider returned unexpected payload", code="AI_BAD_PAYLOAD") from exc

    async def stream(
        self,
        messages: List[Dict[str, str]],
        *,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        with_search: bool = False,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream the model's reply.

        Yields dicts so the caller can distinguish content tokens from
        citation metadata that xAI emits at the *end* of the stream:

            {"type": "delta", "content": str}
            {"type": "citations", "urls": [str, ...]}

        For OpenAI/proxies without live search the second event simply never
        fires.
        """
        if not self.configured:
            raise ServiceUnavailableError(
                "AI provider not configured (AI_API_KEY missing)",
                code="AI_NOT_CONFIGURED",
            )

        # When web search is requested, route to /v1/responses streaming —
        # that's the only endpoint that exposes the `web_search` tool. The
        # SSE event shape is different from chat-completions, so we have a
        # dedicated parser for it.
        if with_search and self.supports_responses_api:
            async for evt in self._stream_responses(messages, max_tokens=max_tokens):
                yield evt
            return

        url = f"{self.base_url}/v1/chat/completions"
        payload = self._build_payload(
            messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )

        async with httpx.AsyncClient(timeout=180.0) as client:
            async with client.stream("POST", url, json=payload, headers=self._headers()) as response:
                async for evt in self._consume_stream(response):
                    yield evt

    async def _consume_stream(self, response: httpx.Response) -> AsyncIterator[Dict[str, Any]]:
        """Drain an open SSE response into typed delta/citation events."""
        if response.status_code >= 400:
            body_text = ""
            try:
                body_text = (await response.aread()).decode(errors="ignore")[:600]
            except Exception:
                body_text = "<unreadable>"
            log.warning(
                "ai.upstream_error",
                status=response.status_code,
                body=body_text,
                model=self.model,
            )
            raise UpstreamError(
                f"AI provider returned {response.status_code}",
                code="AI_UPSTREAM",
                details={"status": response.status_code, "body": body_text},
            )

        final_citations: List[str] = []

        async for raw_line in response.aiter_lines():
            line = raw_line.strip()
            if not line or not line.startswith("data:"):
                continue
            data_str = line[len("data:") :].strip()
            if data_str == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
            except ValueError:
                continue

            cits = chunk.get("citations")
            if isinstance(cits, list) and cits:
                for c in cits:
                    if isinstance(c, str):
                        if c not in final_citations:
                            final_citations.append(c)
                    elif isinstance(c, dict):
                        u = c.get("url")
                        if isinstance(u, str) and u not in final_citations:
                            final_citations.append(u)

            try:
                choices = chunk.get("choices") or []
                if not choices:
                    continue
                delta = choices[0].get("delta", {}) or {}
                content = delta.get("content")
                if content:
                    yield {"type": "delta", "content": content}
            except (KeyError, IndexError):
                continue

        if final_citations:
            yield {"type": "citations", "urls": final_citations}

    async def chat_with_search(
        self,
        messages: List[Dict[str, Any]],
        *,
        max_tokens: int = 2000,
        allowed_domains: Optional[List[str]] = None,
        external_web_access: bool = True,
    ) -> Dict[str, Any]:
        """Single-shot **Responses API** call with the `web_search` tool enabled.

        The model decides on its own whether to issue search queries; if it does,
        the cited URLs come back in `citations`. The plain answer text is in
        `text`. If the upstream provider doesn't expose /v1/responses (e.g. a
        proxy), we fall back to a plain chat completion *without* search.

        Returns:
            {
                "text": str,
                "citations": [{"url": str, "title": str, "start": int, "end": int}],
                "searched": bool,         # did the model actually issue a query
                "fallback": bool,         # True if we fell back to chat.completions
            }
        """
        if not self.configured:
            raise ServiceUnavailableError(
                "AI provider not configured (AI_API_KEY missing)",
                code="AI_NOT_CONFIGURED",
            )

        # Proxies without /v1/responses fall back to plain chat (no search).
        if not self.supports_responses_api:
            text = await self.chat(messages, max_tokens=max_tokens)
            return {"text": text, "citations": [], "searched": False, "fallback": True}

        url = f"{self.base_url}/v1/responses"
        payload = self._build_responses_payload(
            messages,
            max_tokens=max_tokens,
            allowed_domains=allowed_domains,
            external_web_access=external_web_access,
            stream=False,
        )

        async with httpx.AsyncClient(timeout=180.0) as client:
            try:
                response = await client.post(url, json=payload, headers=self._headers())
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                body_text = ""
                try:
                    body_text = exc.response.text[:600]
                except Exception:
                    body_text = "<unreadable>"
                log.warning(
                    "ai.responses_upstream_error",
                    status=exc.response.status_code,
                    body=body_text,
                    model=self.model,
                )
                # 404 / 400 likely means the provider doesn't accept Responses
                # API → fall back transparently.
                if exc.response.status_code in (400, 404, 405, 501):
                    log.info("ai.responses_falling_back_to_chat", reason=exc.response.status_code)
                    text = await self.chat(messages, max_tokens=max_tokens)
                    return {"text": text, "citations": [], "searched": False, "fallback": True}
                raise UpstreamError(
                    f"AI provider returned {exc.response.status_code}",
                    code="AI_UPSTREAM",
                    details={"status": exc.response.status_code, "body": body_text},
                ) from exc
            except httpx.HTTPError as exc:
                raise UpstreamError(f"AI provider unreachable: {exc!r}", code="AI_NETWORK") from exc

        data = response.json()
        return _parse_responses_payload(data)

    def _build_responses_payload(
        self,
        messages: List[Dict[str, Any]],
        *,
        max_tokens: int,
        allowed_domains: Optional[List[str]] = None,
        external_web_access: bool = True,
        stream: bool,
    ) -> Dict[str, Any]:
        """Build a /v1/responses request body with the web_search tool enabled."""
        web_search_tool: Dict[str, Any] = {"type": "web_search"}
        if allowed_domains:
            # xAI honors the same `filters.allowed_domains` shape OpenAI uses
            # (capped at ~100 entries upstream — we forward as-is).
            web_search_tool["filters"] = {"allowed_domains": allowed_domains[:100]}
        if not external_web_access:
            web_search_tool["external_web_access"] = False

        payload: Dict[str, Any] = {
            "model": self.model,
            "input": messages,
            "tools": [web_search_tool],
            "max_output_tokens": max_tokens,
        }
        if stream:
            payload["stream"] = True
        return payload

    async def _stream_responses(
        self,
        messages: List[Dict[str, Any]],
        *,
        max_tokens: int,
    ) -> AsyncIterator[Dict[str, Any]]:
        """Stream /v1/responses with the web_search tool active.

        Yields the same shape as `stream()`:
            {"type": "delta", "content": str}
            {"type": "citations", "urls": [str, ...]}

        SSE event names from the Responses API include
        `response.output_text.delta` (token deltas) and `response.completed`
        (final aggregate). Citations live as `url_citation` annotations on
        message items; we harvest them and yield once at the end.
        """
        url = f"{self.base_url}/v1/responses"
        payload = self._build_responses_payload(
            messages,
            max_tokens=max_tokens,
            stream=True,
        )

        async with httpx.AsyncClient(timeout=240.0) as client:
            async with client.stream("POST", url, json=payload, headers=self._headers()) as response:
                if response.status_code >= 400:
                    body_text = ""
                    try:
                        body_text = (await response.aread()).decode(errors="ignore")[:600]
                    except Exception:
                        body_text = "<unreadable>"
                    log.warning(
                        "ai.responses_stream_upstream_error",
                        status=response.status_code,
                        body=body_text,
                        model=self.model,
                    )
                    raise UpstreamError(
                        f"AI provider returned {response.status_code}",
                        code="AI_UPSTREAM",
                        details={"status": response.status_code, "body": body_text},
                    )

                citations: List[str] = []
                seen: set[str] = set()

                async for raw_line in response.aiter_lines():
                    line = raw_line.strip()
                    if not line.startswith("data:"):
                        continue
                    data_str = line[len("data:") :].strip()
                    if not data_str or data_str == "[DONE]":
                        continue
                    try:
                        chunk = json.loads(data_str)
                    except ValueError:
                        continue

                    evt_type = chunk.get("type", "")
                    # Token-level deltas from the message item.
                    if evt_type == "response.output_text.delta":
                        delta = chunk.get("delta")
                        if isinstance(delta, str) and delta:
                            yield {"type": "delta", "content": delta}
                        continue

                    # Final aggregate — pull text out if we somehow missed deltas
                    # and harvest citations from message annotations.
                    if evt_type == "response.completed":
                        resp = chunk.get("response") or {}
                        for item in resp.get("output", []) or []:
                            if item.get("type") != "message":
                                continue
                            for content in item.get("content", []) or []:
                                for ann in content.get("annotations", []) or []:
                                    if ann.get("type") != "url_citation":
                                        continue
                                    u = ann.get("url")
                                    if isinstance(u, str) and u and u not in seen:
                                        seen.add(u)
                                        citations.append(u)

                if citations:
                    yield {"type": "citations", "urls": citations}


def _parse_responses_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Pluck the text + citation metadata out of a /v1/responses payload.

    The Responses API returns a list of typed `output` entries:
      - `web_search_call`  — the model issued a query
      - `message`          — the assistant's actual reply, with annotations
        carrying URL citations.

    We collect everything into a single flat shape the callers can work with.
    """
    text_parts: List[str] = []
    citations: List[Dict[str, Any]] = []
    searched = False

    # The handy convenience field, if present, is the canonical text.
    if "output_text" in data and isinstance(data["output_text"], str):
        text_parts.append(data["output_text"])

    for item in data.get("output", []) or []:
        item_type = item.get("type")
        if item_type == "web_search_call":
            searched = True
            continue
        if item_type == "message":
            for chunk in item.get("content", []) or []:
                if chunk.get("type") in ("output_text", "text"):
                    if not text_parts:  # only fall back if output_text was absent
                        if isinstance(chunk.get("text"), str):
                            text_parts.append(chunk["text"])
                    for ann in chunk.get("annotations", []) or []:
                        if ann.get("type") == "url_citation":
                            citations.append(
                                {
                                    "url": ann.get("url", ""),
                                    "title": ann.get("title", "") or ann.get("url", ""),
                                    "start": ann.get("start_index"),
                                    "end": ann.get("end_index"),
                                }
                            )

    # De-dup citations by URL while preserving order.
    seen: set[str] = set()
    deduped: List[Dict[str, Any]] = []
    for c in citations:
        u = c.get("url", "")
        if not u or u in seen:
            continue
        seen.add(u)
        deduped.append(c)

    return {
        "text": "".join(text_parts).strip(),
        "citations": deduped,
        "searched": searched,
        "fallback": False,
    }


_singleton: Optional[AIClient] = None


def get_client() -> AIClient:
    global _singleton
    if _singleton is None:
        _singleton = AIClient()
    return _singleton

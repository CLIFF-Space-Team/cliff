"""AI endpoints — chat + threat explanation + tts."""

from __future__ import annotations

import io
import json
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.ai.service import get_service
from app.ai.tts import TtsError
from app.ai.tts import synthesize as tts_synthesize
from app.core.config import settings
from app.core.rate_limit import rate_limit_dep, rate_limit_queue_dep

router = APIRouter()


# Layered per-IP limits — a request must clear every dependency.
# Per-minute bounds use the QUEUE limiter: bursts wait their turn instead
# of slapping the user with 429. Per-hour bounds stay as hard 429s so a
# pathological client can't hold open dozens of paid-token requests.
_chat_minute_dep = rate_limit_queue_dep(
    limit_per_window=settings.AI_CHAT_LIMIT_PER_MINUTE,
    window_seconds=60,
    name="ai_chat_min",
    max_wait_seconds=25.0,
)
_chat_hour_dep = rate_limit_dep(
    limit=settings.AI_CHAT_LIMIT_PER_HOUR,
    window_seconds=3600,
    name="ai_chat_hour",
)
_explain_minute_dep = rate_limit_queue_dep(
    limit_per_window=settings.AI_EXPLAIN_LIMIT_PER_MINUTE,
    window_seconds=60,
    name="ai_explain_min",
    max_wait_seconds=25.0,
)
_explain_hour_dep = rate_limit_dep(
    limit=settings.AI_EXPLAIN_LIMIT_PER_HOUR,
    window_seconds=3600,
    name="ai_explain_hour",
)
# Global ceiling — also queued. Single sentinel, all clients share the bucket.
_global_minute_dep = rate_limit_queue_dep(
    limit_per_window=settings.AI_GLOBAL_LIMIT_PER_MINUTE,
    window_seconds=60,
    name="ai_global_min",
    max_wait_seconds=25.0,
)
# TTS dedicated buckets — synthesis is paid + slow, give it its own budget.
_tts_minute_dep = rate_limit_queue_dep(
    limit_per_window=settings.TTS_LIMIT_PER_MINUTE,
    window_seconds=60,
    name="tts_min",
    max_wait_seconds=20.0,
)
_tts_hour_dep = rate_limit_dep(
    limit=settings.TTS_LIMIT_PER_HOUR,
    window_seconds=3600,
    name="tts_hour",
)


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(system|user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    history: List[ChatMessage] = Field(default_factory=list)
    query: str
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    stream: bool = True  # streaming is the default UX
    with_search: bool = True  # let Grok ground answers in live web data


class ChatResponse(BaseModel):
    request_id: str
    reply: str
    model: str
    citations: List[str] = Field(default_factory=list)


class ThreatExplanationRequest(BaseModel):
    neo_id: str
    language: str = Field("tr", pattern="^(tr|en)$")
    with_search: bool = True


class ThreatCitation(BaseModel):
    url: str
    title: str


class ThreatExplanationResponse(BaseModel):
    neo_id: str
    explanation: str
    language: str
    searched: bool = False
    fallback: bool = False
    citations: List[ThreatCitation] = Field(default_factory=list)
    model: str


class TtsRequest(BaseModel):
    """Text-to-speech request. `voice_id` defaults to the configured server
    default; clients normally don't pass one. Voice tuning knobs use the
    upstream's 0..1 conventions; the server passes them through unchanged."""

    text: str = Field(..., min_length=1, max_length=2000)
    voice_id: Optional[str] = Field(default=None, max_length=64)
    voice_speed: float = Field(1.0, ge=0.7, le=1.2)
    voice_stability: float = Field(0.5, ge=0.0, le=1.0)
    voice_similarity: float = Field(0.75, ge=0.0, le=1.0)
    voice_style: float = Field(0.0, ge=0.0, le=1.0)
    voice_speaker_boost: bool = True
    audio_format: str = Field("mp3", pattern="^(mp3|wav)$")


@router.get("/models")
async def models() -> dict:
    """Lists the active model + which capabilities the upstream supports.
    The frontend uses `web_search` to decide whether to surface the
    "Kaynaklar" panel after a threat explanation.
    """
    from app.ai.client import get_client

    client = get_client()
    return {
        "default": settings.AI_MODEL,
        "available": [settings.AI_MODEL] if settings.AI_API_KEY else [],
        "configured": bool(settings.AI_API_KEY),
        "capabilities": {
            "web_search": client.supports_web_search and bool(settings.AI_API_KEY),
            "streaming": True,
            "tts": bool(settings.TTS_API_KEY and settings.TTS_BASE_URL),
        },
    }


@router.post(
    "/tts",
    dependencies=[
        Depends(_tts_minute_dep),
        Depends(_tts_hour_dep),
    ],
)
async def text_to_speech(request: TtsRequest) -> StreamingResponse:
    """Synthesize speech audio from `text` and stream it back.

    The audio is produced by an asynchronous TTS upstream, but the client
    sees a normal blocking HTTP response — the server hides the polling.
    Output is `audio/mpeg` for mp3 and `audio/wav` for wav. Returns 503
    when the service is not configured."""
    try:
        audio_bytes = await tts_synthesize(
            request.text,
            voice_id=request.voice_id,
            voice_speed=request.voice_speed,
            voice_stability=request.voice_stability,
            voice_similarity=request.voice_similarity,
            voice_style=request.voice_style,
            voice_speaker_boost=request.voice_speaker_boost,
            audio_format=request.audio_format,
        )
    except TtsError as exc:
        if exc.code == "not_configured":
            raise HTTPException(
                status_code=503,
                detail={"code": "TTS_NOT_CONFIGURED", "message": "TTS yapılandırılmadı"},
            ) from exc
        if exc.code == "content_filtered":
            raise HTTPException(
                status_code=400,
                detail={"code": "TTS_CONTENT_FILTERED", "message": str(exc)},
            ) from exc
        if exc.code == "rate_limited":
            raise HTTPException(
                status_code=429,
                detail={"code": "TTS_RATE_LIMITED", "message": str(exc)},
            ) from exc
        if exc.code == "timeout":
            raise HTTPException(
                status_code=504,
                detail={"code": "TTS_TIMEOUT", "message": str(exc)},
            ) from exc
        raise HTTPException(
            status_code=502,
            detail={"code": "TTS_ERROR", "message": str(exc)},
        ) from exc

    media_type = "audio/wav" if request.audio_format == "wav" else "audio/mpeg"
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "X-Audio-Length": str(len(audio_bytes)),
        },
    )


@router.post(
    "/chat",
    dependencies=[
        Depends(_chat_minute_dep),
        Depends(_chat_hour_dep),
        Depends(_global_minute_dep),
    ],
)
async def chat(request: ChatRequest):
    service = get_service()
    history = [m.model_dump() for m in request.history]
    request_id = str(uuid.uuid4())

    if not request.stream:
        reply = await service.chat(
            history,
            request.query,
            temperature=request.temperature,
            with_search=request.with_search,
        )
        return ChatResponse(request_id=request_id, reply=reply, model=settings.AI_MODEL)

    async def event_source():
        yield f"data: {json.dumps({'request_id': request_id, 'event': 'start'})}\n\n"
        try:
            async for evt in service.chat_stream(
                history,
                request.query,
                temperature=request.temperature,
                with_search=request.with_search,
            ):
                if evt.get("type") == "delta":
                    payload = {"request_id": request_id, "event": "delta", "content": evt["content"]}
                    yield f"data: {json.dumps(payload)}\n\n"
                elif evt.get("type") == "citations":
                    payload = {"request_id": request_id, "event": "citations", "urls": evt["urls"]}
                    yield f"data: {json.dumps(payload)}\n\n"
        except Exception as exc:  # bubble error as final SSE event
            yield f"data: {json.dumps({'request_id': request_id, 'event': 'error', 'message': str(exc)})}\n\n"
            return
        yield f"data: {json.dumps({'request_id': request_id, 'event': 'done'})}\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream")


@router.post(
    "/threat-explanation",
    response_model=ThreatExplanationResponse,
    dependencies=[
        Depends(_explain_minute_dep),
        Depends(_explain_hour_dep),
        Depends(_global_minute_dep),
    ],
)
async def threat_explanation(request: ThreatExplanationRequest) -> ThreatExplanationResponse:
    service = get_service()
    result = await service.explain_threat(
        request.neo_id,
        language=request.language,
        with_search=request.with_search,
    )
    return ThreatExplanationResponse(
        neo_id=request.neo_id,
        explanation=result["text"],
        language=request.language,
        searched=result.get("searched", False),
        fallback=result.get("fallback", False),
        citations=[
            ThreatCitation(url=c["url"], title=c.get("title") or c["url"]) for c in result.get("citations", []) if c.get("url")
        ],
        model=settings.AI_MODEL,
    )

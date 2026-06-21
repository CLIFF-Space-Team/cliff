"""Text-to-speech service.

Asynchronous submit-and-poll TTS upstream. Submits a generation request,
polls the task until completion, then fetches the resulting audio bytes.
Endpoint and credentials are read from settings — they live in env, not
in source. Internal logging stays generic ("tts.*") so log streams don't
expose the upstream provider.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class TtsError(Exception):
    """TTS failure — wraps misconfiguration, upstream errors, timeouts."""

    def __init__(self, message: str, *, code: str = "tts_error") -> None:
        super().__init__(message)
        self.code = code


def _ensure_configured() -> None:
    if not settings.TTS_API_KEY or not settings.TTS_BASE_URL:
        raise TtsError("tts service is not configured", code="not_configured")


async def synthesize(
    text: str,
    *,
    voice_id: Optional[str] = None,
    voice_speed: float = 1.0,
    voice_stability: float = 0.5,
    voice_similarity: float = 0.75,
    voice_style: float = 0.0,
    voice_speaker_boost: bool = True,
    audio_format: str = "mp3",
) -> bytes:
    """Render `text` as audio bytes.

    Returns raw audio (mp3 by default; wav available). Raises `TtsError` on
    misconfiguration, network failure, content moderation, or timeout.
    """
    _ensure_configured()

    voice = voice_id or settings.TTS_DEFAULT_VOICE_ID
    if not voice:
        raise TtsError("voice id missing", code="missing_voice")

    headers = {
        "Authorization": f"Bearer {settings.TTS_API_KEY}",
        "Content-Type": "application/json",
    }
    payload: Dict[str, Any] = {
        "model": settings.TTS_MODEL,
        "params": {
            "prompt": text,
            "voice_id": voice,
            "voice_speed": voice_speed,
            "voice_stability": voice_stability,
            "voice_similarity": voice_similarity,
            "voice_style": voice_style,
            "voice_speaker_boost": voice_speaker_boost,
            "audio_format": audio_format,
        },
    }

    base = settings.TTS_BASE_URL.rstrip("/")
    timeout = httpx.Timeout(settings.TTS_TIMEOUT_SECONDS)

    async with httpx.AsyncClient(timeout=timeout) as client:
        # 1. Submit
        try:
            submit = await client.post(
                f"{base}/api/generate",
                headers=headers,
                json=payload,
            )
        except httpx.HTTPError as exc:
            log.warning("tts.submit_unreachable", error=str(exc))
            raise TtsError("tts upstream unreachable", code="unreachable") from exc

        if submit.status_code == 401:
            raise TtsError("tts auth failed", code="auth_failed")
        if submit.status_code == 429:
            raise TtsError("tts rate limited", code="rate_limited")
        if submit.status_code >= 400:
            log.warning("tts.submit_error", status=submit.status_code)
            raise TtsError(
                f"tts submit failed ({submit.status_code})",
                code="submit_failed",
            )

        try:
            body = submit.json()
        except ValueError as exc:
            raise TtsError("tts submit malformed", code="malformed") from exc

        task_id = body.get("task_id")
        if not isinstance(task_id, str) or not task_id:
            raise TtsError("tts missing task id", code="missing_task")

        log.info("tts.task_submitted", task_id=task_id, length=len(text))

        # 2. Poll — task service is asynchronous; status flips PROCESSING → FINISHED.
        audio_url: Optional[str] = None
        for attempt in range(settings.TTS_MAX_POLL_ATTEMPTS):
            await asyncio.sleep(settings.TTS_POLL_INTERVAL_SECONDS)
            try:
                poll = await client.get(
                    f"{base}/get/{task_id}",
                    headers=headers,
                )
            except httpx.HTTPError as exc:
                log.warning("tts.poll_error", attempt=attempt, error=str(exc))
                continue
            if poll.status_code != 200:
                continue

            try:
                status_body = poll.json()
            except ValueError:
                continue

            status = status_body.get("status")
            if status == "FINISHED":
                results = status_body.get("result") or []
                if isinstance(results, list) and results:
                    first = results[0]
                    if isinstance(first, str):
                        audio_url = first
                break
            if status == "FAILED":
                err = status_body.get("error") or {}
                code = err.get("code") or "failed"
                msg = err.get("message") or "tts failed"
                if code == "content_filtered":
                    raise TtsError(msg, code="content_filtered")
                raise TtsError(msg, code=code)
            # else PROCESSING — keep polling
        else:
            raise TtsError("tts task timed out", code="timeout")

        if not audio_url:
            raise TtsError("tts result empty", code="empty_result")

        # 3. Fetch audio
        try:
            audio = await client.get(audio_url)
        except httpx.HTTPError as exc:
            raise TtsError("tts audio fetch failed", code="fetch_failed") from exc

        if audio.status_code != 200:
            raise TtsError(
                f"tts audio fetch status {audio.status_code}",
                code="fetch_status",
            )

        return audio.content

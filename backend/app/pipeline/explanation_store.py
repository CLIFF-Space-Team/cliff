"""Shared cache for AI-generated NEO threat explanations.

Each NEO gets ONE canonical explanation that every visitor sees. The first
user who clicks "Açıkla" pays the Grok call; everyone after them reads it
back from Redis instantly. The store is regenerable — calling
`generate(...)` again overwrites the cached entry, so the operator (or any
authorised user) can refresh stale text after orbital data updates.

Why a separate module instead of bolting onto risk_store: explanations are
write-on-demand and have a totally different lifecycle from the autonomous
risk pipeline. Keeping the storage decoupled means we can later move
explanations to Postgres (for full-text search) without touching the risk
hot path.

Redis keys:
    cliff:explain:{neo_id}    HASH-as-JSON  (text, citations, model, gen_at, lang)
"""

from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from app.core import redis_client
from app.core.logging import get_logger

log = get_logger(__name__)

_PREFIX = "cliff:explain"
_DEFAULT_TTL_SECONDS = 7 * 24 * 3600  # 7 days — re-fetch weekly so orbital
# updates eventually flush old narrative.


def _key(neo_id: str) -> str:
    return f"{_PREFIX}:{neo_id}"


async def get(neo_id: str) -> Optional[Dict[str, Any]]:
    """Return the cached explanation dict, or None if absent / Redis down."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return None
    try:
        raw = await client.get(_key(neo_id))
    except Exception as exc:
        log.warning("explanation_store.get_failed", neo_id=neo_id, error=str(exc))
        return None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


async def put(
    neo_id: str,
    *,
    text: str,
    citations: List[Dict[str, Any]],
    language: str,
    model: str,
    searched: bool,
    fallback: bool,
    ttl_seconds: int = _DEFAULT_TTL_SECONDS,
) -> Dict[str, Any]:
    """Persist (or overwrite) the cached explanation for `neo_id`."""
    payload: Dict[str, Any] = {
        "neo_id": neo_id,
        "text": text,
        "citations": citations,
        "language": language,
        "model": model,
        "searched": searched,
        "fallback": fallback,
        "generated_at": int(time.time()),
    }
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return payload  # caller still gets the freshly-generated copy
    try:
        await client.set(_key(neo_id), json.dumps(payload), ex=ttl_seconds)
    except Exception as exc:
        log.warning("explanation_store.put_failed", neo_id=neo_id, error=str(exc))
    return payload


async def delete(neo_id: str) -> bool:
    """Drop the cached explanation. Returns True if a key was deleted."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return False
    try:
        n = await client.delete(_key(neo_id))
    except Exception as exc:
        log.warning("explanation_store.delete_failed", neo_id=neo_id, error=str(exc))
        return False
    return bool(n)


__all__ = ["get", "put", "delete"]

"""Redis-backed JSON cache helper for NASA clients.

`get_or_fetch(key, ttl, loader)` is the only thing callers need: returns
deserialized JSON if cached, otherwise calls `loader`, persists, returns.
Falls back gracefully if Redis is down (loader still runs, no cache).
"""

from __future__ import annotations

import json
from typing import Any, Awaitable, Callable, Optional

from app.core import redis_client
from app.core.logging import get_logger

log = get_logger(__name__)

NAMESPACE = "cliff:nasa:"


def _full_key(key: str) -> str:
    return f"{NAMESPACE}{key}"


async def get(key: str) -> Optional[Any]:
    """Return parsed JSON or None if missing / Redis down."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return None
    try:
        raw = await client.get(_full_key(key))
        if raw is None:
            return None
        return json.loads(raw)
    except Exception as exc:
        log.warning("cache.get_failed", key=key, error=str(exc))
        return None


async def set(key: str, value: Any, ttl_seconds: int) -> None:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return
    try:
        await client.set(
            _full_key(key),
            json.dumps(value, default=str),
            ex=ttl_seconds,
        )
    except Exception as exc:
        log.warning("cache.set_failed", key=key, error=str(exc))


async def get_or_fetch(
    key: str,
    ttl_seconds: int,
    loader: Callable[[], Awaitable[Any]],
) -> Any:
    cached = await get(key)
    if cached is not None:
        return cached
    fresh = await loader()
    if fresh is not None:
        await set(key, fresh, ttl_seconds)
    return fresh


async def invalidate(key: str) -> None:
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return
    try:
        await client.delete(_full_key(key))
    except Exception as exc:
        log.warning("cache.invalidate_failed", key=key, error=str(exc))

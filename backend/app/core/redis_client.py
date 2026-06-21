"""Async Redis client. Single pool, lifespan-managed."""

from __future__ import annotations

from typing import Optional

import redis.asyncio as aioredis
from redis.asyncio.client import Redis

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

_client: Optional[Redis] = None


async def connect() -> Optional[Redis]:
    """Open the global pool. Idempotent.

    If the initial ping fails, the client is torn down and `_client` stays
    `None`. Subsequent `get_client()` calls then raise immediately, so cache
    lookups return None fast instead of waiting on a 5s socket timeout per
    request when Redis is unreachable.
    """
    global _client
    if _client is not None:
        return _client
    candidate = aioredis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
        socket_timeout=settings.REDIS_TIMEOUT_SECONDS,
        socket_connect_timeout=settings.REDIS_TIMEOUT_SECONDS,
        retry_on_timeout=True,
        health_check_interval=30,
    )
    try:
        await candidate.ping()
    except Exception as exc:
        log.warning("redis.connect_failed", error=str(exc))
        try:
            await candidate.aclose()
        except Exception:
            pass
        # Dev fallback: spin up an in-memory fakeredis so the backend runs
        # locally without Docker/Redis. Production never fakes — fail loud.
        if settings.REDIS_FALLBACK_FAKE and not settings.is_production:
            fake = _make_fake_redis()
            if fake is not None:
                _client = fake
                log.warning("redis.using_fakeredis_fallback")
                return _client
        return None
    _client = candidate
    log.info("redis.connected", url=_safe_url(settings.REDIS_URL))
    return _client


def _make_fake_redis() -> Optional[Redis]:
    """In-memory Redis drop-in for dev (no external server needed)."""
    try:
        import fakeredis.aioredis

        return fakeredis.aioredis.FakeRedis(decode_responses=True)
    except Exception as exc:  # fakeredis not installed / init failure
        log.warning("redis.fakeredis_unavailable", error=str(exc))
        return None


async def disconnect() -> None:
    """Close the global pool. Idempotent."""
    global _client
    if _client is None:
        return
    try:
        await _client.aclose()
    except Exception as exc:
        log.warning("redis.disconnect_warning", error=str(exc))
    _client = None
    log.info("redis.disconnected")


def get_client() -> Redis:
    """Return the live client. Raises if not connected."""
    if _client is None:
        raise RuntimeError("Redis client not initialized. Call connect() first.")
    return _client


async def ping() -> bool:
    """Return True if Redis responds within the timeout."""
    if _client is None:
        return False
    try:
        return await _client.ping()
    except Exception:
        return False


def _safe_url(url: str) -> str:
    """Strip credentials from a Redis URL for logs."""
    try:
        from urllib.parse import urlparse, urlunparse

        parsed = urlparse(url)
        if parsed.password:
            netloc = f"{parsed.username or ''}:***@{parsed.hostname}"
            if parsed.port:
                netloc += f":{parsed.port}"
            parsed = parsed._replace(netloc=netloc)
        return urlunparse(parsed)
    except Exception:
        return url

"""Per-IP rate limiter for cost-sensitive endpoints (mainly AI).

Two flavours:

  * `rate_limit_dep(...)` — Redis-backed fixed-window counter. Hard-rejects
    the request with 429 when the limit is hit. Cheap, atomic, but visible
    to the user as an error. Use this for the *upper* (per-hour) bound so
    a runaway client can't burn unbounded paid tokens.

  * `rate_limit_queue_dep(...)` — in-memory token bucket per IP. When the
    bucket is empty the request *waits* (up to `max_wait_seconds`) instead
    of erroring. Use this for the *fast* (per-minute) bound: bursts smooth
    out into a steady queue, the user just sees a slightly slower reply.

The queue path is purposely in-memory (single uvicorn worker on the VPS).
If we ever scale to multiple workers behind nginx we can swap to a Redis
semaphore with the same surface. The hour-bound counter stays in Redis so
it's correct across workers.
"""

from __future__ import annotations

import asyncio
import time
from collections import OrderedDict
from typing import Callable, Optional

from fastapi import HTTPException, Request

from app.core import redis_client
from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


_PREFIX = "cliff:rl"


def _client_ip(request: Request) -> str:
    """Return the originating client IP, honoring X-Forwarded-For / CF-
    Connecting-IP when set by a trusted proxy. We take the *first* hop in
    XFF (the original client) rather than the immediate peer."""
    # Cloudflare hands us the real client IP here regardless of XFF games.
    cf = request.headers.get("cf-connecting-ip")
    if cf:
        return cf.strip()
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",", 1)[0].strip()
        if first:
            return first
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def _is_whitelisted(ip: str) -> bool:
    """True when this IP completely bypasses every rate-limit check."""
    if not ip or ip == "unknown":
        return False
    return ip in settings.AI_RATE_LIMIT_BYPASS_IPS


def _get_cf_country(request: Request) -> Optional[str]:
    """Pull the visitor's ISO 3166-1 alpha-2 country code from the
    Cloudflare-injected `CF-IPCountry` header. Returns None for direct
    (non-CF) hits, localhost dev, or when the header is the special value
    `XX` (Cloudflare's "unknown" placeholder)."""
    cc = request.headers.get("cf-ipcountry")
    if not cc:
        return None
    cc = cc.strip().upper()
    if not cc or cc == "XX" or cc == "T1":  # T1 = Tor
        return None
    return cc[:2] if len(cc) >= 2 else None


async def _consume(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """Return (allowed, current_count). Fail-closed if Redis is down."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        # No Redis: refuse to serve cost-sensitive endpoint rather than open
        # the floodgates. Caller surfaces this as 503/429 as appropriate.
        log.warning("rate_limit.no_redis", key=key)
        return False, 0

    pipe = client.pipeline(transaction=False)
    pipe.set(key, 0, nx=True, ex=window_seconds)
    pipe.incr(key)
    try:
        _, count = await pipe.execute()
    except Exception as exc:
        log.warning("rate_limit.redis_failed", key=key, error=str(exc))
        return False, 0
    return count <= limit, int(count)


def rate_limit_dep(
    *,
    limit: int,
    window_seconds: int,
    name: str,
) -> Callable:
    """Build a FastAPI dependency that enforces `limit` per `window_seconds`
    per client IP. Stack multiple dependencies for layered limits (e.g. a
    fast minute window + a slower hour window)."""

    async def _check(request: Request) -> None:
        if limit <= 0:
            return  # disabled
        ip = _client_ip(request)
        if _is_whitelisted(ip):
            return  # operator / trusted IP — no limits
        bucket = int(time.time()) // window_seconds
        key = f"{_PREFIX}:{name}:{ip}:{bucket}"
        allowed, count = await _consume(key, limit, window_seconds)
        if not allowed:
            log.info(
                "rate_limit.exceeded",
                ip=ip,
                name=name,
                count=count,
                limit=limit,
                window=window_seconds,
            )
            retry_after = window_seconds - (int(time.time()) % window_seconds)
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "RATE_LIMITED",
                    "message": (f"Çok fazla istek. {window_seconds}s pencerede {limit} " "isteği aştın — biraz bekle."),
                    "retry_after_seconds": retry_after,
                    "limit": limit,
                    "window_seconds": window_seconds,
                },
                headers={"Retry-After": str(retry_after)},
            )

    return _check


# ════════════════════════════════════════════════════════════════════════
# Queueing limiter (token bucket per IP)
# ════════════════════════════════════════════════════════════════════════


class _TokenBucket:
    """Async token bucket. `acquire()` blocks until a token is available
    or the deadline passes."""

    __slots__ = ("capacity", "refill_rate", "tokens", "last", "lock", "last_used")

    def __init__(self, capacity: float, refill_rate: float) -> None:
        self.capacity = capacity
        self.refill_rate = refill_rate  # tokens per second
        self.tokens = capacity
        self.last = time.monotonic()
        self.lock = asyncio.Lock()
        self.last_used = time.monotonic()

    async def acquire(self, max_wait_seconds: float) -> tuple[bool, float]:
        """Try to grab one token. Returns (acquired, waited_seconds)."""
        deadline = time.monotonic() + max_wait_seconds
        waited = 0.0
        while True:
            async with self.lock:
                now = time.monotonic()
                elapsed = now - self.last
                self.last = now
                self.last_used = now
                self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
                if self.tokens >= 1:
                    self.tokens -= 1
                    return True, waited
                # How long until 1 full token is available?
                missing = 1 - self.tokens
                wait = missing / self.refill_rate
            if time.monotonic() + wait > deadline:
                return False, waited
            sleep_for = min(wait, max(0.05, deadline - time.monotonic()))
            await asyncio.sleep(sleep_for)
            waited += sleep_for


# Per-(name, ip) buckets. Bounded LRU eviction so a noisy IP rotation can't
# leak unbounded memory.
_BUCKETS: dict[str, OrderedDict[str, _TokenBucket]] = {}
_BUCKETS_LOCK = asyncio.Lock()
_BUCKETS_MAX_PER_NAME = 4096


def _bucket_for(
    name: str,
    ip: str,
    capacity: float,
    refill_rate: float,
) -> _TokenBucket:
    table = _BUCKETS.setdefault(name, OrderedDict())
    bucket = table.get(ip)
    if bucket is None:
        bucket = _TokenBucket(capacity=capacity, refill_rate=refill_rate)
        table[ip] = bucket
        if len(table) > _BUCKETS_MAX_PER_NAME:
            table.popitem(last=False)
    else:
        table.move_to_end(ip)
    return bucket


def rate_limit_queue_dep(
    *,
    limit_per_window: int,
    window_seconds: int,
    name: str,
    max_wait_seconds: float = 25.0,
) -> Callable:
    """Token-bucket dependency. Equivalent steady rate is
    `limit_per_window / window_seconds` tokens per second, with a burst
    capacity of `limit_per_window` tokens. When the bucket is empty the
    request is *queued* (sleeps in `acquire`) for up to `max_wait_seconds`
    before falling back to a 429.

    Use this for the per-minute bound on AI endpoints: a sudden flurry of
    clicks pancakes into a single queue instead of spraying 429s at the UI.
    """

    refill_rate = limit_per_window / max(1, window_seconds)
    capacity = float(limit_per_window)

    async def _check(request: Request) -> None:
        if limit_per_window <= 0:
            return
        ip = _client_ip(request)
        if _is_whitelisted(ip):
            return  # operator / trusted IP — never queues, never waits
        bucket = _bucket_for(name, ip, capacity, refill_rate)
        acquired, waited = await bucket.acquire(max_wait_seconds=max_wait_seconds)
        if not acquired:
            log.info(
                "rate_limit.queue_timeout",
                ip=ip,
                name=name,
                limit=limit_per_window,
                window=window_seconds,
                waited=waited,
            )
            retry_after = int(max(1, 1 / refill_rate))
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "RATE_LIMITED",
                    "message": ("Sırada çok bekledik — lütfen birkaç saniye sonra tekrar dene."),
                    "retry_after_seconds": retry_after,
                    "limit": limit_per_window,
                    "window_seconds": window_seconds,
                },
                headers={"Retry-After": str(retry_after)},
            )
        if waited > 0.5:
            log.info(
                "rate_limit.queued",
                ip=ip,
                name=name,
                waited=round(waited, 2),
                limit=limit_per_window,
            )

    return _check


__all__ = ["rate_limit_dep", "rate_limit_queue_dep", "_client_ip", "_get_cf_country"]

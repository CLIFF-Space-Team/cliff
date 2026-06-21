"""Shared async HTTP client for NASA endpoints.

- Single httpx.AsyncClient pool
- Token-bucket rate limiter (settings.NASA_RATE_LIMIT_RPS)
- Retry with exponential backoff, respects Retry-After
- Maps non-2xx responses to ApiError subclasses
"""

from __future__ import annotations

import asyncio
import random
import time
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings
from app.core.exceptions import RateLimitError, UpstreamError
from app.core.logging import get_logger

log = get_logger(__name__)

_client: Optional[httpx.AsyncClient] = None
_rate_lock = asyncio.Lock()
_last_call_at: float = 0.0


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.NASA_HTTP_TIMEOUT_SECONDS),
            http2=True,
            follow_redirects=True,
            headers={"User-Agent": f"CLIFF/{settings.APP_VERSION} (+https://cliff.kynux.dev)"},
        )
    return _client


async def close_client() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


async def _throttle() -> None:
    """Token-bucket-ish: ensure at least 1/RPS seconds between calls globally."""
    if settings.NASA_RATE_LIMIT_RPS <= 0:
        return
    min_interval = 1.0 / settings.NASA_RATE_LIMIT_RPS
    global _last_call_at
    async with _rate_lock:
        now = time.monotonic()
        wait = (_last_call_at + min_interval) - now
        if wait > 0:
            await asyncio.sleep(wait)
        _last_call_at = time.monotonic()


async def request_json(
    method: str,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json_body: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    upstream_label: str = "nasa",
) -> Any:
    """Issue an HTTP request and return parsed JSON. Raises ApiError on failure."""
    client = await get_client()
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        await _throttle()
        try:
            response = await client.request(method, url, params=params, json=json_body)
        except httpx.TimeoutException as exc:
            last_exc = exc
            log.warning(
                "nasa.http.timeout",
                upstream=upstream_label,
                url=url,
                attempt=attempt,
            )
            if attempt < max_retries:
                await _backoff(attempt)
                continue
            raise UpstreamError(
                f"{upstream_label} timed out",
                code="UPSTREAM_TIMEOUT",
                details={"url": url},
            ) from exc
        except httpx.RequestError as exc:
            last_exc = exc
            if attempt < max_retries:
                await _backoff(attempt)
                continue
            raise UpstreamError(
                f"{upstream_label} unreachable: {exc!r}",
                code="UPSTREAM_NETWORK",
                details={"url": url},
            ) from exc

        if response.status_code == 429:
            retry_after = _parse_retry_after(response.headers.get("retry-after"))
            log.warning(
                "nasa.http.rate_limited",
                upstream=upstream_label,
                retry_after=retry_after,
                attempt=attempt,
            )
            if attempt < max_retries:
                await asyncio.sleep(retry_after)
                continue
            raise RateLimitError(
                f"{upstream_label} rate limited",
                details={"retry_after": retry_after},
            )

        if 500 <= response.status_code < 600:
            log.warning(
                "nasa.http.5xx",
                upstream=upstream_label,
                status=response.status_code,
                attempt=attempt,
            )
            if attempt < max_retries:
                await _backoff(attempt)
                continue
            raise UpstreamError(
                f"{upstream_label} returned {response.status_code}",
                details={"url": url, "status": response.status_code},
            )

        if response.status_code >= 400:
            raise UpstreamError(
                f"{upstream_label} error {response.status_code}",
                status_code=502,
                details={
                    "url": url,
                    "status": response.status_code,
                    "body": _safe_body(response),
                },
            )

        try:
            return response.json()
        except ValueError as exc:
            raise UpstreamError(
                f"{upstream_label} returned non-JSON response",
                details={"content_type": response.headers.get("content-type", "")},
            ) from exc

    # Defensive — loop exits via raise above.
    raise UpstreamError(
        f"{upstream_label} request failed",
        details={"last_error": repr(last_exc)},
    )


def _parse_retry_after(value: Optional[str]) -> float:
    if not value:
        return 5.0
    try:
        return min(60.0, max(1.0, float(value)))
    except ValueError:
        return 5.0


async def _backoff(attempt: int) -> None:
    base = 0.5 * (2**attempt)
    jitter = random.uniform(0.0, 0.5)
    await asyncio.sleep(min(15.0, base + jitter))


def _safe_body(response: httpx.Response) -> str:
    try:
        text = response.text
    except Exception:
        return "<unreadable>"
    return text[:300]

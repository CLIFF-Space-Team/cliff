"""Admin endpoint gate.

Two acceptable proofs of admin identity:

1. **Client IP is in the whitelist** (`ADMIN_IP_WHITELIST` setting). This is
   the operator's own IP — no token negotiation required, the gate just
   waves them through.

2. **Bearer token matches `ADMIN_TOKEN`** (when configured). Lets the same
   operator log in from a phone, hotspot, or any non-whitelisted address by
   sending `Authorization: Bearer <token>`.

Endpoints that need to refuse non-admins use `Depends(require_admin)`. The
`/whoami` endpoint uses the non-raising `is_admin()` so the frontend can
detect operator status without triggering an HTTP error.

Reuses `_client_ip()` from `app.core.rate_limit` so both modules pull the
visitor's real IP through the same Cloudflare-aware path.
"""

from __future__ import annotations

import hmac

from fastapi import HTTPException, Request

from app.core.config import settings
from app.core.logging import get_logger
from app.core.rate_limit import _client_ip

log = get_logger(__name__)


def _bearer_token(request: Request) -> str | None:
    """Pull the bearer token from `Authorization: Bearer <token>`. Returns
    None for missing or malformed headers — never raises."""
    raw = request.headers.get("authorization") or ""
    if not raw.lower().startswith("bearer "):
        return None
    token = raw[7:].strip()
    return token or None


def is_admin(request: Request) -> bool:
    """Non-raising version of `require_admin`. Returns True iff the client
    proves admin identity via IP whitelist OR bearer token."""
    ip = _client_ip(request)
    if ip and ip != "unknown" and ip in settings.ADMIN_IP_WHITELIST:
        return True
    expected = settings.ADMIN_TOKEN
    if expected:
        provided = _bearer_token(request)
        if provided:
            # `hmac.compare_digest` is strictly ASCII-safe; non-ASCII tokens
            # (UTF-8 Turkish chars, emoji, …) raise inside CPython. Encode
            # both sides to bytes to keep the comparison correct AND
            # constant-time. Any encoding/decoding error → not authenticated.
            try:
                if hmac.compare_digest(expected.encode("utf-8"), provided.encode("utf-8")):
                    return True
            except (UnicodeEncodeError, TypeError):
                return False
    return False


def require_admin(request: Request) -> None:
    """FastAPI dependency. Raises 403 if the caller is not admin."""
    if is_admin(request):
        return
    log.info(
        "admin.forbidden",
        ip=_client_ip(request),
        path=str(request.url.path),
        has_bearer=bool(_bearer_token(request)),
    )
    raise HTTPException(
        status_code=403,
        detail={
            "code": "ADMIN_FORBIDDEN",
            "message": "Yönetici erişimi gerekiyor.",
        },
    )


__all__ = ["require_admin", "is_admin"]

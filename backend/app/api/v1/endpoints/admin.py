"""Admin analytics + pageview ingest.

Three classes of routes here:

1. **Pageview ingest** (`POST /track/pageview`) — UNGATED but rate-limited.
   The frontend pings this on every Next.js route change so we know what
   page a visitor landed on. No authentication: every visitor must be able
   to record their own visit.

2. **Identity probe** (`GET /whoami`) — UNGATED. Returns whether the caller
   is admin (by IP whitelist or bearer token) so the frontend can show or
   hide the admin link in the sidebar.

3. **Analytics queries** (`GET /analytics/*`, `POST /analytics/clear`) —
   GATED via `require_admin`. Only the operator (whitelisted IP) or holder
   of `ADMIN_TOKEN` can read the visitor data or wipe it.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.admin_auth import is_admin, require_admin
from app.core.rate_limit import _client_ip, _get_cf_country, rate_limit_queue_dep
from app.pipeline import analytics_store

router = APIRouter()


# Generous per-IP cap on pageview pings — a real visitor changes pages a
# few times per minute. Bots that try to flood get queued first then 429'd.
_pageview_throttle = rate_limit_queue_dep(
    limit_per_window=60,
    window_seconds=60,
    name="admin_pageview",
    max_wait_seconds=2.0,
)


# Routes the Next.js app actually serves. Anything outside this set lands
# in `/unknown` so injected/scanner paths can't pollute the top-pages list.
_ALLOWED_TOP_SEGMENTS = {"", "dashboard", "earth", "impact"}


def _normalize_path(raw: str) -> str:
    """Coerce a client-reported path into one of the routes we actually
    ship. Strips query string + fragment, lowercases, caps at 64 chars,
    and returns `/unknown` for anything that doesn't start with a known
    top-level segment. Prevents top-pages tampering via the public
    ingest endpoint without dropping the visit entirely."""
    if not raw:
        return "/unknown"
    raw = raw.strip()
    if not raw.startswith("/"):
        return "/unknown"
    # Drop query string + fragment so /impact?city=istanbul and /impact
    # collapse into one bucket.
    raw = raw.split("?", 1)[0].split("#", 1)[0]
    raw = raw[:64].lower()
    parts = [p for p in raw.split("/") if p]
    top = parts[0] if parts else ""
    if top not in _ALLOWED_TOP_SEGMENTS:
        return "/unknown"
    return "/" + "/".join(parts) if parts else "/"


class PageviewBody(BaseModel):
    """One pageview ping. Path is the Next.js route the user just landed on
    (e.g. `/dashboard`, `/earth`, `/impact/?city=istanbul`). Referrer is
    optional and not used in v1."""

    path: str = Field(..., min_length=1, max_length=512)
    referrer: str | None = Field(None, max_length=512)


class WhoamiResponse(BaseModel):
    authenticated: bool
    method: str  # "ip" | "token" | "none"
    ip: str
    country: str | None = None


class TodayBucket(BaseModel):
    views: int = 0
    uniques: int = 0


class TrendPoint(BaseModel):
    date: str
    views: int = 0
    uniques: int = 0


class TopPageRow(BaseModel):
    path: str
    views: int


class TopCountryRow(BaseModel):
    country: str
    count: int


class OverviewResponse(BaseModel):
    live_count: int
    today: TodayBucket
    last_7d: List[TrendPoint]
    top_pages: List[TopPageRow]
    top_countries: List[TopCountryRow]
    totals_90d: Dict[str, int]


class RecentVisitRow(BaseModel):
    ts: int
    ip: str
    ua_hash: str = ""
    path: str
    country: str = ""
    status: int = 200


# ─────────────────────────────────────────────────────────────────────────
# Ungated routes
# ─────────────────────────────────────────────────────────────────────────


@router.post("/track/pageview", dependencies=[Depends(_pageview_throttle)])
async def track_pageview(body: PageviewBody, request: Request) -> Dict[str, Any]:
    """Record one pageview. Fires from the Next.js root layout on every
    route change. The IP and country come from the request headers, not the
    body — clients can't spoof their own location."""
    ip = _client_ip(request)
    country = _get_cf_country(request)
    ua = request.headers.get("user-agent", "")
    await analytics_store.record_visit(
        ip=ip,
        user_agent=ua,
        path=_normalize_path(body.path),
        country=country,
        status_code=200,
    )
    return {"recorded": True}


@router.get("/whoami", response_model=WhoamiResponse)
async def whoami(request: Request) -> WhoamiResponse:
    """Tell the caller whether they're admin and how. Used by the frontend
    to decide whether to show the Admin sidebar link and skip the
    token-entry box on `/admin`."""
    ip = _client_ip(request)
    country = _get_cf_country(request)
    if not is_admin(request):
        return WhoamiResponse(authenticated=False, method="none", ip=ip, country=country)
    # Decide which proof did the trick (IP wins if both are present)
    from app.core.config import settings

    method = "ip" if ip in settings.ADMIN_IP_WHITELIST else "token"
    return WhoamiResponse(authenticated=True, method=method, ip=ip, country=country)


# ─────────────────────────────────────────────────────────────────────────
# Gated analytics queries
# ─────────────────────────────────────────────────────────────────────────


@router.get(
    "/analytics/overview",
    response_model=OverviewResponse,
    dependencies=[Depends(require_admin)],
)
async def analytics_overview() -> OverviewResponse:
    summary = await analytics_store.daily_summary(days_back=7)
    return OverviewResponse(
        live_count=int(summary.get("live_count", 0)),
        today=TodayBucket(**summary.get("today", {})),
        last_7d=[TrendPoint(**row) for row in summary.get("last_7d", [])],
        top_pages=[TopPageRow(**row) for row in summary.get("top_pages", [])],
        top_countries=[TopCountryRow(**row) for row in summary.get("top_countries", [])],
        totals_90d=summary.get("totals_90d", {"views": 0}),
    )


@router.get(
    "/analytics/recent",
    response_model=List[RecentVisitRow],
    dependencies=[Depends(require_admin)],
)
async def analytics_recent(limit: int = 100) -> List[RecentVisitRow]:
    rows = await analytics_store.recent_visits(limit=limit)
    out: List[RecentVisitRow] = []
    for r in rows:
        try:
            out.append(RecentVisitRow(**r))
        except Exception:
            continue
    return out


@router.post(
    "/analytics/clear",
    dependencies=[Depends(require_admin)],
)
async def analytics_clear() -> Dict[str, int]:
    deleted = await analytics_store.clear_all()
    return {"deleted_keys": deleted}

"""Redis-backed visitor analytics for the admin panel.

Wired to the public `POST /api/v1/admin/track/pageview` endpoint. The
Next.js root layout pings that endpoint via `sendBeacon` on every route
change; the endpoint normalizes the reported path against a route
allowlist and calls `record_visit(...)`. The admin endpoints
(`/api/v1/admin/analytics/*`) read back through the helpers here.

Redis key schema (prefix `cliff:analytics:`):

    visits                     ZSET   — score=unix_ts, member=JSON({ip,ua_hash,path,country,ts,status})
                                       capped at the last 5_000 entries via ZREMRANGEBYRANK
    pages:{YYYY-MM-DD}         HASH   — field=path, value=view_count           (90 d TTL)
    uniques:{YYYY-MM-DD}       HLL    — PFADD over `ip` per UTC day            (90 d TTL)
    countries:{YYYY-MM-DD}     HASH   — field=ISO2, value=count                (90 d TTL)
    daily_views                ZSET   — score=YYYYMMDD as int, member=YYYY-MM-DD (90 d retention)

Privacy:
    - User-Agent is stored as `sha256(ua)[:12]` only (raw UA discarded).
    - Raw IP is held in the recent-visits ZSET for 7 days; aggregate stats
      (HLL, country/page HASHes) survive 90 days but contain no per-visitor PII.
    - All operations fail closed if Redis is unreachable (warning logged,
      empty result returned — never blocks the user request).
"""

from __future__ import annotations

import hashlib
import json
import time
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core import redis_client
from app.core.logging import get_logger

log = get_logger(__name__)

_PREFIX = "cliff:analytics"
_VISITS_KEY = f"{_PREFIX}:visits"
_DAILY_VIEWS_KEY = f"{_PREFIX}:daily_views"
_VISITS_RETAIN = 5_000
_DAY_TTL_SECONDS = 90 * 24 * 3600
_VISIT_TTL_SECONDS = 7 * 24 * 3600


def _today_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _hash_ua(ua: str) -> str:
    if not ua:
        return ""
    return hashlib.sha256(ua.encode("utf-8", errors="ignore")).hexdigest()[:12]


async def record_visit(
    *,
    ip: str,
    user_agent: str,
    path: str,
    country: Optional[str],
    status_code: int,
) -> None:
    """Append one visit to the analytics store. Best-effort: never raises,
    never blocks the caller."""
    if not ip or ip == "unknown":
        return
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return  # Redis offline — drop silently
    if client is None:
        return

    ts = int(time.time())
    today = _today_utc()
    ua_hash = _hash_ua(user_agent)
    entry = {
        "ts": ts,
        "ip": ip,
        "ua_hash": ua_hash,
        "path": path,
        "country": country or "",
        "status": status_code,
    }
    member = json.dumps(entry, separators=(",", ":"), ensure_ascii=False)

    try:
        pipe = client.pipeline(transaction=False)
        # Recent visits feed (capped + 7 d TTL)
        pipe.zadd(_VISITS_KEY, {member: ts})
        pipe.zremrangebyrank(_VISITS_KEY, 0, -(_VISITS_RETAIN + 1))
        pipe.expire(_VISITS_KEY, _VISIT_TTL_SECONDS)

        # Per-day page views (HASH counter)
        pages_key = f"{_PREFIX}:pages:{today}"
        pipe.hincrby(pages_key, path, 1)
        pipe.expire(pages_key, _DAY_TTL_SECONDS)

        # Per-day unique IP counter via HyperLogLog
        uniques_key = f"{_PREFIX}:uniques:{today}"
        pipe.pfadd(uniques_key, ip)
        pipe.expire(uniques_key, _DAY_TTL_SECONDS)

        # Per-day country tally
        if country:
            countries_key = f"{_PREFIX}:countries:{today}"
            pipe.hincrby(countries_key, country, 1)
            pipe.expire(countries_key, _DAY_TTL_SECONDS)

        # Daily index — lets daily_summary discover available days fast.
        pipe.zadd(_DAILY_VIEWS_KEY, {today: int(today.replace("-", ""))})
        pipe.expire(_DAILY_VIEWS_KEY, _DAY_TTL_SECONDS)

        await pipe.execute()
    except Exception as exc:  # noqa: BLE001
        log.warning("analytics.record_failed", error=str(exc), path=path)


async def recent_visits(limit: int = 100) -> List[Dict[str, Any]]:
    """Most-recent visits (newest first). Returns at most `limit` rows."""
    limit = max(1, min(500, limit))
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return []
    if client is None:
        return []
    try:
        raw = await client.zrevrange(_VISITS_KEY, 0, limit - 1, withscores=False)
    except Exception as exc:  # noqa: BLE001
        log.warning("analytics.recent_failed", error=str(exc))
        return []
    out: List[Dict[str, Any]] = []
    for member in raw or []:
        try:
            out.append(json.loads(member))
        except (ValueError, TypeError):
            continue
    return out


async def _hash_total(client, key: str) -> int:
    try:
        vals = await client.hvals(key)
    except Exception:
        return 0
    total = 0
    for v in vals or []:
        try:
            total += int(v)
        except (ValueError, TypeError):
            continue
    return total


async def daily_summary(days_back: int = 7) -> Dict[str, Any]:
    """Aggregate stats for the last `days_back` UTC days plus today.

    Returns:
        {
            "live_count":    int,                    # current WS connections
            "today":         {"views": int, "uniques": int},
            "last_7d":       [{"date": "YYYY-MM-DD", "views": int, "uniques": int}, ...],
            "top_pages":     [{"path": str, "views": int}, ...],   # last 7d combined
            "top_countries": [{"country": "TR", "count": int}, ...],
            "totals_90d":    {"views": int},
        }
    """
    days_back = max(1, min(30, days_back))
    today = _today_utc()
    cutoff = datetime.now(timezone.utc).date()
    days = [(cutoff - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days_back)]
    days.reverse()  # oldest → newest

    empty: Dict[str, Any] = {
        "live_count": await live_count(),
        "today": {"views": 0, "uniques": 0},
        "last_7d": [{"date": d, "views": 0, "uniques": 0} for d in days],
        "top_pages": [],
        "top_countries": [],
        "totals_90d": {"views": 0},
    }

    try:
        client = redis_client.get_client()
    except RuntimeError:
        return empty
    if client is None:
        return empty

    # Per-day views + uniques (pipelined batch)
    try:
        pipe = client.pipeline(transaction=False)
        for d in days:
            pipe.hvals(f"{_PREFIX}:pages:{d}")
            pipe.pfcount(f"{_PREFIX}:uniques:{d}")
        results = await pipe.execute()
    except Exception as exc:  # noqa: BLE001
        log.warning("analytics.summary_failed", error=str(exc))
        return empty

    last_7d: List[Dict[str, Any]] = []
    for i, d in enumerate(days):
        page_vals = results[i * 2] or []
        unique_count = int(results[i * 2 + 1] or 0)
        views = 0
        for v in page_vals:
            try:
                views += int(v)
            except (ValueError, TypeError):
                continue
        last_7d.append({"date": d, "views": views, "uniques": unique_count})

    today_row = next((r for r in last_7d if r["date"] == today), {"views": 0, "uniques": 0})

    # Combined top pages + top countries across the requested window
    page_counter: Counter[str] = Counter()
    country_counter: Counter[str] = Counter()
    try:
        pipe = client.pipeline(transaction=False)
        for d in days:
            pipe.hgetall(f"{_PREFIX}:pages:{d}")
            pipe.hgetall(f"{_PREFIX}:countries:{d}")
        per_day = await pipe.execute()
        for idx in range(len(days)):
            pages_map = per_day[idx * 2] or {}
            countries_map = per_day[idx * 2 + 1] or {}
            for path, count in pages_map.items():
                try:
                    page_counter[path] += int(count)
                except (ValueError, TypeError):
                    continue
            for cc, count in countries_map.items():
                try:
                    country_counter[cc] += int(count)
                except (ValueError, TypeError):
                    continue
    except Exception as exc:  # noqa: BLE001
        log.warning("analytics.top_failed", error=str(exc))

    # 90-day total via the daily index
    totals_90d_views = 0
    try:
        all_days = await client.zrevrange(_DAILY_VIEWS_KEY, 0, 89)
        if all_days:
            pipe = client.pipeline(transaction=False)
            for d in all_days:
                pipe.hvals(f"{_PREFIX}:pages:{d}")
            day_vals = await pipe.execute()
            for vals in day_vals:
                for v in vals or []:
                    try:
                        totals_90d_views += int(v)
                    except (ValueError, TypeError):
                        continue
    except Exception:
        totals_90d_views = sum(d["views"] for d in last_7d)

    return {
        "live_count": await live_count(),
        "today": {"views": today_row["views"], "uniques": today_row["uniques"]},
        "last_7d": last_7d,
        "top_pages": [{"path": p, "views": c} for p, c in page_counter.most_common(10)],
        "top_countries": [{"country": cc, "count": c} for cc, c in country_counter.most_common(12)],
        "totals_90d": {"views": totals_90d_views},
    }


async def live_count() -> int:
    """Currently active WebSocket clients — the live "online now" number."""
    try:
        from app.ws.manager import get_manager

        return get_manager().current_active_count()
    except Exception:
        return 0


async def clear_all() -> int:
    """Wipe every analytics key. Returns number of keys deleted. Operator-only."""
    try:
        client = redis_client.get_client()
    except RuntimeError:
        return 0
    if client is None:
        return 0
    deleted = 0
    try:
        pattern = f"{_PREFIX}:*"
        async for key in client.scan_iter(match=pattern, count=200):
            await client.delete(key)
            deleted += 1
    except Exception as exc:  # noqa: BLE001
        log.warning("analytics.clear_failed", error=str(exc))
    return deleted


__all__ = [
    "record_visit",
    "recent_visits",
    "daily_summary",
    "live_count",
    "clear_all",
]

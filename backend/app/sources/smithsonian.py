"""USGS Volcano Hazards Program client.

Originally targeted the Smithsonian Global Volcanism Program weekly RSS, but
that endpoint sits behind Cloudflare's bot challenge and refuses non-browser
clients. USGS exposes a JSON API for currently-elevated volcanoes that gives
the same operational signal (alert level + color code) without auth or
challenge: https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes

Module name kept as `smithsonian` for import compatibility.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)

USGS_VOLCANO_URL = "https://volcanoes.usgs.gov/hans-public/api/volcano/getElevatedVolcanoes"
CACHE_TTL_SECONDS = 30 * 60  # USGS HANS updates within minutes of an alert change


# Color code → severity rank (highest = most urgent)
COLOR_RANK: Dict[str, int] = {
    "RED": 4,
    "ORANGE": 3,
    "YELLOW": 2,
    "GREEN": 1,
    "UNASSIGNED": 0,
}


async def get_weekly_activity(limit: int = 50) -> List[Dict[str, Any]]:
    """Return currently-elevated volcanoes from USGS HANS.

    Each entry exposes a stable shape consumed by the dashboard:
        {volcano_name, country, summary, link, published_at}
    """
    cache_key = "usgs:volcanoes:elevated"

    async def loader() -> Any:
        log.info("usgs.volcanoes.fetch")
        try:
            return await http.request_json(
                "GET",
                USGS_VOLCANO_URL,
                upstream_label="usgs.volcanoes",
                max_retries=1,
            )
        except Exception as exc:
            log.warning("usgs.volcanoes.fetch.failed", error=str(exc))
            return []

    raw = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    if not isinstance(raw, list):
        return []

    out: List[Dict[str, Any]] = []
    for v in raw:
        if not isinstance(v, dict):
            continue
        name = v.get("volcano_name") or "Unknown volcano"
        observatory = v.get("obs_fullname") or v.get("obs_abbr") or ""
        color = (v.get("color_code") or "UNASSIGNED").upper()
        alert = (v.get("alert_level") or "").upper()
        notice = v.get("notice_type_cd") or ""
        sent_utc = v.get("sent_utc") or ""
        sent_unix = v.get("sent_unixtime")
        try:
            sent_ms = int(sent_unix) * 1000 if sent_unix else 0
        except (TypeError, ValueError):
            sent_ms = 0

        # Parse "country" out of observatory name (e.g. "Alaska Volcano
        # Observatory" → "ABD"). USGS only covers US territories, so a
        # default of "ABD" is honest and accurate.
        country = "ABD" if "Volcano Observatory" in observatory else ""

        summary_parts = []
        if alert:
            summary_parts.append(f"Uyarı seviyesi: {alert}")
        if notice:
            summary_parts.append(f"Bildirim: {notice}")
        if observatory:
            summary_parts.append(observatory)
        if sent_utc:
            summary_parts.append(f"Yayın: {sent_utc} UTC")
        summary = " · ".join(summary_parts)

        vnum = v.get("vnum")
        link = f"https://volcanoes.usgs.gov/volcanoes/{vnum}/" if vnum else "https://volcanoes.usgs.gov/"

        out.append(
            {
                "title": f"{name} ({color} / {alert})" if alert else name,
                "volcano_name": name,
                "country": country,
                "summary": summary,
                "link": link,
                "published_at": sent_ms,
                "color_code": color,
                "alert_level": alert,
                "color_rank": COLOR_RANK.get(color, 0),
            }
        )

    out.sort(key=lambda x: (-(x.get("color_rank") or 0), -(x.get("published_at") or 0)))
    return out[:limit]


# Backward-compat alias the endpoint imports.
async def get_recent(limit: int = 50) -> List[Dict[str, Any]]:
    return await get_weekly_activity(limit=limit)


# Used by tests / boot smoke checks
def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

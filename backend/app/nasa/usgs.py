"""USGS Earthquake Hazards Program client.

Pulls the live GeoJSON feeds from earthquake.usgs.gov. We expose two windows:
  - significant 30-day  (M4.5+)
  - day-significant     (M2.5+ within last 24 hours)

Both are free, no API key, no rate limit (USGS just asks 'be nice').

https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)

USGS_BASE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary"

# Cache long enough to be polite — USGS updates the feed every 5 min.
CACHE_TTL_SECONDS = 5 * 60


async def get_recent_earthquakes(
    min_magnitude: float = 4.5,
    window: str = "day",
) -> List[Dict[str, Any]]:
    """Return a flat list of recent earthquakes above `min_magnitude`.

    `window` ∈ {'hour', 'day', 'week', 'month'} — maps directly to USGS's
    canonical feed slugs. We pick the smallest matching feed for the chosen
    magnitude floor (smaller payload, faster cache turnaround).
    """
    # Pick the most precise feed available
    if min_magnitude >= 4.5:
        slug = f"4.5_{window}"
    elif min_magnitude >= 2.5:
        slug = f"2.5_{window}"
    elif min_magnitude >= 1.0:
        slug = f"1.0_{window}"
    else:
        slug = f"all_{window}"

    cache_key = f"usgs:eq:{slug}:{min_magnitude}"

    async def loader() -> Dict[str, Any]:
        url = f"{USGS_BASE}/{slug}.geojson"
        log.info("usgs.eq.fetch", slug=slug, min_magnitude=min_magnitude)
        return await http.request_json("GET", url, upstream_label="usgs")

    payload = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)

    out: List[Dict[str, Any]] = []
    for feature in payload.get("features", []):
        props = feature.get("properties", {}) or {}
        geom = feature.get("geometry", {}) or {}
        coords = geom.get("coordinates") or [None, None, None]
        mag = props.get("mag")
        if mag is None or mag < min_magnitude:
            continue
        out.append(
            {
                "id": feature.get("id"),
                "magnitude": float(mag),
                "place": props.get("place") or "",
                "time": props.get("time"),  # epoch ms
                "tsunami": bool(props.get("tsunami") or 0),
                "felt": props.get("felt"),  # int or None
                "lon": coords[0] if len(coords) > 0 else None,
                "lat": coords[1] if len(coords) > 1 else None,
                "depth_km": coords[2] if len(coords) > 2 else None,
                "url": props.get("url") or "",
                "alert": props.get("alert"),  # 'green' | 'yellow' | 'orange' | 'red'
                "sig": props.get("sig"),  # significance score 0..1000
            }
        )
    # Newest first
    out.sort(key=lambda x: x.get("time") or 0, reverse=True)
    return out

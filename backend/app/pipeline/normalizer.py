"""Convert raw NeoWs / Sentry payloads into NormalizedNeo.

NeoWs feed objects nest close-approach + diameter + magnitude in awkward shapes;
this module flattens them.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from app.core.logging import get_logger
from app.domain.neo import NormalizedNeo

log = get_logger(__name__)


def normalize_neows(raw: Dict[str, Any]) -> Optional[NormalizedNeo]:
    """Build a NormalizedNeo from a single NeoWs feed/lookup object."""
    if not isinstance(raw, dict):
        return None

    try:
        neo_id = str(raw.get("id") or raw.get("neo_reference_id") or "").strip()
        if not neo_id:
            return None
        name = str(raw.get("name") or neo_id)

        diameter = (raw.get("estimated_diameter") or {}).get("kilometers") or {}
        diameter_min = _safe_float(diameter.get("estimated_diameter_min"))
        diameter_max = _safe_float(diameter.get("estimated_diameter_max"))

        # Pick the next *future* close approach, not [0] which is historical.
        approaches = raw.get("close_approach_data") or []
        next_at: Optional[datetime] = None
        miss_km: Optional[float] = None
        velocity_kms: Optional[float] = None
        orbiting = "Earth"
        if approaches:
            best = _select_relevant_approach(approaches)
            next_at = _parse_iso(best.get("close_approach_date_full") or best.get("close_approach_date"))
            miss_km = _safe_float(((best.get("miss_distance") or {}).get("kilometers")))
            velocity_kms = _safe_float(((best.get("relative_velocity") or {}).get("kilometers_per_second")))
            orbiting = best.get("orbiting_body") or "Earth"

        return NormalizedNeo(
            neo_id=neo_id,
            designation=raw.get("designation"),
            name=name,
            is_potentially_hazardous=bool(raw.get("is_potentially_hazardous_asteroid", False)),
            diameter_min_km=diameter_min,
            diameter_max_km=diameter_max,
            absolute_magnitude_h=_safe_float(raw.get("absolute_magnitude_h")),
            next_approach_at=next_at,
            miss_distance_km=miss_km,
            relative_velocity_kms=velocity_kms,
            orbiting_body=orbiting,
            nasa_jpl_url=raw.get("nasa_jpl_url"),
        )
    except Exception as exc:
        log.warning("normalizer.neows_failed", error=str(exc), neo_id=raw.get("id"))
        return None


def merge_sentry_flag(neo: NormalizedNeo, sentry_designations: set[str]) -> NormalizedNeo:
    """Mark `sentry_listed=True` if the NEO appears in the Sentry table."""
    designation = neo.designation or neo.neo_id
    if designation in sentry_designations or neo.neo_id in sentry_designations:
        return neo.model_copy(update={"sentry_listed": True})
    return neo


def _select_relevant_approach(approaches: list) -> Dict[str, Any]:
    """Pick the next future close approach.

    NeoWs returns close approaches in chronological order, oldest first. The
    historical entries (some go back to 1900) are useless for an operational
    dashboard — operators want to know the *next* approach. If no future
    approach is in the dataset, fall back to the most recent past one.
    """
    now = datetime.utcnow()
    earth_only = [a for a in approaches if (a.get("orbiting_body") or "Earth") == "Earth"]
    candidates = earth_only or approaches

    future: list = []
    past: list = []
    for a in candidates:
        when = _parse_iso(a.get("close_approach_date_full") or a.get("close_approach_date"))
        if when is None:
            continue
        (future if when >= now else past).append((when, a))

    if future:
        future.sort(key=lambda x: x[0])
        return future[0][1]
    if past:
        past.sort(key=lambda x: x[0], reverse=True)
        return past[0][1]
    return candidates[0]


def _safe_float(value: object) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None


def _parse_iso(value: object) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    # NeoWs "close_approach_date_full" → "2029-Apr-13 21:46"
    formats = ["%Y-%b-%d %H:%M", "%Y-%m-%d %H:%M", "%Y-%m-%d"]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None

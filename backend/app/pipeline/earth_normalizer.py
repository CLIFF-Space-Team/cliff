"""Raw-source → `EarthEvent` normalization.

EONET responses use GeoJSON-ish geometry, NASA category codes, and one
`magnitudeValue/magnitudeUnit` per geometry sample. AFAD returns a flat
list of TR earthquakes with magnitude, depth, lat/lon. This module
unifies both into the `EarthEvent` shape and computes severity via the
`earth_categories` thresholds.

Both helpers are tolerant of malformed payloads — bad rows return None
and are skipped by the scheduler. They never raise.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.logging import get_logger
from app.domain.earth_event import (
    EarthEvent,
    EarthEventGeometry,
    EarthEventMetric,
    EarthEventSourceLink,
    EventSeverity,
)
from app.pipeline.earth_categories import (
    EARTH_CATEGORIES,
    category_for_eonet,
    severity_for_metric,
    severity_score,
)

log = get_logger(__name__)


# ---------------------------------------------------------------------------
# EONET
# ---------------------------------------------------------------------------


def normalize_eonet_event(raw: Dict[str, Any]) -> Optional[EarthEvent]:
    """Convert one EONET event dict → `EarthEvent`. Returns None on bad data."""
    if not isinstance(raw, dict):
        return None
    eonet_id = raw.get("id")
    title = raw.get("title")
    if not eonet_id or not title:
        return None

    # NASA puts 1+ category objects on each event. We pick the first one
    # we recognise; anything unmapped lands in `dustHaze`-like buckets via
    # `category_for_eonet`.
    raw_cats: List[Dict[str, Any]] = raw.get("categories") or []
    cat_key: Optional[str] = None
    raw_codes: List[str] = []
    for c in raw_cats:
        code = c.get("id") or c.get("title")
        if code:
            raw_codes.append(str(code))
            if cat_key is None:
                resolved = category_for_eonet(str(code))
                if resolved:
                    cat_key = resolved
    if cat_key is None:
        # Unmapped category: try lowercase id directly, else give up.
        if raw_codes and raw_codes[0].lower() in EARTH_CATEGORIES:
            cat_key = raw_codes[0].lower()
        else:
            return None

    # Geometries → list[EarthEventGeometry]; track the most recent
    # magnitude_value so we can score severity.
    geos_in: List[Dict[str, Any]] = raw.get("geometry") or raw.get("geometries") or []
    geometries: List[EarthEventGeometry] = []
    last_mag: Optional[float] = None
    last_mag_unit: Optional[str] = None
    for g in geos_in:
        if not isinstance(g, dict):
            continue
        date_raw = g.get("date")
        coords = g.get("coordinates")
        if date_raw is None or coords is None:
            continue
        try:
            dt = _parse_iso(date_raw)
        except Exception:
            continue
        gtype = "Polygon" if g.get("type") == "Polygon" else "Point"
        try:
            mag = float(g.get("magnitudeValue")) if g.get("magnitudeValue") is not None else None
        except (TypeError, ValueError):
            mag = None
        unit = g.get("magnitudeUnit")
        geometries.append(
            EarthEventGeometry(
                date=dt,
                type=gtype,
                coordinates=coords,
                magnitude_value=mag,
                magnitude_unit=str(unit) if unit else None,
            )
        )
        if mag is not None:
            last_mag = mag
            last_mag_unit = str(unit) if unit else None

    if not geometries:
        return None

    started_at = geometries[0].date
    updated_at = geometries[-1].date
    closed_raw = raw.get("closed")
    closed_at: Optional[datetime] = None
    if closed_raw:
        try:
            closed_at = _parse_iso(closed_raw)
        except Exception:
            closed_at = None
    status = "closed" if closed_at is not None else "open"

    # Severity. Most categories key off the most recent magnitude_value.
    # Fires sometimes ship area in km² via that field already; storms via
    # wind speed; etc.
    metric_value = _convert_metric_value(cat_key, last_mag, last_mag_unit)
    severity = severity_for_metric(cat_key, metric_value)
    score = severity_score(severity, metric_value)

    primary_metric: Optional[EarthEventMetric] = None
    if last_mag is not None:
        meta = EARTH_CATEGORIES[cat_key]
        primary_metric = EarthEventMetric(
            value=last_mag,
            unit=last_mag_unit or meta.metric_unit or "",
            label_tr=meta.metric_label_tr or "Şiddet",
        )

    sources_in: List[Dict[str, Any]] = raw.get("sources") or []
    sources: List[EarthEventSourceLink] = []
    for s in sources_in:
        sid = s.get("id") or s.get("title")
        url = s.get("url")
        if sid and url:
            sources.append(EarthEventSourceLink(id=str(sid), url=str(url)))

    return EarthEvent(
        id=f"EONET_{eonet_id}",
        source="eonet",
        category=cat_key,
        title=str(title),
        description=str(raw.get("description")) if raw.get("description") else None,
        geometries=geometries,
        started_at=started_at,
        updated_at=updated_at,
        closed_at=closed_at,
        status="closed" if status == "closed" else "open",
        severity=EventSeverity(severity),
        severity_score=score,
        primary_metric=primary_metric,
        sources=sources,
        raw_categories=raw_codes,
    )


def normalize_eonet_payload(payload: Dict[str, Any]) -> List[EarthEvent]:
    """Walk an `eonet.get_events()` response → list[EarthEvent]."""
    if not isinstance(payload, dict):
        return []
    if payload.get("_unavailable"):
        return []
    raw_events = payload.get("events") or []
    out: List[EarthEvent] = []
    for r in raw_events:
        try:
            ev = normalize_eonet_event(r)
        except Exception as exc:  # noqa: BLE001
            log.debug("earth.normalize.eonet.skip", error=str(exc))
            ev = None
        if ev is not None:
            out.append(ev)
    return out


# ---------------------------------------------------------------------------
# AFAD (Türkiye earthquakes)
# ---------------------------------------------------------------------------


def normalize_afad_row(raw: Dict[str, Any]) -> Optional[EarthEvent]:
    """One AFAD-normalised row (USGS-shape) → `EarthEvent` under
    category `earthquakes-tr`."""
    if not isinstance(raw, dict):
        return None
    rid = raw.get("id")
    if not rid:
        return None
    try:
        mag = float(raw.get("magnitude") or 0)
    except (TypeError, ValueError):
        return None
    if mag <= 0:
        return None
    try:
        lat = float(raw.get("lat") or 0)
        lon = float(raw.get("lon") or 0)
    except (TypeError, ValueError):
        return None
    if lat == 0 and lon == 0:
        return None

    time_ms = raw.get("time")
    try:
        ts = datetime.fromtimestamp(int(time_ms) / 1000, tz=timezone.utc) if time_ms else datetime.now(timezone.utc)
    except (TypeError, ValueError, OSError):
        ts = datetime.now(timezone.utc)

    place = str(raw.get("place") or "Türkiye")
    depth_km = raw.get("depth_km")

    cat_key = "earthquakes-tr"
    severity = severity_for_metric(cat_key, mag)
    score = severity_score(severity, mag)

    geometry = EarthEventGeometry(
        date=ts,
        type="Point",
        coordinates=[lon, lat],
        magnitude_value=mag,
        magnitude_unit="Mw",
    )

    sources = [EarthEventSourceLink(id="AFAD", url="https://deprem.afad.gov.tr/")]

    title = f"{place} · M{mag:.1f}"

    description_parts = [f"Magnitüd Mw {mag:.1f}"]
    if depth_km is not None:
        try:
            description_parts.append(f"derinlik {float(depth_km):.0f} km")
        except (TypeError, ValueError):
            pass
    description = ", ".join(description_parts)

    primary_metric = EarthEventMetric(
        value=mag,
        unit="Mw",
        label_tr="Büyüklük",
    )

    return EarthEvent(
        id=f"AFAD_{rid}",
        source="afad",
        category=cat_key,
        title=title,
        description=description,
        geometries=[geometry],
        started_at=ts,
        updated_at=ts,
        closed_at=None,
        status="open",
        severity=EventSeverity(severity),
        severity_score=score,
        primary_metric=primary_metric,
        sources=sources,
        raw_categories=["earthquakes-tr"],
        extras={
            "depth_km": depth_km,
            "place": place,
        },
    )


def normalize_afad_rows(rows: List[Dict[str, Any]]) -> List[EarthEvent]:
    out: List[EarthEvent] = []
    for r in rows or []:
        try:
            ev = normalize_afad_row(r)
        except Exception as exc:  # noqa: BLE001
            log.debug("earth.normalize.afad.skip", error=str(exc))
            ev = None
        if ev is not None:
            out.append(ev)
    return out


# ---------------------------------------------------------------------------
# USGS (global earthquakes)
# ---------------------------------------------------------------------------


def normalize_usgs_row(raw: Dict[str, Any]) -> Optional[EarthEvent]:
    """One USGS-feed row → unified `EarthEvent` under `earthquakes`.

    USGS rows mirror the AFAD shape (id, magnitude, place, time, lat, lon,
    depth_km, url, tsunami flag, alert level). We treat them as the
    global complement to AFAD's Türkiye-only data.
    """
    if not isinstance(raw, dict):
        return None
    rid = raw.get("id")
    if not rid:
        return None
    try:
        mag = float(raw.get("magnitude") or 0)
    except (TypeError, ValueError):
        return None
    if mag <= 0:
        return None
    try:
        lat = float(raw.get("lat") or 0)
        lon = float(raw.get("lon") or 0)
    except (TypeError, ValueError):
        return None
    if lat == 0 and lon == 0:
        return None

    time_ms = raw.get("time")
    try:
        ts = datetime.fromtimestamp(int(time_ms) / 1000, tz=timezone.utc) if time_ms else datetime.now(timezone.utc)
    except (TypeError, ValueError, OSError):
        ts = datetime.now(timezone.utc)

    place = str(raw.get("place") or "").strip()
    depth_km = raw.get("depth_km")
    tsunami = bool(raw.get("tsunami") or False)
    alert = raw.get("alert")  # green | yellow | orange | red | None
    url = str(raw.get("url") or "").strip()

    cat_key = "earthquakes"
    severity = severity_for_metric(cat_key, mag)
    score = severity_score(severity, mag)

    geometry = EarthEventGeometry(
        date=ts,
        type="Point",
        coordinates=[lon, lat],
        magnitude_value=mag,
        magnitude_unit="Mw",
    )

    sources: List[EarthEventSourceLink] = []
    if url:
        sources.append(EarthEventSourceLink(id="USGS", url=url))
    else:
        sources.append(
            EarthEventSourceLink(
                id="USGS",
                url="https://earthquake.usgs.gov/earthquakes/map/",
            )
        )

    title = f"{place or 'Global'} · M{mag:.1f}"
    description_parts = [f"Magnitüd Mw {mag:.1f}"]
    if depth_km is not None:
        try:
            description_parts.append(f"derinlik {float(depth_km):.0f} km")
        except (TypeError, ValueError):
            pass
    if tsunami:
        description_parts.append("tsunami uyarısı")
    if alert:
        description_parts.append(f"USGS alarm: {alert}")
    description = ", ".join(description_parts)

    primary_metric = EarthEventMetric(
        value=mag,
        unit="Mw",
        label_tr="Büyüklük",
    )

    return EarthEvent(
        id=f"USGS_{rid}",
        source="usgs",
        category=cat_key,
        title=title,
        description=description,
        geometries=[geometry],
        started_at=ts,
        updated_at=ts,
        closed_at=None,
        status="open",
        severity=EventSeverity(severity),
        severity_score=score,
        primary_metric=primary_metric,
        sources=sources,
        raw_categories=["earthquakes"],
        extras={
            "depth_km": depth_km,
            "place": place,
            "tsunami": tsunami,
            "alert": alert,
        },
    )


def normalize_usgs_rows(rows: List[Dict[str, Any]]) -> List[EarthEvent]:
    out: List[EarthEvent] = []
    for r in rows or []:
        try:
            ev = normalize_usgs_row(r)
        except Exception as exc:  # noqa: BLE001
            log.debug("earth.normalize.usgs.skip", error=str(exc))
            ev = None
        if ev is not None:
            out.append(ev)
    return out


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_iso(value: Any) -> datetime:
    """Parse an ISO-8601 string (with or without `Z` / offset) → aware UTC."""
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        raise ValueError("non-string date")
    s = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _convert_metric_value(category: str, raw_value: Optional[float], unit: Optional[str]) -> Optional[float]:
    """Convert EONET's heterogeneous magnitudeUnit into the unit our
    category thresholds use. e.g. wildfires sometimes ship 'acres' which
    must become km², storms 'mph' which must become knots.
    """
    if raw_value is None:
        return None
    u = (unit or "").strip().lower()

    if category == "wildfires":
        # Thresholds in km². EONET commonly emits "acres" for fire area.
        if u in ("acres", "ac"):
            return raw_value * 0.00404686  # acres → km²
        if u in ("hectares", "ha"):
            return raw_value * 0.01
        if u in ("km^2", "km2", "sq km", "km²"):
            return raw_value
        return raw_value  # unknown unit — treat as already-km² best effort

    if category == "severeStorms":
        # Thresholds in knots.
        if u in ("kts", "knots", "kt"):
            return raw_value
        if u in ("mph",):
            return raw_value * 0.868976
        if u in ("kph", "km/h"):
            return raw_value * 0.539957
        if u in ("m/s", "mps"):
            return raw_value * 1.94384
        return raw_value

    # Quakes, volcanoes, default — pass through.
    return raw_value


__all__ = [
    "normalize_eonet_event",
    "normalize_eonet_payload",
    "normalize_afad_row",
    "normalize_afad_rows",
    "normalize_usgs_row",
    "normalize_usgs_rows",
]

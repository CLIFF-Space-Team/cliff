"""Earth-side observation endpoints.

Bundles every "what's happening on Earth right now" feed the dashboard needs:
  - **Unified Earth-events API** (`/events`, `/events/{id}`, `/categories`,
    `/summary`) — server-side filtered + WS-pushed, fed by the autonomous
    scheduler from EONET + AFAD.
  - USGS global earthquakes
  - AFAD Türkiye earthquakes (also surfaced via `/events?categories=earthquakes-tr`)
  - NASA FIRMS active wildfires (requires FIRMS_API_KEY)
  - GDACS multi-hazard alert aggregator
  - Smithsonian weekly volcanic activity
  - Curated 'on this day in asteroid history' anniversaries
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.data.historical_events import HISTORICAL_EVENTS, events_for
from app.domain.earth_event import EarthEvent, EarthEventSummary
from app.nasa import usgs
from app.pipeline import earth_event_store
from app.pipeline.earth_categories import list_categories
from app.sources import afad, firms, koeri, press, smithsonian

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────
# Unified Earth-events (read-only; feed comes from the scheduler)
# ─────────────────────────────────────────────────────────────────────────


@router.get("/events")
async def earth_events(
    categories: Optional[str] = Query(
        None,
        description="Comma-separated category codes (wildfires, volcanoes, earthquakes-tr, ...).",
    ),
    sources: Optional[str] = Query(
        None,
        description="Comma-separated sources (eonet, afad).",
    ),
    severity_min: Optional[str] = Query(
        None,
        pattern="^(info|low|moderate|high|critical)$",
    ),
    status: str = Query("all", pattern="^(open|closed|all)$"),
    days: Optional[int] = Query(None, ge=1, le=365),
    sort_by: str = Query("recent", pattern="^(recent|severity)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0, le=2000),
) -> Dict[str, Any]:
    """Unified, filtered, paginated earth-event feed.

    Powers the `/earth` dashboard. Items are pre-normalized to the
    `EarthEvent` shape regardless of upstream source — frontend renders
    every category through one component path.
    """
    cat_list: Optional[List[str]] = None
    if categories:
        cat_list = [c.strip() for c in categories.split(",") if c.strip()]
    src_list: Optional[List[str]] = None
    if sources:
        src_list = [s.strip() for s in sources.split(",") if s.strip()]

    result = await earth_event_store.query(
        categories=cat_list,
        sources=src_list,
        status=status,
        severity_min=severity_min,
        days=days,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )

    items: List[EarthEvent] = result.get("items", [])
    return {
        "items": [item.model_dump(mode="json") for item in items],
        "total": result.get("total", 0),
        "page": {"limit": limit, "offset": offset},
        "filters": {
            "categories": cat_list or [],
            "sources": src_list or [],
            "severity_min": severity_min,
            "status": status,
            "days": days,
            "sort_by": sort_by,
        },
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/events/{event_id}")
async def earth_event_detail(event_id: str) -> EarthEvent:
    """Full record for one event. 404 if it isn't (or no longer is) in
    the store."""
    record = await earth_event_store.get(event_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "EARTH_EVENT_NOT_FOUND",
                "message": f"Earth event '{event_id}' bulunamadı.",
            },
        )
    return record


@router.get("/categories")
async def earth_categories() -> Dict[str, Any]:
    """Category metadata sözlüğü. Frontend bu listeyi referans alarak
    chip filter, ikon, renk ve etiket render eder."""
    items = [meta.model_dump() for meta in list_categories()]
    return {
        "items": items,
        "total": len(items),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/summary", response_model=EarthEventSummary)
async def earth_summary() -> EarthEventSummary:
    """KPI bar payload: open count, by-category & by-severity histograms,
    last 24h / 7d totals, top 5 most-severe open events."""
    return await earth_event_store.summary(top_n=5)


@router.get("/alerts/recent")
async def earth_alerts_recent(limit: int = Query(20, ge=1, le=50)) -> Dict[str, Any]:
    """Most recent broadcast alerts (severity ≥ HIGH). Fallback for
    clients that connect after a push has already fired."""
    rows = await earth_event_store.recent_alerts(limit=limit)
    return {
        "items": [r.model_dump(mode="json") for r in rows],
        "total": len(rows),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/earthquakes")
async def earthquakes(
    min_magnitude: float = Query(4.5, ge=0.0, le=10.0),
    window: str = Query("day", pattern="^(hour|day|week|month)$"),
    limit: int = Query(50, ge=1, le=500),
) -> Dict[str, Any]:
    """Return recent earthquakes ≥ `min_magnitude` from the USGS feed.

    Used by the dashboard ticker + the Earth Events panel. Defaults focus on
    M4.5+ in the last 24 h — the same threshold operations centres watch.
    """
    rows = await usgs.get_recent_earthquakes(min_magnitude=min_magnitude, window=window)
    return {
        "items": rows[:limit],
        "total": len(rows),
        "min_magnitude": min_magnitude,
        "window": window,
        "source": "usgs.gov",
    }


@router.get("/history-today")
async def history_today(
    month: Optional[int] = Query(None, ge=1, le=12),
    day: Optional[int] = Query(None, ge=1, le=31),
) -> Dict[str, Any]:
    """Return curated 'on this day in asteroid history' entries.

    With no params, uses today's UTC date. The frontend Hero widget falls back
    to the most recent prior day if today has no entries (handled server-side
    here by walking back up to 14 days).
    """
    if month is None or day is None:
        today = datetime.now(timezone.utc).date()
        month = today.month
        day = today.day

    matches = events_for(month, day)

    # If today has nothing curated, pick the closest prior anniversary
    # (≤ 60 days back). The curated DB is sparse (~24 events), so a tight
    # window can leave the widget empty; 60 days guarantees we land on at
    # least one annual anchor (Apophis discovery, Tunguska, etc).
    walked = 0
    cur_month, cur_day = month, day
    while not matches and walked < 60:
        cur_day -= 1
        if cur_day < 1:
            cur_month -= 1
            if cur_month < 1:
                cur_month = 12
            cur_day = 28  # safe lower bound for Feb
        matches = events_for(cur_month, cur_day)
        walked += 1

    return {
        "month": cur_month,
        "day": cur_day,
        "is_today": (cur_month == month and cur_day == day),
        "events": matches,
    }


@router.get("/history-all")
async def history_all() -> Dict[str, Any]:
    """All curated historical events — used by the timeline / archive view."""
    return {"events": HISTORICAL_EVENTS, "total": len(HISTORICAL_EVENTS)}


@router.get("/earthquakes-tr")
async def earthquakes_tr(
    min_magnitude: float = Query(2.0, ge=0.0, le=10.0),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(100, ge=1, le=500),
) -> Dict[str, Any]:
    """Türkiye-only earthquake feed sourced from AFAD.

    Uses the official AFAD `apiv2/event/filter` endpoint. Defaults to the last
    24h above M2.0 (matches AFAD's own dashboard threshold).
    """
    rows = await afad.get_recent_earthquakes(min_magnitude=min_magnitude, hours=hours, limit=limit)
    return {
        "items": rows,
        "total": len(rows),
        "min_magnitude": min_magnitude,
        "hours": hours,
        "source": "deprem.afad.gov.tr",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/turkish-press")
async def turkish_press(
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(24, ge=1, le=60),
) -> Dict[str, Any]:
    """Türkçe basında asteroit / uzay haberleri.

    TÜBİTAK Bilim Genç + AA + TRT + NASA RSS feed'leri paralel çekilir,
    anahtar kelime filtresi (asteroit/NEO/meteor/uzay misyonları) uygulanır.
    Tüm feed'ler düşerse boş liste döner — frontend manuel listeye fallback.
    """
    items = await press.get_articles(days=days, limit=limit)
    return {
        "items": items,
        "total": len(items),
        "days": days,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/earthquakes-koeri")
async def earthquakes_koeri(
    min_magnitude: float = Query(2.0, ge=0.0, le=10.0),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(100, ge=1, le=500),
) -> Dict[str, Any]:
    """Boğaziçi Kandilli (KOERI) Türkiye deprem feed.

    AFAD'a paralel ikinci ulusal kaynak. Aynı normalize şemada döner; frontend
    iki kaynağı `id` ile dedupe ederek birleştirebilir.
    """
    rows = await koeri.get_recent_earthquakes(min_magnitude=min_magnitude, hours=hours, limit=limit)
    return {
        "items": rows,
        "total": len(rows),
        "min_magnitude": min_magnitude,
        "hours": hours,
        "source": "koeri.boun.edu.tr",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/wildfires")
async def wildfires(
    country: str = Query("TUR", min_length=3, max_length=3),
    days: int = Query(1, ge=1, le=10),
    source: str = Query("VIIRS_SNPP_NRT"),
    limit: int = Query(500, ge=1, le=2000),
) -> Dict[str, Any]:
    """Active wildfire detections from NASA FIRMS.

    Requires `FIRMS_API_KEY` in settings; returns 503 otherwise. `country` is
    an ISO 3166-1 alpha-3 code (TUR, USA, BRA, …). The default `source`
    (VIIRS_SNPP_NRT) gives the highest-resolution near-real-time detections.
    """
    rows = await firms.get_active_fires(country=country.upper(), days=days, source=source, limit=limit)
    return {
        "items": rows,
        "total": len(rows),
        "country": country.upper(),
        "days": days,
        "source": f"NASA FIRMS · {source}",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/volcanoes")
async def volcanoes(limit: int = Query(50, ge=1, le=200)) -> Dict[str, Any]:
    """Currently elevated volcanoes from USGS Hazards Notification System (HANS)."""
    rows = await smithsonian.get_weekly_activity(limit=limit)
    return {
        "items": rows,
        "total": len(rows),
        "source": "USGS Volcano Hazards Program",
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }

"""Autonomous monitoring loop.

Every `INGEST_INTERVAL_SECONDS`:
  1. Fetch the next 7 days of NeoWs feed → normalize → upsert into RiskStore.
  2. Fetch the Sentry list → mark `sentry_listed` on matching records.
  3. Recompute hybrid risk for top-N stale records (older than RISK_REFRESH_SECONDS).
  4. Compute deltas, push critical-class transitions to alerts.recent.
  5. Broadcast `risk_update` + per-alert `threat_alert` over the WebSocket.

The loop is restartable, jittered, and gracefully handles transient NASA / Redis
failures (logs and continues). One exception to the rule: a hard NASA outage
shouldn't peg the loop, so we cap retries inside individual fetches via the
`nasa.http` retry policy and otherwise skip the cycle.
"""

from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.domain.alert import ThreatAlert
from app.domain.neo import NormalizedNeo
from app.domain.risk import HybridAnalysis, RiskClass, RiskDelta, RiskRecord
from app.nasa import eonet, neows, sentry, usgs
from app.pipeline import (
    earth_event_store,
    earth_normalizer,
    hybrid_engine,
    normalizer,
    risk_store,
    risk_timeline,
)
from app.sources import afad
from app.ws.events import (
    EarthEventAlertEvent,
    EarthEventUpdateEvent,
    RiskUpdateEvent,
    SystemStatusEvent,
    ThreatAlertEvent,
)
from app.ws.manager import manager as ws_manager

log = get_logger(__name__)


class AutonomousLoop:
    def __init__(self) -> None:
        self._task: Optional[asyncio.Task] = None
        self._live_task: Optional[asyncio.Task] = None
        self._earth_task: Optional[asyncio.Task] = None
        self._stop_event: Optional[asyncio.Event] = None
        self._cycle_count = 0
        self._earth_cycle_count = 0
        self._last_cycle_at: Optional[datetime] = None
        self._last_earth_cycle_at: Optional[datetime] = None
        self._healthy = True

    # ----- lifecycle -----

    async def start(self) -> None:
        if not settings.SCHEDULER_ENABLED:
            log.info("scheduler.disabled")
            return
        if self._task and not self._task.done():
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run(), name="cliff-autonomous-loop")
        # Side-car task: every 30 s, push the live online-count to admin
        # subscribers. Independent of the heavy ingest cycle so an analytics
        # tile updates even when ingest is mid-flight.
        self._live_task = asyncio.create_task(self._live_count_loop(), name="cliff-live-count")
        if settings.SCHEDULER_EARTH_ENABLED:
            self._earth_task = asyncio.create_task(self._earth_loop(), name="cliff-earth-loop")
        log.info(
            "scheduler.started",
            interval=settings.INGEST_INTERVAL_SECONDS,
            watchlist_size=settings.WATCHLIST_SIZE,
            earth_enabled=settings.SCHEDULER_EARTH_ENABLED,
        )

    async def stop(self) -> None:
        if self._stop_event:
            self._stop_event.set()
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=15)
            except asyncio.TimeoutError:
                self._task.cancel()
            self._task = None
        if self._live_task:
            try:
                await asyncio.wait_for(self._live_task, timeout=5)
            except asyncio.TimeoutError:
                self._live_task.cancel()
            self._live_task = None
        if self._earth_task:
            try:
                await asyncio.wait_for(self._earth_task, timeout=15)
            except asyncio.TimeoutError:
                self._earth_task.cancel()
            self._earth_task = None
        log.info("scheduler.stopped")

    async def _earth_loop(self) -> None:
        """Independent ingest loop for unified Earth events.

        Pulls EONET (NASA) + AFAD (Türkiye) on a separate cadence from
        the NEO scheduler so an EONET timeout can't stall asteroid
        ingest. Runs one cycle on boot then sleeps `EARTH_INGEST_INTERVAL_SECONDS`
        between cycles. Failures are logged and skipped.
        """
        assert self._stop_event is not None
        await self._safe_earth_cycle(initial=True)
        while not self._stop_event.is_set():
            try:
                jitter = random.uniform(-30.0, 30.0)
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=max(60.0, settings.EARTH_INGEST_INTERVAL_SECONDS + jitter),
                )
            except asyncio.TimeoutError:
                pass
            else:
                break
            await self._safe_earth_cycle(initial=False)

    async def _safe_earth_cycle(self, *, initial: bool) -> None:
        try:
            await self._earth_cycle(initial=initial)
        except Exception as exc:  # noqa: BLE001
            log.exception("scheduler.earth.cycle_failed", error=str(exc))

    async def _earth_cycle(self, *, initial: bool) -> None:
        started = datetime.now(timezone.utc)
        self._earth_cycle_count += 1
        log.info("scheduler.earth.start", cycle=self._earth_cycle_count, initial=initial)

        # 1. EONET — global natural events.
        eonet_events: list = []
        try:
            payload = await eonet.get_events(
                days=settings.EARTH_REFRESH_DAYS,
                status="all",
                limit=400,
            )
            eonet_events = earth_normalizer.normalize_eonet_payload(payload)
        except Exception as exc:  # noqa: BLE001
            log.warning("scheduler.earth.eonet_failed", error=str(exc))

        # 2. AFAD — Türkiye earthquakes.
        afad_events: list = []
        try:
            rows = await afad.get_recent_earthquakes(
                min_magnitude=2.0,
                hours=settings.EARTH_AFAD_WINDOW_HOURS,
                limit=200,
            )
            afad_events = earth_normalizer.normalize_afad_rows(rows)
        except Exception as exc:  # noqa: BLE001
            log.warning("scheduler.earth.afad_failed", error=str(exc))

        # 3. USGS — global earthquakes (M4.5+ last 7 days).
        usgs_events: list = []
        try:
            rows = await usgs.get_recent_earthquakes(min_magnitude=4.5, window="week")
            usgs_events = earth_normalizer.normalize_usgs_rows(rows)
        except Exception as exc:  # noqa: BLE001
            log.warning("scheduler.earth.usgs_failed", error=str(exc))

        all_events = eonet_events + afad_events + usgs_events

        # 3. Upsert + collect deltas + alerts.
        deltas = []
        alerts = []
        for event in all_events:
            try:
                delta = await earth_event_store.upsert(event)
            except Exception as exc:  # noqa: BLE001
                log.warning(
                    "scheduler.earth.upsert_failed",
                    event_id=event.id,
                    error=str(exc),
                )
                continue
            if delta is None:
                continue
            deltas.append(delta)
            alert = earth_event_store.build_alert_for_delta(event, delta)
            if alert is not None:
                alerts.append(alert)
                try:
                    await earth_event_store.push_alert(alert)
                except Exception:
                    pass

        # 4. Periodic prune so the indexes don't grow forever.
        if initial or self._earth_cycle_count % 20 == 0:
            try:
                await earth_event_store.prune_stale()
            except Exception as exc:  # noqa: BLE001
                log.warning("scheduler.earth.prune_failed", error=str(exc))

        # 5. Broadcast.
        if deltas:
            try:
                await ws_manager.broadcast(
                    "earth_updates",
                    EarthEventUpdateEvent(deltas=deltas),
                )
            except Exception as exc:  # noqa: BLE001
                log.warning("scheduler.earth.broadcast_deltas_failed", error=str(exc))
        for alert in alerts:
            try:
                await ws_manager.broadcast(
                    "earth_alerts",
                    EarthEventAlertEvent(alert=alert),
                )
            except Exception as exc:  # noqa: BLE001
                log.warning("scheduler.earth.broadcast_alert_failed", error=str(exc))

        self._last_earth_cycle_at = started
        log.info(
            "scheduler.earth.done",
            cycle=self._earth_cycle_count,
            eonet=len(eonet_events),
            afad=len(afad_events),
            usgs=len(usgs_events),
            deltas=len(deltas),
            alerts=len(alerts),
            duration_ms=int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
        )

    async def _live_count_loop(self) -> None:
        """Broadcast live WebSocket connection count every 30 s on the
        `analytics_updates` channel. Cheap — single integer + JSON encode.
        Failures are swallowed so an admin-feed glitch can't crash ingest."""
        assert self._stop_event is not None
        while not self._stop_event.is_set():
            try:
                from app.ws.events import LiveCountEvent
                from app.ws.manager import get_manager

                wsmgr = get_manager()
                count = wsmgr.current_active_count()
                event = LiveCountEvent(count=count)
                await wsmgr.broadcast("analytics_updates", event)
            except Exception as exc:
                log.warning("live_count.broadcast_failed", error=str(exc))
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=30.0)
            except asyncio.TimeoutError:
                continue
            else:
                break

    @property
    def cycle_count(self) -> int:
        return self._cycle_count

    @property
    def last_cycle_at(self) -> Optional[datetime]:
        return self._last_cycle_at

    # ----- main loop -----

    async def _run(self) -> None:
        assert self._stop_event is not None
        # Run one cycle on boot so the dashboard has data within seconds.
        await self._safe_cycle(initial=True)

        while not self._stop_event.is_set():
            try:
                jitter = random.uniform(-30.0, 30.0)
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=max(60.0, settings.INGEST_INTERVAL_SECONDS + jitter),
                )
            except asyncio.TimeoutError:
                pass
            else:
                break  # stop requested
            await self._safe_cycle()

    async def _safe_cycle(self, *, initial: bool = False) -> None:
        try:
            await self._cycle(initial=initial)
            self._healthy = True
        except Exception as exc:
            self._healthy = False
            log.exception("scheduler.cycle_failed", error=str(exc))

    async def _cycle(self, *, initial: bool) -> None:
        started = datetime.now(timezone.utc)
        self._cycle_count += 1
        log.info("scheduler.cycle.start", cycle=self._cycle_count, initial=initial)

        # 1. Ingest NeoWs feed — wider window on first boot, then incremental.
        feed_result = await self._ingest_feed(deep=initial)

        # 2. Sentry overlay.
        sentry_designations = await self._fetch_sentry_designations()

        # 3. Recompute risk for stale records (or all on first cycle).
        recompute_count, deltas, alerts = await self._recompute_top_n(
            sentry_designations=sentry_designations,
            force_all=initial or feed_result["new"] > 0,
        )

        # 4. Persist alerts and broadcast.
        for alert in alerts:
            await risk_store.push_alert(alert)
            await ws_manager.broadcast("threat_alerts", ThreatAlertEvent(alert=alert))

        if deltas:
            await ws_manager.broadcast("risk_updates", RiskUpdateEvent(deltas=deltas))

        await ws_manager.broadcast(
            "system_status",
            SystemStatusEvent(
                status="healthy" if self._healthy else "degraded",
                cycle_count=self._cycle_count,
                last_cycle_at=started,
                redis_ok=True,
                nasa_ok=feed_result["fetched"] > 0,
            ),
        )

        self._last_cycle_at = started
        log.info(
            "scheduler.cycle.done",
            cycle=self._cycle_count,
            ingested=feed_result["fetched"],
            new=feed_result["new"],
            recomputed=recompute_count,
            deltas=len(deltas),
            alerts=len(alerts),
            duration_ms=int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
        )

    # ----- helpers -----

    async def _ingest_feed(self, *, deep: bool = False) -> dict:
        """Fetch NeoWs feed and seed placeholder records.

        `deep` mode (used on boot) pulls a 30-day window in 7-day chunks so the
        catalog starts wide. Subsequent cycles use the cheaper 7-day pull.
        """
        raws: List[Dict[str, Any]] = []
        try:
            if deep:
                window_days = settings.INGEST_FEED_DAYS_BOOT
                chunks = await neows.get_feed_window(window_days)
                for chunk in chunks:
                    raws.extend(neows.iter_neos_from_feed(chunk))
            else:
                window_days = settings.INGEST_FEED_DAYS_CYCLE
                feed = await neows.get_feed_today(window_days)
                raws.extend(neows.iter_neos_from_feed(feed))
        except Exception as exc:
            log.warning("scheduler.feed_fetch_failed", error=str(exc))
            return {"fetched": 0, "new": 0}

        # De-dup by neo_id — wider windows can cross-list the same NEO.
        seen: set[str] = set()
        normalized: List[NormalizedNeo] = []
        for raw in raws:
            neo_id = str(raw.get("id") or raw.get("neo_reference_id") or "")
            if not neo_id or neo_id in seen:
                continue
            seen.add(neo_id)
            n = normalizer.normalize_neows(raw)
            if n is not None:
                normalized.append(n)

        new_count = 0
        for n in normalized:
            existing = await risk_store.get(n.neo_id)
            if existing is None:
                # Seed a placeholder MINIMAL record so it appears in the watchlist
                # before the first hybrid analysis runs.
                placeholder = RiskRecord(
                    neo_id=n.neo_id,
                    designation=n.designation,
                    name=n.name,
                    risk_class=RiskClass.MINIMAL,
                    hybrid_score=0.0,
                    diameter_max_km=n.diameter_max_km,
                    next_approach_at=n.next_approach_at,
                    miss_distance_km=n.miss_distance_km,
                    relative_velocity_kms=n.relative_velocity_kms,
                    is_potentially_hazardous=n.is_potentially_hazardous,
                    sentry_listed=n.sentry_listed,
                )
                await risk_store.upsert(placeholder)
                new_count += 1

        return {"fetched": len(raws), "new": new_count}

    async def _fetch_sentry_designations(self) -> set[str]:
        try:
            payload = await sentry.get_objects()
        except Exception as exc:
            log.warning("scheduler.sentry_fetch_failed", error=str(exc))
            return set()
        return set(sentry.extract_designations(payload))

    async def _recompute_top_n(
        self,
        sentry_designations: set[str],
        *,
        force_all: bool,
    ) -> tuple[int, List[RiskDelta], List[ThreatAlert]]:
        watchlist_size = settings.WATCHLIST_SIZE

        if force_all:
            # On boot or when new NEOs arrived, recompute the highest-priority N.
            current = await risk_store.top_n_by_score(watchlist_size)
            neo_ids = [r.neo_id for r in current]
        else:
            stale = await risk_store.stale_neo_ids(
                older_than_seconds=settings.RISK_REFRESH_SECONDS,
                limit=watchlist_size,
            )
            neo_ids = stale

        if not neo_ids:
            return 0, [], []

        deltas: List[RiskDelta] = []
        alerts: List[ThreatAlert] = []
        recompute_count = 0

        for neo_id in neo_ids:
            try:
                raw_neo = await neows.get_neo(neo_id)
                neo: Optional[NormalizedNeo] = None
                if raw_neo is not None:
                    n = normalizer.normalize_neows(raw_neo)
                    if n is not None:
                        neo = normalizer.merge_sentry_flag(n, sentry_designations)
                analysis: HybridAnalysis = await hybrid_engine.analyze_target(
                    neo_id=neo_id,
                    days_ahead=30,
                    neo=neo,
                )
                helio_pos, geo_dist = self._compute_position(raw_neo)
            except Exception as exc:
                log.warning("scheduler.recompute_failed", neo_id=neo_id, error=str(exc))
                continue

            record = self._build_record(neo, analysis, helio_pos, geo_dist)
            previous = await risk_store.get(neo_id)
            delta = await risk_store.upsert(record)
            await risk_timeline.append(record)
            recompute_count += 1

            if delta is not None:
                deltas.append(delta)
                if previous is not None:
                    alert = risk_store.build_alert_for_delta(record, delta)
                    if alert is not None:
                        alerts.append(alert)

        return recompute_count, deltas, alerts

    async def _build_normalized_neo(self, neo_id: str, sentry_designations: set[str]) -> Optional[NormalizedNeo]:
        raw = await neows.get_neo(neo_id)
        if raw is None:
            return None
        n = normalizer.normalize_neows(raw)
        if n is None:
            return None
        return normalizer.merge_sentry_flag(n, sentry_designations)

    def _compute_position(
        self,
        raw_neo: Optional[dict],
    ) -> tuple[Optional[list[float]], Optional[float]]:
        """Heliocentric position (AU) + Earth-distance (AU) at current time.

        Returns (None, None) if `orbital_data` missing or invalid.
        """
        if raw_neo is None:
            return None, None
        orbital_data = raw_neo.get("orbital_data") if isinstance(raw_neo, dict) else None
        if not orbital_data:
            return None, None

        try:
            import numpy as np

            from app.pipeline import orbit_elements as oe
            from app.pipeline.propagator import planet_position

            elem = oe.from_neows(orbital_data)
            if elem is None:
                return None, None
            jd = oe.jd_now()
            state = oe.state_at(elem, jd)
            r_helio = state["r"]  # numpy array
            r_earth = planet_position("earth", jd)
            geo = float(np.linalg.norm(r_helio - r_earth))
            return [float(c) for c in r_helio], geo
        except Exception as exc:
            log.warning("scheduler.position_failed", error=str(exc))
            return None, None

    def _build_record(
        self,
        neo: Optional[NormalizedNeo],
        analysis: HybridAnalysis,
        helio_position_au: Optional[list[float]] = None,
        geo_distance_au: Optional[float] = None,
    ) -> RiskRecord:
        if neo is None:
            return RiskRecord(
                neo_id=analysis.neo_id,
                name=analysis.neo_id,
                risk_class=analysis.ml_class,
                hybrid_score=analysis.hybrid_score,
                ml_confidence=analysis.ml_confidence,
                monte_carlo=analysis.monte_carlo,
                helio_position_au=helio_position_au,
                geo_distance_au=geo_distance_au,
                computed_at=analysis.computed_at,
            )
        return RiskRecord(
            neo_id=neo.neo_id,
            designation=neo.designation,
            name=neo.name,
            risk_class=analysis.ml_class,
            hybrid_score=analysis.hybrid_score,
            ml_confidence=analysis.ml_confidence,
            diameter_max_km=neo.diameter_max_km,
            next_approach_at=neo.next_approach_at,
            miss_distance_km=neo.miss_distance_km,
            relative_velocity_kms=neo.relative_velocity_kms,
            is_potentially_hazardous=neo.is_potentially_hazardous,
            sentry_listed=neo.sentry_listed,
            monte_carlo=analysis.monte_carlo,
            helio_position_au=helio_position_au,
            geo_distance_au=geo_distance_au,
            computed_at=analysis.computed_at,
            fetched_at=neo.fetched_at,
        )


loop = AutonomousLoop()


def get_loop() -> AutonomousLoop:
    return loop

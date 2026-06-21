"""NOAA Space Weather Prediction Center (SWPC) client.

Pulls live solar / geomagnetic data from services.swpc.noaa.gov. All feeds
are JSON, no key, no rate limit. We expose three signals:

  - **Kp index**   — geomagnetic activity (0..9, ≥5 = storm)
  - **X-ray flux** — current solar flare class (e.g. C2.4, M1.0, X9.3)
  - **Solar wind** — speed / density / Bz (interplanetary mag-field component)

Cache 60 s — these feeds update on the minute.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.logging import get_logger
from app.nasa import cache, http

log = get_logger(__name__)

SWPC_BASE = "https://services.swpc.noaa.gov"
CACHE_TTL_SECONDS = 60


def _flare_class(flux_wm2: float) -> str:
    """Classify GOES X-ray flux into the standard A/B/C/M/X letter system."""
    if flux_wm2 >= 1e-4:
        return f"X{flux_wm2 / 1e-4:.1f}"
    if flux_wm2 >= 1e-5:
        return f"M{flux_wm2 / 1e-5:.1f}"
    if flux_wm2 >= 1e-6:
        return f"C{flux_wm2 / 1e-6:.1f}"
    if flux_wm2 >= 1e-7:
        return f"B{flux_wm2 / 1e-7:.1f}"
    return f"A{flux_wm2 / 1e-8:.1f}"


def _kp_label(kp: float) -> str:
    """Convert a Kp value to a human-readable storm level."""
    if kp >= 9:
        return "G5 — Extreme"
    if kp >= 8:
        return "G4 — Severe"
    if kp >= 7:
        return "G3 — Strong"
    if kp >= 6:
        return "G2 — Moderate"
    if kp >= 5:
        return "G1 — Minor"
    if kp >= 4:
        return "Unsettled"
    return "Quiet"


async def get_kp_index() -> Dict[str, Any]:
    """Most recent 1-minute Kp estimate + quick storm classification."""
    cache_key = "swpc:kp:1m"

    async def loader() -> List[Dict[str, Any]]:
        url = f"{SWPC_BASE}/json/planetary_k_index_1m.json"
        log.info("swpc.kp.fetch")
        return await http.request_json("GET", url, upstream_label="swpc")

    rows = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    if not rows:
        return {"available": False}
    latest = rows[-1]
    kp = float(latest.get("kp_index") or latest.get("estimated_kp") or 0)
    return {
        "available": True,
        "kp": kp,
        "label": _kp_label(kp),
        "time_tag": latest.get("time_tag"),
        "storm": kp >= 5,
    }


async def get_xray_flares() -> Dict[str, Any]:
    """Latest GOES X-ray flux + the most recent significant flare in 7 days."""
    cache_key = "swpc:xray:7day"

    async def loader() -> List[Dict[str, Any]]:
        url = f"{SWPC_BASE}/json/goes/primary/xrays-7-day.json"
        log.info("swpc.xray.fetch")
        return await http.request_json("GET", url, upstream_label="swpc")

    rows = await cache.get_or_fetch(cache_key, CACHE_TTL_SECONDS, loader)
    if not rows:
        return {"available": False}

    long_band = [r for r in rows if (r.get("energy") or "").startswith("0.1-0.8")]
    if not long_band:
        long_band = rows
    latest = long_band[-1]
    flux = float(latest.get("flux") or 0)

    # Find the strongest flare of the last 24h
    cutoff_idx = max(0, len(long_band) - 24 * 60)
    recent = long_band[cutoff_idx:]
    peak: Optional[Dict[str, Any]] = None
    peak_flux = 0.0
    for row in recent:
        f = float(row.get("flux") or 0)
        if f > peak_flux:
            peak_flux = f
            peak = row

    return {
        "available": True,
        "current_flux_wm2": flux,
        "current_class": _flare_class(flux) if flux > 0 else None,
        "current_time_tag": latest.get("time_tag"),
        "peak_24h": (
            {
                "flux_wm2": peak_flux,
                "class": _flare_class(peak_flux),
                "time_tag": peak["time_tag"] if peak else None,
            }
            if peak and peak_flux > 0
            else None
        ),
    }


async def get_solar_wind() -> Dict[str, Any]:
    """Real-time DSCOVR/ACE solar wind plasma + magnetic field summary."""
    cache_key = "swpc:solarwind:1d"

    async def plasma_loader() -> List[List[Any]]:
        url = f"{SWPC_BASE}/products/solar-wind/plasma-1-day.json"
        log.info("swpc.solar_wind.plasma.fetch")
        return await http.request_json("GET", url, upstream_label="swpc")

    async def mag_loader() -> List[List[Any]]:
        url = f"{SWPC_BASE}/products/solar-wind/mag-1-day.json"
        log.info("swpc.solar_wind.mag.fetch")
        return await http.request_json("GET", url, upstream_label="swpc")

    plasma = await cache.get_or_fetch(cache_key + ":plasma", CACHE_TTL_SECONDS, plasma_loader)
    mag = await cache.get_or_fetch(cache_key + ":mag", CACHE_TTL_SECONDS, mag_loader)

    if not plasma or len(plasma) < 2:
        return {"available": False}

    def _safe_row(rows: List[List[Any]], wanted_keys: list[str]) -> Optional[Dict[str, Any]]:
        if not rows:
            return None
        header = rows[0]
        idx = {k: i for i, k in enumerate(header)}
        for row in reversed(rows[1:]):
            try:
                values = {k: row[idx[k]] for k in wanted_keys if k in idx}
                if all(v not in (None, "", "null") for v in values.values()):
                    return {k: float(v) for k, v in values.items()}
            except (IndexError, ValueError):
                continue
        return None

    plasma_row = _safe_row(plasma, ["density", "speed", "temperature"])
    mag_row = _safe_row(mag, ["bx_gsm", "by_gsm", "bz_gsm", "bt"]) if mag else None

    return {
        "available": plasma_row is not None,
        "speed_kms": plasma_row.get("speed") if plasma_row else None,
        "density_pcm3": plasma_row.get("density") if plasma_row else None,
        "temperature_k": plasma_row.get("temperature") if plasma_row else None,
        "bz_nt": mag_row.get("bz_gsm") if mag_row else None,
        "bt_nt": mag_row.get("bt") if mag_row else None,
    }


async def get_summary() -> Dict[str, Any]:
    """One-shot endpoint that bundles Kp + X-ray + solar-wind for the dashboard."""
    import asyncio as _asyncio

    kp, xray, sw = await _asyncio.gather(
        get_kp_index(),
        get_xray_flares(),
        get_solar_wind(),
        return_exceptions=True,
    )

    def _safe(x: Any) -> Dict[str, Any]:
        if isinstance(x, Exception):
            log.warning("swpc.summary.subcall_failed", error=str(x))
            return {"available": False}
        return x  # type: ignore[return-value]

    return {
        "kp": _safe(kp),
        "xray": _safe(xray),
        "solar_wind": _safe(sw),
    }

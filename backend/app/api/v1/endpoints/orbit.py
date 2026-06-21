"""Orbit & trajectory endpoints.

Two flavors:
  - /orbit/{neo_id}/keplerian  — 2-body ellipse points (fast, for the
    trajectory line on the dashboard)
  - /orbit/{neo_id}/projection — RK4 + planetary perturbations forward
    propagation (slow, for "where will it be in N years" queries)
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Query

from app.core.exceptions import NotFoundError, UpstreamError
from app.nasa import neows
from app.pipeline import orbit_elements as oe
from app.pipeline import propagator as prop

router = APIRouter()


@router.get("/orbit/{neo_id}/keplerian")
async def keplerian(
    neo_id: str,
    points: int = Query(256, ge=32, le=2048),
) -> Dict[str, Any]:
    """Closed orbit ellipse for `neo_id` as `points` Cartesian samples (AU).

    Uses pure Keplerian elements from NeoWs `orbital_data`. Output is suitable
    for drawing the trajectory line in the dashboard 3D scene.
    """
    elements = await _fetch_elements(neo_id)
    samples = oe.sample_orbit(elements, points=points)
    return {
        "neo_id": neo_id,
        "elements": {
            "a_au": elements.a_au,
            "e": elements.e,
            "i_deg": _deg(elements.i_rad),
            "omega_deg": _deg(elements.omega_rad),
            "arg_peri_deg": _deg(elements.arg_peri_rad),
            "M0_deg": _deg(elements.M0_rad),
            "epoch_jd": elements.epoch_jd,
            "period_days": elements.period_days,
        },
        "points_au": samples,
    }


@router.get("/orbit/{neo_id}/projection")
async def projection(
    neo_id: str,
    years: float = Query(5.0, ge=0.1, le=200.0),
    samples: int = Query(200, ge=20, le=2000),
) -> Dict[str, Any]:
    """RK4 + perturbation propagation. Returns sampled trajectory points.

    Heavy: a 50-year, 1000-sample projection takes ~1 second on a laptop.
    Cache aggressively at the caller level if you call this often.
    """
    elements = await _fetch_elements(neo_id)
    jd_start = oe.jd_now()
    days = years * 365.25
    traj = prop.propagate(
        elements,
        jd_start=jd_start,
        days=days,
        sample_count=samples,
    )
    return {
        "neo_id": neo_id,
        "jd_start": jd_start,
        "years": years,
        "samples": [{"jd": s.jd, "r_au": s.r_au} for s in traj],
    }


@router.get("/orbit/{neo_id}/state")
async def current_state(neo_id: str) -> Dict[str, Any]:
    """Current heliocentric Cartesian position + velocity (AU, AU/day)."""
    elements = await _fetch_elements(neo_id)
    state = oe.state_at(elements, oe.jd_now())
    return {
        "neo_id": neo_id,
        "jd": oe.jd_now(),
        "r_au": [float(c) for c in state["r"]],
        "v_au_per_day": [float(c) for c in state["v"]],
    }


async def _fetch_elements(neo_id: str) -> oe.OrbitalElements:
    try:
        raw = await neows.get_lookup(neo_id)
    except UpstreamError as exc:
        raise NotFoundError(
            f"NEO {neo_id} could not be fetched from NeoWs",
            details={"neo_id": neo_id, "upstream_error": str(exc)},
        ) from exc
    if not isinstance(raw, dict):
        raise NotFoundError(f"NEO {neo_id} returned invalid payload")
    orbital_data = raw.get("orbital_data") if isinstance(raw, dict) else None
    if not orbital_data:
        raise NotFoundError(
            f"NEO {neo_id} has no orbital elements (NeoWs returned no orbital_data)",
            details={"neo_id": neo_id},
        )
    elements = oe.from_neows(orbital_data)
    if elements is None:
        raise NotFoundError(
            f"NEO {neo_id} orbital elements incomplete",
            details={"neo_id": neo_id},
        )
    return elements


def _deg(rad: float) -> float:
    import math

    return math.degrees(rad)

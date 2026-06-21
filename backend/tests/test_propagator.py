"""Orbit element extraction + propagator tests."""

from __future__ import annotations

import math

import numpy as np

from app.pipeline.orbit_elements import (
    OrbitalElements,
    from_neows,
    sample_orbit,
    solve_kepler,
    state_at,
)
from app.pipeline.propagator import planet_position, propagate


# ----- Kepler equation -----

def test_solve_kepler_circle():
    # Circular orbit (e=0) → E should equal M
    for M in [0, 0.5, 1.0, 2.0, math.pi]:
        E = solve_kepler(M, 0.0)
        assert abs(E - ((M + math.pi) % (2 * math.pi) - math.pi)) < 1e-10


def test_solve_kepler_high_eccentricity():
    # Should converge for e=0.9
    M = 0.5
    e = 0.9
    E = solve_kepler(M, e)
    assert abs(E - e * math.sin(E) - M) < 1e-9


# ----- Orbital elements parsing -----

def test_from_neows_full():
    raw = {
        "semi_major_axis": "1.5",
        "eccentricity": "0.2",
        "inclination": "10",
        "ascending_node_longitude": "45",
        "perihelion_argument": "60",
        "mean_anomaly": "30",
        "epoch_osculation": 2451545.0,
    }
    elem = from_neows(raw)
    assert elem is not None
    assert abs(elem.a_au - 1.5) < 1e-9
    assert abs(elem.e - 0.2) < 1e-9
    assert abs(elem.i_rad - math.radians(10)) < 1e-9


def test_from_neows_missing_returns_none():
    assert from_neows({}) is None
    assert from_neows({"semi_major_axis": "1.0"}) is None  # incomplete


# ----- State propagation -----

def _earth_like() -> OrbitalElements:
    return OrbitalElements(
        a_au=1.0,
        e=0.0167,
        i_rad=0.0,
        omega_rad=0.0,
        arg_peri_rad=0.0,
        M0_rad=0.0,
        epoch_jd=2451545.0,
    )


def test_state_at_returns_unit_distance_for_earth_orbit():
    elem = _earth_like()
    state = state_at(elem, 2451545.0)
    r = float(np.linalg.norm(state["r"]))
    # Should be near perihelion: a(1-e) = 0.9833 AU
    assert 0.98 < r < 1.02


def test_state_at_one_period_returns_initial_position():
    elem = _earth_like()
    period = elem.period_days
    assert period is not None and 360 < period < 370
    s0 = state_at(elem, 2451545.0)
    s1 = state_at(elem, 2451545.0 + period)
    diff = float(np.linalg.norm(s0["r"] - s1["r"]))
    assert diff < 1e-6


# ----- Sampling -----

def test_sample_orbit_closed_loop():
    elem = _earth_like()
    pts = sample_orbit(elem, points=64)
    # Should be 65 points (closed loop)
    assert len(pts) == 65
    # First and last should be (nearly) coincident
    diff = math.dist(pts[0], pts[-1])
    assert diff < 1e-6


def test_sample_orbit_within_aphelion():
    elem = _earth_like()
    pts = sample_orbit(elem, points=128)
    # All points should sit between perihelion and aphelion
    aphelion = elem.a_au * (1 + elem.e)
    perihelion = elem.a_au * (1 - elem.e)
    for p in pts:
        r = math.sqrt(p[0] ** 2 + p[1] ** 2 + p[2] ** 2)
        assert perihelion - 1e-6 <= r <= aphelion + 1e-6


# ----- Planet positions -----

def test_earth_position_unit_distance():
    """Earth's heliocentric distance should be ~1 AU at any epoch."""
    for jd in [2451545.0, 2459580.0, 2465000.0]:  # J2000, ~2022, ~2034
        r = planet_position("earth", jd)
        d = float(np.linalg.norm(r))
        assert 0.98 < d < 1.02, f"Earth distance {d} at jd {jd}"


def test_jupiter_position_in_belt():
    """Jupiter's heliocentric distance should be 4.95–5.45 AU."""
    r = planet_position("jupiter", 2459580.0)
    d = float(np.linalg.norm(r))
    assert 4.95 < d < 5.46


# ----- N-body propagator -----

def test_propagate_earth_one_year():
    """Propagating an Earth-like orbit for 365 days should return near origin."""
    elem = _earth_like()
    samples = propagate(elem, jd_start=2451545.0, days=365.0, sample_count=200)
    assert len(samples) == 201
    initial_r = np.asarray(samples[0].r_au)
    final_r = np.asarray(samples[-1].r_au)
    # After ~1 year an Earth-like orbit should be close to its starting point.
    # Tolerance is generous because we're propagating through Jupiter
    # perturbations and the start isn't exactly J2000.
    diff = float(np.linalg.norm(final_r - initial_r))
    assert diff < 0.05


def test_propagate_keeps_bounded_distance():
    """For a bound orbit, perihelion < |r| < aphelion + slack throughout."""
    elem = _earth_like()
    samples = propagate(elem, jd_start=2451545.0, days=730.0, sample_count=100)
    aph = elem.a_au * (1 + elem.e) + 0.05
    peri = elem.a_au * (1 - elem.e) - 0.05
    for s in samples:
        d = math.sqrt(sum(c * c for c in s.r_au))
        assert peri <= d <= aph

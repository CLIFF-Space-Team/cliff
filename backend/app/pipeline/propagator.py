"""Level-3 N-body propagator — RK4 with major-planet perturbations.

Used for medium-term (years → decades) trajectory projection where
Keplerian becomes inaccurate due to Jupiter / Earth perturbations.

The dashboard's orbit *line* uses Keplerian (orbit_elements.sample_orbit).
This propagator powers the `/orbit/projection` endpoint where users want to
see how a NEO's path evolves under realistic gravity.

Frame: heliocentric ecliptic J2000. Units: AU, days. Mass in solar masses.

Planet masses (solar masses):
   Earth   3.0034e-6
   Mars    3.2271e-7
   Jupiter 9.5479e-4   ← dominant perturber for inner-system NEOs
   Saturn  2.8589e-4

Planet positions are evaluated from cached mean orbital elements
(VSOP87 trimmed) — sub-arcsecond accuracy is unnecessary for visualization,
but the perturbation magnitudes need to be physically reasonable.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

from app.pipeline.orbit_elements import GM_SUN_AU3_PER_DAY2, OrbitalElements, solve_kepler

# Planet GM (= G·M / GM_sun · GM_sun_au_day_units)
PLANETS_GM = {
    "earth": GM_SUN_AU3_PER_DAY2 * 3.0034896149e-6,
    "mars": GM_SUN_AU3_PER_DAY2 * 3.22715144e-7,
    "jupiter": GM_SUN_AU3_PER_DAY2 * 9.5479194e-4,
    "saturn": GM_SUN_AU3_PER_DAY2 * 2.8588598e-4,
}

# Mean orbital elements (J2000, simplified for propagation)
PLANET_ELEMENTS = {
    "earth": OrbitalElements(
        a_au=1.00000261,
        e=0.01671123,
        i_rad=math.radians(0.00001531),
        omega_rad=math.radians(0.0),
        arg_peri_rad=math.radians(102.93768193),
        M0_rad=math.radians(100.46457166),
        epoch_jd=2451545.0,  # J2000
    ),
    "mars": OrbitalElements(
        a_au=1.52371034,
        e=0.09339410,
        i_rad=math.radians(1.84969142),
        omega_rad=math.radians(49.55953891),
        arg_peri_rad=math.radians(286.502141),
        M0_rad=math.radians(355.45332),
        epoch_jd=2451545.0,
    ),
    "jupiter": OrbitalElements(
        a_au=5.20288700,
        e=0.04838624,
        i_rad=math.radians(1.30439695),
        omega_rad=math.radians(100.47390909),
        arg_peri_rad=math.radians(273.86740),
        M0_rad=math.radians(34.39644051),
        epoch_jd=2451545.0,
    ),
    "saturn": OrbitalElements(
        a_au=9.53667594,
        e=0.05386179,
        i_rad=math.radians(2.48599187),
        omega_rad=math.radians(113.66242448),
        arg_peri_rad=math.radians(339.39164),
        M0_rad=math.radians(49.95424423),
        epoch_jd=2451545.0,
    ),
}


@dataclass(frozen=True)
class TrajectorySample:
    jd: float
    r_au: List[float]  # [x, y, z]


def planet_position(name: str, jd: float) -> np.ndarray:
    """Heliocentric ecliptic position of a major planet at `jd` (AU)."""
    elem = PLANET_ELEMENTS[name]
    dt = jd - elem.epoch_jd
    M = elem.M0_rad + elem.n_rad_per_day * dt
    E = solve_kepler(M, elem.e)
    a = elem.a_au
    e = elem.e
    x_p = a * (math.cos(E) - e)
    y_p = a * math.sqrt(max(0.0, 1 - e * e)) * math.sin(E)
    cosO = math.cos(elem.omega_rad)
    sinO = math.sin(elem.omega_rad)
    cosi = math.cos(elem.i_rad)
    sini = math.sin(elem.i_rad)
    cosw = math.cos(elem.arg_peri_rad)
    sinw = math.sin(elem.arg_peri_rad)
    R = np.array(
        [
            [cosO * cosw - sinO * sinw * cosi, -cosO * sinw - sinO * cosw * cosi, sinO * sini],
            [sinO * cosw + cosO * sinw * cosi, -sinO * sinw + cosO * cosw * cosi, -cosO * sini],
            [sinw * sini, cosw * sini, cosi],
        ]
    )
    return R @ np.array([x_p, y_p, 0.0])


def acceleration(r: np.ndarray, jd: float) -> np.ndarray:
    """Heliocentric acceleration on a body at position r (AU) at time jd.

    Sun's pull + perturbations from Earth, Mars, Jupiter, Saturn.
    """
    r_norm = float(np.linalg.norm(r))
    if r_norm < 1e-9:
        return np.zeros(3)
    a = -GM_SUN_AU3_PER_DAY2 * r / r_norm**3

    # Planetary perturbations
    for name, gm in PLANETS_GM.items():
        rp = planet_position(name, jd)
        d = r - rp
        d_norm = float(np.linalg.norm(d))
        rp_norm = float(np.linalg.norm(rp))
        if d_norm < 1e-9 or rp_norm < 1e-9:
            continue
        # Direct + indirect terms (heliocentric formulation)
        a -= gm * (d / d_norm**3 + rp / rp_norm**3)
    return a


def rk4_step(r: np.ndarray, v: np.ndarray, jd: float, dt: float) -> Tuple[np.ndarray, np.ndarray]:
    """Single RK4 step on the (r, v) state."""
    k1r = v
    k1v = acceleration(r, jd)

    k2r = v + 0.5 * dt * k1v
    k2v = acceleration(r + 0.5 * dt * k1r, jd + 0.5 * dt)

    k3r = v + 0.5 * dt * k2v
    k3v = acceleration(r + 0.5 * dt * k2r, jd + 0.5 * dt)

    k4r = v + dt * k3v
    k4v = acceleration(r + dt * k3r, jd + dt)

    r_next = r + (dt / 6.0) * (k1r + 2 * k2r + 2 * k3r + k4r)
    v_next = v + (dt / 6.0) * (k1v + 2 * k2v + 2 * k3v + k4v)
    return r_next, v_next


def propagate(
    elements: OrbitalElements,
    jd_start: float,
    days: float,
    sample_count: int = 200,
) -> List[TrajectorySample]:
    """Propagate a small body forward `days` days using RK4 + perturbations.

    Returns `sample_count + 1` samples (start + intermediate + end).
    Step size = days / sample_count, so longer projections use bigger steps.
    """
    from app.pipeline.orbit_elements import state_at

    initial = state_at(elements, jd_start)
    r = np.asarray(initial["r"], dtype=np.float64)
    v = np.asarray(initial["v"], dtype=np.float64)
    dt = days / sample_count

    samples: List[TrajectorySample] = [TrajectorySample(jd=jd_start, r_au=r.tolist())]
    jd = jd_start
    for _ in range(sample_count):
        r, v = rk4_step(r, v, jd, dt)
        jd += dt
        samples.append(TrajectorySample(jd=jd, r_au=r.tolist()))
    return samples

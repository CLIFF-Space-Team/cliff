"""Keplerian orbital element extraction + state-vector propagation.

Pure-numpy. No external dependencies beyond what's already in the pipeline.

Conventions:
- Heliocentric ecliptic J2000 frame.
- All angles in radians inside the module; degrees only at the I/O boundary.
- Distances in AU, times in days.

The Keplerian propagator is an order-of-magnitude faster than the RK4 N-body
in `propagator.py` and is accurate to <1% over one orbital period for asteroids
without close planetary encounters — which is the right tool for drawing the
trajectory ellipse on the dashboard.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import numpy as np

GM_SUN_AU3_PER_DAY2 = 0.0002959122082855911  # Gauss gravitational constant²


@dataclass(frozen=True)
class OrbitalElements:
    """Heliocentric Keplerian elements for a small body."""

    a_au: float
    """Semi-major axis."""
    e: float
    """Eccentricity (0 = circle, <1 = ellipse, 1 = parabola)."""
    i_rad: float
    """Inclination relative to ecliptic."""
    omega_rad: float
    """Longitude of ascending node (Ω)."""
    arg_peri_rad: float
    """Argument of periapsis (ω)."""
    M0_rad: float
    """Mean anomaly at epoch."""
    epoch_jd: float
    """Reference epoch (Julian Day)."""

    @property
    def n_rad_per_day(self) -> float:
        """Mean motion."""
        if self.a_au <= 0:
            return 0.0
        return math.sqrt(GM_SUN_AU3_PER_DAY2 / self.a_au**3)

    @property
    def period_days(self) -> Optional[float]:
        if self.e >= 1.0 or self.a_au <= 0:
            return None
        return 2 * math.pi / self.n_rad_per_day


def from_neows(orbital_data: Dict[str, Any]) -> Optional[OrbitalElements]:
    """Build OrbitalElements from a NeoWs `orbital_data` dict.

    NeoWs returns angles in degrees and distances in AU. We tolerate both
    string and float values; missing fields → None.
    """
    if not isinstance(orbital_data, dict):
        return None

    def f(key: str) -> Optional[float]:
        val = orbital_data.get(key)
        if val is None:
            return None
        try:
            return float(val)
        except (TypeError, ValueError):
            return None

    a = f("semi_major_axis")
    e = f("eccentricity")
    i_deg = f("inclination")
    omega_deg = f("ascending_node_longitude")
    w_deg = f("perihelion_argument")
    M_deg = f("mean_anomaly")
    epoch = f("epoch_osculation")
    if any(v is None for v in (a, e, i_deg, omega_deg, w_deg, M_deg, epoch)):
        return None
    assert a is not None and e is not None and i_deg is not None
    assert omega_deg is not None and w_deg is not None and M_deg is not None
    assert epoch is not None

    return OrbitalElements(
        a_au=a,
        e=e,
        i_rad=math.radians(i_deg),
        omega_rad=math.radians(omega_deg),
        arg_peri_rad=math.radians(w_deg),
        M0_rad=math.radians(M_deg),
        epoch_jd=epoch,
    )


def solve_kepler(M: float, e: float, tol: float = 1e-10, max_iter: int = 50) -> float:
    """Solve M = E - e·sin(E) for E (Newton-Raphson).

    Stable for e in [0, 0.999].
    """
    M = (M + math.pi) % (2 * math.pi) - math.pi  # wrap to [-π, π]
    E = M if e < 0.8 else math.pi
    for _ in range(max_iter):
        f = E - e * math.sin(E) - M
        fp = 1 - e * math.cos(E)
        dE = -f / fp
        E += dE
        if abs(dE) < tol:
            break
    return E


def state_at(elements: OrbitalElements, jd: float) -> Dict[str, np.ndarray]:
    """Heliocentric ecliptic Cartesian position + velocity at Julian Day `jd`.

    Returns {"r": [x, y, z] AU, "v": [vx, vy, vz] AU/day}.
    """
    dt = jd - elements.epoch_jd
    M = elements.M0_rad + elements.n_rad_per_day * dt
    E = solve_kepler(M, elements.e)

    # Position in orbital plane (perifocal frame)
    a = elements.a_au
    e = elements.e
    cosE = math.cos(E)
    sinE = math.sin(E)
    x_p = a * (cosE - e)
    y_p = a * math.sqrt(max(0.0, 1 - e * e)) * sinE

    # Velocity in perifocal frame
    n = elements.n_rad_per_day
    Edot = n / (1 - e * cosE)
    vx_p = -a * sinE * Edot
    vy_p = a * math.sqrt(max(0.0, 1 - e * e)) * cosE * Edot

    # Rotate to heliocentric ecliptic (Ω, i, ω)
    R = _rotation(elements.omega_rad, elements.i_rad, elements.arg_peri_rad)
    r = R @ np.array([x_p, y_p, 0.0])
    v = R @ np.array([vx_p, vy_p, 0.0])
    return {"r": r, "v": v}


def sample_orbit(
    elements: OrbitalElements,
    points: int = 256,
) -> List[List[float]]:
    """Equally-spaced (in mean anomaly) Cartesian points along one full orbit.

    Returns a list of [x, y, z] AU triples — useful for drawing the orbit line.
    """
    pts: List[List[float]] = []
    cosi = math.cos(elements.i_rad)
    sini = math.sin(elements.i_rad)
    cosO = math.cos(elements.omega_rad)
    sinO = math.sin(elements.omega_rad)
    cosw = math.cos(elements.arg_peri_rad)
    sinw = math.sin(elements.arg_peri_rad)
    R = np.array(
        [
            [cosO * cosw - sinO * sinw * cosi, -cosO * sinw - sinO * cosw * cosi, sinO * sini],
            [sinO * cosw + cosO * sinw * cosi, -sinO * sinw + cosO * cosw * cosi, -cosO * sini],
            [sinw * sini, cosw * sini, cosi],
        ]
    )

    for k in range(points + 1):  # close the loop with extra point
        M = (k / points) * 2 * math.pi
        E = solve_kepler(M, elements.e)
        x_p = elements.a_au * (math.cos(E) - elements.e)
        y_p = elements.a_au * math.sqrt(max(0.0, 1 - elements.e**2)) * math.sin(E)
        r = R @ np.array([x_p, y_p, 0.0])
        pts.append([float(r[0]), float(r[1]), float(r[2])])
    return pts


def _rotation(omega: float, i: float, arg_peri: float) -> np.ndarray:
    """Perifocal → heliocentric ecliptic rotation matrix."""
    cosO = math.cos(omega)
    sinO = math.sin(omega)
    cosi = math.cos(i)
    sini = math.sin(i)
    cosw = math.cos(arg_peri)
    sinw = math.sin(arg_peri)
    return np.array(
        [
            [cosO * cosw - sinO * sinw * cosi, -cosO * sinw - sinO * cosw * cosi, sinO * sini],
            [sinO * cosw + cosO * sinw * cosi, -sinO * sinw + cosO * cosw * cosi, -cosO * sini],
            [sinw * sini, cosw * sini, cosi],
        ]
    )


def jd_now() -> float:
    """Current time as Julian Day (UT)."""
    import datetime as _dt

    now = _dt.datetime.utcnow()
    a = (14 - now.month) // 12
    y = now.year + 4800 - a
    m = now.month + 12 * a - 3
    jdn = now.day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    frac = (now.hour - 12) / 24 + now.minute / 1440 + now.second / 86400
    return jdn + frac

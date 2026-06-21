"""Monte Carlo uncertainty estimator.

Given a series of nominal distance measurements with sigma, sample N gaussian
perturbations and report percentiles + closest approach.
"""

from __future__ import annotations

from typing import Sequence

import numpy as np

from app.domain.risk import MCSummary


def run(
    nominal_distances_km: Sequence[float],
    sigma_km: float,
    samples: int = 10_000,
    seed: int = 42,
) -> MCSummary:
    """Return percentile statistics for the perturbed minimum distance."""
    if not nominal_distances_km:
        empty = MCSummary(
            samples=0,
            mean_km=0.0,
            std_km=0.0,
            p1_km=0.0,
            p50_km=0.0,
            p99_km=0.0,
            closest_p1_km=0.0,
        )
        return empty

    rng = np.random.default_rng(seed)
    nominals = np.asarray(nominal_distances_km, dtype=np.float64)
    sigma = max(float(sigma_km), 1.0)

    # Each row = one Monte Carlo trial; min over the whole window per trial.
    perturbations = rng.normal(loc=0.0, scale=sigma, size=(samples, nominals.size))
    trials = nominals[None, :] + perturbations
    closest = np.maximum(0.0, trials.min(axis=1))

    return MCSummary(
        samples=samples,
        mean_km=float(closest.mean()),
        std_km=float(closest.std(ddof=1)) if samples > 1 else 0.0,
        p1_km=float(np.percentile(closest, 1)),
        p50_km=float(np.percentile(closest, 50)),
        p99_km=float(np.percentile(closest, 99)),
        closest_p1_km=float(np.percentile(closest, 1)),
    )


def estimate_sigma_from_series(values: Sequence[float]) -> float:
    """Sample standard deviation of a distance series, bounded by 1 km min."""
    if len(values) < 3:
        return 1.0
    arr = np.asarray(values, dtype=np.float64)
    return max(float(arr.std(ddof=1)), 1.0)

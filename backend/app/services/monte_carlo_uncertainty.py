from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


@dataclass
class UncertaintySummary:
    samples: int
    mean_distance_km: float
    std_distance_km: float
    ci68_km: Tuple[float, float]
    ci95_km: Tuple[float, float]
    ci99_km: Tuple[float, float]
    worst_case_km: float


class MonteCarloUncertaintyEngine:
    """Monte Carlo belirsizlik motoru.
    Not: Nominal seriler için 1D mesafe belirsizliği simülasyonu yapar.
    Gelişmiş kullanımda 3B konum vektörleri ile genişletilebilir.
    """

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)
        np.random.seed(seed)

    @staticmethod
    def _quantiles(arr: np.ndarray, qs: List[float]) -> List[float]:
        return [float(np.quantile(arr, q)) for q in qs]

    def run(
        self,
        nominal_distances_km: List[float],
        sigma_km: float,
        samples: int = 10000,
    ) -> UncertaintySummary:
        """Nominal mesafeler ve 1-sigma ile dağılım simülasyonu."""
        if sigma_km <= 0 or not nominal_distances_km:
            base = nominal_distances_km[-1] if nominal_distances_km else 0.0
            return UncertaintySummary(
                samples=0,
                mean_distance_km=base,
                std_distance_km=0.0,
                ci68_km=(base, base),
                ci95_km=(base, base),
                ci99_km=(base, base),
                worst_case_km=base,
            )

        base = float(nominal_distances_km[-1])
        draws = np.random.normal(loc=base, scale=sigma_km, size=samples)
        mean = float(np.mean(draws))
        std = float(np.std(draws, ddof=1))
        q16, q50, q84 = self._quantiles(draws, [0.16, 0.5, 0.84])
        q025, q975 = self._quantiles(draws, [0.025, 0.975])
        q005, q995 = self._quantiles(draws, [0.005, 0.995])
        return UncertaintySummary(
            samples=samples,
            mean_distance_km=mean,
            std_distance_km=std,
            ci68_km=(q16, q84),
            ci95_km=(q025, q975),
            ci99_km=(q005, q995),
            worst_case_km=float(np.min(draws)),
        )


_mc_engine: Optional[MonteCarloUncertaintyEngine] = None


def get_monte_carlo_engine() -> MonteCarloUncertaintyEngine:
    global _mc_engine
    if _mc_engine is None:
        _mc_engine = MonteCarloUncertaintyEngine()
    return _mc_engine

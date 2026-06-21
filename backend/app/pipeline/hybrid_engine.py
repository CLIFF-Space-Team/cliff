"""Hybrid risk engine — Horizons + Monte Carlo + ML classifier.

The single entry point is `analyze_target(neo_id, days_ahead=30)` which:

1. Fetches future positions from JPL Horizons.
2. Estimates uncertainty (sigma_km) from the distance series.
3. Runs Monte Carlo (10k samples) for a percentile-bounded closest approach.
4. Builds the 7-feature vector for the ML classifier.
5. Composes a hybrid_score in [0, 1] from MC distance, ML confidence, and
   physical features.
"""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from app.core.logging import get_logger
from app.domain.neo import NormalizedNeo
from app.domain.risk import HybridAnalysis, MCSummary, RiskClass
from app.nasa import horizons
from app.pipeline import monte_carlo
from app.pipeline.ml_classifier import get_classifier

log = get_logger(__name__)

AU_TO_KM = 149_597_870.7
LUNAR_DISTANCE_KM = 384_400.0


async def analyze_target(
    neo_id: str,
    days_ahead: int = 30,
    *,
    step: str = "1d",
    samples: int = 10_000,
    neo: Optional[NormalizedNeo] = None,
) -> HybridAnalysis:
    """Run the hybrid pipeline for one NEO and return a `HybridAnalysis`."""
    notes: List[str] = []

    # 1. Horizons ephemeris
    try:
        payload = await horizons.get_future_positions(neo_id, days_ahead=days_ahead, step=step)
    except Exception as exc:
        log.warning("hybrid.horizons_failed", neo_id=neo_id, error=str(exc))
        notes.append(f"horizons_failed:{exc!r}")
        payload = {}

    rows = payload.get("_rows") or []
    distances_km: List[float] = []
    velocities_kms: List[float] = []
    for row in rows:
        delta_au = row.get("delta_au")
        if isinstance(delta_au, (int, float)):
            distances_km.append(float(delta_au) * AU_TO_KM)
        deldot = row.get("deldot_kms")
        if isinstance(deldot, (int, float)):
            velocities_kms.append(abs(float(deldot)))

    nominal_min = min(distances_km) if distances_km else None
    velocity_avg = sum(velocities_kms) / len(velocities_kms) if velocities_kms else None
    sigma_km = monte_carlo.estimate_sigma_from_series(distances_km) if distances_km else 0.0

    # 2. Monte Carlo
    mc: Optional[MCSummary] = None
    if distances_km:
        mc = monte_carlo.run(distances_km, sigma_km=sigma_km, samples=samples)

    # 3. Build ML feature row
    moid_au = (nominal_min / AU_TO_KM) if nominal_min is not None else 1.0
    diameter_km = neo.diameter_avg_km if (neo and neo.diameter_avg_km) else 0.0
    h_mag = neo.absolute_magnitude_h if (neo and neo.absolute_magnitude_h is not None) else 22.0
    features: Dict[str, float] = {
        "moid_au": moid_au,
        "velocity_kms": velocity_avg or 18.0,
        "diameter_km": diameter_km,
        "time_to_approach_days": float(days_ahead),
        "observation_count": float(len(rows)),
        "h_magnitude": h_mag,
        "uncertainty_km": sigma_km,
    }

    # 4. ML classify
    ml_cls, ml_conf = get_classifier().classify(features)

    # 5. Hybrid composite score
    hybrid = _compose_score(
        ml_cls=ml_cls,
        ml_confidence=ml_conf,
        mc=mc,
        diameter_km=diameter_km,
        sentry_listed=bool(neo and neo.sentry_listed),
    )

    return HybridAnalysis(
        neo_id=neo_id,
        days_ahead=days_ahead,
        nominal_min_distance_km=nominal_min,
        nominal_velocity_kms=velocity_avg,
        sigma_km=sigma_km,
        monte_carlo=mc,
        ml_class=ml_cls,
        ml_confidence=ml_conf,
        hybrid_score=hybrid,
        rows_count=len(rows),
        notes=notes,
        computed_at=datetime.utcnow(),
    )


def _compose_score(
    *,
    ml_cls: RiskClass,
    ml_confidence: float,
    mc: Optional[MCSummary],
    diameter_km: float,
    sentry_listed: bool,
) -> float:
    """Combine the signals into a single 0..1 hybrid score."""
    # Class baseline: minimal=0.05, low=0.20, moderate=0.45, high=0.70, critical=0.90
    baseline = {
        RiskClass.MINIMAL: 0.05,
        RiskClass.LOW: 0.20,
        RiskClass.MODERATE: 0.45,
        RiskClass.HIGH: 0.70,
        RiskClass.CRITICAL: 0.90,
    }[ml_cls]

    # Confidence smooths the baseline toward the next level (50% confidence = 50% jump)
    score = baseline * (0.5 + 0.5 * ml_confidence)

    # MC bonus: closer p1 → higher score. Saturates inside lunar distance.
    if mc is not None and mc.p1_km > 0:
        if mc.p1_km < LUNAR_DISTANCE_KM:
            score += 0.12 * (1.0 - mc.p1_km / LUNAR_DISTANCE_KM)
        elif mc.p1_km < 10 * LUNAR_DISTANCE_KM:
            score += 0.04 * (1.0 - mc.p1_km / (10 * LUNAR_DISTANCE_KM))

    # Diameter bonus: > 140m bumps category-equivalent (PHA threshold)
    if diameter_km >= 0.14:
        score += min(0.08, 0.04 * (diameter_km / 0.5))

    if sentry_listed:
        score += 0.05

    return max(0.0, min(1.0, score))

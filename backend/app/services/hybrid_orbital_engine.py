from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from app.services.monte_carlo_uncertainty import get_monte_carlo_engine
from app.services.ml_risk_classifier import get_ml_risk_classifier
from app.services.nasa_horizons_service import get_nasa_horizons_service


def _parse_horizons_result(ephem: Dict[str, Any]) -> list[dict]:
    
    raw = ephem.get("result") or ""
    if not isinstance(raw, str) or "$$SOE" not in raw:
        data = ephem.get("data")
        return data if isinstance(data, list) else []
    lines = raw.splitlines()
    in_table = False
    rows: list[dict] = []
    for line in lines:
        s = line.strip()
        if s == "$$SOE":
            in_table = True
            continue
        if s == "$$EOE":
            break
        if not in_table or not s:
            continue
        if "," in s:
            parts = [p.strip() for p in s.split(",")]
            if len(parts) > 6:
                try:
                    delta_au = float(parts[5])
                    deldot_kms = float(parts[6])
                    rows.append(
                        {
                            "datetime": parts[0],
                            "delta_au": delta_au,
                            "deldot_kms": deldot_kms,
                        }
                    )
                except Exception:
                    continue
        else:
            parts = s.split()
            if len(parts) < 12:
                continue
            try:
                delta_au = float(parts[-5])  # delta Ã§oÄŸu zaman sondan 5.
                deldot_kms = float(parts[-4])
            except Exception:
                continue
            rows.append(
                {
                    "datetime": f"{parts[0]} {parts[1]}",
                    "delta_au": delta_au,
                    "deldot_kms": deldot_kms,
                }
            )
    return rows


async def analyze_target(
    target_id: str,
    days_ahead: int = 30,
    step: str = "1 d",
) -> Dict[str, Any]:
    
    horizons = get_nasa_horizons_service()
    mc = get_monte_carlo_engine()
    ml = get_ml_risk_classifier()

    ephem = await horizons.get_future_positions(
        target_id=target_id,
        days_ahead=days_ahead,
        step_size=step,
    )
    parsed_rows = _parse_horizons_result(ephem)
    AU_TO_KM = 149_597_870.7
    deltas_km = [float(r["delta_au"]) * AU_TO_KM for r in parsed_rows if r.get("delta_au") is not None]
    sigma_km = 0.0
    if len(deltas_km) >= 3:
        mean = sum(deltas_km) / len(deltas_km)
        var = sum((d - mean) ** 2 for d in deltas_km) / (len(deltas_km) - 1)
        sigma_km = var ** 0.5

    nominal_distances_km = deltas_km
    mc_summary = mc.run(
        nominal_distances_km=nominal_distances_km,
        sigma_km=sigma_km,
        samples=10000,
    )

    last_row = parsed_rows[-1] if parsed_rows else {}
    features = {
        "distance_au": float(last_row.get("delta_au", 1.0)),
        "velocity_kms": float(last_row.get("deldot_kms", 20.0)),
        "diameter_km": 0.0,  # Bilinmiyorsa 0.0, UI/endpoint Ã¼zerinden saÄŸlanabilir
        "time_to_approach_days": float(days_ahead),
        "observation_count": 0.0,  # Bilinmiyorsa 0
        "h_magnitude": 0.0,
        "uncertainty_km": float(sigma_km),
    }
    ml_pred = ml.predict(features)

    explanation = (
        f"NASA Horizons verilerine gÃ¶re nominal en yakÄ±n mesafe ~{nominal_distances_km[-1]:,.0f} km. "
        f"Monte Carlo (10k) sonucunda %95 aralÄ±k {mc_summary.ci95_km[0]:,.0f} - {mc_summary.ci95_km[1]:,.0f} km. "
        f"ML sÄ±nÄ±flandÄ±rma: {ml_pred.label} (gÃ¼ven: {ml_pred.confidence:.2f})."
        if nominal_distances_km
        else "NASA Horizons verisi yetersiz gÃ¶rÃ¼nÃ¼yor."
    )

    return {
        "success": True,
        "source": "NASA/JPL Horizons",
        "ephemeris": ephem,
        "uncertainty": {
            "success": sigma_km > 0,
            "sigma_km": sigma_km,
            "points": len(deltas_km),
        },
        "monte_carlo": {
            "samples": mc_summary.samples,
            "mean_km": mc_summary.mean_distance_km,
            "std_km": mc_summary.std_distance_km,
            "ci68_km": mc_summary.ci68_km,
            "ci95_km": mc_summary.ci95_km,
            "ci99_km": mc_summary.ci99_km,
            "worst_case_km": mc_summary.worst_case_km,
        },
        "ml_risk": {
            "label": ml_pred.label,
            "confidence": ml_pred.confidence,
            "probabilities": ml_pred.probabilities,
            "features": ml_pred.features_used,
        },
        "explanation": explanation,
    }

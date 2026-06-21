"""ML risk classifier.

Lazy-loads a scikit-learn pipeline from `models/ml_risk_classifier.joblib`. If
the artifact is missing, falls back to a deterministic heuristic so the rest
of the pipeline keeps working in dev.

The model expects a 7-feature row, in this order:
  [moid_au, velocity_kms, diameter_km, time_to_approach_days, observation_count,
   h_magnitude, uncertainty_km]
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np

from app.core.logging import get_logger
from app.domain.risk import RISK_LABELS, RiskClass

log = get_logger(__name__)

_MODEL_PATH = Path(__file__).resolve().parents[2] / "models" / "ml_risk_classifier.joblib"

FEATURE_ORDER = (
    "moid_au",
    "velocity_kms",
    "diameter_km",
    "time_to_approach_days",
    "observation_count",
    "h_magnitude",
    "uncertainty_km",
)


class StringClassifierWrapper:
    """Adapter that exposes a sklearn-shaped string-label interface over a
    numerically-encoded classifier (XGBoost / HistGradientBoosting).

    Defined here in the runtime module so joblib can unpickle the artifact
    saved by `scripts/train_ml_model.py` — both ends import the same class.
    """

    def __init__(self, model: Any, encoder: Any) -> None:
        self.model = model
        self.encoder = encoder
        self.classes_ = list(encoder.classes_)

    def predict(self, X: np.ndarray) -> np.ndarray:
        idx = self.model.predict(X)
        return self.encoder.inverse_transform(np.asarray(idx).astype(int))

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)


class MLRiskClassifier:
    def __init__(self, model_path: Optional[Path] = None) -> None:
        self._model: Optional[Any] = None
        self._loaded = False
        self._model_path = Path(model_path) if model_path else _MODEL_PATH

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        self._loaded = True
        if not self._model_path.exists():
            log.info(
                "ml.classifier.fallback_heuristic",
                reason="model_file_missing",
                expected=str(self._model_path),
            )
            return
        try:
            import joblib  # local import: optional dep at runtime

            self._model = joblib.load(self._model_path)
            log.info("ml.classifier.loaded", path=str(self._model_path))
        except Exception as exc:
            log.warning("ml.classifier.load_failed", error=str(exc))
            self._model = None

    def classify(self, features: Dict[str, float]) -> Tuple[RiskClass, float]:
        self._ensure_loaded()
        vec = np.array([[features.get(name, 0.0) or 0.0 for name in FEATURE_ORDER]])

        if self._model is not None:
            try:
                if hasattr(self._model, "predict_proba"):
                    proba = self._model.predict_proba(vec)[0]
                    idx = int(np.argmax(proba))
                    label = self._model.classes_[idx] if hasattr(self._model, "classes_") else RISK_LABELS[idx]
                    confidence = float(proba[idx])
                else:
                    label = str(self._model.predict(vec)[0])
                    confidence = 0.7
                return RiskClass(label) if label in RISK_LABELS else RiskClass.MINIMAL, confidence
            except Exception as exc:
                log.warning("ml.classifier.predict_failed", error=str(exc))

        return _heuristic_classify(features)


def _heuristic_classify(features: Dict[str, float]) -> Tuple[RiskClass, float]:
    """Conservative rule-based fallback when no trained model is available.

    Bands inspired by JPL Sentry / Palermo guidelines: closer + faster + larger
    objects rank higher.
    """
    moid_au = features.get("moid_au") or features.get("distance_au") or 1.0
    velocity = features.get("velocity_kms", 18.0)
    diameter = features.get("diameter_km", 0.05)
    h_mag = features.get("h_magnitude", 22.0)
    uncertainty_km = features.get("uncertainty_km", 0.0)

    moid_lunar_distance = 384_400.0
    moid_km = moid_au * 149_597_870.7

    score = 0.0
    score += _normalize(moid_km, low=moid_lunar_distance, high=50 * moid_lunar_distance, invert=True) * 0.45
    score += _normalize(velocity, low=10.0, high=40.0) * 0.20
    score += _normalize(diameter, low=0.05, high=2.0) * 0.20
    score += _normalize(h_mag, low=18.0, high=27.0, invert=True) * 0.10
    score += _normalize(uncertainty_km, low=0.0, high=moid_lunar_distance) * 0.05

    if score >= 0.85:
        cls = RiskClass.CRITICAL
    elif score >= 0.65:
        cls = RiskClass.HIGH
    elif score >= 0.45:
        cls = RiskClass.MODERATE
    elif score >= 0.25:
        cls = RiskClass.LOW
    else:
        cls = RiskClass.MINIMAL
    return cls, float(min(0.95, max(0.4, 0.5 + abs(score - 0.5) * 0.8)))


def _normalize(value: float, *, low: float, high: float, invert: bool = False) -> float:
    if high <= low:
        return 0.0
    clipped = max(low, min(high, value))
    norm = (clipped - low) / (high - low)
    return 1.0 - norm if invert else norm


_singleton: Optional[MLRiskClassifier] = None


def get_classifier() -> MLRiskClassifier:
    global _singleton
    if _singleton is None:
        _singleton = MLRiskClassifier()
    return _singleton


__all__ = ["MLRiskClassifier", "get_classifier", "FEATURE_ORDER", "RISK_LABELS"]
# Compatibility export so legacy training script still works:
os.environ.setdefault("CLIFF_ML_CLASSIFIER_INITIALIZED", "1")

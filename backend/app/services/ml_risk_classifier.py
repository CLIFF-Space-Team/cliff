from __future__ import annotations

import os
import pickle
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


RISK_LABELS = ["minimal", "low", "moderate", "high", "critical"]


@dataclass
class RiskPrediction:
    label: str
    confidence: float
    probabilities: Dict[str, float]
    features_used: Dict[str, float]


class MLRiskClassifier:
    

    def __init__(self, model_path: Optional[str] = None) -> None:
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), "models", "ml_risk_classifier.pkl"
        )
        self._model: Optional[Pipeline] = None
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)

    def _build_pipeline(self) -> Pipeline:
        return Pipeline(
            steps=[
                ("scaler", StandardScaler()),
                (
                    "clf",
                    RandomForestClassifier(
                        n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
                    ),
                ),
            ]
        )

    def load(self) -> bool:
        if not os.path.exists(self.model_path):
            return False
        with open(self.model_path, "rb") as f:
            self._model = pickle.load(f)
        return True

    def save(self) -> None:
        if self._model is None:
            return
        with open(self.model_path, "wb") as f:
            pickle.dump(self._model, f)

    def train(
        self, X: np.ndarray, y: np.ndarray, class_labels: Optional[List[str]] = None
    ) -> None:
        
        self._model = self._build_pipeline()
        self._model.fit(X, y)
        self.save()

    def _rule_based_fallback(self, feats: Dict[str, float]) -> RiskPrediction:
        
        distance_au = feats.get("distance_au", 1.0)
        velocity_kms = feats.get("velocity_kms", 20.0)
        diameter_km = feats.get("diameter_km", 0.05)
        uncert_km = feats.get("uncertainty_km", 0.0)

        if distance_au < 0.00067:  # ~100,000 km
            label = "critical"
        elif distance_au < 0.0033:  # ~500,000 km
            label = "high"
        elif distance_au < 0.0134:  # ~2,000,000 km
            label = "moderate"
        elif distance_au < 0.05:  # ~7,500,000 km
            label = "low"
        else:
            label = "minimal"

        if velocity_kms > 30 and label != "critical":
            label = RISK_LABELS[max(RISK_LABELS.index(label) - 1, 0)]
        if diameter_km > 0.5 and label != "critical":
            label = RISK_LABELS[max(RISK_LABELS.index(label) - 1, 0)]
        if uncert_km > 100000 and label != "critical":
            label = RISK_LABELS[max(RISK_LABELS.index(label) - 1, 0)]

        probs = {k: 0.0 for k in RISK_LABELS}
        probs[label] = 0.85
        return RiskPrediction(
            label=label,
            confidence=0.85,
            probabilities=probs,
            features_used=feats,
        )

    def predict(self, features: Dict[str, float]) -> RiskPrediction:
        
        if self._model is None and not self.load():
            return self._rule_based_fallback(features)

        order = [
            "distance_au",
            "velocity_kms",
            "diameter_km",
            "time_to_approach_days",
            "observation_count",
            "h_magnitude",
            "uncertainty_km",
        ]
        x = np.array([[float(features.get(k, 0.0)) for k in order]], dtype=float)
        assert self._model is not None
        proba = self._model.predict_proba(x)[0]
        idx = int(np.argmax(proba))
        label = self._model.classes_[idx] if hasattr(self._model, "classes_") else RISK_LABELS[idx]
        probs = {str(cls): float(p) for cls, p in zip(getattr(self._model, "classes_", RISK_LABELS), proba)}
        return RiskPrediction(
            label=str(label),
            confidence=float(np.max(proba)),
            probabilities=probs,
            features_used=features,
        )


_ml_classifier: Optional[MLRiskClassifier] = None


def get_ml_risk_classifier() -> MLRiskClassifier:
    global _ml_classifier
    if _ml_classifier is None:
        _ml_classifier = MLRiskClassifier()
    return _ml_classifier

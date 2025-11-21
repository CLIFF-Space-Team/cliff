import json
import math
import os
from typing import Dict, List, Tuple

import numpy as np
import requests
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from app.services.ml_risk_classifier import MLRiskClassifier, RISK_LABELS


SENTRY_API = "https://ssd-api.jpl.nasa.gov/sentry.api"


def fetch_sentry_data(limit: int = 1000) -> List[Dict]:
    try:
        resp = requests.get(SENTRY_API, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])[:limit]
    except Exception:
        return []


def build_dataset_from_sentry(rows: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
    X: List[List[float]] = []
    y: List[str] = []
    for row in rows:
        try:
            moid_au = float(row.get("moid", 0.1) or 0.1)  # min orbit intersection distance
            v_inf = float(row.get("v_inf", 20.0) or 20.0)  # km/s
            h_mag = float(row.get("h", 22.0) or 22.0)
            ip = float(row.get("ip", 1e-8) or 1e-8)  # impact probability
            ps_cum = float(row.get("ps_cum", -10.0) or -10.0)  # Palermo scale cumulative

            feats = [
                moid_au,             # distance_au yerine moid
                v_inf,               # velocity_kms
                0.0,                 # diameter_km (bilinmiyor)
                180.0,               # time_to_approach_days (yaklaÅŸÄ±k)
                5.0,                 # observation_count (yaklaÅŸÄ±k)
                h_mag,               # h_magnitude
                0.0,                 # uncertainty_km
            ]
            X.append(feats)

            if ip >= 1e-5 or ps_cum > 0:
                label = "critical"
            elif moid_au <= 0.002 and v_inf > 25:
                label = "high"
            elif moid_au <= 0.01:
                label = "moderate"
            elif moid_au <= 0.05:
                label = "low"
            else:
                label = "minimal"
            y.append(label)
        except Exception:
            continue

    return np.array(X, dtype=float), np.array(y, dtype=str)


def synthetic_dataset(n: int = 2000) -> Tuple[np.ndarray, np.ndarray]:
    X = []
    y = []
    rng = np.random.default_rng(42)
    for _ in range(n):
        distance_au = float(rng.uniform(0.0001, 0.2))
        velocity_kms = float(rng.uniform(5, 40))
        diameter_km = float(rng.uniform(0.01, 2.0))
        time_to_days = float(rng.uniform(1, 365))
        obs_count = float(rng.integers(1, 50))
        h_mag = float(rng.uniform(16, 28))
        uncert_km = float(rng.uniform(0, 300000))
        X.append([
            distance_au,
            velocity_kms,
            diameter_km,
            time_to_days,
            obs_count,
            h_mag,
            uncert_km,
        ])
        if distance_au < 0.00067:
            label = "critical"
        elif distance_au < 0.0033:
            label = "high"
        elif distance_au < 0.0134:
            label = "moderate"
        elif distance_au < 0.05:
            label = "low"
        else:
            label = "minimal"
        if velocity_kms > 30 and label != "critical":
            idx = max(RISK_LABELS.index(label) - 1, 0)
            label = RISK_LABELS[idx]
        if diameter_km > 0.5 and label != "critical":
            idx = max(RISK_LABELS.index(label) - 1, 0)
            label = RISK_LABELS[idx]
        y.append(label)
    return np.array(X, dtype=float), np.array(y, dtype=str)


def main() -> None:
    print("[INFO] Fetching NASA Sentry data...")
    rows = fetch_sentry_data(limit=2000)
    if rows:
        X, y = build_dataset_from_sentry(rows)
        print(f"[INFO] Sentry dataset built: {len(y)} samples")
    else:
        print("[WARN] Sentry API unavailable, generating synthetic dataset")
        X, y = synthetic_dataset(4000)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if len(set(y)) > 1 else None
    )

    clf = MLRiskClassifier()
    clf.train(X_train, y_train)

    from sklearn.metrics import accuracy_score

    y_pred = clf._model.predict(X_test)  # type: ignore[attr-defined]
    acc = accuracy_score(y_test, y_pred)
    print(f"[OK] Accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, zero_division=0))
    print(f"[OK] Model saved to: {clf.model_path}")


if __name__ == "__main__":
    main()
*** End Patch**


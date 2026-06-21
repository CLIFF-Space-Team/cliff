"""Train the CLIFF risk classifier from real JPL Sentry data.

Run from the backend dir:
    python -m scripts.train_ml_model

Pipeline:
  1. Pull the full Sentry impact-probability list (~2000 entries).
  2. Engineer the 7-feature row that matches `app.pipeline.ml_classifier`.
  3. Auto-label by Sentry's own metrics (impact probability + Palermo Scale).
  4. Train an XGBoost classifier (with sklearn fallback if xgboost is missing).
  5. Persist to `backend/models/ml_risk_classifier.joblib` so the runtime
     classifier picks it up at next start.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import httpx
import numpy as np
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

# Ensure `backend/` is on path so the script works under `python -m scripts.train_ml_model`
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.pipeline.ml_classifier import FEATURE_ORDER, RISK_LABELS, StringClassifierWrapper  # noqa: E402

SENTRY_API = "https://ssd-api.jpl.nasa.gov/sentry.api"
MODEL_PATH = ROOT / "models" / "ml_risk_classifier.joblib"


def fetch_sentry_data(limit: int = 5000) -> List[Dict]:
    print(f"[INFO] Fetching JPL Sentry list (limit={limit})...")
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.get(SENTRY_API)
            resp.raise_for_status()
            rows = resp.json().get("data", [])
            return rows[:limit]
    except Exception as exc:
        print(f"[WARN] Sentry fetch failed: {exc}")
        return []


def build_dataset(rows: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
    """Engineer (X, y) from raw Sentry rows.

    Sentry fields:
      - moid (AU): minimum orbit intersection distance
      - v_inf (km/s): asymptotic velocity at infinity
      - h (mag): absolute magnitude
      - ip (1): cumulative impact probability across virtual impactors
      - ps_cum (1): cumulative Palermo Scale value
    """
    X: List[List[float]] = []
    y: List[str] = []

    for row in rows:
        try:
            moid = float(row.get("moid") or 0.1)
            v_inf = float(row.get("v_inf") or 20.0)
            h = float(row.get("h") or 22.0)
            ip = float(row.get("ip") or 1e-9)
            ps_cum = float(row.get("ps_cum") or -10.0)
        except (TypeError, ValueError):
            continue

        # Match the runtime feature order:
        #   [moid_au, velocity_kms, diameter_km, time_to_approach_days,
        #    observation_count, h_magnitude, uncertainty_km]
        feats = [
            moid,
            v_inf,
            0.0,         # diameter unknown for most Sentry entries
            180.0,       # time_to_approach proxy
            10.0,        # observation_count proxy
            h,
            0.0,         # uncertainty proxy
        ]
        assert len(feats) == len(FEATURE_ORDER), "feature count mismatch"

        # Auto-label by Sentry's own metrics — these are the metrics JPL uses
        # to triage real-world hazard.
        if ip >= 1e-4 or ps_cum > -1.0:
            label = "critical"
        elif ip >= 1e-6 or ps_cum > -3.0:
            label = "high"
        elif moid <= 0.002:
            label = "high"
        elif moid <= 0.01:
            label = "moderate"
        elif moid <= 0.05:
            label = "low"
        else:
            label = "minimal"

        X.append(feats)
        y.append(label)

    return np.array(X, dtype=float), np.array(y, dtype=str)


def synthetic_dataset(n: int = 4000) -> Tuple[np.ndarray, np.ndarray]:
    """Fallback if Sentry is unreachable — physically plausible synthetic data."""
    rng = np.random.default_rng(42)
    X: List[List[float]] = []
    y: List[str] = []
    for _ in range(n):
        moid_au = float(rng.uniform(0.0001, 0.2))
        v_kms = float(rng.uniform(5, 40))
        d_km = float(rng.uniform(0.005, 2.0))
        t_days = float(rng.uniform(1, 365))
        n_obs = float(rng.integers(1, 50))
        h_mag = float(rng.uniform(16, 28))
        sigma = float(rng.uniform(0, 300_000))
        X.append([moid_au, v_kms, d_km, t_days, n_obs, h_mag, sigma])

        if moid_au < 0.0007:
            label = "critical"
        elif moid_au < 0.003:
            label = "high"
        elif moid_au < 0.013:
            label = "moderate"
        elif moid_au < 0.05:
            label = "low"
        else:
            label = "minimal"
        # Velocity nudges up severity
        if v_kms > 32 and label != "critical":
            label = RISK_LABELS[min(len(RISK_LABELS) - 1, RISK_LABELS.index(label) + 1)]
        # Big bodies likewise
        if d_km > 1.0 and label != "critical":
            label = RISK_LABELS[min(len(RISK_LABELS) - 1, RISK_LABELS.index(label) + 1)]
        y.append(label)
    return np.array(X, dtype=float), np.array(y, dtype=str)


def train_classifier(X: np.ndarray, y: np.ndarray):
    """Train and return a fitted classifier. Tries XGBoost, falls back to sklearn."""
    # Clean: replace any NaN/inf that slipped through with column medians
    if not np.all(np.isfinite(X)):
        col_med = np.nanmedian(np.where(np.isfinite(X), X, np.nan), axis=0)
        col_med = np.where(np.isfinite(col_med), col_med, 0.0)
        for j in range(X.shape[1]):
            mask = ~np.isfinite(X[:, j])
            X[mask, j] = col_med[j]

    from sklearn.preprocessing import LabelEncoder

    encoder = LabelEncoder()
    encoder.fit(np.unique(y))
    y_enc = encoder.transform(y)
    n_classes = len(encoder.classes_)

    try:
        from xgboost import XGBClassifier

        clf = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="multi:softprob" if n_classes > 2 else "binary:logistic",
            num_class=n_classes if n_classes > 2 else None,
            eval_metric="mlogloss" if n_classes > 2 else "logloss",
            random_state=42,
            n_jobs=-1,
            tree_method="hist",
        )
        clf.fit(X, y_enc)
        return StringClassifierWrapper(clf, encoder), "XGBoost"
    except Exception as exc:
        print(f"[WARN] XGBoost unavailable ({exc}); falling back to HistGradientBoosting")
        from sklearn.ensemble import HistGradientBoostingClassifier

        clf = HistGradientBoostingClassifier(
            max_iter=300,
            max_depth=6,
            learning_rate=0.06,
            random_state=42,
        )
        clf.fit(X, y_enc)
        return StringClassifierWrapper(clf, encoder), "HistGradientBoosting"


def main() -> None:
    rows = fetch_sentry_data(limit=5000)
    if rows:
        X, y = build_dataset(rows)
        source = "Sentry"
    else:
        X, y = synthetic_dataset(4000)
        source = "synthetic"
    print(f"[INFO] Dataset built from {source}: {len(y)} samples, "
          f"label distribution: {dict(zip(*np.unique(y, return_counts=True)))}")

    if len(set(y)) < 2:
        print("[ERROR] Single-class dataset — aborting")
        return

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    clf, kind = train_classifier(X_train, y_train)
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"[OK] {kind} accuracy: {acc:.3f}")
    print(classification_report(y_test, y_pred, zero_division=0))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    import joblib

    joblib.dump(clf, MODEL_PATH)
    print(f"[OK] Model saved → {MODEL_PATH}")


if __name__ == "__main__":
    main()

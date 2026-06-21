"""Monte Carlo engine sanity tests."""

from __future__ import annotations

from app.pipeline.monte_carlo import estimate_sigma_from_series, run


def test_run_returns_valid_summary():
    distances = [1_000_000.0, 1_050_000.0, 980_000.0, 1_020_000.0, 990_000.0]
    summary = run(distances, sigma_km=10_000.0, samples=2_000)
    assert summary.samples == 2_000
    assert summary.p1_km <= summary.p50_km <= summary.p99_km
    assert summary.mean_km > 0
    assert summary.std_km >= 0


def test_run_handles_empty_input():
    summary = run([], sigma_km=10.0, samples=1_000)
    assert summary.samples == 0
    assert summary.mean_km == 0.0


def test_sigma_estimator_floors_to_one_km():
    assert estimate_sigma_from_series([100.0, 100.0, 100.0]) == 1.0
    assert estimate_sigma_from_series([100.0, 101.0]) == 1.0
    assert estimate_sigma_from_series([100.0, 200.0, 150.0, 175.0, 125.0]) > 1.0

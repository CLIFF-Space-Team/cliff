"""Impact physics endpoint smoke test (no Redis required)."""

from __future__ import annotations

from app.api.v1.endpoints.impact import ImpactRequest, _compute


def test_compute_apophis_like_scenario():
    request = ImpactRequest(
        diameter_m=370,
        velocity_kms=12.6,
        angle_deg=45,
        density_kg_m3=3000,
        target_density_kg_m3=2750,
    )
    result = _compute(request)
    assert result.energy_megatons > 500
    assert result.energy_megatons < 2_000
    assert result.crater_diameter_km > 2
    assert result.seismic_magnitude > 5
    assert result.thermal_radius_km > 10


def test_compute_scales_with_diameter():
    base = ImpactRequest(
        diameter_m=50,
        velocity_kms=20,
        angle_deg=45,
        density_kg_m3=3000,
        target_density_kg_m3=2750,
    )
    big = base.model_copy(update={"diameter_m": 1000})
    assert _compute(big).energy_megatons > _compute(base).energy_megatons

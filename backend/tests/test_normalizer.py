"""NeoWs normalizer tests."""

from __future__ import annotations

from app.pipeline.normalizer import normalize_neows


def test_normalize_neows_minimum_payload():
    raw = {
        "id": "2099942",
        "name": "99942 Apophis (2004 MN4)",
        "is_potentially_hazardous_asteroid": True,
        "absolute_magnitude_h": 19.7,
        "estimated_diameter": {
            "kilometers": {
                "estimated_diameter_min": 0.34,
                "estimated_diameter_max": 0.37,
            }
        },
        "close_approach_data": [
            {
                "close_approach_date_full": "2029-Apr-13 21:46",
                "miss_distance": {"kilometers": "31000"},
                "relative_velocity": {"kilometers_per_second": "7.42"},
                "orbiting_body": "Earth",
            }
        ],
        "nasa_jpl_url": "https://example.test/apophis",
    }
    neo = normalize_neows(raw)
    assert neo is not None
    assert neo.neo_id == "2099942"
    assert neo.is_potentially_hazardous is True
    assert neo.diameter_max_km == 0.37
    assert neo.relative_velocity_kms is not None
    assert neo.relative_velocity_kms > 7.0
    assert neo.miss_distance_km is not None
    assert neo.next_approach_at is not None


def test_normalize_neows_returns_none_on_garbage():
    assert normalize_neows({}) is None
    assert normalize_neows({"foo": "bar"}) is None
    assert normalize_neows(None) is None  # type: ignore[arg-type]

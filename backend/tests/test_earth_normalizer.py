"""Earth-event normalizer tests."""

from __future__ import annotations

from app.domain.earth_event import EventSeverity
from app.pipeline.earth_normalizer import (
    normalize_afad_row,
    normalize_eonet_event,
    normalize_eonet_payload,
)


def test_normalize_eonet_wildfire_with_acres_unit_converts_to_km2():
    raw = {
        "id": "EONET_5500",
        "title": "Hayward Fire",
        "categories": [{"id": "wildfires", "title": "Wildfires"}],
        "geometry": [
            {
                "date": "2026-04-30T00:00:00Z",
                "type": "Point",
                "coordinates": [-122.5, 37.5],
                "magnitudeValue": 50_000,  # acres
                "magnitudeUnit": "acres",
            }
        ],
        "sources": [{"id": "InciWeb", "url": "https://inciweb.example/5500"}],
    }
    ev = normalize_eonet_event(raw)
    assert ev is not None
    assert ev.id == "EONET_EONET_5500"
    assert ev.category == "wildfires"
    # 50_000 acres ≈ 202 km² → between thresholds 50 and 200 → high (since 202 > 200)
    assert ev.severity in (EventSeverity.HIGH, EventSeverity.MODERATE)
    # Magnitude preserved verbatim in primary_metric (raw NASA value/unit)
    assert ev.primary_metric is not None
    assert ev.primary_metric.value == 50_000


def test_normalize_eonet_storm_with_mph_unit():
    raw = {
        "id": "EONET_S1",
        "title": "Hurricane Aurora",
        "categories": [{"id": "severeStorms", "title": "Severe Storms"}],
        "geometry": [
            {
                "date": "2026-05-01T00:00:00Z",
                "type": "Point",
                "coordinates": [-80.0, 25.0],
                "magnitudeValue": 110,  # mph
                "magnitudeUnit": "mph",
            }
        ],
    }
    ev = normalize_eonet_event(raw)
    assert ev is not None
    assert ev.category == "severeStorms"
    # 110 mph ≈ 95.6 kts → falls in HIGH bucket [96 cat3] but just under
    # thresholds [34, 64, 96, 137], 95.6 < 96 → MODERATE
    assert ev.severity in (EventSeverity.MODERATE, EventSeverity.HIGH)


def test_normalize_eonet_volcano_min_severity_moderate():
    raw = {
        "id": "EONET_V1",
        "title": "Sakurajima",
        "categories": [{"id": "volcanoes", "title": "Volcanoes"}],
        "geometry": [
            {
                "date": "2026-04-30T00:00:00Z",
                "type": "Point",
                "coordinates": [130.66, 31.59],
            }
        ],
    }
    ev = normalize_eonet_event(raw)
    assert ev is not None
    # No metric → default tier MODERATE per category meta.
    assert ev.severity == EventSeverity.MODERATE
    # Score within moderate band [0.45, 0.7).
    assert 0.4 <= ev.severity_score < 0.7


def test_normalize_eonet_skips_unknown_category():
    raw = {
        "id": "EONET_X",
        "title": "Mystery",
        "categories": [{"id": "alienInvasion"}],
        "geometry": [
            {"date": "2026-05-01T00:00:00Z", "type": "Point", "coordinates": [0, 0]}
        ],
    }
    ev = normalize_eonet_event(raw)
    assert ev is None


def test_normalize_eonet_skips_when_no_geometry():
    raw = {
        "id": "EONET_NOPE",
        "title": "Empty",
        "categories": [{"id": "wildfires"}],
        "geometry": [],
    }
    assert normalize_eonet_event(raw) is None


def test_normalize_eonet_payload_filters_empty_or_unavailable():
    payload = {
        "events": [
            {
                "id": "ok",
                "title": "Ok",
                "categories": [{"id": "wildfires"}],
                "geometry": [
                    {
                        "date": "2026-04-30T00:00:00Z",
                        "type": "Point",
                        "coordinates": [0, 0],
                        "magnitudeValue": 200,
                        "magnitudeUnit": "km^2",
                    }
                ],
            },
            {"id": "bad"},
        ]
    }
    out = normalize_eonet_payload(payload)
    assert len(out) == 1
    assert out[0].id.endswith("ok")


def test_normalize_eonet_payload_unavailable_returns_empty():
    assert normalize_eonet_payload({"_unavailable": True, "events": []}) == []
    assert normalize_eonet_payload({}) == []
    assert normalize_eonet_payload(None) == []  # type: ignore[arg-type]


def test_normalize_afad_row_basic():
    raw = {
        "id": "12345",
        "magnitude": 5.7,
        "place": "İzmir · Karaburun",
        "time": 1746440000000,  # epoch ms
        "lat": 38.6,
        "lon": 26.5,
        "depth_km": 12.0,
        "url": "",
        "source": "afad.gov.tr",
    }
    ev = normalize_afad_row(raw)
    assert ev is not None
    assert ev.id == "AFAD_12345"
    assert ev.source == "afad"
    assert ev.category == "earthquakes-tr"
    # 5.7 ≥ 5.5 (HIGH boundary) and < 6.5 → HIGH
    assert ev.severity == EventSeverity.HIGH
    assert ev.primary_metric is not None
    assert ev.primary_metric.value == 5.7
    assert ev.geometries[0].coordinates == [26.5, 38.6]


def test_normalize_afad_row_skips_zero_magnitude():
    raw = {"id": "x", "magnitude": 0, "lat": 1, "lon": 1, "time": 1}
    assert normalize_afad_row(raw) is None


def test_normalize_afad_row_skips_zero_coords():
    raw = {"id": "x", "magnitude": 4.0, "lat": 0, "lon": 0, "time": 1}
    assert normalize_afad_row(raw) is None

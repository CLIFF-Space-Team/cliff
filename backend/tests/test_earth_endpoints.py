"""Endpoint smoke tests for /api/v1/earth/* unified routes.

These verify route shape + categories metadata without requiring Redis.
The store layer is exercised in `test_earth_event_store.py`.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app

app = create_app()
client = TestClient(app)


def test_categories_returns_full_metadata():
    resp = client.get("/api/v1/earth/categories")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body
    items = body["items"]
    codes = {item["code"] for item in items}
    # Every key category we promise the frontend.
    for must_have in ("wildfires", "volcanoes", "severeStorms", "earthquakes-tr"):
        assert must_have in codes, f"missing category {must_have}"
    # Each category exposes the visual + label fields the chip rail needs.
    sample = next(i for i in items if i["code"] == "wildfires")
    assert sample["icon"]
    assert sample["accent_hex"].startswith("#")
    assert sample["label_tr"]
    assert "severity_thresholds" in sample


def test_events_returns_empty_shape_without_redis():
    """Without a configured Redis the store returns an empty result —
    endpoint must still respond 200 with the documented shape."""
    resp = client.get("/api/v1/earth/events?limit=5")
    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["page"] == {"limit": 5, "offset": 0}
    assert "filters" in body


def test_events_validates_severity_min():
    resp = client.get("/api/v1/earth/events?severity_min=NOPE")
    assert resp.status_code == 422  # FastAPI Query pattern fails


def test_events_validates_status():
    resp = client.get("/api/v1/earth/events?status=banana")
    assert resp.status_code == 422


def test_events_validates_sort_by():
    resp = client.get("/api/v1/earth/events?sort_by=foo")
    assert resp.status_code == 422


def test_event_detail_404_when_missing():
    resp = client.get("/api/v1/earth/events/does-not-exist")
    assert resp.status_code == 404
    # The custom ApiError handler reshapes detail dicts under `message`.
    payload = resp.json()
    assert payload["error"] is True
    assert payload["message"]["code"] == "EARTH_EVENT_NOT_FOUND"


def test_summary_returns_documented_shape_without_redis():
    resp = client.get("/api/v1/earth/summary")
    assert resp.status_code == 200
    body = resp.json()
    for key in ("total_open", "by_category", "by_severity", "last_24h", "last_7d", "top_active"):
        assert key in body


def test_alerts_recent_returns_empty_without_redis():
    resp = client.get("/api/v1/earth/alerts/recent")
    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0

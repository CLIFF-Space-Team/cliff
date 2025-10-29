from fastapi.testclient import TestClient
from backend.main import app


client = TestClient(app)


def test_overview_endpoint():
    r = client.get('/api/v1/asteroids/overview')
    assert r.status_code == 200
    data = r.json()
    assert 'counters' in data


def test_approaches_endpoint():
    r = client.get('/api/v1/asteroids/approaches?window=7d')
    assert r.status_code == 200
    assert 'series' in r.json()



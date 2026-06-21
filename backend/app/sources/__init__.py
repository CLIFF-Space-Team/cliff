"""External (non-NASA) data source clients.

Each module here wraps a single public hazard/disaster API:
  - afad: Türkiye AFAD earthquake feed
  - firms: NASA FIRMS active wildfire detections (requires API key)
  - gdacs: GDACS multi-hazard alert aggregator
  - smithsonian: Smithsonian Global Volcanism Program weekly activity report

All clients reuse the shared `app.nasa.http` rate-limited client and the
`app.nasa.cache` Redis-backed TTL cache so we get consistent backoff,
retry-after handling, and graceful degradation when Redis is down.
"""

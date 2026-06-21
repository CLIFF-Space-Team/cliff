"""NASA API client layer.

Each module wraps a NASA / JPL endpoint with:
- Shared httpx.AsyncClient (with rate limiting + retry)
- Typed Pydantic response models
- Redis-backed TTL cache (`get_or_fetch` pattern)
"""

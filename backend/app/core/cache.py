import time
from typing import Any, Optional, Dict
import asyncio

class TTLCache:
    def __init__(self, default_ttl: int = 300):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[Any]:
        async with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            if time.time() > entry["expires"]:
                del self._store[key]
                return None
            return entry["value"]

    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        async with self._lock:
            self._store[key] = {
                "value": value,
                "expires": time.time() + (ttl or self._default_ttl)
            }

    async def delete(self, key: str):
        async with self._lock:
            self._store.pop(key, None)

    async def clear(self):
        async with self._lock:
            self._store.clear()

    def size(self) -> int:
        return len(self._store)

cache = TTLCache(default_ttl=300)

"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import AsyncIterator

from fastapi import Depends

from app.core import redis_client
from app.ws.manager import WebSocketManager, get_manager


async def redis_dep() -> AsyncIterator[None]:
    # Force a touch on the client so missing-Redis errors surface clearly.
    redis_client.get_client()
    yield


def ws_manager_dep() -> WebSocketManager:
    return get_manager()


__all__ = ["redis_dep", "ws_manager_dep", "Depends"]

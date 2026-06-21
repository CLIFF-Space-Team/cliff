"""WebSocket subscription manager.

A single `WebSocketManager` (module-level singleton) holds all active
connections, maps channel → set of client_ids, and broadcasts typed events.

Inbound messages are JSON `ClientCommand` envelopes (subscribe/unsubscribe/ping).
"""

from __future__ import annotations

import asyncio
import uuid
from typing import Any, Dict, Set

from fastapi import WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.core.config import settings
from app.core.logging import get_logger
from app.ws.events import (
    CHANNELS,
    ClientCommand,
    ErrorEvent,
    HeartbeatEvent,
    HelloEvent,
    ServerEvent,
    SubscribedEvent,
    UnsubscribedEvent,
)

log = get_logger(__name__)


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: Dict[str, WebSocket] = {}
        self._subscriptions: Dict[str, Set[str]] = {channel: set() for channel in CHANNELS}
        self._lock = asyncio.Lock()

    # ----- lifecycle -----

    async def accept(self, websocket: WebSocket) -> str:
        await websocket.accept()
        client_id = str(uuid.uuid4())
        async with self._lock:
            self._connections[client_id] = websocket
        log.info("ws.connected", client_id=client_id, total=len(self._connections))

        await self._send(
            client_id,
            HelloEvent(
                client_id=client_id,
                channels=list(CHANNELS),
                server_version=settings.APP_VERSION,
            ),
        )
        return client_id

    async def disconnect(self, client_id: str) -> None:
        async with self._lock:
            self._connections.pop(client_id, None)
            for subscribers in self._subscriptions.values():
                subscribers.discard(client_id)
        log.info("ws.disconnected", client_id=client_id, total=len(self._connections))

    async def shutdown(self) -> None:
        async with self._lock:
            for client_id, ws in list(self._connections.items()):
                try:
                    await ws.close()
                except Exception:
                    pass
                self._connections.pop(client_id, None)
            for ch in self._subscriptions.values():
                ch.clear()

    # ----- inbound -----

    async def handle_text(self, client_id: str, payload: str) -> None:
        try:
            command = ClientCommand.model_validate_json(payload)
        except ValidationError as exc:
            await self._send(client_id, ErrorEvent(code="BAD_COMMAND", message=str(exc)))
            return

        if command.action == "subscribe" and command.channel:
            await self._subscribe(client_id, command.channel)
        elif command.action == "unsubscribe" and command.channel:
            await self._unsubscribe(client_id, command.channel)
        elif command.action == "ping":
            await self._send(client_id, HeartbeatEvent())
        elif command.action == "echo":
            # Diagnostic for client tests; just bounce the channel field.
            if command.channel:
                await self._send(client_id, SubscribedEvent(channel=command.channel))

    async def _subscribe(self, client_id: str, channel: str) -> None:
        if channel not in self._subscriptions:
            await self._send(client_id, ErrorEvent(code="UNKNOWN_CHANNEL", message=channel))
            return
        async with self._lock:
            self._subscriptions[channel].add(client_id)
        log.info("ws.subscribed", client_id=client_id, channel=channel)
        await self._send(client_id, SubscribedEvent(channel=channel))

    async def _unsubscribe(self, client_id: str, channel: str) -> None:
        if channel not in self._subscriptions:
            return
        async with self._lock:
            self._subscriptions[channel].discard(client_id)
        await self._send(client_id, UnsubscribedEvent(channel=channel))

    # ----- outbound -----

    async def broadcast(self, channel: str, event: ServerEvent) -> int:
        """Send `event` to every subscriber of `channel`. Returns delivered count."""
        if channel not in self._subscriptions:
            log.warning("ws.broadcast_unknown_channel", channel=channel)
            return 0

        async with self._lock:
            recipients = list(self._subscriptions[channel])

        if not recipients:
            return 0

        delivered = 0
        for client_id in recipients:
            ok = await self._send(client_id, event)
            if ok:
                delivered += 1
        return delivered

    async def send_to(self, client_id: str, event: ServerEvent) -> bool:
        return await self._send(client_id, event)

    async def _send(self, client_id: str, event: ServerEvent) -> bool:
        ws = self._connections.get(client_id)
        if ws is None:
            return False
        try:
            await ws.send_text(event.model_dump_json())
            return True
        except (WebSocketDisconnect, RuntimeError) as exc:
            log.info("ws.send_failed_drop", client_id=client_id, error=str(exc))
            await self.disconnect(client_id)
            return False
        except Exception as exc:
            log.warning("ws.send_failed", client_id=client_id, error=str(exc))
            return False

    # ----- introspection -----

    def stats(self) -> Dict[str, Any]:
        return {
            "connections": len(self._connections),
            "subscriptions": {ch: len(subs) for ch, subs in self._subscriptions.items()},
        }

    def current_active_count(self) -> int:
        """Number of clients with an open WebSocket right now. Cheap O(1)
        getter — used by the analytics endpoint as the "live" online count."""
        return len(self._connections)


manager = WebSocketManager()


def get_manager() -> WebSocketManager:
    return manager

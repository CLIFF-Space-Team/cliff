

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
import structlog

from app.core.config import settings
from app.services.nasa_services import get_nasa_services, SimplifiedNASAServices
from app.services.ai_services import get_ai_services

logger = structlog.get_logger(__name__)



class WebSocketMessage(BaseModel):
    
    type: str = Field(..., description="Message type")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    data: Dict[str, Any] = Field(default_factory=dict, description="Message data")
    client_id: Optional[str] = Field(None, description="Target client ID")
    broadcast: bool = Field(default=False, description="Broadcast to all clients")


class ThreatAlert(BaseModel):
    
    alert_id: str = Field(..., description="Alert identifier")
    severity: str = Field(..., description="Alert severity (LOW, MODERATE, HIGH, CRITICAL)")
    title: str = Field(..., description="Alert title")
    description: str = Field(..., description="Alert description")
    threat_type: str = Field(..., description="Type of threat")
    location: Optional[Dict[str, float]] = Field(None, description="Geographic location")
    expires_at: Optional[datetime] = Field(None, description="Alert expiration")
    actions: List[str] = Field(default_factory=list, description="Recommended actions")


class ClientInfo(BaseModel):
    
    client_id: str = Field(..., description="Unique client identifier")
    connected_at: datetime = Field(default_factory=datetime.utcnow, description="Connection timestamp")
    last_activity: datetime = Field(default_factory=datetime.utcnow, description="Last activity timestamp")
    subscriptions: Set[str] = Field(default_factory=set, description="Subscribed event types")
    user_id: Optional[str] = Field(None, description="Associated user ID")
    session_id: Optional[str] = Field(None, description="Session identifier")
    location: Optional[Dict[str, float]] = Field(None, description="Client location")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="Client preferences")


class DataUpdate(BaseModel):
    
    update_id: str = Field(..., description="Update identifier")
    data_type: str = Field(..., description="Type of data updated")
    source: str = Field(..., description="Data source")
    changes: Dict[str, Any] = Field(..., description="Data changes")
    affects_threat_level: bool = Field(default=False, description="Whether update affects threat level")



class WebSocketManager:
    
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        
        self.clients: Dict[str, ClientInfo] = {}
        
        self.subscriptions: Dict[str, Set[str]] = {
            "threat_alerts": set(),
            "data_updates": set(), 
            "system_status": set(),
            "asteroid_updates": set(),
            "earth_events": set(),
            "space_weather": set(),
            "voice_responses": set(),
        }
        self.last_known_alert_ids: Set[str] = set()
        
        self.background_tasks: Set[asyncio.Task] = set()
        
        self.message_queue: Dict[str, List[WebSocketMessage]] = {}
        
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "messages_sent": 0,
            "alerts_broadcast": 0,
            "data_updates_sent": 0,
        }
        
        logger.info("WebSocket Manager initialized")
    
    async def initialize(self):
        
        try:
            if settings.ENABLE_REAL_TIME_ALERTS:
                task = asyncio.create_task(self._monitor_threats())
                self.background_tasks.add(task)
                task.add_done_callback(self.background_tasks.discard)
            
            task = asyncio.create_task(self._cleanup_inactive_clients())
            self.background_tasks.add(task)
            task.add_done_callback(self.background_tasks.discard)
            
            task = asyncio.create_task(self._heartbeat_monitor())
            self.background_tasks.add(task)
            task.add_done_callback(self.background_tasks.discard)
            
            logger.info("WebSocket Manager background tasks started")
            
        except Exception as e:
            logger.error(f"Failed to initialize WebSocket Manager: {str(e)}")
            raise
    
    async def shutdown(self):
        try:
            logger.info("Shutting down WebSocket Manager...")
            
            for task in self.background_tasks:
                task.cancel()
            
            if self.background_tasks:
                await asyncio.gather(*self.background_tasks, return_exceptions=True)
            
            for client_id in list(self.active_connections.keys()):
                await self.disconnect(client_id)
            
            logger.info("WebSocket Manager shutdown complete")
            
        except Exception as e:
            logger.error(f"WebSocket Manager shutdown error: {str(e)}")
    
    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None) -> str:
        try:
            await websocket.accept()
            
            if not client_id:
                client_id = f"client_{uuid.uuid4().hex[:8]}"
            
            self.active_connections[client_id] = websocket
            
            client_info = ClientInfo(client_id=client_id)
            self.clients[client_id] = client_info
            
            self.message_queue[client_id] = []
            
            self.stats["total_connections"] += 1
            self.stats["active_connections"] = len(self.active_connections)
            
            welcome_message = WebSocketMessage(
                type="connection_established",
                data={
                    "client_id": client_id,
                    "server_time": datetime.utcnow().isoformat(),
                    "available_subscriptions": list(self.subscriptions.keys()),
                    "features": {
                        "threat_monitoring": settings.ENABLE_REAL_TIME_ALERTS,
                        "voice_interface": settings.ENABLE_VOICE_INTERFACE,
                        "data_streaming": True,
                    }
                }
            )
            
            await self._send_to_client(client_id, welcome_message)
            
            logger.info(f"WebSocket client connected: {client_id}")
            
            return client_id
            
        except Exception as e:
            logger.error(f"Failed to connect WebSocket client: {str(e)}")
            if client_id and client_id in self.active_connections:
                del self.active_connections[client_id]
            raise
    
    async def disconnect(self, client_id: str):
        
        try:
            for subscription_type in self.subscriptions:
                self.subscriptions[subscription_type].discard(client_id)
            
            if client_id in self.active_connections:
                websocket = self.active_connections[client_id]
                try:
                    await websocket.close()
                except:
                    pass  # Connection may already be closed
                
                del self.active_connections[client_id]
            
            if client_id in self.clients:
                del self.clients[client_id]
            
            if client_id in self.message_queue:
                del self.message_queue[client_id]
            
            await self._cleanup_ai_client(client_id)
            
            self.stats["active_connections"] = len(self.active_connections)
            
            logger.info(f"WebSocket client disconnected: {client_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting client {client_id}: {str(e)}")
    
    async def subscribe(self, client_id: str, subscription_type: str) -> bool:
        
        try:
            if subscription_type not in self.subscriptions:
                logger.warning(f"Unknown subscription type: {subscription_type}")
                return False
            
            if client_id not in self.clients:
                logger.warning(f"Unknown client: {client_id}")
                return False
            
            self.subscriptions[subscription_type].add(client_id)
            self.clients[client_id].subscriptions.add(subscription_type)
            
            confirmation = WebSocketMessage(
                type="subscription_confirmed",
                data={
                    "subscription_type": subscription_type,
                    "subscribed_at": datetime.utcnow().isoformat(),
                }
            )
            
            await self._send_to_client(client_id, confirmation)
            
            logger.info(f"Client {client_id} subscribed to {subscription_type}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to subscribe client {client_id} to {subscription_type}: {str(e)}")
            return False
    
    async def unsubscribe(self, client_id: str, subscription_type: str) -> bool:
        
        try:
            if subscription_type in self.subscriptions:
                self.subscriptions[subscription_type].discard(client_id)
            
            if client_id in self.clients:
                self.clients[client_id].subscriptions.discard(subscription_type)
            
            logger.info(f"Client {client_id} unsubscribed from {subscription_type}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to unsubscribe client {client_id} from {subscription_type}: {str(e)}")
            return False
    
    async def broadcast_threat_alert(self, alert: ThreatAlert):
        
        try:
            message = WebSocketMessage(
                type="threat_alert",
                data=alert.dict(),
                broadcast=True,
            )
            
            subscribers = self.subscriptions.get("threat_alerts", set())
            
            if subscribers:
                await self._broadcast_to_subscribers(message, subscribers)
                self.stats["alerts_broadcast"] += 1
                
                logger.info(f"Threat alert broadcast: {alert.alert_id} to {len(subscribers)} clients")
            
        except Exception as e:
            logger.error(f"Failed to broadcast threat alert: {str(e)}")
    
    async def broadcast_data_update(self, update: DataUpdate):
        
        try:
            message = WebSocketMessage(
                type="data_update",
                data=update.dict(),
                broadcast=True,
            )
            
            subscribers = self.subscriptions.get("data_updates", set())
            
            specific_subscribers = self.subscriptions.get(f"{update.data_type}_updates", set())
            all_subscribers = subscribers.union(specific_subscribers)
            
            if all_subscribers:
                await self._broadcast_to_subscribers(message, all_subscribers)
                self.stats["data_updates_sent"] += 1
                
                logger.info(f"Data update broadcast: {update.data_type} to {len(all_subscribers)} clients")
            
        except Exception as e:
            logger.error(f"Failed to broadcast data update: {str(e)}")
    
    async def send_voice_response(self, client_id: str, response_data: Dict[str, Any]):
        
        try:
            message = WebSocketMessage(
                type="voice_response",
                client_id=client_id,
                data=response_data,
            )
            
            await self._send_to_client(client_id, message)
            
            logger.info(f"Voice response sent to client: {client_id}")
            
        except Exception as e:
            logger.error(f"Failed to send voice response to {client_id}: {str(e)}")
    
    async def broadcast_system_status(self, status_data: Dict[str, Any]):
        
        try:
            message = WebSocketMessage(
                type="system_status",
                data=status_data,
                broadcast=True,
            )
            
            subscribers = self.subscriptions.get("system_status", set())
            
            if subscribers:
                await self._broadcast_to_subscribers(message, subscribers)
                
                logger.info(f"System status broadcast to {len(subscribers)} clients")
            
        except Exception as e:
            logger.error(f"Failed to broadcast system status: {str(e)}")
    
    async def broadcast_to_all(self, message_data: Dict[str, Any], message_type: str = "notification"):
        
        try:
            message = WebSocketMessage(
                type=message_type,
                data=message_data,
                broadcast=True,
            )
            
            all_clients = set(self.active_connections.keys())
            
            if all_clients:
                await self._broadcast_to_subscribers(message, all_clients)
                logger.info(f"Message broadcast to {len(all_clients)} clients")
            
        except Exception as e:
            logger.error(f"Failed to broadcast to all clients: {str(e)}")
    
    async def handle_client_message(self, client_id: str, message: str):
        
        try:
            if client_id in self.clients:
                self.clients[client_id].last_activity = datetime.utcnow()
            
            try:
                data = json.loads(message)
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON message from {client_id}: {message[:100]}")
                await self._send_error(client_id, "Invalid JSON message")
                return
            
            logger.debug(f"Parsed message from {client_id}: {data}")
            
            message_type = data.get("type")
            
            if not message_type:
                logger.warning(f"Message from {client_id} has no type field. Full data: {data}")
                await self._send_error(client_id, "Message type is required")
                return
            
            if message_type == "subscribe":
                subscription_type = data.get("subscription_type")
                if subscription_type:
                    await self.subscribe(client_id, subscription_type)
                else:
                    await self._send_error(client_id, "Missing subscription_type")
            
            elif message_type == "unsubscribe":
                subscription_type = data.get("subscription_type")
                if subscription_type:
                    await self.unsubscribe(client_id, subscription_type)
                else:
                    await self._send_error(client_id, "Missing subscription_type")
            
            elif message_type == "ping":
                await self._send_pong(client_id)
            
            elif message_type == "pong":
                logger.debug(f"Received pong from client {client_id}")
            
            elif message_type == "voice_command":
                await self._handle_voice_command(client_id, data)
            
            elif message_type == "get_current_threats":
                await self._send_current_threats(client_id)
            
            elif message_type in ["subscribe_to_analysis", "unsubscribe_from_analysis",
                                "get_active_analyses", "request_ai_system_status"]:
                await self._handle_ai_message(client_id, data)
            
            else:
                await self._send_error(client_id, f"Unknown message type: {message_type}")
            
            logger.debug(f"Message handled from {client_id}: {message_type}")
            
        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {str(e)}")
            await self._send_error(client_id, "Internal server error")
    
    def get_stats(self) -> Dict[str, Any]:
        
        return {
            **self.stats,
            "subscription_counts": {
                sub_type: len(subscribers)
                for sub_type, subscribers in self.subscriptions.items()
            },
            "active_clients": list(self.active_connections.keys()),
            "uptime": "Running",  # Could track actual uptime
        }
    
    
    async def _send_to_client(self, client_id: str, message: WebSocketMessage):
        
        if client_id not in self.active_connections:
            logger.warning(f"Client {client_id} not in active connections")
            return
        
        websocket = self.active_connections[client_id]
        
        try:
            if websocket.client_state == websocket.client_state.DISCONNECTED:
                logger.warning(f"WebSocket for {client_id} is already disconnected")
                await self.disconnect(client_id)
                return
            
            await websocket.send_text(message.json())
            self.stats["messages_sent"] += 1
            
        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected during message send")
            await self.disconnect(client_id)
        except Exception as e:
            logger.error(f"Failed to send message to {client_id}: {str(e)}")
            if "ConnectionClosed" in str(type(e)) or "websocket" in str(e).lower():
                await self.disconnect(client_id)
    
    async def _broadcast_to_subscribers(self, message: WebSocketMessage, subscribers: Set[str]):
        
        if not subscribers:
            return
        
        tasks = []
        for client_id in subscribers.copy():  # Copy to avoid modification during iteration
            if client_id in self.active_connections:
                task = asyncio.create_task(self._send_to_client(client_id, message))
                tasks.append(task)
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_error(self, client_id: str, error_message: str):
        
        error_msg = WebSocketMessage(
            type="error",
            data={
                "error": error_message,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
        
        await self._send_to_client(client_id, error_msg)
    
    async def _send_pong(self, client_id: str):
        
        pong_msg = WebSocketMessage(
            type="pong",
            data={"timestamp": datetime.utcnow().isoformat()}
        )
        
        await self._send_to_client(client_id, pong_msg)
    
    async def _handle_voice_command(self, client_id: str, data: Dict[str, Any]):
        
        try:
            command = data.get("command", "")
            
            response = WebSocketMessage(
                type="voice_command_received",
                data={
                    "command": command,
                    "status": "processing",
                    "estimated_response_time": "2-5 seconds",
                }
            )
            
            await self._send_to_client(client_id, response)
            
        except Exception as e:
            logger.error(f"Voice command handling error: {str(e)}")
            await self._send_error(client_id, "Voice command processing failed")
    
    async def _send_current_threats(self, client_id: str):
        
        try:
            threat_data = {
                "threat_level": "MODERATE",
                "active_threats": 3,
                "last_updated": datetime.utcnow().isoformat(),
                "summary": "Monitoring 3 active threats: 1 asteroid approach, 2 earth events",
            }
            
            message = WebSocketMessage(
                type="current_threats",
                data=threat_data,
            )
            
            await self._send_to_client(client_id, message)
            
        except Exception as e:
            logger.error(f"Failed to send current threats: {str(e)}")
            await self._send_error(client_id, "Failed to get current threats")
    
    async def _handle_ai_message(self, client_id: str, data: Dict[str, Any]):
        
        try:
            from app.websocket.ai_threat_websocket import handle_ai_websocket_message
            await handle_ai_websocket_message(client_id, data)
        except Exception as e:
            logger.error(f"AI message handling error: {str(e)}")
            await self._send_error(client_id, "AI message processing failed")
    
    async def _cleanup_ai_client(self, client_id: str):
        
        try:
            from app.websocket.ai_threat_websocket import cleanup_ai_client
            await cleanup_ai_client(client_id)
        except Exception as e:
            logger.error(f"AI client cleanup error: {str(e)}")

    async def _monitor_threats(self):
        
        logger.info("Starting threat monitoring background task...")
        nasa_services: SimplifiedNASAServices = get_nasa_services()

        while True:
            try:
                await asyncio.sleep(30)
                logger.debug("Threat monitoring check: Fetching new data...")

                all_potential_alerts: List[ThreatAlert] = []

                try:
                    asteroids = await nasa_services.get_simple_asteroids(days_ahead=7)
                    for ast in asteroids:
                        is_hazardous = ast.get("is_hazardous", False)
                        if is_hazardous:
                            alert = ThreatAlert(
                                alert_id=f"asteroid-{ast.get('id', 'unknown')}",
                                severity="CRITICAL" if is_hazardous else "MODERATE",
                                title=f"YaklaÅŸan Asteroit: {ast.get('name', 'Bilinmeyen')}",
                                description=f"{ast.get('close_approach_date', 'Bilinmeyen')} tarihinde {ast.get('miss_distance_km', 0):,.0f} km mesafeden geÃ§ecek.",
                                threat_type="asteroid",
                                actions=["YÃ¶rÃ¼ngeyi analiz et", "DetaylarÄ± gÃ¶rÃ¼ntÃ¼le"],
                                expires_at=datetime.utcnow() + timedelta(days=1)
                            )
                            all_potential_alerts.append(alert)
                except Exception as e:
                    logger.warning(f"Threat monitor could not fetch asteroid data: {e}")

                try:
                    events = await nasa_services.get_simple_earth_events(limit=10)
                    for event in events:
                        category = event.get("category", "Unknown")
                        critical_categories = ["Wildfires", "Severe Storms", "Volcanoes"]
                        severity = "CRITICAL" if category in critical_categories else "MODERATE"
                        
                        alert = ThreatAlert(
                            alert_id=f"eonet-{event.get('id', 'unknown')}",
                            severity=severity,
                            title=f"DoÄŸal Olay: {event.get('title', 'Bilinmeyen')}",
                            description=f"Kategori: {category}",
                            threat_type="earth_event",
                            actions=["Etkilenen bÃ¶lgeyi incele", "DetaylarÄ± gÃ¶rÃ¼ntÃ¼le"],
                            expires_at=datetime.utcnow() + timedelta(days=2)
                        )
                        all_potential_alerts.append(alert)
                except Exception as e:
                    logger.warning(f"Threat monitor could not fetch earth event data: {e}")

                current_alert_ids = {alert.alert_id for alert in all_potential_alerts}
                new_alert_ids = current_alert_ids - self.last_known_alert_ids

                if new_alert_ids:
                    logger.info(f"New threats detected: {len(new_alert_ids)} adet. Broadcasting...")
                    new_alerts = [alert for alert in all_potential_alerts if alert.alert_id in new_alert_ids]
                    
                    for new_alert in new_alerts:
                        await self.broadcast_threat_alert(new_alert)
                else:
                    logger.debug("No new threats detected.")

                self.last_known_alert_ids = current_alert_ids

            except asyncio.CancelledError:
                logger.info("Threat monitoring task cancelled")
                break
            except Exception as e:
                logger.error(f"Threat monitoring error: {str(e)}", exc_info=True)
                await asyncio.sleep(60)  # Wait longer on error

    async def _cleanup_inactive_clients(self):
        
        logger.info("Starting client cleanup background task...")
        
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                cutoff_time = datetime.utcnow() - timedelta(hours=1)
                inactive_clients = []
                
                for client_id, client_info in self.clients.items():
                    if client_info.last_activity < cutoff_time:
                        inactive_clients.append(client_id)
                
                for client_id in inactive_clients:
                    logger.info(f"Disconnecting inactive client: {client_id}")
                    await self.disconnect(client_id)
                
                if inactive_clients:
                    logger.info(f"Cleaned up {len(inactive_clients)} inactive clients")
                
            except asyncio.CancelledError:
                logger.info("Client cleanup task cancelled")
                break
            except Exception as e:
                logger.error(f"Client cleanup error: {str(e)}")
                await asyncio.sleep(300)
    
    async def _heartbeat_monitor(self):
        
        logger.info("Starting heartbeat monitoring...")
        
        while True:
            try:
                await asyncio.sleep(30)  # Send heartbeat every 30 seconds
                
                if self.active_connections:
                    ping_tasks = []
                    for client_id in list(self.active_connections.keys()):
                        ping_message = WebSocketMessage(
                            type="ping",
                            data={"timestamp": datetime.utcnow().isoformat()}
                        )
                        task = asyncio.create_task(
                            self._send_ping_with_timeout(client_id, ping_message)
                        )
                        ping_tasks.append(task)
                    
                    if ping_tasks:
                        await asyncio.gather(*ping_tasks, return_exceptions=True)
                
            except asyncio.CancelledError:
                logger.info("Heartbeat monitoring cancelled")
                break
            except Exception as e:
                logger.error(f"Heartbeat monitoring error: {str(e)}")
                await asyncio.sleep(30)


    async def _send_ping_with_timeout(self, client_id: str, message: WebSocketMessage):
        
        try:
            await asyncio.wait_for(
                self._send_to_client(client_id, message),
                timeout=5.0  # 5 second timeout
            )
        except asyncio.TimeoutError:
            logger.warning(f"Ping timeout for client {client_id} - disconnecting")
            await self.disconnect(client_id)
        except Exception as e:
            logger.warning(f"Ping failed for client {client_id}: {str(e)}")
            await self.disconnect(client_id)



websocket_manager = WebSocketManager()



async def get_websocket_manager() -> WebSocketManager:
    
    return websocket_manager


async def create_threat_alert(
    severity: str,
    title: str,
    description: str,
    threat_type: str,
    actions: List[str] = None,
    location: Dict[str, float] = None,
    expires_in_hours: int = 24,
) -> ThreatAlert:
    
    alert = ThreatAlert(
        alert_id=f"ALERT-{uuid.uuid4().hex[:8]}",
        severity=severity,
        title=title,
        description=description,
        threat_type=threat_type,
        location=location,
        expires_at=datetime.utcnow() + timedelta(hours=expires_in_hours),
        actions=actions or [],
    )
    
    await websocket_manager.broadcast_threat_alert(alert)
    
    return alert


async def create_data_update(
    data_type: str,
    source: str,
    changes: Dict[str, Any],
    affects_threat_level: bool = False,
) -> DataUpdate:
    
    update = DataUpdate(
        update_id=f"UPD-{uuid.uuid4().hex[:8]}",
        data_type=data_type,
        source=source,
        changes=changes,
        affects_threat_level=affects_threat_level,
    )
    
    await websocket_manager.broadcast_data_update(update)
    
    return update


async def check_websocket_health() -> Dict[str, Any]:
    
    try:
        stats = websocket_manager.get_stats()
        
        return {
            "status": "healthy",
            "active_connections": stats["active_connections"],
            "total_messages_sent": stats["messages_sent"],
            "background_tasks_running": len(websocket_manager.background_tasks),
            "subscriptions": stats["subscription_counts"],
        }
        
    except Exception as e:
        logger.error(f"WebSocket health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }

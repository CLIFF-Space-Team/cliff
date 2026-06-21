/**
 * WebSocket event union. Mirrors `backend/app/ws/events.py`.
 *
 * Inbound (server → client): discriminated union by `type`.
 * Outbound (client → server): see `ClientCommand`.
 */

import type { RiskDelta, ThreatAlert } from './api-types';
import type { EarthEventAlert, EarthEventDelta } from './earth-types';

export const WS_CHANNELS = [
  'risk_updates',
  'threat_alerts',
  'system_status',
  'data_updates',
  // Live admin-panel feed: receives `LiveCountEvent` ~30 s pushes from
  // the scheduler so the "online now" tile stays current without polling.
  'analytics_updates',
  // Unified Earth-event pipeline: every upsert delta + every high-severity
  // alert is broadcast on these channels for the /earth dashboard.
  'earth_updates',
  'earth_alerts',
] as const;

export type WsChannel = (typeof WS_CHANNELS)[number];

export interface BaseEvent {
  timestamp: string;
}

export interface HelloEvent extends BaseEvent {
  type: 'hello';
  client_id: string;
  channels: string[];
  server_version: string;
}

export interface SubscribedEvent extends BaseEvent {
  type: 'subscribed';
  channel: string;
}

export interface UnsubscribedEvent extends BaseEvent {
  type: 'unsubscribed';
  channel: string;
}

export interface HeartbeatEvent extends BaseEvent {
  type: 'heartbeat';
}

export interface RiskUpdateEvent extends BaseEvent {
  type: 'risk_update';
  deltas: RiskDelta[];
}

export interface ThreatAlertEvent extends BaseEvent {
  type: 'threat_alert';
  alert: ThreatAlert;
}

export interface SystemStatusEvent extends BaseEvent {
  type: 'system_status';
  status: 'healthy' | 'degraded' | 'offline';
  cycle_count: number;
  last_cycle_at: string | null;
  redis_ok: boolean;
  nasa_ok: boolean;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  code: string;
  message: string;
}

export interface LiveCountEvent extends BaseEvent {
  type: 'live_count';
  count: number;
}

export interface EarthUpdateEvent extends BaseEvent {
  type: 'earth_update';
  deltas: EarthEventDelta[];
}

export interface EarthAlertEvent extends BaseEvent {
  type: 'earth_alert';
  alert: EarthEventAlert;
}

export type ServerEvent =
  | HelloEvent
  | SubscribedEvent
  | UnsubscribedEvent
  | HeartbeatEvent
  | RiskUpdateEvent
  | ThreatAlertEvent
  | SystemStatusEvent
  | ErrorEvent
  | LiveCountEvent
  | EarthUpdateEvent
  | EarthAlertEvent;

export interface ClientCommand {
  action: 'subscribe' | 'unsubscribe' | 'ping' | 'echo';
  channel?: WsChannel;
  request_id?: string;
  payload?: Record<string, unknown>;
}

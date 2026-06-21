'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { toast } from 'sonner';

import { queryKeys } from '@/lib/query-keys';
import type { RiskDelta, RiskSnapshot, ThreatAlert } from '@/lib/api-types';
import type { EarthEvent, EarthEventAlert, EarthEventDelta, EarthEventListResponse } from '@/lib/earth-types';
import {
  type ClientCommand,
  type ServerEvent,
  type WsChannel,
} from '@/lib/ws-events';

const HEARTBEAT_INTERVAL_MS = 30_000;
// 750 ms initial backoff (vs. the old 250 ms) — fast enough to feel
// instant on a real network blip, slow enough that a 5-10 s backend deploy
// window doesn't generate a flurry of 502s in the nginx log. Plus jitter so
// multiple tabs don't dog-pile the upstream when it comes back.
const MIN_RECONNECT_MS = 750;
const MAX_RECONNECT_MS = 30_000;
const RECONNECT_JITTER_MS = 350;

type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'offline';

interface WebSocketContextValue {
  state: ConnectionState;
  clientId: string | null;
  send: (cmd: ClientCommand) => void;
  subscribe: (channel: WsChannel) => void;
  unsubscribe: (channel: WsChannel) => void;
  lastEvent: ServerEvent | null;
  alerts: ThreatAlert[];
}

const Context = createContext<WebSocketContextValue | null>(null);

/**
 * Resolve the WebSocket URL at connect time (not at module load) so that:
 *   - HTTPS pages always upgrade to `wss://` (no mixed-content / SecurityError)
 *   - The same code works under any hostname (localhost / notcome.app / …)
 *   - Hot-reload picks up env changes without a full process restart
 */
function resolveWsUrl(): string {
  const env = process.env.NEXT_PUBLIC_WS_URL?.replace(/\/$/, '');
  if (env) return `${env}/ws/cliff`;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/cliff`;
  }
  return 'ws://localhost:8000/ws/cliff';
}

const DEFAULT_CHANNELS: WsChannel[] = [
  'risk_updates',
  'threat_alerts',
  'system_status',
  'earth_updates',
  'earth_alerts',
];

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>('idle');
  const [clientId, setClientId] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<ServerEvent | null>(null);
  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttempts = useRef(0);
  const subscribed = useRef<Set<WsChannel>>(new Set(DEFAULT_CHANNELS));
  // True after the first successful WS handshake. We use it to detect
  // *re*-connects (vs the very first connect) — those imply the backend
  // may have restarted, so any cached query errors are stale and every
  // React Query subscription should refetch.
  const hasConnectedOnce = useRef(false);

  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const sendRaw = useCallback((cmd: ClientCommand) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(cmd));
    }
  }, []);

  const subscribe = useCallback(
    (channel: WsChannel) => {
      subscribed.current.add(channel);
      sendRaw({ action: 'subscribe', channel });
    },
    [sendRaw],
  );

  const unsubscribe = useCallback(
    (channel: WsChannel) => {
      subscribed.current.delete(channel);
      sendRaw({ action: 'unsubscribe', channel });
    },
    [sendRaw],
  );

  const handleEvent = useCallback(
    (event: ServerEvent) => {
      setLastEvent(event);
      switch (event.type) {
        case 'hello':
          setClientId(event.client_id);
          for (const channel of subscribed.current) {
            sendRaw({ action: 'subscribe', channel });
          }
          break;

        case 'risk_update':
          // Target ONLY the snapshot family. The old `threats.all` prefix
          // also matched the risk-detail (RiskRecord) and alerts (array)
          // caches, whose values have no `.items` — mergeDeltas then threw a
          // TypeError that aborted the merge and was swallowed, silently
          // killing live risk updates once a detail/alerts query was cached.
          queryClient.setQueriesData<RiskSnapshot | undefined>(
            { queryKey: queryKeys.threats.riskSnapshotAll },
            (snapshot) => mergeDeltas(snapshot, event.deltas),
          );
          break;

        case 'threat_alert':
          setAlerts((prev) => [event.alert, ...prev].slice(0, 50));
          // Prefix-invalidate so the limit-25 feed consumer matches too.
          queryClient.invalidateQueries({ queryKey: queryKeys.threats.alertsAll });
          break;

        case 'system_status':
          // Consumed by SystemStatusIndicator via lastEvent.
          break;

        case 'earth_update':
          // Server pushed deltas for one or more events. Merge them into
          // every cached `useEarthEvents` query (filters live in the key
          // tail so we wildcard-match on the prefix and let the merger
          // skip events that don't fit the visible filter on its own).
          // Then nudge the summary tile so KPI counts stay live.
          queryClient.setQueriesData<EarthEventListResponse | undefined>(
            { queryKey: queryKeys.earth.eventsAll },
            (snapshot) => mergeEarthDeltas(snapshot, event.deltas),
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.earth.summary() });
          break;

        case 'earth_alert':
          // Toast the highest-severity events for instant operator feedback,
          // then refresh the alerts list cache so the side-panel ticker updates.
          notifyEarthAlert(event.alert);
          queryClient.invalidateQueries({ queryKey: queryKeys.earth.summary() });
          break;

        default:
          break;
      }
    },
    [queryClient, sendRaw],
  );

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (ws.current && ws.current.readyState !== WebSocket.CLOSED) return;

    setState((prev) => (prev === 'open' ? prev : 'connecting'));

    const socket = new WebSocket(resolveWsUrl());
    ws.current = socket;

    socket.onopen = () => {
      const wasReconnect = hasConnectedOnce.current;
      hasConnectedOnce.current = true;
      reconnectAttempts.current = 0;
      setState('open');
      heartbeatTimer.current = setInterval(() => {
        sendRaw({ action: 'ping' });
      }, HEARTBEAT_INTERVAL_MS);
      if (wasReconnect) {
        // The WS dropped and is back — most likely cause is a backend
        // restart. Any React Query that ended up in a stuck error state
        // during the outage now needs to retry. Cheap nuke: invalidate
        // every query, which kicks all observers into refetch.
        queryClient.invalidateQueries();
      }
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      let parsed: ServerEvent;
      try {
        parsed = JSON.parse(event.data) as ServerEvent;
      } catch {
        // Malformed frame (network noise) — ignore silently.
        return;
      }
      try {
        handleEvent(parsed);
      } catch (err) {
        // A handler threw — that is a real bug, not noise. Surface it in dev
        // so a cache-merge regression can't silently kill live updates again.
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[ws] event handler error', err);
        }
      }
    };

    socket.onerror = () => {
      setState('reconnecting');
    };

    socket.onclose = () => {
      clearTimers();
      ws.current = null;
      setClientId(null);
      const attempt = reconnectAttempts.current++;
      const base = Math.min(MAX_RECONNECT_MS, MIN_RECONNECT_MS * 2 ** attempt);
      const delay = base + Math.random() * RECONNECT_JITTER_MS;
      setState('reconnecting');
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [clearTimers, handleEvent, sendRaw]);

  useEffect(() => {
    connect();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && ws.current?.readyState !== WebSocket.OPEN) {
        connect();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimers();
      ws.current?.close();
      ws.current = null;
      setState('offline');
    };
  }, [connect, clearTimers]);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      state,
      clientId,
      send: sendRaw,
      subscribe,
      unsubscribe,
      lastEvent,
      alerts,
    }),
    [state, clientId, sendRaw, subscribe, unsubscribe, lastEvent, alerts],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useWebSocket() {
  const ctx = useContext(Context);
  if (ctx === null) throw new Error('useWebSocket must be used inside <WebSocketProvider>');
  return ctx;
}

function mergeDeltas(
  snapshot: RiskSnapshot | undefined,
  deltas: RiskDelta[],
): RiskSnapshot | undefined {
  // Defensive: a non-snapshot value (e.g. an unexpected cache-key match)
  // must never throw inside setQueriesData and abort the merge loop.
  if (!snapshot || !Array.isArray(snapshot.items)) return snapshot;
  const byId = new Map(snapshot.items.map((item) => [item.neo_id, item]));
  for (const delta of deltas) {
    const existing = byId.get(delta.neo_id);
    if (!existing) continue;
    byId.set(delta.neo_id, {
      ...existing,
      risk_class: delta.new_class,
      hybrid_score: delta.new_score,
      computed_at: delta.computed_at,
    });
  }
  const items = Array.from(byId.values()).sort((a, b) => b.hybrid_score - a.hybrid_score);
  return { ...snapshot, items };
}

/**
 * Apply a batch of `EarthEventDelta`s to a cached events list. We don't
 * have the full event payload in a delta — only metadata + new severity
 * — so for `new` deltas we synthesize a placeholder that gets backfilled
 * by the next refetch; for updates we patch in place.
 *
 * The merge respects the cached filter: if a "new" delta lands in a
 * category the cached filter excludes, it stays out. The next refetch
 * (every 60 s) pulls fresh data anyway so a brief miss is acceptable.
 */
function mergeEarthDeltas(
  snapshot: EarthEventListResponse | undefined,
  deltas: EarthEventDelta[],
): EarthEventListResponse | undefined {
  if (!snapshot) return snapshot;
  const byId = new Map(snapshot.items.map((item) => [item.id, item]));
  const filterCategories = snapshot.filters?.categories ?? [];
  const passesFilter = (category: string) =>
    filterCategories.length === 0 || filterCategories.includes(category);

  for (const delta of deltas) {
    const existing = byId.get(delta.event_id);
    if (existing) {
      byId.set(delta.event_id, {
        ...existing,
        severity: delta.new_severity,
        severity_score: delta.new_score,
        updated_at: delta.updated_at,
        status: delta.direction === 'closed' ? 'closed' : existing.status,
      });
    } else if (delta.direction === 'new' && passesFilter(delta.category)) {
      // Synthesize a thin placeholder. Full record arrives on next refetch.
      const placeholder: EarthEvent = {
        id: delta.event_id,
        source: 'eonet',
        category: delta.category,
        title: delta.title,
        description: null,
        geometries: delta.point
          ? [
              {
                date: delta.updated_at,
                type: 'Point',
                coordinates: delta.point,
                magnitude_value: null,
                magnitude_unit: null,
              },
            ]
          : [],
        started_at: delta.started_at,
        updated_at: delta.updated_at,
        closed_at: null,
        status: 'open',
        severity: delta.new_severity,
        severity_score: delta.new_score,
        primary_metric: null,
        sources: [],
        raw_categories: [],
        fetched_at: delta.computed_at,
        extras: {},
      };
      byId.set(delta.event_id, placeholder);
    }
  }

  const items = Array.from(byId.values()).sort((a, b) => {
    if (snapshot.filters?.sort_by === 'severity') {
      return b.severity_score - a.severity_score;
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  return { ...snapshot, items };
}

/**
 * Toast a high-severity earth alert. Severity drives both wording and
 * tone (sonner has its own taxonomy; we map to its closest channel).
 */
function notifyEarthAlert(alert: EarthEventAlert): void {
  const message =
    alert.severity === 'critical'
      ? `Kritik: ${alert.title}`
      : `Yüksek tehdit: ${alert.title}`;
  if (alert.severity === 'critical') {
    toast.error(message, {
      description: alert.description ?? undefined,
      duration: 8000,
    });
  } else {
    toast.warning(message, {
      description: alert.description ?? undefined,
      duration: 6000,
    });
  }
}

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ApiError, api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useWebSocket } from '@/providers/WebSocketProvider';

export interface AdminWhoami {
  authenticated: boolean;
  method: 'ip' | 'token' | 'none';
  ip: string;
  country: string | null;
}

export interface AdminTrendPoint {
  date: string; // YYYY-MM-DD
  views: number;
  uniques: number;
}

export interface AdminTopPage {
  path: string;
  views: number;
}

export interface AdminTopCountry {
  country: string; // ISO2
  count: number;
}

export interface AdminOverview {
  live_count: number;
  today: { views: number; uniques: number };
  last_7d: AdminTrendPoint[];
  top_pages: AdminTopPage[];
  top_countries: AdminTopCountry[];
  totals_90d: { views: number };
}

export interface AdminRecentVisit {
  ts: number;
  ip: string;
  ua_hash: string;
  path: string;
  country: string;
  status: number;
}

/**
 * Whoami probe — never throws on 401/403; surfaces `authenticated: false`
 * cleanly so the admin page can render the token-entry UI.
 */
export function useAdminWhoami() {
  return useQuery({
    queryKey: queryKeys.admin.whoami(),
    queryFn: async (): Promise<AdminWhoami> => {
      try {
        return await api.get<AdminWhoami>('/api/v1/admin/whoami');
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          return { authenticated: false, method: 'none', ip: '', country: null };
        }
        throw err;
      }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useAdminOverview(enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.overview(),
    enabled,
    queryFn: () => api.get<AdminOverview>('/api/v1/admin/analytics/overview'),
    staleTime: 25 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
  });
}

export function useAdminRecentVisits(limit = 100, enabled = true) {
  return useQuery({
    queryKey: queryKeys.admin.recent(limit),
    enabled,
    queryFn: () =>
      api.get<AdminRecentVisit[]>(`/api/v1/admin/analytics/recent?limit=${limit}`),
    staleTime: 12 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1,
  });
}

/**
 * Live "online now" — subscribes to the `analytics_updates` WS channel.
 * Falls back to whatever overview's polled `live_count` says when no WS
 * push has arrived yet.
 */
export function useAdminLiveCount(initial?: number): number | null {
  const { subscribe, unsubscribe, lastEvent } = useWebSocket();
  const [count, setCount] = useState<number | null>(
    typeof initial === 'number' ? initial : null,
  );

  useEffect(() => {
    subscribe('analytics_updates');
    return () => {
      unsubscribe('analytics_updates');
    };
  }, [subscribe, unsubscribe]);

  useEffect(() => {
    if (!lastEvent) return;
    // Discriminated union: only react to live_count events.
    if ((lastEvent as { type?: string }).type === 'live_count') {
      const c = (lastEvent as { count?: number }).count;
      if (typeof c === 'number') setCount(c);
    }
  }, [lastEvent]);

  // Sync up if a fresher overview poll arrives while we're waiting on a push.
  useEffect(() => {
    if (typeof initial === 'number' && count === null) setCount(initial);
  }, [initial, count]);

  return count;
}

/**
 * Helper: invalidate the admin queries — call from the token-entry submit
 * handler after `setAdminToken(...)` so the queries refetch with auth.
 */
export function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin'] });
  };
}

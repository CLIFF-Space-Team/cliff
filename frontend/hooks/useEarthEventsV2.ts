/**
 * Hooks for the unified Earth-events pipeline (`/api/v1/earth/*`).
 *
 * The pipeline is server-side filtered, paginated, and WS-pushed — these
 * hooks just bind React Query to the matching endpoints. Cache merge of
 * `earth_update` deltas happens in `WebSocketProvider`; these hooks
 * don't subscribe directly so any consumer page automatically picks up
 * pushes once the provider is mounted.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import {
  type EarthCategoriesResponse,
  type EarthEvent,
  type EarthEventFilters,
  type EarthEventListResponse,
  type EarthEventSummary,
} from '@/lib/earth-types';
import { queryKeys } from '@/lib/query-keys';

function filtersKey(filters: EarthEventFilters | undefined): string {
  if (!filters) return 'default';
  // Stable string so the query key is referentially stable across renders.
  return JSON.stringify({
    c: (filters.categories ?? []).slice().sort(),
    s: (filters.sources ?? []).slice().sort(),
    sm: filters.severity_min ?? null,
    st: filters.status ?? 'all',
    d: filters.days ?? null,
    sb: filters.sort_by ?? 'recent',
    l: filters.limit ?? 50,
    o: filters.offset ?? 0,
  });
}

function toQuery(filters: EarthEventFilters | undefined): Record<string, string> {
  const q: Record<string, string> = {};
  if (!filters) return q;
  if (filters.categories?.length) q.categories = filters.categories.join(',');
  if (filters.sources?.length) q.sources = filters.sources.join(',');
  if (filters.severity_min) q.severity_min = filters.severity_min;
  if (filters.status) q.status = filters.status;
  if (filters.days) q.days = String(filters.days);
  if (filters.sort_by) q.sort_by = filters.sort_by;
  if (filters.limit) q.limit = String(filters.limit);
  if (filters.offset) q.offset = String(filters.offset);
  return q;
}

export function useEarthEvents(filters?: EarthEventFilters) {
  return useQuery<EarthEventListResponse>({
    queryKey: queryKeys.earth.events(filtersKey(filters)),
    queryFn: ({ signal }) =>
      api.get<EarthEventListResponse>('/api/v1/earth/events', {
        signal,
        query: toQuery(filters),
      }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useEarthEventDetail(eventId: string | null) {
  return useQuery<EarthEvent>({
    queryKey: queryKeys.earth.eventDetail(eventId ?? ''),
    enabled: Boolean(eventId),
    queryFn: ({ signal }) =>
      api.get<EarthEvent>(`/api/v1/earth/events/${encodeURIComponent(eventId ?? '')}`, {
        signal,
      }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useEarthCategories() {
  return useQuery<EarthCategoriesResponse>({
    queryKey: queryKeys.earth.categories(),
    queryFn: ({ signal }) =>
      api.get<EarthCategoriesResponse>('/api/v1/earth/categories', { signal }),
    // Metadata never changes during a session — keep it forever.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

export function useEarthSummary() {
  return useQuery<EarthEventSummary>({
    queryKey: queryKeys.earth.summary(),
    queryFn: ({ signal }) =>
      api.get<EarthEventSummary>('/api/v1/earth/summary', { signal }),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });
}

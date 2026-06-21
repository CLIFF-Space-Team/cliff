'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { MissionListResponse } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

export function useMissions() {
  return useQuery({
    queryKey: queryKeys.missions.list(),
    queryFn: () => api.get<MissionListResponse>('/api/v1/missions'),
    // Horizons telemetry is cached server-side for 5 min; matching here keeps
    // refetches in sync with the backend cache lifetime.
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

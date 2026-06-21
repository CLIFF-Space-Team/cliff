'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ThreatAlert } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

export function useThreatAlerts(limit = 25) {
  return useQuery({
    queryKey: queryKeys.threats.alerts(limit),
    queryFn: () => api.get<ThreatAlert[]>(`/api/v1/threats/alerts/recent?limit=${limit}`),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

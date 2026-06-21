'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { RiskSnapshot } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

export function useRiskSnapshot(limit = 200) {
  return useQuery({
    queryKey: queryKeys.threats.riskSnapshot(limit),
    queryFn: () => api.get<RiskSnapshot>(`/api/v1/threats/risk/snapshot?limit=${limit}`),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

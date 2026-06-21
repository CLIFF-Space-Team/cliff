'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { HybridAnalysis, RiskRecord } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

export function useNeoRiskDetail(neoId: string | null) {
  return useQuery({
    queryKey: queryKeys.threats.riskDetail(neoId ?? ''),
    queryFn: () => api.get<RiskRecord>(`/api/v1/threats/risk/${neoId}`),
    enabled: !!neoId,
    staleTime: 60 * 1000,
  });
}

export function useHybridAnalysis(neoId: string | null, daysAhead = 30) {
  return useQuery({
    queryKey: queryKeys.horizons.hybridAnalysis(neoId ?? '', daysAhead),
    queryFn: () =>
      api.get<HybridAnalysis>(
        `/api/v1/horizons/asteroid/${neoId}/hybrid-analysis?days_ahead=${daysAhead}`,
      ),
    enabled: !!neoId,
    staleTime: 5 * 60 * 1000,
  });
}

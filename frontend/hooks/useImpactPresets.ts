'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { ImpactPresetsResponse } from '@/lib/impact-presets';
import { queryKeys } from '@/lib/query-keys';

export function useImpactPresets() {
  return useQuery({
    queryKey: queryKeys.impact.presets(),
    queryFn: () => api.get<ImpactPresetsResponse>('/api/v1/impact/presets'),
    // SBDB diameter refreshes daily on the backend; matching here.
    staleTime: 60 * 60 * 1000,
    refetchOnMount: false,
  });
}

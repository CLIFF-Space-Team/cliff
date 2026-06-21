'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { RiskClass } from '@/lib/api-types';

export interface TimelineSample {
  ts: number;
  risk_class: RiskClass;
  hybrid_score: number;
  ml_confidence: number;
  miss_distance_km: number | null;
  geo_distance_au: number | null;
}

export interface TimelineSeries {
  neo_id: string;
  samples: TimelineSample[];
}

export function useRiskTimeline(neoId: string | null, days = 30) {
  return useQuery({
    queryKey: ['risk-timeline', neoId, days],
    queryFn: () =>
      api.get<TimelineSeries>(`/api/v1/threats/risk/${neoId}/timeline?days=${days}`),
    enabled: !!neoId,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

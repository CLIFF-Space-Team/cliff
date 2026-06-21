'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface ObservableNeo {
  neo_id: string;
  name: string;
  designation: string | null;
  diameter_max_km: number | null;
  miss_distance_km: number;
  miss_distance_au: number;
  next_approach_at: string;
  days_until_approach: number | null;
  absolute_magnitude_h: number;
  apparent_magnitude: number;
  phase_angle_deg?: number;
  observable_class:
    | 'naked_eye'
    | 'amateur_telescope'
    | 'professional'
    | 'out_of_reach';
  observable_window: string;
  best_time_tr?: string;
  is_potentially_hazardous: boolean;
  sentry_listed: boolean;
  hybrid_score: number;
  risk_class: string;
}

interface ObservableResponse {
  items: ObservableNeo[];
  total: number;
  days: number;
  max_magnitude: number;
  naked_eye_limit: number;
  amateur_telescope_limit: number;
  professional_limit: number;
  observer_lat: number;
  observer_lng: number;
  fetched_at: string;
}

/**
 * Türkiye semasından önümüzdeki günlerde gözlemlenebilir NEO listesi.
 * Risk store'dan gelen mevcut NEO'ları parlaklık tahminiyle filtreler.
 */
export function useObservableNeos(days = 14, maxMagnitude = 16) {
  return useQuery({
    queryKey: ['observability-tr', days, maxMagnitude],
    queryFn: () =>
      api.get<ObservableResponse>(
        `/api/v1/observability/turkey?days=${days}&max_magnitude=${maxMagnitude}`,
      ),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}

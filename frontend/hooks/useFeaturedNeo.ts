'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { RiskClass } from '@/lib/api-types';

export interface FeaturedNeo {
  available: boolean;
  neo_id?: string;
  designation?: string | null;
  name?: string;
  risk_class?: RiskClass;
  hybrid_score?: number;
  diameter_max_km?: number | null;
  miss_distance_km?: number | null;
  relative_velocity_kms?: number | null;
  next_approach_at?: string | null;
  is_potentially_hazardous?: boolean;
  sentry_listed?: boolean;
  days_until_approach?: number | null;
}

export function useFeaturedNeo() {
  return useQuery({
    queryKey: ['featured-neo'],
    queryFn: () => api.get<FeaturedNeo>('/api/v1/threats/featured-today'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

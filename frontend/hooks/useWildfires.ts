'use client';

import { useQuery } from '@tanstack/react-query';

import { ApiError, api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface Wildfire {
  lat: number;
  lon: number;
  brightness_k: number;
  frp: number;
  confidence: string;
  acq_at: number;
  satellite: string;
  instrument: string;
  daynight: string;
  source: string;
}

export interface WildfiresResponse {
  items: Wildfire[];
  total: number;
  country: string;
  days: number;
  source: string;
  fetched_at: string;
}

export function useWildfires(country = 'TUR', days = 1) {
  return useQuery({
    queryKey: queryKeys.earth.wildfires(country, days),
    queryFn: () =>
      api.get<WildfiresResponse>(
        `/api/v1/earth/wildfires?country=${country}&days=${days}&limit=500`,
      ),
    // FIRMS only updates every few hours; long stale time avoids hammering.
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry if FIRMS isn't configured — backend returns 503 immediately.
      if (error instanceof ApiError && error.code === 'FIRMS_NOT_CONFIGURED') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

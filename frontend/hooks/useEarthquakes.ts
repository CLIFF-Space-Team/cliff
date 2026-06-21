'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  tsunami: boolean;
  felt: number | null;
  lon: number | null;
  lat: number | null;
  depth_km: number | null;
  url: string;
  alert: 'green' | 'yellow' | 'orange' | 'red' | null;
  sig: number | null;
}

interface EarthquakesResponse {
  items: Earthquake[];
  total: number;
  min_magnitude: number;
  window: string;
  source: string;
}

export function useEarthquakes(min = 4.5, window: 'hour' | 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['earthquakes', min, window],
    queryFn: () =>
      api.get<EarthquakesResponse>(
        `/api/v1/earth/earthquakes?min_magnitude=${min}&window=${window}&limit=80`,
      ),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

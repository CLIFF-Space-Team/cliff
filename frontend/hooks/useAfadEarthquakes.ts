'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface AfadEarthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  lat: number | null;
  lon: number | null;
  depth_km: number | null;
  url: string;
  source: string;
  country: string;
  type: string;
}

export interface AfadEarthquakesResponse {
  items: AfadEarthquake[];
  total: number;
  min_magnitude: number;
  hours: number;
  source: string;
  fetched_at: string;
}

export function useAfadEarthquakes(min = 2.0, hours = 24) {
  return useQuery({
    queryKey: queryKeys.earth.earthquakesTr(min),
    queryFn: () =>
      api.get<AfadEarthquakesResponse>(
        `/api/v1/earth/earthquakes-tr?min_magnitude=${min}&hours=${hours}&limit=100`,
      ),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

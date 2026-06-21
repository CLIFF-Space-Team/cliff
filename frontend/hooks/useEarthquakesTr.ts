'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/** AFAD-shaped quake row. Same fields as USGS where they overlap so the
 *  /earth scene can render both feeds through one code path. */
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

interface EarthquakesTrResponse {
  items: AfadEarthquake[];
  total: number;
  min_magnitude: number;
  hours: number;
  source: string;
  fetched_at: string;
}

/**
 * Live AFAD Türkiye earthquake feed. Lower magnitude floor than USGS
 * (M2.0 instead of M4.5) because the Turkish national network resolves
 * many small events that the global feed never sees.
 */
export function useEarthquakesTr(minMagnitude = 2.0, hours = 24) {
  return useQuery({
    queryKey: ['earthquakes-tr', minMagnitude, hours],
    queryFn: () =>
      api.get<EarthquakesTrResponse>(
        `/api/v1/earth/earthquakes-tr?min_magnitude=${minMagnitude}&hours=${hours}&limit=120`,
      ),
    staleTime: 4 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

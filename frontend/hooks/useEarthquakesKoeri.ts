'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/**
 * KOERI (Boğaziçi Kandilli) Türkiye deprem feed.
 *
 * AFAD ile aynı normalize şemada — `useEarthquakesTr` ile birlikte tüketilip
 * `id` ile dedupe edilir. Tek başına başarısız olursa sessiz boş döner;
 * AFAD ana kaynak olarak kalmaya devam eder.
 */
export interface KoeriEarthquake {
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
  quality?: string | null;
}

interface KoeriResponse {
  items: KoeriEarthquake[];
  total: number;
  min_magnitude: number;
  hours: number;
  source: string;
  fetched_at: string;
}

export function useEarthquakesKoeri(minMagnitude = 2.0, hours = 24) {
  return useQuery({
    queryKey: ['earthquakes-koeri', minMagnitude, hours],
    queryFn: () =>
      api.get<KoeriResponse>(
        `/api/v1/earth/earthquakes-koeri?min_magnitude=${minMagnitude}&hours=${hours}&limit=120`,
      ),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    retry: 1,
  });
}

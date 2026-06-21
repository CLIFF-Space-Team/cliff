'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import type { EphemerisResponse } from '@/lib/api-types';
import { queryKeys } from '@/lib/query-keys';

/**
 * JPL Horizons gözlemci-modu efemerisi — bir NEO'nun önümüzdeki günlerde
 * geosentrik mesafesi, görünen parlaklığı (apmag) ve gökyüzü konumu (ra/dec).
 * "Ne zaman / ne kadar parlak görünür" zaman çizelgesini besler.
 */
export function useEphemeris(neoId: string | null, daysAhead = 60) {
  return useQuery({
    queryKey: queryKeys.horizons.ephemeris(neoId ?? '', daysAhead),
    queryFn: () =>
      api.get<EphemerisResponse>(
        `/api/v1/horizons/asteroid/${neoId}/ephemeris?days_ahead=${daysAhead}`,
      ),
    enabled: !!neoId,
    staleTime: 30 * 60 * 1000,
  });
}

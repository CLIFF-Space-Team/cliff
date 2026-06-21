'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface IssPass {
  city: string;
  starts_at: string;
  duration_min: number;
  max_elevation_deg: number;
  appears_dir: string;
  disappears_dir: string;
}

interface IssResponse {
  items: IssPass[];
  total: number;
  source: string;
  fetched_at: string;
}

/**
 * NASA Spot the Station — Türkiye 5 büyük şehir için ISS gece geçişleri.
 */
export function useIssPasses(limit = 8) {
  return useQuery({
    queryKey: ['iss-passes-tr', limit],
    queryFn: () =>
      api.get<IssResponse>(`/api/v1/iss/passes-tr?limit=${limit}`),
    // NASA günde bir kez güncelliyor; agresif cache
    staleTime: 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
    retry: 1,
  });
}

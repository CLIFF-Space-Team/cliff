'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface EonetGeometry {
  date: string;
  type: string;
  coordinates: number[];
}

export interface EonetCategory {
  id: string;
  title: string;
}

export interface EonetEvent {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  categories: EonetCategory[];
  geometry: EonetGeometry[];
}

interface EonetResponse {
  title: string;
  description: string;
  link: string;
  events: EonetEvent[];
}

export function useEarthEvents(days = 30, status: 'open' | 'closed' | 'all' = 'open') {
  return useQuery({
    queryKey: queryKeys.nasa.eonet(days, status),
    queryFn: () =>
      api.get<EonetResponse>(`/api/v1/nasa/eonet/events?days=${days}&status=${status}&limit=120`),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

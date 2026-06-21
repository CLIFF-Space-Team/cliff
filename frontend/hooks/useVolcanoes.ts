'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export interface Volcano {
  title: string;
  volcano_name: string;
  country: string;
  summary: string;
  link: string;
  published_at: number;
}

export interface VolcanoesResponse {
  items: Volcano[];
  total: number;
  source: string;
  fetched_at: string;
}

export function useVolcanoes() {
  return useQuery({
    queryKey: queryKeys.earth.volcanoes(),
    queryFn: () =>
      api.get<VolcanoesResponse>('/api/v1/earth/volcanoes?limit=50'),
    // Smithsonian feed updates weekly; cache an hour aggressively.
    staleTime: 60 * 60 * 1000,
    refetchInterval: 6 * 60 * 60 * 1000,
  });
}

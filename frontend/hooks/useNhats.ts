'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface NhatsTarget {
  des: string;
  fullname?: string;
  min_dv?: { dv: number; dur: number; stay: number; launch: string };
  n_via_traj?: number;
  obs_start?: string;
  obs_end?: string;
  occ?: number;
  size?: number;
}

interface NhatsResponse {
  count?: number;
  data: NhatsTarget[];
}

export function useNhats() {
  return useQuery({
    queryKey: ['nhats'],
    queryFn: () => api.get<NhatsResponse>('/api/v1/nasa/nhats'),
    staleTime: 60 * 60 * 1000,
  });
}

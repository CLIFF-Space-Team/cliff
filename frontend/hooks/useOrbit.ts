'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface OrbitElements {
  a_au: number;
  e: number;
  i_deg: number;
  omega_deg: number;
  arg_peri_deg: number;
  M0_deg: number;
  epoch_jd: number;
  period_days: number | null;
}

export interface OrbitResponse {
  neo_id: string;
  elements: OrbitElements;
  /** Cartesian heliocentric ecliptic points in AU. First and last coincide. */
  points_au: [number, number, number][];
}

export interface OrbitState {
  neo_id: string;
  jd: number;
  r_au: [number, number, number];
  v_au_per_day: [number, number, number];
}

export function useOrbit(neoId: string | null) {
  return useQuery({
    queryKey: ['orbit', neoId, 'keplerian'],
    queryFn: () =>
      api.get<OrbitResponse>(`/api/v1/orbit/${neoId}/keplerian?points=256`),
    enabled: !!neoId,
    staleTime: 60 * 60 * 1000, // orbital elements rarely change
  });
}

export function useOrbitState(neoId: string | null) {
  return useQuery({
    queryKey: ['orbit', neoId, 'state'],
    queryFn: () => api.get<OrbitState>(`/api/v1/orbit/${neoId}/state`),
    enabled: !!neoId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

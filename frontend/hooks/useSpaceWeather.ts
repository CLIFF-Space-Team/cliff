'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface KpReading {
  available: boolean;
  kp?: number;
  label?: string;
  time_tag?: string;
  storm?: boolean;
}

export interface XrayReading {
  available: boolean;
  current_flux_wm2?: number;
  current_class?: string | null;
  current_time_tag?: string;
  peak_24h?: {
    flux_wm2: number;
    class: string;
    time_tag: string;
  } | null;
}

export interface SolarWindReading {
  available: boolean;
  speed_kms?: number | null;
  density_pcm3?: number | null;
  temperature_k?: number | null;
  bz_nt?: number | null;
  bt_nt?: number | null;
}

export interface SpaceWeatherSummary {
  kp: KpReading;
  xray: XrayReading;
  solar_wind: SolarWindReading;
}

export function useSpaceWeather() {
  return useQuery({
    queryKey: ['space-weather', 'summary'],
    queryFn: () => api.get<SpaceWeatherSummary>('/api/v1/space-weather/summary'),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
}

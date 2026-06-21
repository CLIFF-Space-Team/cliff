'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

export interface HistoricalEvent {
  month: number;
  day: number;
  year: number;
  title_tr: string;
  title_en: string;
  summary_tr: string;
  summary_en: string;
  category: 'impact' | 'airburst' | 'discovery' | 'mission' | 'flyby' | 'milestone';
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
}

interface HistoryTodayResponse {
  month: number;
  day: number;
  is_today: boolean;
  events: HistoricalEvent[];
}

export function useHistoryToday() {
  return useQuery({
    queryKey: ['history-today'],
    queryFn: () => api.get<HistoryTodayResponse>('/api/v1/earth/history-today'),
    staleTime: 60 * 60 * 1000, // hourly is plenty for an "on this day" widget
    refetchInterval: 6 * 60 * 60 * 1000,
  });
}

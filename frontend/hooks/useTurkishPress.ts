'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';

/**
 * Türkçe basın aggregator (TÜBİTAK Bilim Genç + AA + TRT + NASA RSS).
 *
 * Backend birleştirip filtrelediği için frontend sadece tüketir.
 * Boş dönerse `/turkiye` sayfası manuel `TURKISH_PRESS` listesine fallback.
 */
export interface PressArticle {
  id: string;
  date: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
}

interface PressResponse {
  items: PressArticle[];
  total: number;
  days: number;
  fetched_at: string;
}

export function useTurkishPress(days = 30, limit = 24) {
  return useQuery({
    queryKey: ['turkish-press', days, limit],
    queryFn: () =>
      api.get<PressResponse>(
        `/api/v1/earth/turkish-press?days=${days}&limit=${limit}`,
      ),
    staleTime: 30 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
  });
}

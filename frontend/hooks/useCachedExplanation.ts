'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, api } from '@/lib/api-client';

export interface CachedExplanationCitation {
  url: string;
  title: string;
}

export interface CachedExplanation {
  neo_id: string;
  text: string;
  citations: CachedExplanationCitation[];
  language: string;
  model: string;
  searched: boolean;
  fallback: boolean;
  generated_at: number; // unix seconds
  cached: boolean;
}

const explanationKey = (neoId: string) =>
  ['threats', 'explanation', neoId] as const;

/**
 * Read the *shared* AI explanation for a NEO. The first visitor on a NEO
 * gets a 404 (cache miss) and the UI prompts them to hit "Açıkla", which
 * fires `useGenerateExplanation()`. Every subsequent visitor lands on the
 * already-cached copy — no extra Grok call.
 */
export function useCachedExplanation(neoId: string | null | undefined) {
  return useQuery({
    queryKey: explanationKey(neoId ?? ''),
    enabled: !!neoId,
    queryFn: async (): Promise<CachedExplanation | null> => {
      if (!neoId) return null;
      try {
        return await api.get<CachedExplanation>(
          `/api/v1/threats/risk/${encodeURIComponent(neoId)}/explanation`,
        );
      } catch (err) {
        // 404 is the expected "not yet generated" state — surface it as
        // null so the consumer can render the empty CTA.
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },
    // Treat the cache as fresh for 5 minutes; after that React Query refetches
    // on focus so a regenerated copy from another tab/user is picked up.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/**
 * Generate (or regenerate) the cached explanation. Writes to Redis on the
 * server; mutating the cache here means the React Query cache for every
 * subscriber on the same NEO key updates instantly without a refetch.
 */
export function useGenerateExplanation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      neoId: string;
      language?: 'tr' | 'en';
      withSearch?: boolean;
    }) => {
      return api.post<CachedExplanation>(
        `/api/v1/threats/risk/${encodeURIComponent(input.neoId)}/explanation`,
        {
          language: input.language ?? 'tr',
          with_search: input.withSearch ?? true,
        },
      );
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CachedExplanation>(
        explanationKey(variables.neoId),
        data,
      );
    },
  });
}

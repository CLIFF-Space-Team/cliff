'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

import { ApiError } from '@/lib/api-client';

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        // Tab a geri dönünce stale query'leri tazele — backend reload olduysa
        // kullanıcı manuel "Yenile"ye basmadan veriler kendiliğinden güncellenir.
        refetchOnWindowFocus: true,
        // Network kesilip dönünce de refetch tetikle (WebSocketProvider ek
        // olarak WS reconnect'te `invalidateQueries()` çağırıyor — ikisi
        // birlikte stuck-error state'lerden tam recovery garantiler).
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          // Allow more retries on 5xx / network errors so a backend reload
          // doesn't lock a query into "isError" after a brief outage.
          return failureCount < 4;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(makeClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      ) : null}
    </QueryClientProvider>
  );
}

'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

interface QueryProviderProps {
  children: React.ReactNode
}

// Create a client with optimized settings for CLIFF
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time for different types of data
        staleTime: 5 * 60 * 1000, // 5 minutes default
        // Refetch on window focus for real-time data
        refetchOnWindowFocus: true,
        // Retry failed requests
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Network mode for handling offline scenarios
        networkMode: 'offlineFirst'
      },
      mutations: {
        // Global error handling for mutations
        onError: (error) => {
          console.error('Mutation error:', error)
        },
        // Retry mutations once
        retry: 1,
        networkMode: 'offlineFirst'
      }
    }
  })
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create client inside component to avoid SSR issues
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}

// Custom hooks for CLIFF data fetching

// Base API configuration - API çağrıları devre dışı
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'
const DISABLE_API_CALLS = true // API çağrılarını devre dışı bırak

const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  // API çağrıları devre dışı - mock veri döndür
  if (DISABLE_API_CALLS) {
    console.log(`🚫 API çağrısı engellendi: ${endpoint}`)
    // Mock veri döndür
    return Promise.resolve({
      asteroids: [],
      threats: [],
      message: 'API çağrıları devre dışı - mock veri modu'
    })
  }
  
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  return response.json()
}

// Threat data queries
export const useThreatSummaryQuery = () => {
  return useQuery({
    queryKey: ['threat-summary'],
    queryFn: () => fetchWithAuth('/api/v1/threats/summary'),
    staleTime: 2 * 60 * 1000, // 2 minutes - threats need fresh data
    refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  })
}

export const useAsteroidThreatsQuery = (limit: number = 50) => {
  return useQuery({
    queryKey: ['asteroid-threats', limit],
    queryFn: () => fetchWithAuth(`/api/v1/threats/asteroids?limit=${limit}`),
    staleTime: 10 * 60 * 1000, // 10 minutes - asteroid data doesn't change as quickly
    refetchInterval: 10 * 60 * 1000,
  })
}

export const useSpaceWeatherQuery = () => {
  return useQuery({
    queryKey: ['space-weather'],
    queryFn: () => fetchWithAuth('/api/v1/threats/space-weather'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  })
}

export const useEarthEventsQuery = () => {
  return useQuery({
    queryKey: ['earth-events'],
    queryFn: () => fetchWithAuth('/api/v1/threats/earth-events'),
    staleTime: 15 * 60 * 1000, // 15 minutes - earth events change slower
    refetchInterval: 15 * 60 * 1000,
  })
}

// Individual threat query
export const useThreatQuery = (threatId: string) => {
  return useQuery({
    queryKey: ['threat', threatId],
    queryFn: () => fetchWithAuth(`/api/v1/threats/${threatId}`),
    enabled: !!threatId,
    staleTime: 5 * 60 * 1000,
  })
}

// NASA data queries
export const useNasaDataQuery = (endpoint: string, params: Record<string, any> = {}) => {
  const queryParams = new URLSearchParams(params).toString()
  const url = `/api/v1/nasa/${endpoint}${queryParams ? `?${queryParams}` : ''}`
  
  return useQuery({
    queryKey: ['nasa-data', endpoint, params],
    queryFn: () => fetchWithAuth(url),
    staleTime: 30 * 60 * 1000, // 30 minutes - NASA data is relatively stable
    refetchInterval: false, // Don't auto-refetch unless explicitly needed
  })
}

// System status query
export const useSystemStatusQuery = () => {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: () => fetchWithAuth('/api/v1/system/status'),
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Check every 2 minutes
  })
}

// Voice interface queries
export const useVoiceModelsQuery = () => {
  return useQuery({
    queryKey: ['voice-models'],
    queryFn: () => fetchWithAuth('/api/v1/voice/models'),
    staleTime: 60 * 60 * 1000, // 1 hour - models don't change frequently
  })
}

// AI analysis mutations
export const useAnalyzeThreatMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (threatData: any) => 
      fetchWithAuth('/api/v1/ai/analyze-threat', {
        method: 'POST',
        body: JSON.stringify(threatData),
      }),
    onSuccess: () => {
      // Invalidate and refetch threat data
      queryClient.invalidateQueries({ queryKey: ['threat-summary'] })
      queryClient.invalidateQueries({ queryKey: ['asteroid-threats'] })
    },
  })
}

export const useVoiceCommandMutation = () => {
  return useMutation({
    mutationFn: (commandData: { command: string; language?: string }) =>
      fetchWithAuth('/api/v1/voice/command', {
        method: 'POST',
        body: JSON.stringify(commandData),
      }),
  })
}

export const useRefreshDataMutation = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (dataType?: string) => 
      fetchWithAuth('/api/v1/system/refresh', {
        method: 'POST',
        body: JSON.stringify({ data_type: dataType }),
      }),
    onSuccess: () => {
      // Invalidate all queries to force fresh data
      queryClient.invalidateQueries()
    },
  })
}

// Custom hooks for optimistic updates
export const useOptimisticThreatUpdate = () => {
  const queryClient = useQueryClient()
  
  const updateThreat = (threatId: string, updates: Partial<any>) => {
    // Optimistically update the cache
    queryClient.setQueryData(['threat', threatId], (old: any) => ({
      ...old,
      ...updates,
      updated_at: new Date().toISOString()
    }))
    
    // Also update summary if needed
    queryClient.setQueryData(['threat-summary'], (old: any) => {
      if (!old) return old
      
      // Update relevant counts/statistics
      return {
        ...old,
        last_updated: new Date().toISOString()
      }
    })
  }
  
  return { updateThreat }
}

// Prefetch utilities
export const usePrefetchThreatData = () => {
  const queryClient = useQueryClient()
  
  const prefetchThreat = (threatId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['threat', threatId],
      queryFn: () => fetchWithAuth(`/api/v1/threats/${threatId}`),
      staleTime: 5 * 60 * 1000,
    })
  }
  
  const prefetchAsteroidData = () => {
    queryClient.prefetchQuery({
      queryKey: ['asteroid-threats'],
      queryFn: () => fetchWithAuth('/api/v1/threats/asteroids'),
      staleTime: 10 * 60 * 1000,
    })
  }
  
  return { prefetchThreat, prefetchAsteroidData }
}

// Background sync hook
export const useBackgroundSync = () => {
  const queryClient = useQueryClient()
  
  React.useEffect(() => {
    const handleFocus = () => {
      // Refetch critical data when window regains focus
      queryClient.refetchQueries({ 
        queryKey: ['threat-summary'],
        type: 'active' 
      })
    }
    
    const handleOnline = () => {
      // Refetch all data when coming back online
      queryClient.refetchQueries({ 
        type: 'active' 
      })
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [queryClient])
}

// Cache management utilities
export const useCacheManagement = () => {
  const queryClient = useQueryClient()
  
  const clearCache = () => {
    queryClient.clear()
  }
  
  const invalidateAll = () => {
    queryClient.invalidateQueries()
  }
  
  const getCacheSize = () => {
    const cache = queryClient.getQueryCache()
    return cache.getAll().length
  }
  
  const getCacheStats = () => {
    const cache = queryClient.getQueryCache()
    const queries = cache.getAll()
    
    return {
      total: queries.length,
      fresh: queries.filter(q => q.isStale() === false).length,
      stale: queries.filter(q => q.isStale() === true).length,
      error: queries.filter(q => q.state.status === 'error').length,
    }
  }
  
  return {
    clearCache,
    invalidateAll,
    getCacheSize,
    getCacheStats
  }
}

// Error boundary hook for React Query errors
export const useQueryErrorHandler = () => {
  return {
    onError: (error: Error, query: any) => {
      console.error('Query error:', error, query)
      
      // You could integrate with error tracking service here
      // e.g., Sentry, LogRocket, etc.
      
      // Show user-friendly error message
      if (error.message.includes('Network')) {
        // Handle network errors
        console.warn('Network error detected, some features may be limited')
      } else if (error.message.includes('401')) {
        // Handle authentication errors
        console.warn('Authentication error, please check your connection')
      }
    }
  }
}

export default QueryProvider

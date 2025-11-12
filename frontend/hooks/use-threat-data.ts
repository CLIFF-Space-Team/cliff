'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
interface ThreatLevel {
  overall_threat_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  risk_score: number
  active_threats_count: number
  last_updated: string
  data_sources: string[]
  confidence_score: number
}
interface ThreatDetail {
  threat_id: string
  threat_type: string
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  impact_probability: number
  time_to_impact?: string
  recommended_actions: string[]
  data_source: string
  coordinates?: { lat: number; lng: number }
  ai_analysis?: Record<string, any>
}
interface ComprehensiveAssessment {
  timestamp: string
  overall_risk: ThreatLevel
  active_threats: ThreatDetail[]
  threat_categories: Record<string, number>
  geographic_hotspots: Array<{
    region: string
    threat_count: number
    primary_threat_types: string[]
    risk_level: string
  }>
  recommendations: string[]
  next_assessment: string
}
interface ThreatAlert {
  alert_id: string
  alert_level: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  threat_details: ThreatDetail
  created_at: string
  expires_at?: string
}
interface ThreatsData {
  asteroid_count: number
  potentially_hazardous_asteroids: number
  active_earth_events: number
  space_weather_status: string
  exoplanets_discovered: number
  last_data_update: string
}
interface UseThreatDataOptions {
  apiUrl?: string
  refreshInterval?: number
  autoRefresh?: boolean
  cacheTimeout?: number
}
interface UseThreatDataReturn {
  threatLevel: ThreatLevel | null
  threatsData: ThreatsData | null
  comprehensiveAssessment: ComprehensiveAssessment | null
  activeAlerts: ThreatAlert[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastError: Error | null
  refreshThreats: () => Promise<void>
  getComprehensiveAssessment: () => Promise<void>
  predictThreatEvolution: (threatType: string, days: number) => Promise<any>
  assessCustomThreat: (threatData: any, threatType: string) => Promise<any>
  lastRefresh: Date | null
  nextRefresh: Date | null
  cacheHitRate: number
}
export function useThreatData({
  apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  refreshInterval = 30000, // 30 seconds
  autoRefresh = false, // Geçici olarak kapatıldı
  cacheTimeout = 60000, // 1 minute
}: UseThreatDataOptions = {}): UseThreatDataReturn {
  const [threatLevel, setThreatLevel] = useState<ThreatLevel | null>(null)
  const [threatsData, setThreatsData] = useState<ThreatsData | null>(null)
  const [comprehensiveAssessment, setComprehensiveAssessment] = useState<ComprehensiveAssessment | null>(null)
  const [activeAlerts, setActiveAlerts] = useState<ThreatAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastError, setLastError] = useState<Error | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null)
  const [cacheHits, setCacheHits] = useState(0)
  const [totalRequests, setTotalRequests] = useState(0)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const cache = useRef<Map<string, { data: any; timestamp: number }>>(new Map())
  const getCachedData = useCallback((key: string) => {
    const cached = cache.current.get(key)
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      setCacheHits(prev => prev + 1)
      return cached.data
    }
    return null
  }, [cacheTimeout])
  const setCachedData = useCallback((key: string, data: any) => {
    cache.current.set(key, { data, timestamp: Date.now() })
  }, [])
  const apiRequest = useCallback(async <T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> => {
    const url = `${apiUrl}${endpoint}`
    setTotalRequests(prev => prev + 1)
    const cachedData = getCachedData(url)
    if (cachedData) {
      return cachedData
    }
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortController.current.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setCachedData(url, data)
      return data
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('Request was aborted')
          throw err
        }
        console.error('API request error:', err)
        setLastError(err)
        throw err
      }
      throw new Error('Unknown API error')
    }
  }, [apiUrl, getCachedData, setCachedData])
  const fetchThreatLevel = useCallback(async () => {
    try {
      const data = await apiRequest<ThreatLevel>('/v1/threats/current')
      setThreatLevel(data)
      setThreatsData(prev => prev ? {
        ...prev,
        last_data_update: data.last_updated,
      } : {
        asteroid_count: 0,
        potentially_hazardous_asteroids: data.active_threats_count,
        active_earth_events: 0,
        space_weather_status: 'NOMINAL',
        exoplanets_discovered: 0,
        last_data_update: data.last_updated,
      })
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch threat level:', err)
        setError('Failed to fetch current threat level')
      }
    }
  }, [apiRequest])
  const fetchActiveAlerts = useCallback(async () => {
    try {
      const data = await apiRequest<ThreatAlert[]>('/v1/threats/alerts')
      setActiveAlerts(data)
      data.forEach(alert => {
        if (alert.alert_level === 'CRITICAL' && 
            !activeAlerts.some(existing => existing.alert_id === alert.alert_id)) {
          toast.error(`🚨 CRITICAL ALERT: ${alert.message}`, {
            duration: 10000,
          })
        }
      })
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch alerts:', err)
      }
    }
  }, [apiRequest, activeAlerts])
  const refreshThreats = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      await Promise.all([
        fetchThreatLevel(),
        fetchActiveAlerts(),
      ])
      setLastRefresh(new Date())
      setNextRefresh(new Date(Date.now() + refreshInterval))
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMessage = err.message || 'Failed to refresh threat data'
        setError(errorMessage)
        toast.error('Failed to update threat data', {
          description: errorMessage,
          duration: 5000,
        })
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [fetchThreatLevel, fetchActiveAlerts, refreshInterval])
  const getComprehensiveAssessment = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const data = await apiRequest<ComprehensiveAssessment>('/v1/threats/comprehensive')
      setComprehensiveAssessment(data)
      setThreatLevel(data.overall_risk)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to fetch comprehensive assessment:', err)
        setError('Failed to fetch comprehensive threat assessment')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [apiRequest])
  const predictThreatEvolution = useCallback(async (
    threatType: string, 
    days: number = 7
  ) => {
    try {
      const data = await apiRequest(
        `/v1/threats/predict/${threatType}?days_ahead=${days}`
      )
      toast.success(`Generated ${days}-day prediction for ${threatType} threats`)
      return data
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to predict threat evolution:', err)
        toast.error('Failed to generate threat prediction')
        throw err
      }
    }
  }, [apiRequest])
  const assessCustomThreat = useCallback(async (
    threatData: any,
    threatType: string,
    urgency: string = 'normal'
  ) => {
    try {
      const data = await apiRequest('/v1/threats/assess-custom', {
        method: 'POST',
        body: JSON.stringify({
          threat_data: threatData,
          threat_type: threatType,
          urgency,
        }),
      })
      toast.success('Custom threat assessment completed')
      return data
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Failed to assess custom threat:', err)
        toast.error('Failed to assess custom threat')
        throw err
      }
    }
  }, [apiRequest])
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        if (!isRefreshing) {
          refreshThreats()
        }
      }, refreshInterval)
      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, isRefreshing, refreshThreats])
  useEffect(() => {
    refreshThreats()
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [])
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isRefreshing) {
        const timeSinceLastRefresh = lastRefresh 
          ? Date.now() - lastRefresh.getTime()
          : Infinity
        if (timeSinceLastRefresh > refreshInterval) {
          refreshThreats()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [refreshInterval, lastRefresh, isRefreshing, refreshThreats])
  useEffect(() => {
    const handleOnline = () => {
      if (!isRefreshing) {
        refreshThreats()
      }
    }
    const handleOffline = () => {
      setError('No internet connection - threat data may be outdated')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isRefreshing, refreshThreats])
  const cacheHitRate = useMemo(() => {
    return totalRequests > 0 ? cacheHits / totalRequests : 0
  }, [cacheHits, totalRequests])
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, value] of cache.current.entries()) {
        if (now - value.timestamp > cacheTimeout) {
          cache.current.delete(key)
        }
      }
    }, cacheTimeout)
    return () => clearInterval(cleanupInterval)
  }, [cacheTimeout])
  const returnValue = useMemo((): UseThreatDataReturn => ({
    threatLevel,
    threatsData,
    comprehensiveAssessment,
    activeAlerts,
    isLoading,
    isRefreshing,
    error,
    lastError,
    refreshThreats,
    getComprehensiveAssessment,
    predictThreatEvolution,
    assessCustomThreat,
    lastRefresh,
    nextRefresh,
    cacheHitRate,
  }), [
    threatLevel,
    threatsData,
    comprehensiveAssessment,
    activeAlerts,
    isLoading,
    isRefreshing,
    error,
    lastError,
    refreshThreats,
    getComprehensiveAssessment,
    predictThreatEvolution,
    assessCustomThreat,
    lastRefresh,
    nextRefresh,
    cacheHitRate,
  ])
  return returnValue
}
export default useThreatData

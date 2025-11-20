'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  fetchEphemeris,
  fetchFuturePositions,
  fetchUncertainty,
  fetchHybridAnalysis,
  HybridAnalysis,
  EphemerisResponse,
  UncertaintyHint
} from '@/lib/api/horizons'

interface UseHorizonsDataOptions {
  objectId: string
  days?: number
  autoFetch?: boolean
  enableHybridAnalysis?: boolean
}

interface UseHorizonsDataReturn {
  ephemeris: EphemerisResponse | null
  uncertainty: UncertaintyHint | null
  hybridAnalysis: HybridAnalysis | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  fetchHybrid: () => Promise<void>
}

export function useHorizonsData({
  objectId,
  days = 30,
  autoFetch = true,
  enableHybridAnalysis = false
}: UseHorizonsDataOptions): UseHorizonsDataReturn {
  const [ephemeris, setEphemeris] = useState<EphemerisResponse | null>(null)
  const [uncertainty, setUncertainty] = useState<UncertaintyHint | null>(null)
  const [hybridAnalysis, setHybridAnalysis] = useState<HybridAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!objectId) {
      setError('Object ID gerekli')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log(`🛰️ Horizons data fetching for ${objectId}...`)

      const futurePos = await fetchFuturePositions(objectId, days)
      setEphemeris(futurePos)

      try {
        const unc = await fetchUncertainty(objectId, days)
        setUncertainty(unc)
      } catch (uncError) {
        console.warn('⚠️ Uncertainty fetch failed:', uncError)
      }

      console.log(`✅ Horizons data loaded: ${futurePos.count} positions`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Horizons data yüklenemedi'
      console.error('❌ Horizons data error:', err)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [objectId, days])

  const fetchHybrid = useCallback(async () => {
    if (!objectId) {
      setError('Object ID gerekli')
      return
    }

    setIsLoading(true)

    try {
      console.log(`🤖 Hybrid analysis fetching for ${objectId}...`)
      const hybrid = await fetchHybridAnalysis(objectId, days)
      
      if (hybrid.success) {
        setHybridAnalysis(hybrid)
        console.log(`✅ Hybrid analysis: ${hybrid.ml_risk?.label} risk`)
      } else {
        throw new Error(hybrid.error || 'Hybrid analysis failed')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Hybrid analysis başarısız'
      console.error('❌ Hybrid analysis error:', err)
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [objectId, days])

  useEffect(() => {
    if (autoFetch) {
      refresh()
      
      if (enableHybridAnalysis) {
        const timer = setTimeout(() => {
          fetchHybrid()
        }, 1000)
        return () => clearTimeout(timer)
      }
    }
  }, [autoFetch, enableHybridAnalysis, refresh, fetchHybrid])

  return {
    ephemeris,
    uncertainty,
    hybridAnalysis,
    isLoading,
    error,
    refresh,
    fetchHybrid
  }
}

export default useHorizonsData

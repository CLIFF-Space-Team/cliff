'use client'
import { useEffect, useState } from 'react'
export interface RiskOverview {
  updatedAt: string
  counters: Record<'critical' | 'high' | 'medium' | 'low' | 'none', number>
}
export function useNeoThreatOverview(apiBase: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
  const [data, setData] = useState<RiskOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${apiBase}/api/v1/asteroids/overview`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Hata')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [apiBase])
  return { data, loading, error }
}

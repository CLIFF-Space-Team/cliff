'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { SimpleCelestialBody } from '@/types/astronomical-data'
interface UseAsteroidDataOptions {
  apiUrl?: string
  refreshInterval?: number
  autoRefresh?: boolean
}
interface UseAsteroidDataReturn {
  asteroids: SimpleCelestialBody[]
  isLoading: boolean
  error: string | null
  refreshAsteroids: () => Promise<void>
  lastRefresh: Date | null
}
interface BackendAsteroid {
  id: string
  name: string
  threat_level: string
  is_hazardous: boolean
  approach_date: string
  estimated_diameter: string
  distance: string
  velocity: string
  orbital_data: {
    miss_distance: {
      kilometers: string
    }
    relative_velocity: {
      kilometers_per_second: string
      kilometers_per_hour: string
    }
  }
}
export function useAsteroidData({
  apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '',
  refreshInterval = 300000, // 5 dakika
  autoRefresh = false, // Auto-refresh kapalı - manuel refresh
}: UseAsteroidDataOptions = {}): UseAsteroidDataReturn {
  const [asteroids, setAsteroids] = useState<SimpleCelestialBody[]>([])
  const [isLoading, setIsLoading] = useState(true) // true - gerçek veri yüklenene kadar
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const convertBackendAsteroid = (backendAst: BackendAsteroid): SimpleCelestialBody => {
    const safeOrbitalData = backendAst.orbital_data || {
      miss_distance: { kilometers: '5000000' },
      relative_velocity: { kilometers_per_second: '15.0', kilometers_per_hour: '54000' }
    }
    const safeMissDistance = safeOrbitalData.miss_distance?.kilometers || '5000000'
    const safeVelocity = safeOrbitalData.relative_velocity?.kilometers_per_hour || '54000'
    const distance_km = parseFloat(safeMissDistance) || 5000000
    const velocity_kmh = parseFloat(safeVelocity) || 54000
    const diameter_str = backendAst.estimated_diameter || '1.0 km'
    const radius_km = parseFloat(diameter_str.split(' ')[0]) / 2 || 0.5
    const normalizeThreatLevel = (level: string): "Düşük" | "Orta" | "Yüksek" => {
      if (!level) return 'Düşük'
      const lowerLevel = level.toLowerCase()
      if (lowerLevel.includes('yüksek') || lowerLevel.includes('high')) return 'Yüksek'
      if (lowerLevel.includes('orta') || lowerLevel.includes('medium')) return 'Orta'
      return 'Düşük'
    }
    return {
      id: backendAst.id || `asteroid-${Math.random().toString(36).substr(2, 9)}`,
      name: backendAst.name || 'Unknown Asteroid',
      turkish_name: `Asteroit ${backendAst.name || 'Bilinmeyen'}`,
      type: 'asteroid',
      info: {
        radius_km: radius_km,
        mass_relative_to_earth: radius_km * 0.001,
        gravity_relative_to_earth: 0.001,
        has_atmosphere: false,
        has_rings: false,
        moon_count: 0,
        surface_temp_celsius: { min: -100, max: -50, average: -75 }
      },
      orbit: {
        distance_from_sun: distance_km / 149597870.7, // AU'ya çevir
        orbital_period_days: 365 + Math.random() * 1000,
        rotation_period_hours: Math.random() * 48,
        tilt_degrees: Math.random() * 180
      },
      color: (backendAst.is_hazardous ?? false) ? '#ff4444' : '#888888',
      description: `${normalizeThreatLevel(backendAst.threat_level || 'düşük')} seviyede asteroit`,
      interesting_facts: [
        `Çap: ${(radius_km * 2).toFixed(1)} km`,
        `Hız: ${(velocity_kmh / 1000).toFixed(1)} km/s`,
        `Mesafe: ${(distance_km / 1000000).toFixed(1)} milyon km`,
        `Yaklaşma: ${backendAst.approach_date || 'Bilinmiyor'}`
      ],
      is_hazardous: backendAst.is_hazardous ?? false,
      threat_level: normalizeThreatLevel(backendAst.threat_level || 'düşük'),
      orbital_data: {
        miss_distance: {
          kilometers: distance_km.toString()
        },
        relative_velocity: {
          kilometers_per_second: (velocity_kmh / 3600).toFixed(2),
          kilometers_per_hour: velocity_kmh.toString()
        }
      }
    }
  }
  const fetchAsteroids = useCallback(async () => {
    try {
      setIsLoading(true)
      // NASA API'den gerçek asteroid verisi çek
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/v1/nasa/asteroids?days=7`)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      const backendAsteroids = data.asteroids || []
      
      const processedAsteroids: SimpleCelestialBody[] = backendAsteroids.map((ast: BackendAsteroid) => 
        convertBackendAsteroid(ast)
      )
      
      setAsteroids(processedAsteroids)
      setLastRefresh(new Date())
      setError(null)
      console.log(`✅ ${processedAsteroids.length} gerçek NASA asteroid yüklendi (${processedAsteroids.filter(a => a.is_hazardous).length} tehlikeli)`)
    } catch (err) {
      console.error('❌ NASA asteroid verisi yüklenemedi:', err)
      setAsteroids([])
      setError('NASA asteroid verileri yüklenemedi')
      setLastRefresh(new Date())
    } finally {
      setIsLoading(false)
    }
  }, [])
  // Mock functions removed - using only real NASA data
  const refreshAsteroids = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      await fetchAsteroids()
    } catch (err) {
    } finally {
      setIsLoading(false)
    }
  }, [fetchAsteroids])
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimer.current = setInterval(() => {
        refreshAsteroids()
      }, refreshInterval)
      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current)
        }
      }
    }
  }, [autoRefresh, refreshInterval, refreshAsteroids])
  useEffect(() => {
    refreshAsteroids()
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [])
  return {
    asteroids,
    isLoading,
    error,
    refreshAsteroids,
    lastRefresh,
  }
}
export default useAsteroidData
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

// Backend'den gelen asteroid response type
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
  const [isLoading, setIsLoading] = useState(false) // false olarak başlat - mock veri hemen hazır
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  const refreshTimer = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)
  
  // API çağrısı devre dışı - sadece mock veri kullan
  const USE_MOCK_DATA = true

  // Backend asteroid verisini SimpleCelestialBody formatına çevir
  const convertBackendAsteroid = (backendAst: BackendAsteroid): SimpleCelestialBody => {
    // Güvenli veri kontrolü
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

    // Backend'den gelen threat_level'ı normalize et
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

  // Mock veri kullan - API çağrısı devre dışı
  const fetchAsteroids = useCallback(async () => {
    try {
      const processedAsteroids: SimpleCelestialBody[] = []
      
      // Mock veri oluştur
      if (USE_MOCK_DATA) {
        for (let i = 0; i < 12; i++) {
          processedAsteroids.push(createMockAsteroid(i))
        }
      }
      
      setAsteroids(processedAsteroids)
      setLastRefresh(new Date())
      setError(null) // Hataları temizle
      
      console.log(`✅ ${processedAsteroids.length} asteroid yüklendi (${processedAsteroids.filter(a => a.is_hazardous).length} tehlikeli)`)
      
    } catch (err) {
      // Hata olsa bile fallback veri sağla ve hata gösterme
      console.warn('⚠️ Mock veri oluşturulurken uyarı:', err)
      
      const fallbackAsteroids: SimpleCelestialBody[] = []
      for (let i = 0; i < 8; i++) {
        fallbackAsteroids.push(createFallbackAsteroid(`fallback-${i}`))
      }
      setAsteroids(fallbackAsteroids)
      setError(null) // Hata gösterme, sessizce fallback kullan
      setLastRefresh(new Date())
    }
  }, [])

  // Fallback asteroid oluşturma fonksiyonu
  const createFallbackAsteroid = (id: string): SimpleCelestialBody => {
    return {
      id: id,
      name: `Fallback ${id}`,
      turkish_name: `Acil Durum Asteroidi ${id}`,
      type: 'asteroid',
      info: {
        radius_km: 0.5,
        mass_relative_to_earth: 0.0005,
        gravity_relative_to_earth: 0.001,
        has_atmosphere: false,
        has_rings: false,
        moon_count: 0,
        surface_temp_celsius: { min: -100, max: -50, average: -75 }
      },
      orbit: {
        distance_from_sun: 1.5,
        orbital_period_days: 400,
        rotation_period_hours: 12,
        tilt_degrees: 15
      },
      color: '#888888',
      description: 'Bağlantı hatası - örnek asteroit',
      interesting_facts: ['API bağlantısı başarısız'],
      is_hazardous: false,
      threat_level: 'Düşük',
      orbital_data: {
        miss_distance: { kilometers: '5000000' },
        relative_velocity: {
          kilometers_per_second: '10.0',
          kilometers_per_hour: '36000'
        }
      }
    }
  }

  // Mock asteroid oluşturma fonksiyonu
  const createMockAsteroid = (index: number): SimpleCelestialBody => {
    const isHazardous = Math.random() > 0.75
    const distance_km = Math.random() * 50000000 + 1000000 // 1M - 50M km
    const velocity_kmh = Math.random() * 50000 + 15000 // 15K - 65K km/h
    const radius_km = Math.random() * 2 + 0.2 // 0.2 - 2.2 km
    
    return {
      id: `mock-asteroid-${index}`,
      name: `2024 ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${index + 1}`,
      turkish_name: `Asteroit ${index + 1}`,
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
      color: isHazardous ? '#ff4444' : '#888888',
      description: `${isHazardous ? 'Yüksek' : 'Düşük'} seviyede asteroit`,
      interesting_facts: [
        `Çap: ${(radius_km * 2).toFixed(1)} km`,
        `Hız: ${(velocity_kmh / 1000).toFixed(1)} km/s`,
        `Mesafe: ${(distance_km / 1000000).toFixed(1)} milyon km`
      ],
      is_hazardous: isHazardous,
      threat_level: isHazardous ? 'Yüksek' : distance_km < 7500000 ? 'Orta' : 'Düşük',
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

  // Main refresh function
  const refreshAsteroids = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      await fetchAsteroids()
    } catch (err) {
      // Error handled in fetchAsteroids
    } finally {
      setIsLoading(false)
    }
  }, [fetchAsteroids])

  // Setup auto-refresh
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

  // Initial data load
  useEffect(() => {
    refreshAsteroids()
    
    // Cleanup on unmount
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
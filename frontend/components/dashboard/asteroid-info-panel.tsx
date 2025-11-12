'use client'
import React, { useState, useMemo, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui'
import { ThreatLevelBadge, DataSourceBadge } from '@/components/ui/specialized-cards'
import { useAsteroidData } from '@/hooks/use-asteroid-data'
import AsteroidProfileCard from './compact-ai-visual-widget'
import {
  Satellite,
  MapPin,
  Gauge,
  Clock,
  Target,
  ArrowRight,
  Zap,
  Globe,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Ruler,
  Calendar
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
interface AsteroidInfoPanelProps {
  className?: string
  maxItems?: number
  showFilters?: boolean
  autoRefresh?: boolean
}
const AsteroidInfoItem = memo(function AsteroidInfoItem({
  asteroid,
  onViewDetails,
  isSelected = false,
}: {
  asteroid: any
  onViewDetails: (asteroid: any) => void
  isSelected?: boolean
}) {
  const handleViewDetails = useCallback(() => {
    onViewDetails(asteroid)
  }, [asteroid, onViewDetails])
  const getThreatLevel = (asteroid: any) => {
    const distance = parseFloat(asteroid.orbital_data?.miss_distance?.kilometers || '999999999')
    const diameter = asteroid.info?.radius_km ? asteroid.info.radius_km * 2 : 0
    if (distance < 1000000 && diameter > 0.5) return 'kritik'
    if (distance < 5000000 && diameter > 0.3) return 'yüksek'
    if (distance < 20000000) return 'orta'
    return 'düşük'
  }
  const formatDistance = (km: string) => {
    const distance = parseFloat(km)
    if (distance > 1000000) {
      return `${(distance / 1000000).toFixed(2)} milyon km`
    }
    return `${distance.toLocaleString('tr-TR')} km`
  }
  const formatSpeed = (kmh: string) => {
    const speed = parseFloat(kmh)
    return `${speed.toFixed(1)} km/s`
  }
  const formatDiameter = (asteroid: any) => {
    const radius = asteroid.info?.radius_km || 0
    const diameter = radius * 2
    return `~${diameter.toFixed(2)} km`
  }
  const closeApproach = asteroid.orbital_data
  const isHazardous = asteroid.is_hazardous
  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:border-blue-400/50",
        isSelected
          ? "bg-blue-950/30 border-blue-400/50 ring-1 ring-blue-400/30"
          : isHazardous
            ? "bg-red-950/20 border-red-500/30"
            : "bg-pure-black border-cliff-light-gray/30"
      )}
      onClick={handleViewDetails}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isHazardous ? "bg-red-500/20" : "bg-blue-500/20"
          )}>
            <Target className={cn("h-4 w-4", isHazardous ? "text-red-400" : "text-blue-400")} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h4 className="font-semibold text-white text-sm mb-1">
                {asteroid.name.replace(/[()]/g, '')}
              </h4>
              <div className="flex items-center gap-2 text-xs text-cliff-light-gray">
                <span>ID: {asteroid.id}</span>
                {isHazardous && (
                  <Badge variant="destructive" className="text-xs">
                    Potansiyel Tehlike
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <ThreatLevelBadge level={getThreatLevel(asteroid)} />
              <DataSourceBadge source="nasa" />
            </div>
          </div>
          {closeApproach && (
            <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-cliff-light-gray" />
                  <span className="text-cliff-light-gray">Mesafe:</span>
                </div>
                <p className="text-cyan-400 font-mono text-xs">
                  {formatDistance(closeApproach.miss_distance?.kilometers || '0')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-cliff-light-gray" />
                  <span className="text-cliff-light-gray">Hız:</span>
                </div>
                <p className="text-green-400 font-mono text-xs">
                  {formatSpeed(closeApproach.velocity?.kilometers_per_hour || '0')}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Ruler className="h-3 w-3 text-cliff-light-gray" />
                  <span className="text-cliff-light-gray">Çap:</span>
                </div>
                <p className="text-yellow-400 font-mono text-xs">
                  {formatDiameter(asteroid)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-cliff-light-gray" />
                  <span className="text-cliff-light-gray">Yaklaşma:</span>
                </div>
                <p className="text-orange-400 font-mono text-xs">
                  {new Date(closeApproach.next_periapsis || closeApproach.epoch || Date.now()).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-cliff-light-gray">
              <Globe className="h-3 w-3" />
              <span>Yörünge Sınıfı: {closeApproach?.orbiting_body || 'Earth'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Detayları görüntüle"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex-shrink-0">
          <ArrowRight className="h-4 w-4 text-cliff-light-gray/40" />
        </div>
      </div>
    </div>
  )
})
const AsteroidFilterControls = memo(function AsteroidFilterControls({
  filter,
  sortBy,
  hazardousOnly,
  onFilterChange,
  onSortChange,
  onHazardousToggle,
}: {
  filter: string
  sortBy: string
  hazardousOnly: boolean
  onFilterChange: (filter: string) => void
  onSortChange: (sort: string) => void
  onHazardousToggle: () => void
}) {
  const filterOptions = [
    { key: 'all', label: 'Tümü' },
    { key: 'today', label: 'Bugün' },
    { key: 'week', label: 'Bu Hafta' },
    { key: 'month', label: 'Bu Ay' },
  ]
  const sortOptions = [
    { key: 'distance', label: 'Mesafe' },
    { key: 'size', label: 'Boyut' },
    { key: 'speed', label: 'Hız' },
    { key: 'date', label: 'Tarih' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-cliff-light-gray/30">
      <Filter className="h-4 w-4 text-cliff-light-gray" />
      <div className="flex gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.key}
            variant={filter === option.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="w-px h-4 bg-cliff-light-gray/30" />
      <div className="flex gap-2">
        {sortOptions.map((option) => (
          <Button
            key={option.key}
            variant={sortBy === option.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSortChange(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>
      <div className="w-px h-4 bg-cliff-light-gray/30" />
      <Button
        variant={hazardousOnly ? 'destructive' : 'outline'}
        size="sm"
        onClick={onHazardousToggle}
      >
        Sadece Tehlikeli
      </Button>
    </div>
  )
})
const AsteroidInfoPanel: React.FC<AsteroidInfoPanelProps> = ({
  className,
  maxItems = 50,
  showFilters = true,
  autoRefresh = true
}) => {
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [sortBy, setSortBy] = useState<'distance' | 'size' | 'speed' | 'date'>('distance')
  const [hazardousOnly, setHazardousOnly] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [selectedAsteroid, setSelectedAsteroid] = useState<any>(null)
  const { asteroids, isLoading, error, lastRefresh } = useAsteroidData()
  const processedAsteroids = useMemo(() => {
    if (!asteroids) return []
    let filtered = [...asteroids]
    if (hazardousOnly) {
      filtered = filtered.filter(asteroid => asteroid.is_hazardous)
    }
    const now = new Date()
    if (filter === 'today') {
      filtered = filtered.filter(asteroid => {
        const approachDate = new Date(asteroid.orbital_data?.next_periapsis || asteroid.orbital_data?.epoch || Date.now())
        return approachDate.toDateString() === now.toDateString()
      })
    } else if (filter === 'week') {
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(asteroid => {
        const approachDate = new Date(asteroid.orbital_data?.next_periapsis || asteroid.orbital_data?.epoch || Date.now())
        return approachDate >= now && approachDate <= weekFromNow
      })
    } else if (filter === 'month') {
      const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(asteroid => {
        const approachDate = new Date(asteroid.orbital_data?.next_periapsis || asteroid.orbital_data?.epoch || Date.now())
        return approachDate >= now && approachDate <= monthFromNow
      })
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          const distanceA = parseFloat(a.orbital_data?.miss_distance?.kilometers || '999999999')
          const distanceB = parseFloat(b.orbital_data?.miss_distance?.kilometers || '999999999')
          return distanceA - distanceB
        case 'size':
          const sizeA = a.info?.radius_km ? a.info.radius_km * 2 : 0
          const sizeB = b.info?.radius_km ? b.info.radius_km * 2 : 0
          return sizeB - sizeA
        case 'speed':
          const speedA = parseFloat(a.orbital_data?.velocity?.kilometers_per_hour || '0')
          const speedB = parseFloat(b.orbital_data?.velocity?.kilometers_per_hour || '0')
          return speedB - speedA
        case 'date':
          const dateA = new Date(a.orbital_data?.next_periapsis || a.orbital_data?.epoch || 0)
          const dateB = new Date(b.orbital_data?.next_periapsis || b.orbital_data?.epoch || 0)
          return dateA.getTime() - dateB.getTime()
        default:
          return 0
      }
    })
    return filtered.slice(0, maxItems)
  }, [asteroids, filter, sortBy, hazardousOnly, maxItems])
  const asteroidStats = useMemo(() => {
    if (!asteroids) return { total: 0, hazardous: 0, approaching: 0 }
    const hazardous = asteroids.filter(a => a.is_hazardous).length
    const approaching = asteroids.filter(a => {
      const distance = parseFloat(a.orbital_data?.miss_distance?.kilometers || '999999999')
      return distance < 10000000
    }).length
    return {
      total: asteroids.length,
      hazardous,
      approaching
    }
  }, [asteroids])
  const handleViewDetails = useCallback((asteroid: any) => {
    setSelectedAsteroid(asteroid)
  }, [])
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter as any)
  }, [])
  const handleSortChange = useCallback((newSort: string) => {
    setSortBy(newSort as any)
  }, [])
  const handleHazardousToggle = useCallback(() => {
    setHazardousOnly(prev => !prev)
  }, [])
  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])
  return (
    <div className={cn("space-y-4", className)}>
      {selectedAsteroid && (
        <div className="sticky top-0 z-10 p-4 bg-black/60 border border-blue-500/30 rounded-lg">
          <p className="text-white">Asteroid Seçili: {selectedAsteroid.name}</p>
        </div>
      )}
      <Card className="relative bg-black/40 border-blue-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Satellite className="h-5 w-5 text-blue-400" />
                {isLoading && (
                  <div className="absolute -inset-1 bg-blue-400/30 rounded-full animate-ping" />
                )}
              </div>
              <CardTitle className="flex items-center gap-2">
                Asteroid Listesi
                <Badge variant="default" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  <Target className="h-3 w-3 mr-1" />
                  {asteroidStats.total} NEO
                </Badge>
              </CardTitle>
              <button
                onClick={toggleExpanded}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4 text-cliff-light-gray" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-cliff-light-gray" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full" />
                <span className="text-cliff-light-gray">{asteroidStats.hazardous} Tehlikeli</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <span className="text-cliff-light-gray">{asteroidStats.approaching} Yaklaşan</span>
              </div>
              {lastRefresh && (
                <div className="flex items-center gap-1 text-cliff-light-gray">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(lastRefresh)}
                </div>
              )}
            </div>
          </div>
          {showFilters && expanded && (
            <AsteroidFilterControls
              filter={filter}
              sortBy={sortBy}
              hazardousOnly={hazardousOnly}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              onHazardousToggle={handleHazardousToggle}
            />
          )}
        </CardHeader>
        {expanded && (
          <CardContent className="max-h-96 overflow-y-auto custom-scrollbar">
            {error ? (
              <div className="text-center py-8">
                <Satellite className="h-12 w-12 text-red-400/40 mx-auto mb-4" />
                <p className="text-red-400">Veri yüklenirken hata oluştu</p>
                <p className="text-sm text-cliff-light-gray/70 mt-1">{error}</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <Satellite className="h-12 w-12 text-blue-400/40 mx-auto mb-4 animate-pulse" />
                <p className="text-blue-400">Asteroid verileri yükleniyor...</p>
                <p className="text-sm text-cliff-light-gray/70 mt-1">NASA NEO verisi alınıyor</p>
              </div>
            ) : processedAsteroids.length === 0 ? (
              <div className="text-center py-8">
                <Satellite className="h-12 w-12 text-cliff-light-gray/40 mx-auto mb-4" />
                <p className="text-cliff-light-gray">Gösterilecek asteroid yok</p>
                <p className="text-sm text-cliff-light-gray/70 mt-1">
                  {filter !== 'all' ? `Filtreyi değiştirmeyi deneyin` : 'Yeni veriler bekleniyor...'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {processedAsteroids.map((asteroid) => (
                  <AsteroidInfoItem
                    key={asteroid.id}
                    asteroid={asteroid}
                    onViewDetails={handleViewDetails}
                    isSelected={selectedAsteroid?.id === asteroid.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
export default AsteroidInfoPanel
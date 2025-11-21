'use client'
import React, { useState, useMemo, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, ThreatLevelBadge, DataSourceBadge, MetricCard } from '@/components/ui'
import { Button } from '@/components/ui'
import { useThreatData } from '@/hooks/use-threat-data'
import {
  Globe,
  Zap,
  Target,
  Calendar,
  Ruler,
  Gauge,
  TrendingUp,
  Eye,
  AlertTriangle,
  Clock,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
  MapPin,
  Radar
} from 'lucide-react'
import { cn, formatDistance, formatVelocity, formatDate, formatRelativeTime } from '@/lib/utils'
interface AsteroidData {
  id: string
  name: string
  designation: string
  estimated_diameter_min: number
  estimated_diameter_max: number
  velocity_km_per_hour: number
  velocity_km_per_second: number
  miss_distance_km: number
  miss_distance_au: number
  is_potentially_hazardous: boolean
  close_approach_date: string
  orbiting_body: string
  threat_level: 'critical' | 'high' | 'medium' | 'low'
  impact_probability?: number
  magnitude?: number
  orbit_class?: string
  discovery_date?: string
  last_observation?: string
}
interface AsteroidTrackerProps {
  className?: string
  maxItems?: number
  showFilters?: boolean
  autoRefresh?: boolean
  view?: 'list' | 'grid' | 'compact'
}
const AsteroidStats = memo(function AsteroidStats({ 
  asteroids 
}: { 
  asteroids: AsteroidData[] 
}) {
  const stats = useMemo(() => {
    const total = asteroids.length
    const hazardous = asteroids.filter(a => a.is_potentially_hazardous).length
    const approaching = asteroids.filter(a => {
      const approachDate = new Date(a.close_approach_date)
      const now = new Date()
      const daysDiff = (approachDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff >= 0 && daysDiff <= 7
    }).length
    const critical = asteroids.filter(a => a.threat_level === 'critical').length
    return { total, hazardous, approaching, critical }
  }, [asteroids])
  console.log('🔧 DEBUG MetricCard icon issue - expecting ComponentType but passing JSX element')
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      <MetricCard
        title="İzlenen"
        value={stats.total}
        icon={Radar}
        className="border-blue-500/20"
      />
      <MetricCard
        title="Tehlikeli"
        value={stats.hazardous}
        icon={AlertTriangle}
        className="border-red-500/20"
      />
      <MetricCard
        title="Yaklaşan"
        value={stats.approaching}
        icon={Target}
        className="border-yellow-500/20"
      />
      <MetricCard
        title="Kritik"
        value={stats.critical}
        icon={Zap}
        className="border-purple-500/20"
      />
    </div>
  )
})
const FilterControls = memo(function FilterControls({
  filter,
  sortBy,
  searchTerm,
  onFilterChange,
  onSortChange,
  onSearchChange,
}: {
  filter: string
  sortBy: string
  searchTerm: string
  onFilterChange: (filter: string) => void
  onSortChange: (sort: string) => void
  onSearchChange: (search: string) => void
}) {
  const filterOptions = useMemo(() => ['all', 'hazardous', 'approaching', 'critical'], [])
  const sortOptions = useMemo(() => ['distance', 'size', 'velocity', 'date'], [])
  const getFilterLabel = useCallback((f: string) => {
    switch (f) {
      case 'all': return 'Tümü'
      case 'hazardous': return 'Tehlikeli'
      case 'approaching': return 'Yaklaşan'
      case 'critical': return 'Kritik'
      default: return f.charAt(0).toUpperCase() + f.slice(1)
    }
  }, [])
  const getSortLabel = useCallback((s: string) => {
    switch (s) {
      case 'distance': return 'Mesafe'
      case 'size': return 'Boyut'
      case 'velocity': return 'Hız'
      case 'date': return 'Tarih'
      default: return s.charAt(0).toUpperCase() + s.slice(1)
    }
  }, [])
  return (
    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-cliff-light-gray/30">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-cliff-light-gray" />
        {filterOptions.map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'cosmic' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(f)}
          >
            {getFilterLabel(f)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-4">
        <span className="text-sm text-cliff-light-gray">Sırala:</span>
        {sortOptions.map((s) => (
          <Button
            key={s}
            variant={sortBy === s ? 'cosmic' : 'outline'}
            size="sm"
            onClick={() => onSortChange(s)}
          >
            {getSortLabel(s)}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-cliff-light-gray" />
          <input
            type="text"
            placeholder="Asteroid ara..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 bg-pure-black border border-cliff-light-gray/30 rounded-md text-sm text-cliff-white placeholder-cliff-light-gray focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
      </div>
    </div>
  )
})
const AsteroidListItem = memo(function AsteroidListItem({
  asteroid,
  onAsteroidClick,
}: {
  asteroid: AsteroidData
  onAsteroidClick: (asteroid: AsteroidData) => void
}) {
  const getSizeCategory = useCallback((diameter: number) => {
    if (diameter < 10) return 'Küçük'
    if (diameter < 100) return 'Orta'
    if (diameter < 1000) return 'Büyük'
    return 'Dev'
  }, [])
  const getVelocityCategory = useCallback((velocity: number) => {
    if (velocity < 10) return 'Yavaş'
    if (velocity < 20) return 'Orta'
    if (velocity < 30) return 'Hızlı'
    return 'Çok Hızlı'
  }, [])
  const handleClick = useCallback(() => {
    onAsteroidClick(asteroid)
  }, [asteroid, onAsteroidClick])
  console.log('🔧 DEBUG ThreatLevelBadge language issue:', {
    received: asteroid.threat_level, 
    expected: 'Türkçe levels' 
  })
  const convertThreatLevelToTurkish = (level: string) => {
    switch (level) {
      case 'critical': return 'kritik'
      case 'high': return 'yüksek' 
      case 'medium': return 'orta'
      case 'low': return 'düşük'
      default: return 'düşük'
    }
  }
  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02]",
        asteroid.is_potentially_hazardous
          ? "bg-red-950/20 border-red-500/30 hover:border-red-400/50"
          : "bg-pure-black border-cliff-light-gray/30 hover:border-cliff-light-gray/50",
        asteroid.threat_level === 'critical' && "animate-pulse-subtle"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-cliff-white">
              {asteroid.name}
            </h3>
            <Badge variant="outline" size="sm">
              {asteroid.designation}
            </Badge>
            {asteroid.is_potentially_hazardous && (
              <Badge variant="danger" size="sm">
                <AlertTriangle className="h-3 w-3 mr-1" />
                PHA
              </Badge>
            )}
            <ThreatLevelBadge level={convertThreatLevelToTurkish(asteroid.threat_level)} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-cliff-light-gray">Mesafe</p>
              <p className="text-cliff-white font-medium">
                {formatDistance(asteroid.miss_distance_km, 'km')}
              </p>
              <p className="text-xs text-cliff-light-gray/70">
                {asteroid.miss_distance_au.toFixed(3)} AU
              </p>
            </div>
            <div>
              <p className="text-cliff-light-gray">Boyut</p>
              <p className="text-cliff-white font-medium">
                {asteroid.estimated_diameter_max.toFixed(0)}m
              </p>
              <p className="text-xs text-cliff-light-gray/70">
                {getSizeCategory(asteroid.estimated_diameter_max)}
              </p>
            </div>
            <div>
              <p className="text-cliff-light-gray">Hız</p>
              <p className="text-cliff-white font-medium">
                {formatVelocity(asteroid.velocity_km_per_second, 'kms')}
              </p>
              <p className="text-xs text-cliff-light-gray/70">
                {getVelocityCategory(asteroid.velocity_km_per_second)}
              </p>
            </div>
            <div>
              <p className="text-cliff-light-gray">Yaklaşma</p>
              <p className="text-cliff-white font-medium">
                {formatDate(new Date(asteroid.close_approach_date), { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-cliff-light-gray/70">
                {formatRelativeTime(new Date(asteroid.close_approach_date))}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {asteroid.impact_probability && asteroid.impact_probability > 0 && (
        <div className="mt-3 pt-3 border-t border-cliff-light-gray/40">
          <div className="flex items-center justify-between">
            <span className="text-sm text-cliff-light-gray">Çarpışma Olasılığı:</span>
            <span className="text-sm font-medium text-red-400">
              {(asteroid.impact_probability * 100).toExponential(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
})
const AsteroidGridItem = memo(function AsteroidGridItem({
  asteroid,
  onAsteroidClick,
}: {
  asteroid: AsteroidData
  onAsteroidClick: (asteroid: AsteroidData) => void
}) {
  const handleClick = useCallback(() => {
    onAsteroidClick(asteroid)
  }, [asteroid, onAsteroidClick])
  const convertThreatLevelToTurkish = (level: string) => {
    switch (level) {
      case 'critical': return 'kritik'
      case 'high': return 'yüksek' 
      case 'medium': return 'orta'
      case 'low': return 'düşük'
      default: return 'düşük'
    }
  }
  return (
    <Card
      key={asteroid.id}
      variant={asteroid.is_potentially_hazardous ? 'danger' : 'glass'}
      className="cursor-pointer hover:scale-105 transition-transform"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-cliff-white truncate">
            {asteroid.name}
          </h3>
          <ThreatLevelBadge level={convertThreatLevelToTurkish(asteroid.threat_level)} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-cliff-light-gray">Mesafe:</span>
            <span className="text-cliff-white">
              {formatDistance(asteroid.miss_distance_km, 'km')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cliff-light-gray">Boyut:</span>
            <span className="text-cliff-white">
              {asteroid.estimated_diameter_max.toFixed(0)}m
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-cliff-light-gray">Yaklaşma:</span>
            <span className="text-cliff-white">
              {formatDate(new Date(asteroid.close_approach_date), { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
const AsteroidTracker: React.FC<AsteroidTrackerProps> = ({
  className,
  maxItems = 20,
  showFilters = true,
  autoRefresh = true,
  view = 'list'
}) => {
  const [asteroids, setAsteroids] = useState<AsteroidData[]>([])
  const [filter, setFilter] = useState<'all' | 'hazardous' | 'approaching' | 'critical'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'distance' | 'size' | 'velocity' | 'date'>('distance')
  const [selectedAsteroid, setSelectedAsteroid] = useState<AsteroidData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { comprehensiveAssessment, isLoading } = useThreatData()
  const processedAsteroids = useMemo(() => {
    if (comprehensiveAssessment?.active_threats) {
      const asteroidThreats = comprehensiveAssessment.active_threats.filter(
        threat => threat.threat_type.toLowerCase().includes('asteroid') ||
                  threat.threat_type.toLowerCase().includes('neo') ||
                  threat.title.toLowerCase().includes('asteroid')
      )
      return asteroidThreats.map((threat, index) => ({
        id: threat.threat_id || `${Date.now()}-${index}`,
        name: threat.title || `NEO-${String(index + 1).padStart(4, '0')}`,
        designation: `${threat.threat_type}-${index + 1}` || 'N/A',
        estimated_diameter_min: Math.random() * 50 + 10, 
        estimated_diameter_max: Math.random() * 100 + 50,
        velocity_km_per_hour: Math.random() * 50000 + 10000,
        velocity_km_per_second: Math.random() * 15 + 5,
        miss_distance_km: Math.random() * 10000000 + 1000000,
        miss_distance_au: Math.random() * 0.1 + 0.01,
        is_potentially_hazardous: threat.severity === 'CRITICAL' || threat.severity === 'HIGH',
        close_approach_date: threat.time_to_impact || new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        orbiting_body: 'Earth',
        threat_level: threat.severity.toLowerCase() as any || 'low',
        impact_probability: threat.impact_probability,
        magnitude: Math.random() * 5 + 15,
        orbit_class: 'Apollo',
        discovery_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        last_observation: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }))
    }
    return Array.from({ length: 15 }, (_, i) => ({
      id: `mock-asteroid-${i}`,
      name: `2024 ${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}${i + 1}`,
      designation: `${i + 2000}-${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i + 1) % 26))}`,
      estimated_diameter_min: Math.random() * 50 + 10,
      estimated_diameter_max: Math.random() * 100 + 50,
      velocity_km_per_hour: Math.random() * 50000 + 10000,
      velocity_km_per_second: Math.random() * 15 + 5,
      miss_distance_km: Math.random() * 10000000 + 1000000,
      miss_distance_au: Math.random() * 0.1 + 0.01,
      is_potentially_hazardous: Math.random() > 0.7,
      close_approach_date: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      orbiting_body: 'Earth',
      threat_level: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
      impact_probability: Math.random() * 0.001,
      magnitude: Math.random() * 5 + 15,
      orbit_class: ['Apollo', 'Aten', 'Amor'][Math.floor(Math.random() * 3)],
      discovery_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      last_observation: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }))
  }, [comprehensiveAssessment])
  useEffect(() => {
    setAsteroids(processedAsteroids)
  }, [processedAsteroids])
  const filteredAsteroids = useMemo(() => {
    let filtered = asteroids
    if (filter === 'hazardous') {
      filtered = filtered.filter(a => a.is_potentially_hazardous)
    } else if (filter === 'approaching') {
      const now = Date.now()
      filtered = filtered.filter(a => {
        const approachDate = new Date(a.close_approach_date).getTime()
        const daysDiff = (approachDate - now) / (1000 * 60 * 60 * 24)
        return daysDiff >= 0 && daysDiff <= 30
      })
    } else if (filter === 'critical') {
      filtered = filtered.filter(a => a.threat_level === 'critical' || a.threat_level === 'high')
    }
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(searchLower) ||
        a.designation.toLowerCase().includes(searchLower)
      )
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return a.miss_distance_km - b.miss_distance_km
        case 'size':
          return b.estimated_diameter_max - a.estimated_diameter_max
        case 'velocity':
          return b.velocity_km_per_second - a.velocity_km_per_second
        case 'date':
          return new Date(a.close_approach_date).getTime() - new Date(b.close_approach_date).getTime()
        default:
          return 0
      }
    })
    return filtered.slice(0, maxItems)
  }, [asteroids, filter, searchTerm, sortBy, maxItems])
  const hazardousCount = useMemo(() => 
    asteroids.filter(a => a.is_potentially_hazardous).length, 
    [asteroids]
  )
  const todayApproaches = useMemo(() => {
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    return asteroids.filter(a => {
      const approachDate = new Date(a.close_approach_date)
      return approachDate >= now && approachDate <= tomorrow
    }).length
  }, [asteroids])
  const formatDiameter = (diameter: any) => {
    if (typeof diameter === 'object' && diameter.estimated_diameter_max) {
      return `${diameter.estimated_diameter_max.toFixed(0)}m`
    }
    return `${(diameter || 0).toFixed(0)}m`
  }
  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter as any)
  }, [])
  const handleSortChange = useCallback((newSort: string) => {
    setSortBy(newSort as any)
  }, [])
  const handleSearchChange = useCallback((newSearch: string) => {
    setSearchTerm(newSearch)
  }, [])
  const handleAsteroidClick = useCallback((asteroid: AsteroidData) => {
    setSelectedAsteroid(asteroid)
  }, [])
  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }, [])
  if (isLoading) {
    return (
      <Card variant="default" className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-cliff-light-gray/20 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-cliff-light-gray/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card variant="default" className={cn("relative overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-orange-400" />
            Asteroid İzleyici
            <DataSourceBadge source="nasa" />
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-pure-black border border-cliff-light-gray/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cliff-light-gray">Toplam Asteroit</p>
                <p className="text-2xl font-bold text-cliff-white">{asteroids.length}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-pure-black border border-cliff-light-gray/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cliff-light-gray">Potansiyel Tehdit</p>
                <p className="text-2xl font-bold text-red-400">{hazardousCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <div className="p-4 rounded-lg bg-pure-black border border-cliff-light-gray/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cliff-light-gray">Bugün Yaklaşan</p>
                <p className="text-2xl font-bold text-green-400">{todayApproaches}</p>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </div>
        </div>
        {}
        {showFilters && (
          <FilterControls
            filter={filter}
            sortBy={sortBy}
            searchTerm={searchTerm}
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
            onSearchChange={handleSearchChange}
          />
        )}
      </CardHeader>
      <CardContent>
        {filteredAsteroids.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-cliff-light-gray/40 mx-auto mb-4" />
            <p className="text-cliff-light-gray">Asteroit verisi yok</p>
            <p className="text-sm text-cliff-light-gray/70 mt-1">
              Yaklaşan asteroitler için NASA verisi yükleniyor...
            </p>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-3">
            {filteredAsteroids.map((asteroid) => (
              <div
                key={asteroid.id}
                className={cn(
                  "p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:bg-pure-black",
                  asteroid.is_potentially_hazardous
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-pure-black border-cliff-light-gray/30",
                  selectedAsteroid?.id === asteroid.id && "ring-2 ring-blue-500/30"
                )}
                onClick={() => setSelectedAsteroid(asteroid)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className={cn("h-4 w-4", 
                        asteroid.is_potentially_hazardous ? "text-red-400" : "text-blue-400"
                      )} />
                      <h3 className="font-semibold text-cliff-white truncate">
                        {asteroid.name || `Asteroid ${asteroid.id}`}
                      </h3>
                      {asteroid.is_potentially_hazardous && (
                        <Badge variant="critical" size="sm" animation="pulse">
                          TEHLİKELİ
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-cliff-light-gray">Yakın Geçiş:</span>
                        <p className="text-cliff-white font-medium">
                          {formatDate(new Date(asteroid.close_approach_date))}
                        </p>
                      </div>
                      <div>
                        <span className="text-cliff-light-gray">Mesafe:</span>
                        <p className="text-cliff-white font-medium">
                          {formatDistance(asteroid.miss_distance_km)}
                        </p>
                      </div>
                      <div>
                        <span className="text-cliff-light-gray">Çap:</span>
                        <p className="text-cliff-white font-medium">
                          {asteroid.estimated_diameter_max?.toFixed(0) || '?'}m
                        </p>
                      </div>
                      <div>
                        <span className="text-cliff-light-gray">Hız:</span>
                        <p className="text-cliff-white font-medium">
                          {formatVelocity(asteroid.velocity_km_per_second)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-xs px-2 py-1 rounded-full", 
                      asteroid.is_potentially_hazardous
                        ? "bg-red-500/20 text-red-300" 
                        : "bg-green-500/20 text-green-300"
                    )}>
                      {asteroid.is_potentially_hazardous ? 'Yüksek Risk' : 'Düşük Risk'}
                    </div>
                    <div className="mt-2 text-xs text-cliff-light-gray">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {formatRelativeTime(new Date(asteroid.close_approach_date))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAsteroids.map((asteroid) => (
              <AsteroidGridItem
                key={asteroid.id}
                asteroid={asteroid}
                onAsteroidClick={handleAsteroidClick}
              />
            ))}
          </div>
        )}
      </CardContent>
      {}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-orange-400 to-transparent animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-yellow-400 to-transparent animate-pulse-slow delay-1000" />
      </div>
    </Card>
  )
}
export default AsteroidTracker
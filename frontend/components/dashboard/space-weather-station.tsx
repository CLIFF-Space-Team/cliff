'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, StatusBadge, DataSourceBadge, MetricCard } from '@/components/ui'
import { Button } from '@/components/ui'
import { useThreatData } from '@/hooks/use-threat-data'
import { useWebSocket } from '@/hooks/use-websocket'
import { 
  Zap, 
  Sun, 
  RadioIcon as Radio,
  Satellite,
  Shield,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  RefreshCw,
  BarChart3,
  Settings,
  Eye,
  Thermometer,
  Wind,
  Compass,
  CloudRain
} from 'lucide-react'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
interface SpaceWeatherEvent {
  id: string
  event_type: 'solar_flare' | 'cme' | 'geomagnetic_storm' | 'radiation_storm' | 'radio_blackout'
  severity: 'minor' | 'moderate' | 'strong' | 'severe' | 'extreme'
  start_time: string
  peak_time?: string
  end_time?: string
  duration?: number
  magnitude?: number
  location?: string
  description: string
  impact_description?: string
  affected_systems: string[]
  kp_index?: number
  dst_index?: number
  source: string
  instruments: string[]
  active: boolean
}
interface SolarActivity {
  sunspot_number: number
  solar_flux: number
  xray_class?: string
  proton_flux?: number
  electron_flux?: number
  planetary_k_index: number
  dst_index: number
  last_updated: string
}
interface SpaceWeatherStationProps {
  className?: string
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}
const SpaceWeatherStation: React.FC<SpaceWeatherStationProps> = ({
  className,
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 300000 // 5 minutes
}) => {
  const [spaceWeatherEvents, setSpaceWeatherEvents] = useState<SpaceWeatherEvent[]>([])
  const [solarActivity, setSolarActivity] = useState<SolarActivity | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<SpaceWeatherEvent | null>(null)
  const [view, setView] = useState<'overview' | 'events' | 'solar' | 'alerts'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { comprehensiveAssessment, isLoading } = useThreatData()
  const { isConnected, lastMessage } = useWebSocket()
  useEffect(() => {
    if (comprehensiveAssessment?.active_threats) {
      const spaceWeatherThreats = comprehensiveAssessment.active_threats.filter(
        threat => threat.threat_type.toLowerCase().includes('space') ||
                  threat.threat_type.toLowerCase().includes('solar') ||
                  threat.threat_type.toLowerCase().includes('weather') ||
                  threat.title.toLowerCase().includes('flare') ||
                  threat.title.toLowerCase().includes('storm')
      )
      const events: SpaceWeatherEvent[] = spaceWeatherThreats.map((threat, index) => ({
        id: threat.threat_id || Date.now().toString() + index,
        event_type: determineEventType(threat.threat_type),
        severity: mapThreatLevelToSeverity(threat.severity.toLowerCase()),
        start_time: new Date().toISOString(),
        description: threat.description || 'Uzay hava durumu olayı tespit edildi',
        impact_description: `Impact probability: ${threat.impact_probability}`,
        affected_systems: ['GPS', 'Communications', 'Power Grid'],
        source: threat.data_source || 'NASA UHDI',
        instruments: ['ACE', 'DSCOVR', 'SOHO'],
        active: true,
        kp_index: Math.floor(Math.random() * 9) + 1,
        dst_index: Math.floor(Math.random() * 100) - 50,
        magnitude: threat.impact_probability ? threat.impact_probability * 10 : undefined
      }))
      setSpaceWeatherEvents(events)
      if (events.length > 0) {
        setSolarActivity({
          sunspot_number: Math.floor(Math.random() * 200) + 50,
          solar_flux: Math.floor(Math.random() * 50) + 100,
          xray_class: events.some(e => e.event_type === 'solar_flare') ? 'C1.2' : 'A1.0',
          planetary_k_index: Math.floor(Math.random() * 6) + 1,
          dst_index: Math.floor(Math.random() * 60) - 30,
          last_updated: new Date().toISOString()
        })
      }
    } else {
      const mockEvents: SpaceWeatherEvent[] = [
        {
          id: 'sw-1',
          event_type: 'solar_flare',
          severity: 'moderate',
          start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          description: 'Aktif bölge 3421\'de C-sınıfı güneş patlaması tespit edildi',
          source: 'NASA UHDI',
          instruments: ['GOES', 'SDO'],
          active: true,
          affected_systems: ['HF Radio'],
          kp_index: 4
        },
        {
          id: 'sw-2',
          event_type: 'geomagnetic_storm',
          severity: 'minor',
          start_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          description: 'Küçük jeomanyetik aktivite bekleniyor',
          source: 'NASA UHDI',
          instruments: ['ACE', 'DSCOVR'],
          active: false,
          affected_systems: ['GPS Navigation'],
          kp_index: 3
        }
      ]
      setSpaceWeatherEvents(mockEvents)
      setSolarActivity({
        sunspot_number: 85,
        solar_flux: 142,
        xray_class: 'B9.3',
        planetary_k_index: 3,
        dst_index: -12,
        last_updated: new Date().toISOString()
      })
    }
  }, [comprehensiveAssessment])
  const determineEventType = (threatType: string): any => {
    const type = threatType.toLowerCase()
    if (type.includes('flare')) return 'solar_flare'
    if (type.includes('storm')) return 'geomagnetic_storm'
    if (type.includes('cme')) return 'cme'
    if (type.includes('radiation')) return 'radiation_storm'
    if (type.includes('radio')) return 'radio_blackout'
    return 'solar_flare'
  }
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data)
        if (data.type === 'space_weather_update') {
          const event: SpaceWeatherEvent = {
            id: Date.now().toString(),
            event_type: data.event_type,
            severity: data.severity,
            start_time: data.start_time || new Date().toISOString(),
            description: data.description,
            source: data.source || 'SWPC',
            instruments: data.instruments || [],
            active: true,
            affected_systems: data.affected_systems || []
          }
          setSpaceWeatherEvents(prev => [event, ...prev.slice(0, 19)])
        }
      } catch (error) {
        console.error('Error parsing space weather update:', error)
      }
    }
  }, [lastMessage])
  const mapThreatLevelToSeverity = (level: string): any => {
    const mapping = {
      'critical': 'extreme',
      'high': 'severe',
      'medium': 'moderate',
      'low': 'minor'
    }
    return mapping[level as keyof typeof mapping] || 'minor'
  }
  const activeEvents = useMemo(() => {
    return spaceWeatherEvents.filter(event => event.active)
  }, [spaceWeatherEvents])
  const eventStats = useMemo(() => {
    const total = spaceWeatherEvents.length
    const active = activeEvents.length
    const severe = spaceWeatherEvents.filter(e => e.severity === 'severe' || e.severity === 'extreme').length
    const solarFlares = spaceWeatherEvents.filter(e => e.event_type === 'solar_flare').length
    return { total, active, severe, solarFlares }
  }, [spaceWeatherEvents, activeEvents])
  const getCurrentConditions = () => {
    if (!solarActivity) return 'Unknown'
    if (solarActivity.planetary_k_index >= 6) return 'Fırtına'
    if (solarActivity.planetary_k_index >= 4) return 'Aktif'
    if (solarActivity.planetary_k_index >= 3) return 'Kararsız'
    return 'Sakin'
  }
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Fırtına': return 'text-red-400'
      case 'Aktif': return 'text-orange-400'
      case 'Kararsız': return 'text-yellow-400'
      case 'Sakin': return 'text-green-400'
      default: return 'text-slate-400'
    }
  }
  const getSeverityIcon = (event: SpaceWeatherEvent) => {
    switch (event.event_type) {
      case 'solar_flare':
        return <Sun className="h-4 w-4" />
      case 'cme':
        return <Wind className="h-4 w-4" />
      case 'geomagnetic_storm':
        return <Compass className="h-4 w-4" />
      case 'radiation_storm':
        return <Zap className="h-4 w-4" />
      case 'radio_blackout':
        return <Radio className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'border-red-600 bg-red-950/30'
      case 'severe': return 'border-red-500 bg-red-950/20'
      case 'strong': return 'border-orange-500 bg-orange-950/20'
      case 'moderate': return 'border-yellow-500 bg-yellow-950/20'
      case 'minor': return 'border-green-500 bg-green-950/20'
      default: return 'border-slate-500 bg-slate-950/20'
    }
  }
  const refreshData = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }
  if (isLoading) {
    return (
      <Card variant="default" className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-cliff-light-gray/20 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-cliff-light-gray/20 rounded animate-pulse" />
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
            <CloudRain className="h-5 w-5 text-blue-400" />
            Uzay Hava İstasyonu
            <DataSourceBadge source="noaa" />
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
        {solarActivity && (
          <div className="mt-4 p-4 rounded-lg bg-pure-black border border-cliff-light-gray/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-cliff-white">Mevcut Koşullar</h3>
              <div className={cn("text-lg font-bold", getConditionColor(getCurrentConditions()))}>
                {getCurrentConditions()}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {solarActivity.planetary_k_index}
                </div>
                <div className="text-xs text-cliff-light-gray">K-Endeksi</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">
                  {solarActivity.dst_index}
                </div>
                <div className="text-xs text-cliff-light-gray">Dst (nT)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {solarActivity.sunspot_number}
                </div>
                <div className="text-xs text-cliff-light-gray">Güneş Lekeleri</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {solarActivity.solar_flux}
                </div>
                <div className="text-xs text-cliff-light-gray">Güneş Akısı</div>
              </div>
            </div>
          </div>
        )}
        {}
        <div className="flex gap-2 mt-4">
          {['overview', 'events', 'solar', 'alerts'].map((v) => (
            <Button
              key={v}
              variant={view === v ? 'cosmic' : 'ghost'}
              size="sm"
              onClick={() => setView(v as any)}
            >
              {v === 'overview' ? 'Genel Bakış' :
               v === 'events' ? 'Olaylar' :
               v === 'solar' ? 'Güneş' :
               v === 'alerts' ? 'Uyarılar' : v.charAt(0).toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {view === 'overview' && (
          <div className="space-y-6">
            {}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Güneş Aktivitesi"
                value={`R${solarActivity?.planetary_k_index || 1}`}
                unit="K-Endeksi"
                icon={Activity}
                trend="stable"
                className="border-yellow-500/20"
              />
              <MetricCard
                title="Jeomanyetik Fırtına"
                value={`G${Math.floor((solarActivity?.planetary_k_index || 1) / 2)}`}
                icon={AlertTriangle}
                trend={solarActivity?.planetary_k_index && solarActivity.planetary_k_index > 4 ? 'up' : 'stable'}
                className="border-orange-500/20"
              />
              <MetricCard
                title="Radyasyon"
                value={`S${Math.floor((solarActivity?.dst_index || 0) / -10) || 1}`}
                icon={Zap}
                trend="stable"
                className="border-red-500/20"
              />
              <MetricCard
                title="Güneş Rüzgarı"
                value={`${solarActivity?.solar_flux || 350}`}
                unit="km/s"
                icon={Sun}
                trend="stable"
                className="border-blue-500/20"
              />
            </div>
            {}
            {activeEvents.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-cliff-white flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Aktif Olaylar
                </h3>
                <div className="space-y-2">
                  {activeEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                        getSeverityColor(event.severity)
                      )}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(event)}
                          <span className="font-medium text-cliff-white">
                            {event.event_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <Badge variant={event.severity === 'extreme' ? 'critical' : event.severity as any} size="sm">
                            {event.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-xs text-cliff-light-gray">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatRelativeTime(new Date(event.start_time))}
                        </div>
                      </div>
                      <p className="text-sm text-cliff-light-gray mt-2">
                        {event.description}
                      </p>
                      {event.affected_systems.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.affected_systems.slice(0, 3).map((system, idx) => (
                            <Badge key={idx} variant="outline" size="sm">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {view === 'events' && (
          <div className="space-y-3">
            {spaceWeatherEvents.length === 0 ? (
              <div className="text-center py-8">
                <Sun className="h-12 w-12 text-cliff-light-gray/40 mx-auto mb-4" />
                <p className="text-cliff-light-gray">Uzay hava durumu olayı yok</p>
              </div>
            ) : (
              spaceWeatherEvents.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                    getSeverityColor(event.severity),
                    event.active && "ring-2 ring-blue-500/30"
                  )}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityIcon(event)}
                        <h3 className="font-semibold text-cliff-white">
                          {event.event_type.replace(/_/g, ' ').toUpperCase()}
                        </h3>
                        <Badge variant={event.severity === 'extreme' ? 'critical' : event.severity as any} size="sm">
                          {event.severity}
                        </Badge>
                        {event.active && (
                          <Badge variant="success" size="sm" animation="pulse">
                            AKTİF
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-cliff-light-gray mb-3">
                        {event.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-cliff-light-gray">
                          <span>Başladı: {formatDate(new Date(event.start_time))}</span>
                          {event.magnitude && <span>Büyüklük: {event.magnitude}</span>}
                          <span>Kaynak: {event.source}</span>
                        </div>
                      {event.affected_systems.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {event.affected_systems.map((system, idx) => (
                            <Badge key={idx} variant="outline" size="sm">
                              {system}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {(view === 'solar' || view === 'alerts') && (
          <div className="text-center py-8">
            <Sun className="h-12 w-12 text-cliff-light-gray/40 mx-auto mb-4" />
            <p className="text-cliff-light-gray">Özellik yakında geliyor</p>
            <p className="text-sm text-cliff-light-gray/70 mt-1">
              {view === 'solar' ? 'Detaylı güneş aktivitesi izleme' : 'Gelişmiş uzay hava durumu uyarıları'}
            </p>
          </div>
        )}
      </CardContent>
      {}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-yellow-400 to-transparent animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-orange-400 to-transparent animate-pulse-slow delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-radial from-red-400 to-transparent animate-pulse-slow delay-500" />
      </div>
    </Card>
  )
}
export default SpaceWeatherStation
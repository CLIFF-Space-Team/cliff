"use client"
import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle, TrendingUp, TrendingDown, Activity, 
  Shield, Target, Zap, Clock, MapPin, Globe,
  ChevronRight, Info, AlertCircle, CheckCircle,
  Loader2, BarChart3, PieChart, LineChart
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import AsteroidThreatPanel from "@/components/dashboard/asteroid-threat-panel"
import ApproachTimeline from "@/components/dashboard/approach-timeline"
import { AsteroidTrackerSkeleton } from "@/components/ui/loading-states"
import { useSolarSystemStore } from "@/stores/solarSystemStore"
import { getMessage } from "@/lib/messages"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts"
import FilterBar from "@/components/dashboard/filters/FilterBar"
import { useThreatFilters } from "@/stores/threatFilters"
import { searchAsteroids } from "@/lib/api/asteroids"
import CompareDrawer from "@/components/dashboard/compare/CompareDrawer"
import ExportMenu from "@/components/dashboard/export/ExportMenu"
import NotificationsBell from "@/components/dashboard/notifications/NotificationsBell"
interface RealNeoThreat {
  neoId: string
  name: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'none'
  score: number
  diameter_km?: number
  distance_ld?: number
  distance_au?: number
  velocity_kms?: number
  impact_probability?: number
  torino?: number
  palermo?: number
}
interface NeoDetail {
  asteroid: any
  risk: any
  approaches: any[]
}
interface ThreatData {
  id: string
  name: string
  type: "asteroid" | "solar_flare" | "space_debris" | "earth_event"
  threat_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  risk_score: number
  distance?: number
  velocity?: number
  size?: number
  impact_probability?: number
  time_to_event?: string
  location?: { lat: number, lon: number }
  affected_regions?: string[]
}
interface ThreatPanelProps {
  className?: string
  onThreatSelect?: (threat: ThreatData) => void
}
export const ModernThreatPanel: React.FC<ThreatPanelProps> = ({
  className,
  onThreatSelect
}) => {
  const [threats, setThreats] = useState<ThreatData[]>([])
  const [realNeos, setRealNeos] = useState<RealNeoThreat[]>([])
  const [selectedNeoId, setSelectedNeoId] = useState<string | null>(null)
  const [neoDetail, setNeoDetail] = useState<NeoDetail | null>(null)
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [timelineWindow, setTimelineWindow] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "timeline">("overview")
  const wsRef = useRef<WebSocket | null>(null)
  const { filters } = useThreatFilters()
  const [total, setTotal] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [virt, setVirt] = useState<{ start: number; end: number; item: number }>({ start: 0, end: 30, item: 72 })
  const [listTexts, setListTexts] = useState({
    header: "En Riskli NEO'lar (NASA Verisi)",
    noResults: "Sonuç bulunamadı. Filtreleri gevşetmeyi veya anahtar kelimeleri değiştirmeyi deneyin."
  })
  const fetchRealThreats = async () => {
    try {
      setIsLoading(true)
      const result = await searchAsteroids({
        q: filters.q,
        risk: filters.risks,
        min_diameter_km: filters.minDiameterKm,
        max_diameter_km: filters.maxDiameterKm,
        max_ld: filters.maxLd,
        window_days: filters.windowDays,
        page: filters.page,
        page_size: filters.pageSize,
        sort: filters.sort,
      })
      const items: RealNeoThreat[] = (result.items || []).map((it: any) => ({
        neoId: it.neoId,
        name: it.name,
        riskLevel: (it.risk_level || 'none'),
        score: (it.impact_probability || 0) * 10 + (it.risk_level === 'critical' ? 4 : it.risk_level === 'high' ? 3 : it.risk_level === 'medium' ? 2 : it.risk_level === 'low' ? 1 : 0),
        diameter_km: it.diameter_max_km || it.diameter_min_km,
        distance_ld: it.next_approach?.distance_ld,
        distance_au: it.next_approach?.distance_au,
        velocity_kms: it.next_approach?.relative_velocity_kms,
        impact_probability: it.impact_probability,
        torino: it.torino,
        palermo: it.palermo,
      }))
      setRealNeos(items)
      setTotal(result.total || 0)
    } catch (e) {
      console.error('Top NEO çekilemedi:', e)
      setRealNeos([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }
  const fetchNeoDetail = async (neoId: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiBase}/api/v1/asteroids/detail/${encodeURIComponent(neoId)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: NeoDetail = await res.json()
      setNeoDetail(json)
    } catch (e) {
      console.error('NEO detayı çekilemedi:', e)
      setNeoDetail(null)
    }
  }
  const fetchTimelineData = async (window: string) => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiBase}/api/v1/asteroids/approaches?window=${window}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const series = (json.series || []).map((d: any) => ({ date: d[0], count: d[1] }))
      setTimelineData(series)
    } catch (e) {
      console.error('Timeline çekilemedi:', e)
      setTimelineData([])
    }
  }
  const calculateAsteroidRisk = (asteroid: any): number => {
    let risk = 0
    const size = asteroid.estimated_diameter?.kilometers?.estimated_diameter_max || 0
    if (size > 1) risk += 30
    else if (size > 0.5) risk += 20
    else if (size > 0.1) risk += 10
    else risk += 5
    const distance = parseFloat(asteroid.close_approach_data?.[0]?.miss_distance?.lunar || 100)
    if (distance < 1) risk += 40
    else if (distance < 5) risk += 30
    else if (distance < 10) risk += 20
    else if (distance < 20) risk += 10
    const velocity = parseFloat(asteroid.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second || 0)
    if (velocity > 30) risk += 20
    else if (velocity > 20) risk += 15
    else if (velocity > 10) risk += 10
    if (asteroid.is_potentially_hazardous_asteroid) risk += 10
    return Math.min(risk, 100)
  }
  const calculateEventRisk = (event: any): number => {
    let risk = 30 // Base risk for earth events
    if (event.categories?.some((c: any) => c.id === 8)) risk += 20 // Wildfires
    if (event.categories?.some((c: any) => c.id === 10)) risk += 25 // Storms
    if (event.categories?.some((c: any) => c.id === 12)) risk += 30 // Volcanoes
    const eventDate = new Date(event.geometry?.[0]?.date)
    const daysSinceEvent = (Date.now() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceEvent < 1) risk += 20
    else if (daysSinceEvent < 3) risk += 15
    else if (daysSinceEvent < 7) risk += 10
    return Math.min(risk, 100)
  }
  const calculateSpaceWeatherRisk = (weather: any): number => {
    let risk = 20 // Base risk
    if (weather.messageType?.includes("WARNING")) risk += 30
    else if (weather.messageType?.includes("WATCH")) risk += 20
    else if (weather.messageType?.includes("ALERT")) risk += 25
    return Math.min(risk, 100)
  }
  useEffect(() => {
    fetchRealThreats()
    fetchTimelineData(timelineWindow)
  }, [])
  useEffect(() => {
    ;(async () => {
      const header = await getMessage('threat.list.header', listTexts.header)
      const noResults = await getMessage('threat.list.no_results', listTexts.noResults)
      setListTexts({ header, noResults })
    })()
  }, [])
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchRealThreats()
    }
  }, [filters, activeTab])
  useEffect(() => {
    if (activeTab === 'timeline') {
      fetchTimelineData(timelineWindow)
    }
  }, [timelineWindow, activeTab])
  useEffect(() => {
    if (selectedNeoId && activeTab === 'details') {
      fetchNeoDetail(selectedNeoId)
    }
  }, [selectedNeoId, activeTab])
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NODE_ENV === "production"
          ? `wss://${window.location.host}/ws/threats`
          : "ws://localhost:8000/ws/threats"
        wsRef.current = new WebSocket(wsUrl)
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "new_threat") {
              setThreats(prev => [data.threat, ...prev].slice(0, 50))
            }
          } catch (error) {
            console.error("WebSocket mesaj hatası:", error)
          }
        }
        wsRef.current.onerror = (error) => {
          console.error("WebSocket hatası:", error)
        }
        wsRef.current.onclose = () => {
          setTimeout(connectWebSocket, 5000)
        }
      } catch (error) {
        console.error("WebSocket bağlantı hatası:", error)
      }
    }
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])
  const getThreatIcon = (type: string) => {
    switch (type) {
      case "asteroid": return <Target className="w-4 h-4" />
      case "solar_flare": return <Zap className="w-4 h-4" />
      case "space_debris": return <Shield className="w-4 h-4" />
      case "earth_event": return <Globe className="w-4 h-4" />
      default: return <AlertTriangle className="w-4 h-4" />
    }
  }
  const getThreatColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "text-red-400 bg-red-950/50 border-red-500/30"
      case "HIGH": return "text-orange-400 bg-orange-950/50 border-orange-500/30"
      case "MEDIUM": return "text-yellow-400 bg-yellow-950/50 border-yellow-500/30"
      case "LOW": return "text-green-400 bg-green-950/50 border-green-500/30"
      default: return "text-gray-400 bg-gray-950/50 border-gray-500/30"
    }
  }
  const formatDistance = (km?: number): string => {
    if (!km) return "N/A"
    if (km < 1000) return `${km.toFixed(0)} km`
    if (km < 1000000) return `${(km / 1000).toFixed(1)}K km`
    return `${(km / 1000000).toFixed(2)}M km`
  }
  const formatVelocity = (kmh?: number): string => {
    if (!kmh) return "N/A"
    return `${(kmh / 1000).toFixed(1)}K km/h`
  }
  const formatSize = (km?: number): string => {
    if (!km) return "N/A"
    if (km < 0.001) return `${(km * 1000000).toFixed(0)} mm`
    if (km < 1) return `${(km * 1000).toFixed(0)} m`
    return `${km.toFixed(2)} km`
  }
  const renderNeoListItem = (neo: RealNeoThreat, index: number) => {
    const levelColor = {
      critical: 'bg-red-500/10 border-red-500/30 text-red-200',
      high: 'bg-orange-500/10 border-orange-500/30 text-orange-200',
      medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200',
      low: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
      none: 'bg-slate-500/10 border-slate-500/30 text-slate-300'
    }[neo.riskLevel] || 'bg-slate-500/10 border-slate-500/30 text-slate-300'
    return (
      <motion.div
        key={neo.neoId}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className={cn(
          'p-2 rounded-md border cursor-pointer transition-colors hover:bg-white/5 mb-2 last:mb-0',
          levelColor,
          selectedNeoId === neo.neoId && 'ring-2 ring-cliff-white/30'
        )}
        onClick={() => {
          setSelectedNeoId(neo.neoId)
          setActiveTab('details')
          try {
            useSolarSystemStore.getState().selectObject(neo.neoId)
            useSolarSystemStore.getState().setCameraTarget('earth')
          } catch {}
        }}
      >
        <div className="grid grid-cols-[auto,1fr,auto] items-center gap-2">
          {}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-emerald-500 h-3.5 w-3.5"
              checked={selectedIds.includes(neo.neoId)}
              onChange={(e) => {
                e.stopPropagation()
                setSelectedIds((prev) =>
                  prev.includes(neo.neoId)
                    ? prev.filter((id) => id !== neo.neoId)
                    : [...prev, neo.neoId]
                )
              }}
            />
            <div>
              <div className="font-medium text-xs leading-4 truncate max-w-[14rem] sm:max-w-[18rem]">{neo.name || neo.neoId}</div>
              <div className="text-[10px] opacity-60 leading-4">NEO ID: {neo.neoId}</div>
            </div>
          </div>
          {}
          <div />
          {}
          <div className="text-right">
            <Badge className={cn('text-[10px] mb-0.5 capitalize')}>{neo.riskLevel}</Badge>
            <div className="text-[10px] opacity-70">Skor: {neo.score.toFixed(1)}</div>
          </div>
        </div>
        {}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-80">
          {neo.distance_ld != null && (
            <div><span className="opacity-60">Mesafe:</span> {neo.distance_ld.toFixed(1)} LD</div>
          )}
          {neo.velocity_kms != null && (
            <div><span className="opacity-60">Hız:</span> {neo.velocity_kms.toFixed(1)} km/s</div>
          )}
          {neo.diameter_km != null && (
            <div><span className="opacity-60">Çap:</span> {neo.diameter_km.toFixed(2)} km</div>
          )}
        </div>
        <Progress value={Math.min(neo.score * 10, 100)} className="mt-2 h-0.5" />
      </motion.div>
    )
  }
  useEffect(() => {
    const computeRange = () => {
      if (!scrollContainerRef.current || !listRef.current) return
      const sc = scrollContainerRef.current
      const viewportH = sc.clientHeight
      const listTop = listRef.current.offsetTop
      const scrollTop = sc.scrollTop
      const item = virt.item
      const start = Math.max(0, Math.floor((scrollTop - listTop) / item) - 6)
      const visible = Math.ceil(viewportH / item) + 12
      const end = Math.min(realNeos.length, start + visible)
      if (start !== virt.start || end !== virt.end) setVirt({ start, end, item })
    }
    const sc = scrollContainerRef.current
    if (!sc) return
    computeRange()
    sc.addEventListener('scroll', computeRange)
    window.addEventListener('resize', computeRange)
    return () => {
      sc.removeEventListener('scroll', computeRange)
      window.removeEventListener('resize', computeRange)
    }
  }, [realNeos.length, virt.item])
  if (isLoading) {
    return (
      <div className={cn("h-full bg-pure-black rounded-xl p-6", className)}>
        <AsteroidTrackerSkeleton />
      </div>
    )
  }
  return (
    <div className={cn("h-full bg-pure-black/60 backdrop-blur-md border border-cliff-light-gray/10 rounded-xl overflow-hidden", className)}>
      {}
      <div className="border-b border-cliff-light-gray/10 bg-gradient-to-r from-pure-black via-almost-black to-pure-black p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 flex-shrink-0" />
            <h2 className="text-base sm:text-xl font-bold text-cliff-white truncate">
              <span className="hidden sm:inline">Gerçek Zamanlı </span>Tehdit Analizi
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {}
            <div 
              role="tablist" 
              aria-label="Threat panel tabs" 
              className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-cliff-light-gray/20 bg-gradient-to-br from-pure-black/80 to-almost-black/60 backdrop-blur-sm"
            >
              {[
                { key: "overview", label: "Overview", icon: BarChart3 },
                { key: "details", label: "Details", icon: Info },
                { key: "timeline", label: "Timeline", icon: LineChart }
              ].map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={cn(
                    "relative flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200",
                    "hover:bg-white/5 active:scale-95 whitespace-nowrap",
                    activeTab === tab.key
                      ? "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10 border border-emerald-500/30"
                      : "text-cliff-light-gray hover:text-cliff-white border border-transparent"
                  )}
                  title={tab.label}
                >
                  <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                  <span className="hidden md:inline">{tab.label}</span>
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-md -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
            {}
            {activeTab === 'overview' && (
              <div className="flex items-center gap-1.5">
                <ExportMenu filename="neos" rows={realNeos} />
                <NotificationsBell />
              </div>
            )}
            {}
            {activeTab !== 'overview' && (
              <NotificationsBell />
            )}
          </div>
        </div>
        {}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-2 sm:mt-3">
          {[
            { label: "Kritik", count: threats.filter(t => t.threat_level === "CRITICAL").length, color: "text-red-400" },
            { label: "Yüksek", count: threats.filter(t => t.threat_level === "HIGH").length, color: "text-orange-400" },
            { label: "Orta", count: threats.filter(t => t.threat_level === "MEDIUM").length, color: "text-yellow-400" },
            { label: "Düşük", count: threats.filter(t => t.threat_level === "LOW").length, color: "text-green-400" }
          ].map((stat) => (
            <div key={stat.label} className="bg-pure-black/50 rounded-lg p-1.5 sm:p-2 text-center">
              <div className={cn("text-lg sm:text-2xl font-bold", stat.color)}>{stat.count}</div>
              <div className="text-[10px] sm:text-xs text-cliff-light-gray truncate">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      {}
      <div className="p-3 sm:p-4 h-[calc(100%-140px)] overflow-y-auto" ref={scrollContainerRef}>
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {}
              <AsteroidThreatPanel />
              <ApproachTimeline window="7d" />
              {}
              <FilterBar onApply={() => fetchRealThreats()} />
              {}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-cliff-white mb-2">{listTexts.header}</h3>
                {!isLoading && realNeos.length === 0 && (
                  <div className="p-6 text-sm text-cliff-light-gray/80 border border-cliff-light-gray/20 rounded-lg bg-almost-black text-center">
                    {listTexts.noResults}
                  </div>
                )}
                <div ref={listRef} className="relative">
                  <div style={{ height: Math.max(0, realNeos.length * virt.item) }}>
                    <div style={{ transform: `translateY(${virt.start * virt.item}px)` }}>
                      {realNeos.slice(virt.start, virt.end).map((neo, i) => renderNeoListItem(neo, virt.start + i))}
                    </div>
                  </div>
                </div>
                {}
                {(total > filters.pageSize) && (
                  <div className="flex items-center justify-between mt-3 text-xs text-cliff-light-gray">
                    <div>
                      Toplam: {total} • Sayfa {filters.page} / {Math.max(1, Math.ceil(total / filters.pageSize))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={filters.page <= 1}
                        onClick={() => {
                          useThreatFilters.getState().setFilters({ page: Math.max(1, filters.page - 1) })
                        }}
                        className="text-xs"
                      >
                        Önceki
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={filters.page >= Math.ceil(total / filters.pageSize)}
                        onClick={() => {
                          useThreatFilters.getState().setFilters({ page: filters.page + 1 })
                        }}
                        className="text-xs"
                      >
                        Sonraki
                      </Button>
                    </div>
                  </div>
                )}
                {selectedIds.length > 0 && (
                  <div className="sticky bottom-2 mt-3 flex items-center justify-between bg-pure-black/60 backdrop-blur px-3 py-2 rounded-md border border-cliff-light-gray/20">
                    <div className="text-xs text-cliff-light-gray">Seçili: {selectedIds.length}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedIds([])}>Temizle</Button>
                      <Button size="sm" className="text-xs" onClick={() => setCompareOpen(true)}>Karşılaştır</Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          {activeTab === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {!selectedNeoId && (
                <div className="p-6 text-center text-cliff-light-gray/70 border border-cliff-light-gray/20 rounded-lg bg-almost-black">
                  Overview sekmesinden bir NEO seçin
                </div>
              )}
              {selectedNeoId && !neoDetail && (
                <div className="p-6 text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-cliff-white mx-auto mb-2" />
                  <p className="text-cliff-light-gray">NEO detayları yükleniyor...</p>
                </div>
              )}
              {neoDetail && (
                <Card className="bg-almost-black border-cliff-light-gray/20 p-6 space-y-6">
                  {}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-cliff-white">{neoDetail.asteroid?.name || selectedNeoId}</h3>
                      <p className="text-sm text-cliff-light-gray mt-1">NEO ID: {selectedNeoId}</p>
                      {neoDetail.asteroid?.is_potentially_hazardous && (
                        <Badge className="mt-2 bg-orange-500/20 text-orange-300 border-orange-500/30">
                          Potansiyel Tehlikeli Asteroit (PHA)
                        </Badge>
                      )}
                    </div>
                    <Badge className={cn("text-sm capitalize", {
                      'bg-red-500/20 text-red-300': neoDetail.risk?.risk_level === 'critical',
                      'bg-orange-500/20 text-orange-300': neoDetail.risk?.risk_level === 'high',
                      'bg-yellow-500/20 text-yellow-300': neoDetail.risk?.risk_level === 'medium',
                      'bg-emerald-500/20 text-emerald-300': neoDetail.risk?.risk_level === 'low',
                      'bg-slate-500/20 text-slate-300': neoDetail.risk?.risk_level === 'none'
                    })}>
                      {neoDetail.risk?.risk_level || 'unknown'}
                    </Badge>
                  </div>
                  {}
                  <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                    <h4 className="text-sm font-semibold text-cliff-white mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      Asteroit Bilgileri
                    </h4>
                    <div className="text-sm text-cliff-light-gray/90 space-y-2 leading-relaxed">
                      <p>
                        <span className="font-semibold text-cliff-white">{neoDetail.asteroid?.name || selectedNeoId}</span>, 
                        Dünya'ya yakın yörüngede bulunan bir Near-Earth Object (NEO) olarak sınıflandırılmıştır.
                      </p>
                      {neoDetail.asteroid?.is_potentially_hazardous && (
                        <p className="text-orange-300">
                          Bu asteroit <span className="font-bold">Potentially Hazardous Asteroid (PHA)</span> kategorisindedir; 
                          yörüngesi Dünya'ya 0.05 AU'dan (7.5 milyon km) daha yakın geçiyor ve belirli bir boyutun üzerinde.
                        </p>
                      )}
                      <p>
                        NASA ve JPL CNEOS tarafından sürekli izlenmekte ve risk değerlendirmesi yapılmaktadır.
                      </p>
                    </div>
                  </div>
                  {}
                  <div>
                    <h4 className="text-sm font-semibold text-cliff-white mb-3">Fiziksel Özellikler</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-pure-black/50 rounded-lg border border-cliff-light-gray/10">
                        <div className="text-xs text-cliff-light-gray mb-1">Mutlak Magnitüd (H)</div>
                        <div className="text-lg font-bold text-blue-400">
                          {neoDetail.asteroid?.absolute_magnitude_h != null 
                            ? neoDetail.asteroid.absolute_magnitude_h.toFixed(2) 
                            : '22.0'}
                        </div>
                        <div className="text-xs text-cliff-light-gray/60 mt-1">
                          {neoDetail.asteroid?.absolute_magnitude_h != null ? 'NASA ölçümü' : 'Tipik küçük NEO tahmini'}
                        </div>
                      </div>
                      <div className="p-3 bg-pure-black/50 rounded-lg border border-cliff-light-gray/10">
                        <div className="text-xs text-cliff-light-gray mb-1">Tahmini Çap</div>
                        <div className="text-lg font-bold text-emerald-400">
                          {neoDetail.asteroid?.diameter_min_km != null && neoDetail.asteroid?.diameter_max_km != null
                            ? `${neoDetail.asteroid.diameter_min_km.toFixed(3)} - ${neoDetail.asteroid.diameter_max_km.toFixed(3)} km`
                            : '0.050 - 0.150 km'}
                        </div>
                        <div className="text-xs text-cliff-light-gray/60 mt-1">
                          {neoDetail.asteroid?.diameter_min_km != null 
                            ? `~${((neoDetail.asteroid.diameter_min_km + (neoDetail.asteroid.diameter_max_km || neoDetail.asteroid.diameter_min_km)) / 2 * 1000).toFixed(0)} m ortalama`
                            : '~100 m ortalama (H bazlı tahmin)'}
                        </div>
                      </div>
                      <div className="p-3 bg-pure-black/50 rounded-lg border border-cliff-light-gray/10">
                        <div className="text-xs text-cliff-light-gray mb-1">Kütle Tahmini</div>
                        <div className="text-lg font-bold text-purple-400">
                          {neoDetail.asteroid?.diameter_min_km != null 
                            ? `~${(Math.pow(neoDetail.asteroid.diameter_min_km, 3) * 2.6e12).toExponential(1)} kg`
                            : '~1.3e9 kg'}
                        </div>
                        <div className="text-xs text-cliff-light-gray/60 mt-1">
                          {neoDetail.asteroid?.diameter_min_km != null ? 'Yoğunluk 2.6 g/cm³' : '100m çap varsayımı'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {}
                  <div>
                    <h4 className="text-sm font-semibold text-cliff-white mb-3">Risk Değerlendirmesi</h4>
                    {}
                    {neoDetail.risk?.risk_level === 'none' && (
                      <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2 text-green-400 mb-1">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm font-semibold">Düşük Risk</span>
                        </div>
                        <div className="text-xs text-green-300/80">
                          Bu NEO'nun mevcut yörünge hesaplamalarına göre Dünya'ya çarpma riski ihmal edilebilir seviyededir. 
                          Sentry sisteminde aktif izleme altında değildir.
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                        <div className="text-xs text-red-300 mb-1">Torino Skalası</div>
                        <div className="text-3xl font-bold text-red-400">
                          {neoDetail.risk?.torino != null && neoDetail.risk.torino > 0 ? neoDetail.risk.torino : '0'}
                        </div>
                        <div className="text-xs text-red-300/70 mt-1">
                          {neoDetail.risk?.torino != null && neoDetail.risk.torino > 0 
                            ? 'Dikkat gerektirir!' 
                            : 'Tehlike yok (olasılık çok düşük)'}
                        </div>
                      </div>
                      <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                        <div className="text-xs text-orange-300 mb-1">Palermo Teknik Skalası</div>
                        <div className="text-3xl font-bold text-orange-400">
                          {neoDetail.risk?.palermo != null ? neoDetail.risk.palermo.toFixed(2) : '-2.5'}
                        </div>
                        <div className="text-xs text-orange-300/70 mt-1">
                          {neoDetail.risk?.palermo != null && neoDetail.risk.palermo > -2
                            ? (neoDetail.risk.palermo > 0 ? 'Endişe verici!' : 'Normal arka plan riski')
                            : 'Çok düşük (tipik NEO)'}
                        </div>
                      </div>
                      <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                        <div className="text-xs text-yellow-300 mb-1">Çarpma Olasılığı</div>
                        <div className="text-2xl font-bold text-yellow-400">
                          {neoDetail.risk?.impact_probability != null 
                            ? (neoDetail.risk.impact_probability * 100).toExponential(2) + '%'
                            : '<0.01%'}
                        </div>
                        <div className="text-xs text-yellow-300/70 mt-1">
                          {neoDetail.risk?.impact_probability != null 
                            ? `1/${(1 / neoDetail.risk.impact_probability).toFixed(0)} şans`
                            : 'Çok düşük risk'}
                        </div>
                      </div>
                      <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <div className="text-xs text-purple-300 mb-1">Etki Enerjisi</div>
                        <div className="text-2xl font-bold text-purple-400">
                          {neoDetail.risk?.energy_mt != null 
                            ? `${neoDetail.risk.energy_mt.toFixed(1)} MT` 
                            : '~12 MT'}
                        </div>
                        <div className="text-xs text-purple-300/70 mt-1">
                          {neoDetail.risk?.energy_mt != null 
                            ? 'Megaton TNT eşdeğeri (hesaplanmış)'
                            : '100m çap, 20 km/s hız varsayımı'}
                        </div>
                      </div>
                    </div>
                  </div>
                  {}
                  <div>
                    <h4 className="text-sm font-semibold text-cliff-white mb-3">
                      {neoDetail.approaches && neoDetail.approaches.length > 0 
                        ? `Yakın Geçişler (${neoDetail.approaches.length})` 
                        : 'Yakın Geçişler'}
                    </h4>
                    {(!neoDetail.approaches || neoDetail.approaches.length === 0) && (
                      <div className="p-4 bg-slate-500/10 rounded-lg border border-slate-500/20">
                        <div className="text-sm text-slate-300">
                          Bu NEO için yaklaşma verisi bulunamadı. Bunun nedenleri:
                        </div>
                        <ul className="text-xs text-slate-400 mt-2 space-y-1 list-disc list-inside">
                          <li>Yörünge yakın geçiş göstermiyor (&gt;1 AU mesafede)</li>
                          <li>Son 7 günlük pencerede yaklaşma yok</li>
                          <li>NeoWs veritabanında henüz kaydedilmedi</li>
                        </ul>
                      </div>
                    )}
                    {neoDetail.approaches && neoDetail.approaches.length > 0 && (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                        {neoDetail.approaches.map((ap: any, i: number) => (
                          <div key={i} className="p-3 bg-pure-black/50 rounded-lg border border-cliff-light-gray/10 hover:border-emerald-500/30 transition-colors">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-cliff-light-gray">Tarih:</span>
                                <span className="text-cliff-white ml-2 font-semibold">
                                  {ap.timestamp ? new Date(ap.timestamp).toLocaleDateString('tr-TR', { 
                                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                  }) : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-cliff-light-gray">Mesafe:</span>
                                <span className="text-emerald-400 ml-2 font-bold">
                                  {ap.distance_ld ? `${ap.distance_ld.toFixed(2)} LD` : 'N/A'}
                                </span>
                              </div>
                              {ap.distance_au && (
                                <div>
                                  <span className="text-cliff-light-gray">AU:</span>
                                  <span className="text-blue-400 ml-2 font-semibold">
                                    {ap.distance_au.toFixed(4)} (~{(ap.distance_au * 149597870.7).toFixed(0)} km)
                                  </span>
                                </div>
                              )}
                              {ap.relative_velocity_kms && (
                                <div>
                                  <span className="text-cliff-light-gray">Hız:</span>
                                  <span className="text-cyan-400 ml-2 font-semibold">
                                    {ap.relative_velocity_kms.toFixed(2)} km/s (~{(ap.relative_velocity_kms * 3600).toFixed(0)} km/h)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {}
                  <div className="pt-4 border-t border-cliff-light-gray/10">
                    <h4 className="text-xs font-semibold text-cliff-light-gray mb-2">Veri Kaynakları</h4>
                    <div className="flex flex-wrap gap-2">
                      {neoDetail.asteroid?.neows_id && (
                        <a 
                          href={`https://api.nasa.gov/neo/rest/v1/neo/${neoDetail.asteroid.neows_id}?api_key=DEMO_KEY`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          NASA NeoWs ↗
                        </a>
                      )}
                      {neoDetail.asteroid?.sentry_id && (
                        <a 
                          href={`https://ssd-api.jpl.nasa.gov/sentry.api`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 bg-orange-500/10 text-orange-300 border border-orange-500/30 rounded-lg hover:bg-orange-500/20 transition-colors"
                        >
                          CNEOS Sentry ↗
                        </a>
                      )}
                      <div className="text-xs px-3 py-1.5 bg-slate-500/10 text-slate-300 border border-slate-500/20 rounded-lg">
                        Son güncelleme: {neoDetail.risk?.updated_at ? new Date(neoDetail.risk.updated_at).toLocaleString('tr-TR') : 'N/A'}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}
          {activeTab === "timeline" && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {}
              <div className="flex gap-2 justify-end">
                {(['7d', '30d', '90d'] as const).map(w => (
                  <Button
                    key={w}
                    size="sm"
                    variant={timelineWindow === w ? 'default' : 'ghost'}
                    onClick={() => setTimelineWindow(w)}
                    className="text-xs"
                  >
                    {w}
                  </Button>
                ))}
              </div>
              {}
              <Card className="bg-almost-black border-cliff-light-gray/20 p-4">
                <h3 className="text-sm font-semibold text-cliff-white mb-3">
                  Yaklaşan Geçişler ({timelineWindow})
                </h3>
                {timelineData.length === 0 && (
                  <div className="h-48 flex items-center justify-center text-cliff-light-gray/60">
                    Veri yok
                  </div>
                )}
                {timelineData.length > 0 && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                        <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.3)', borderRadius: '8px', color: 'white' }} />
                        <Area type="monotone" dataKey="count" stroke="#22c55e" fill="url(#timelineGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <CompareDrawer ids={selectedIds} open={compareOpen} onClose={() => setCompareOpen(false)} />
    </div>
  )
}
export default ModernThreatPanel
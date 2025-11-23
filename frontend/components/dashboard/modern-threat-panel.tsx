"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertTriangle, TrendingUp, TrendingDown, Activity,
  Shield, Target, Zap, Clock, MapPin, Globe,
  ChevronRight, Info, AlertCircle, CheckCircle,
  Loader2, BarChart3, PieChart, LineChart,
  ChevronLeft, Brain
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
} from "recharts"
import FilterBar from "@/components/dashboard/filters/FilterBar"
import { useThreatFilters } from "@/stores/threatFilters"
import { searchAsteroids } from "@/lib/api/asteroids"
import CompareDrawer from "@/components/dashboard/compare/CompareDrawer"
import ExportMenu from "@/components/dashboard/export/ExportMenu"
import NotificationsBell from "@/components/dashboard/notifications/NotificationsBell"
import AIInsightsWidget from "@/components/dashboard/ai-insights-widget"

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
  const [statsData, setStatsData] = useState({ critical: 0, high: 0, medium: 0, low: 0 })
  const [selectedNeoId, setSelectedNeoId] = useState<string | null>(null)
  const [neoDetail, setNeoDetail] = useState<NeoDetail | null>(null)
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [timelineWindow, setTimelineWindow] = useState<'7d' | '30d' | '90d'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "timeline">("overview")
  const wsRef = useRef<WebSocket | null>(null)
  const { filters } = useThreatFilters()
  // Ensure default sort is -risk for Sentry mode
  useEffect(() => {
    if (!filters.sort) {
      useThreatFilters.getState().setFilters({ sort: '-risk' })
    }
  }, [])

  const [total, setTotal] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const [virt, setVirt] = useState<{ start: number; end: number; item: number }>({ start: 0, end: 30, item: 72 })
  const [listTexts, setListTexts] = useState({
    header: "NEO Listesi",
    noResults: "Kriterlere uygun NEO bulunamadı."
  })

  
  const stats = useMemo(() => {
    // Use backend provided global stats if available (for Sentry/Full view)
    if (statsData.critical + statsData.high + statsData.medium + statsData.low > 0) {
        return statsData
    }

    // Fallback: Calculate stats based on the currently displayed list
    const source = realNeos.map(n => ({
      threat_level: n.riskLevel.toUpperCase() as any
    }))

    return {
      critical: source.filter(t => t.threat_level === "CRITICAL").length,
      high: source.filter(t => t.threat_level === "HIGH").length,
      medium: source.filter(t => t.threat_level === "MEDIUM").length,
      low: source.filter(t => t.threat_level === "LOW").length,
    }
  }, [realNeos, statsData])

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

  
  const uniqueItems = Array.from(new Map(items.map(item => [item.neoId, item])).values());
  setRealNeos(uniqueItems)
  setTotal(result.total || 0)
  
  setVirt({ start: 0, end: 30, item: 140 })
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

  useEffect(() => {
    
    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchRealThreats(),
          fetchTimelineData(timelineWindow)
        ])
      } finally {
        setIsLoading(false)
      }
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    if (activeTab === 'overview') {
      
      searchAsteroids({
        q: filters.q,
        risk: filters.risks,
        min_diameter_km: filters.minDiameterKm,
        max_diameter_km: filters.maxDiameterKm,
        max_ld: filters.maxLd,
        window_days: filters.windowDays,
        page: filters.page,
        page_size: filters.pageSize,
        sort: filters.sort,
      }).then(result => {
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
        const uniqueItems = Array.from(new Map(items.map(item => [item.neoId, item])).values());
        setRealNeos(uniqueItems)
        setTotal(result.total || 0)
        setVirt({ start: 0, end: 30, item: 140 })
      }).catch(console.error)
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
          ? "wss://" + (typeof window !== "undefined" ? window.location.host : "localhost") + "/ws/threats"
          : "ws://localhost:8000/ws/threats"
        wsRef.current = new WebSocket(wsUrl)
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === "new_threat") {
              setThreats(prev => [data.threat, ...prev].slice(0, 50))
            }
          } catch (error) { console.error(error) }
        }
        wsRef.current.onclose = () => setTimeout(connectWebSocket, 5000)
      } catch (error) { console.error(error) }
    }
    connectWebSocket()
    return () => wsRef.current?.close()
  }, [])

  const renderNeoListItem = (neo: RealNeoThreat, index: number) => {
    const levelColor = {
      critical: 'bg-red-500/10 border-red-500/30 text-red-200 hover:bg-red-500/20',
      high: 'bg-orange-500/10 border-orange-500/30 text-orange-200 hover:bg-orange-500/20',
      medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/20',
      low: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20',
      none: 'bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20'
    }[neo.riskLevel] || 'bg-slate-500/10 border-slate-500/30 text-slate-300'

    return (
      <motion.div
        key={neo.neoId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={cn(
          'group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 mb-2 last:mb-0',
          levelColor,
          selectedNeoId === neo.neoId && 'ring-1 ring-white/50 shadow-lg shadow-black/50'
        )}
        onClick={(e) => {
          
          if ((e.target as HTMLElement).closest('input[type="checkbox"]') || (e.target as HTMLElement).closest('.selection-area')) {
            return;
          }
          
          setSelectedNeoId(neo.neoId)
          setActiveTab('details')
          try {
            useSolarSystemStore.getState().selectObject(neo.neoId)
            useSolarSystemStore.getState().setCameraTarget('earth')
          } catch {}
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="selection-area w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer z-10"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedIds(prev => prev.includes(neo.neoId) ? prev.filter(id => id !== neo.neoId) : [...prev, neo.neoId])
              }}
            >
               {selectedIds.includes(neo.neoId) && <CheckCircle className="w-3 h-3" />}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm truncate text-white/90 group-hover:text-white">
                {neo.name || neo.neoId}
              </div>
              <div className="text-[10px] opacity-60 font-mono">ID: {neo.neoId}</div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-white/10 bg-black/20 uppercase tracking-wider">
               {neo.riskLevel}
             </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
          <div className="text-center">
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Mesafe</div>
            <div className="text-xs font-medium text-white/80">
              {neo.distance_ld ? neo.distance_ld.toFixed(1) + ' LD' : '-'}
            </div>
          </div>
          <div className="text-center border-l border-white/5">
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Hız</div>
            <div className="text-xs font-medium text-white/80">
              {neo.velocity_kms ? neo.velocity_kms.toFixed(1) + ' km/s' : '-'}
            </div>
          </div>
          <div className="text-center border-l border-white/5">
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Çap</div>
            <div className="text-xs font-medium text-white/80">
              {neo.diameter_km ? neo.diameter_km.toFixed(2) + ' km' : '-'}
            </div>
          </div>
        </div>
        
        {/* AI Yorumu */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px]">
            <Brain className="w-3 h-3 text-blue-400" />
            <span className="text-blue-300 font-medium">AI:</span>
            <span className="text-white/60">
              {neo.riskLevel === 'critical' ? 'Yüksek risk - Acil izleme' :
               neo.riskLevel === 'high' ? 'Dikkat gerekli - Yakın takip' :
               neo.riskLevel === 'medium' ? 'Orta risk - İzleme önerilir' :
               'Güvenli - Rutin kontrol'}
            </span>
          </div>
        </div>
      </motion.div>
    )
  }

  
  useEffect(() => {
    const computeRange = () => {
      if (!scrollContainerRef.current || !listRef.current) return
      const sc = scrollContainerRef.current
      
      const item = 140 
      const start = Math.max(0, Math.floor(sc.scrollTop / item))
      
      const visible = Math.ceil(sc.clientHeight / item) + 2 
      const end = Math.min(realNeos.length, start + visible)
      
      
      if (start !== virt.start || end !== virt.end) {
        setVirt({ start, end, item })
      }
    }
    const sc = scrollContainerRef.current
    if (sc) {
      sc.addEventListener('scroll', computeRange)
      computeRange()
    }
    return () => sc?.removeEventListener('scroll', computeRange)
  }, [realNeos.length, virt.item])

  if (isLoading) {
    return (
      <div className={cn("h-full bg-pure-black rounded-xl p-6", className)}>
        <AsteroidTrackerSkeleton />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full bg-pure-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl", className)}>
      
      {}
      <div className="flex-none p-4 border-b border-white/5 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-none">Tehdit Analizi</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-white/60">NASA CNEOS</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">AI ACTIVE</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
            {[
              { id: 'overview', icon: BarChart3 },
              { id: 'details', icon: Info },
              { id: 'timeline', icon: LineChart },
            ].map(t => (
               <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "p-2 rounded-md transition-all",
                  activeTab === t.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                )}
               >
                 <t.icon className="w-4 h-4" />
               </button>
            ))}
          </div>
        </div>

        {}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "KRİTİK", count: stats.critical, color: "bg-red-500", text: "text-red-500" },
            { label: "YÜKSEK", count: stats.high, color: "bg-orange-500", text: "text-orange-500" },
            { label: "ORTA", count: stats.medium, color: "bg-yellow-500", text: "text-yellow-500" },
            { label: "DÜŞÜK", count: stats.low, color: "bg-emerald-500", text: "text-emerald-500" },
          ].map(s => (
            <div key={s.label} className="bg-black/40 rounded-lg p-2 border border-white/5 flex flex-col items-center justify-center group hover:border-white/10 transition-colors">
              <div className={cn("text-xl font-bold mb-0.5", s.text)}>{s.count}</div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", s.color)} />
                <span className="text-[9px] font-medium text-white/40 tracking-wider">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex-none px-4 py-2 border-b border-white/5 bg-black/20 backdrop-blur-sm z-10">
        <FilterBar />
      </div>

      {/* Scrollable List Area */}
      <div className="flex-1 min-h-0 relative">
        <div 
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          <AnimatePresence mode="wait">
            {activeTab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pb-16 min-h-full" 
              >

                <div className="p-4 space-y-4">
                {realNeos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/30 border border-dashed border-white/10 rounded-xl bg-black/20">
                    <Target className="w-8 h-8 mb-3 opacity-50" />
                    <p className="text-sm">{listTexts.noResults}</p>
                  </div>
                ) : (
                  <div ref={listRef} className="relative">
                    <div style={{ height: Math.max(0, realNeos.length * virt.item) }}>
                       <div style={{ transform: "translateY(" + (virt.start * virt.item) + "px)" }}>
                         {realNeos.slice(virt.start, virt.end).map((neo, i) => renderNeoListItem(neo, virt.start + i))}
                       </div>
                    </div>
                  </div>
                )}
                </div>
              </motion.div>
            )}

            {activeTab === "details" && (
              <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 p-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveTab("overview")}
                  className="text-white/60 hover:text-white -ml-2"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Listeye Dön
                </Button>
                
                {!selectedNeoId ? (
                  <div className="text-center py-12 text-white/40">Bir NEO seçiniz</div>
                ) : !neoDetail ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
                ) : (
                  <div className="space-y-4">
                    <Card className="bg-black/40 border-white/10 p-5">
                       <h3 className="text-xl font-bold text-white mb-1">{neoDetail.asteroid?.name}</h3>
                       <div className="flex gap-2 mb-4">
                         <Badge className="bg-white/10 hover:bg-white/20 text-white/70 border-0">ID: {selectedNeoId}</Badge>
                         {neoDetail.asteroid?.is_potentially_hazardous === true && typeof neoDetail.asteroid?.absolute_magnitude_h === 'number' && (
                           <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">TEHLİKELİ</Badge>
                         )}
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3 text-xs">
                         <div className="p-3 rounded bg-white/5 border border-white/5">
                           <div className="opacity-50 mb-1">Mutlak Magnitüd</div>
                           <div className="text-lg font-mono text-cyan-400">{neoDetail.asteroid?.absolute_magnitude_h || 'N/A'}</div>
                         </div>
                         <div className="p-3 rounded bg-white/5 border border-white/5">
                           <div className="opacity-50 mb-1">Tahmini Çap</div>
                           <div className="text-lg font-mono text-emerald-400">
                             {neoDetail.asteroid?.diameter_min_km ? '~' + neoDetail.asteroid.diameter_min_km.toFixed(3) + ' km' : 'N/A'}
                           </div>
                         </div>
                         {neoDetail.asteroid?.orbital_data && (
                           <>
                             <div className="p-3 rounded bg-white/5 border border-white/5">
                               <div className="opacity-50 mb-1">Yörünge Periyodu</div>
                               <div className="text-lg font-mono text-yellow-400">
                                 {neoDetail.asteroid.orbital_data.orbital_period ? parseFloat(neoDetail.asteroid.orbital_data.orbital_period).toFixed(0) + ' gün' : 'N/A'}
                               </div>
                             </div>
                             <div className="p-3 rounded bg-white/5 border border-white/5">
                               <div className="opacity-50 mb-1">Yörünge Sınıfı</div>
                               <div className="text-lg font-mono text-purple-400 truncate">
                                 {neoDetail.asteroid.orbital_data.orbit_class?.orbit_class_type || 'N/A'}
                               </div>
                             </div>
                           </>
                         )}
                       </div>

                       {neoDetail.asteroid?.orbital_data && (
                         <div className="mt-4 pt-4 border-t border-white/10">
                           <h4 className="text-sm font-semibold text-white/80 mb-3">Yörünge Detayları</h4>
                           <div className="grid grid-cols-3 gap-2 text-[10px]">
                             <div className="bg-black/20 p-2 rounded">
                               <span className="block opacity-50">Aphelion (En Uzak)</span>
                               <span className="font-mono">{parseFloat(neoDetail.asteroid.orbital_data.aphelion_distance || 0).toFixed(3)} AU</span>
                             </div>
                             <div className="bg-black/20 p-2 rounded">
                               <span className="block opacity-50">Perihelion (En Yakın)</span>
                               <span className="font-mono">{parseFloat(neoDetail.asteroid.orbital_data.perihelion_distance || 0).toFixed(3)} AU</span>
                             </div>
                             <div className="bg-black/20 p-2 rounded">
                               <span className="block opacity-50">Eğiklik (Inclination)</span>
                               <span className="font-mono">{parseFloat(neoDetail.asteroid.orbital_data.inclination || 0).toFixed(2)}°</span>
                             </div>
                             <div className="bg-black/20 p-2 rounded">
                               <span className="block opacity-50">Dış Merkezlik</span>
                               <span className="font-mono">{parseFloat(neoDetail.asteroid.orbital_data.eccentricity || 0).toFixed(4)}</span>
                             </div>
                             <div className="bg-black/20 p-2 rounded">
                               <span className="block opacity-50">Yarı Büyük Eksen</span>
                               <span className="font-mono">{parseFloat(neoDetail.asteroid.orbital_data.semi_major_axis || 0).toFixed(3)} AU</span>
                             </div>
                             <div className="bg-black/20 p-2 rounded">
                               <span className="block opacity-50">Ortalama Hız</span>
                               <span className="font-mono">{parseFloat(neoDetail.asteroid.orbital_data.mean_motion || 0).toFixed(3)}°/gün</span>
                             </div>
                           </div>
                         </div>
                       )}
                    </Card>

                    <Card className="bg-black/40 border-white/10 p-5">
                      <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        Yaklaşma Verileri (Sonraki 5 Geçiş)
                      </h4>
                      
                      {neoDetail.approaches && neoDetail.approaches.length > 0 ? (
                        <div className="space-y-2">
                          {neoDetail.approaches.slice(0, 5).map((approach, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                              <div>
                                <div className="text-xs font-medium text-white">
                                  {new Date(approach.timestamp).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <div className="text-[10px] opacity-50">{new Date(approach.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-xs font-mono text-cyan-400">
                                  {approach.distance_ld ? approach.distance_ld.toFixed(1) + ' LD' : 'N/A'}
                                </div>
                                <div className="text-[10px] opacity-50">
                                  {approach.relative_velocity_kms ? approach.relative_velocity_kms.toFixed(1) + ' km/s' : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-white/30 text-xs">
                          Yaklaşan geçiş verisi bulunamadı.
                        </div>
                      )}
                    </Card>

                    {/* AI Insights Widget */}
                    <AIInsightsWidget
                      selectedAsteroidId={selectedNeoId}
                      onRequestAnalysis={(asteroidId) => {
                        console.log('AI analizi istendi:', asteroidId)
                        // Burada AI analizi tetiklenebilir
                      }}
                    />

                    <div className="flex gap-2">
                      <a
                        href={"https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=" + selectedNeoId}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 text-xs py-2 rounded border border-blue-600/30 text-center transition-colors"
                      >
                        NASA JPL Detayı ↗
                      </a>
                      <a
                        href={"https://cneos.jpl.nasa.gov/sentry/details.html#?des=" + selectedNeoId}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-orange-600/20 hover:bg-orange-600/30 text-orange-200 text-xs py-2 rounded border border-orange-600/30 text-center transition-colors"
                      >
                        Sentry Risk Analizi ↗
                      </a>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "timeline" && (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 p-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">Yaklaşan Geçişler</h3>
                    <div className="flex bg-white/5 rounded-lg p-0.5">
                      {(['7d', '30d', '90d'] as const).map(w => (
                        <button
                          key={w}
                          onClick={() => setTimelineWindow(w)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-medium rounded transition-all",
                            timelineWindow === w ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                          )}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="h-64 w-full bg-black/20 rounded-xl border border-white/5 p-4">
                   <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timelineData}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.5}/>
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="#ffffff20" fontSize={10} tickLine={false} />
                        <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                        <Area type="monotone" dataKey="count" stroke="#06b6d4" fill="url(#grad)" />
                      </AreaChart>
                   </ResponsiveContainer>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {}
      {activeTab === "overview" && (
        <div className="flex-none p-3 border-t border-white/5 bg-black/40 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs">
            <div className="text-white/40">
              Sayfa <span className="text-white font-mono">{filters.page}</span> / {Math.max(1, Math.ceil(total / filters.pageSize))}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => useThreatFilters.getState().setFilters({ page: Math.max(1, filters.page - 1) })}
                className="h-7 px-2 text-[10px] border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= Math.ceil(total / filters.pageSize)}
                onClick={() => useThreatFilters.getState().setFilters({ page: filters.page + 1 })}
                className="h-7 px-2 text-[10px] border-white/10 bg-white/5 hover:bg-white/10 text-white"
              >
                Sonraki
              </Button>
            </div>
          </div>
          
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-center justify-between bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 rounded-lg"
            >
              <span className="text-cyan-400 font-medium">{selectedIds.length} seçili</span>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds([])} className="text-white/60 hover:text-white text-[10px]">İptal</button>
                <button onClick={() => setCompareOpen(true)} className="bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-bold px-2 py-1 rounded">Karşılaştır</button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      <CompareDrawer ids={selectedIds} open={compareOpen} onClose={() => setCompareOpen(false)} />
    </div>
  )
}

export default ModernThreatPanel

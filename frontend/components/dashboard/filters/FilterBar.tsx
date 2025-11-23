"use client"
import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useThreatFilters, RiskFilter } from '@/stores/threatFilters'
import { Filter, X, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  onApply?: () => void
}

const riskOptions: RiskFilter[] = ['critical', 'high', 'medium', 'low', 'none']

export default function FilterBar({ onApply }: Props) {
  const { filters, setFilters, reset } = useThreatFilters()
  const [isOpen, setIsOpen] = useState(false)
  
  const [q, setQ] = useState(filters.q ?? '')
  const [risks, setRisks] = useState<RiskFilter[]>(filters.risks)
  const [diameter, setDiameter] = useState<[number, number]>([
    filters.minDiameterKm ?? 0,
    filters.maxDiameterKm ?? 5,
  ])
  const [maxLd, setMaxLd] = useState<number | undefined>(filters.maxLd)
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(filters.windowDays)
  const [sort, setSort] = useState(filters.sort)

  // Sync local state with store
  useEffect(() => {
    setQ(filters.q ?? '')
    setRisks(filters.risks)
    setDiameter([
      filters.minDiameterKm ?? 0,
      filters.maxDiameterKm ?? 5,
    ])
    setMaxLd(filters.maxLd)
    setWindowDays(filters.windowDays)
    setSort(filters.sort)
  }, [filters])

  const activeFilterCount = [
    filters.q ? 1 : 0,
    filters.risks.length > 0 ? 1 : 0,
    (filters.minDiameterKm || filters.maxDiameterKm) ? 1 : 0,
    filters.maxLd ? 1 : 0
  ].reduce((a, b) => a + b, 0)

  const apply = () => {
    const minVal = Math.max(0, Math.min(diameter[0] ?? 0, diameter[1] ?? 0))
    const maxVal = Math.max(diameter[0] ?? 0, diameter[1] ?? 0)
    setFilters({
      q: q || undefined,
      risks,
      minDiameterKm: Number.isFinite(minVal) ? minVal : undefined,
      maxDiameterKm: Number.isFinite(maxVal) ? maxVal : undefined,
      maxLd: maxLd || undefined,
      windowDays,
      sort,
      page: 1,
    })
    onApply?.()
    setIsOpen(false)
  }

  const clear = () => {
    reset()
    onApply?.()
  }

  return (
    <div className="w-full">
      {/* Header / Toggle Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                    placeholder="Hızlı Arama (İsim / ID)..."
                    className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-500/50 transition-colors"
                />
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-8 px-3 text-xs gap-2 border transition-all",
                    isOpen ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                )}
            >
                <Filter className="w-3.5 h-3.5" />
                Filtrele
                {activeFilterCount > 0 && (
                    <Badge className="h-4 px-1 bg-cyan-500 text-black text-[9px]">{activeFilterCount}</Badge>
                )}
                {isOpen ? <ChevronUp className="w-3 h-3 ml-1 opacity-50" /> : <ChevronDown className="w-3 h-3 ml-1 opacity-50" />}
            </Button>
        </div>
        
        {/* Sort Dropdown (Always visible) */}
        <select
            className="bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-xs text-white/80 outline-none cursor-pointer hover:border-white/20"
            value={sort}
            onChange={(e) => {
                setSort(e.target.value as any)
                // Apply sort immediately
                useThreatFilters.getState().setFilters({ sort: e.target.value as any })
            }}
        >
            <option value="-risk">Risk (Azalan)</option>
            <option value="risk">Risk (Artan)</option>
            <option value="-palermo">Palermo (Azalan)</option>
            <option value="palermo">Palermo (Artan)</option>
            <option value="-diameter">Çap (Büyükten Küçüğe)</option>
            <option value="diameter">Çap (Küçükten Büyüğe)</option>
        </select>
      </div>

      {/* Collapsible Filter Area */}
      <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
            >
                <div className="mt-3 pt-3 border-t border-white/5 bg-black/40 rounded-lg p-4 space-y-4">
                    
                    {/* Risk Selection */}
                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 block">Risk Seviyesi</label>
                        <div className="flex flex-wrap gap-2">
                            {riskOptions.map((r) => {
                                const active = risks.includes(r)
                                const colors = {
                                    critical: "text-red-400 border-red-500/30 bg-red-500/10",
                                    high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
                                    medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
                                    low: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
                                    none: "text-slate-400 border-slate-500/30 bg-slate-500/10"
                                }[r]
                                
                                return (
                                    <button
                                        key={r}
                                        onClick={() => setRisks(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                                        className={cn(
                                            "text-xs px-3 py-1.5 rounded-md border transition-all capitalize",
                                            active ? colors : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white/70"
                                        )}
                                    >
                                        {r}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Diameter Slider */}
                        <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 block">
                                Çap Aralığı (km)
                            </label>
                            <div className="px-2 py-2">
                                <Slider
                                    min={0}
                                    max={10}
                                    step={0.1}
                                    value={diameter}
                                    onValueChange={(v) => setDiameter([v[0], v[1]])}
                                    className="my-4"
                                />
                                <div className="flex justify-between text-xs font-mono text-cyan-400">
                                    <span>{diameter[0]} km</span>
                                    <span>{diameter[1]} km</span>
                                </div>
                            </div>
                        </div>

                        {/* Distance Input */}
                        <div>
                            <label className="text-[10px] uppercase tracking-wider text-white/40 font-semibold mb-2 block">
                                Maksimum Mesafe (LD)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={maxLd ?? ''}
                                onChange={(e) => setMaxLd(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Tümü"
                                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                        <Button size="sm" variant="ghost" onClick={clear} className="h-7 text-xs text-white/50 hover:text-white hover:bg-white/10">
                            Sıfırla
                        </Button>
                        <Button size="sm" onClick={apply} className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white border-0">
                            Uygula
                        </Button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

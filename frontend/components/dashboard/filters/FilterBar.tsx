"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useThreatFilters, RiskFilter } from '@/stores/threatFilters'
import { loadMessages } from '@/lib/messages'
type Props = {
  onApply?: () => void
}
const riskOptions: RiskFilter[] = ['critical', 'high', 'medium', 'low', 'none']
export default function FilterBar({ onApply }: Props) {
  const { filters, setFilters, reset } = useThreatFilters()
  const [q, setQ] = useState(filters.q ?? '')
  const [risks, setRisks] = useState<RiskFilter[]>(filters.risks)
  const [diameter, setDiameter] = useState<[number, number]>([
    filters.minDiameterKm ?? 0,
    filters.maxDiameterKm ?? 5,
  ])
  const [maxLd, setMaxLd] = useState<number | undefined>(filters.maxLd)
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(filters.windowDays)
  const [sort, setSort] = useState(filters.sort)
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
  }
  const clear = () => {
    reset()
    onApply?.()
  }
  const windowButtons: (7 | 30 | 90)[] = [7, 30, 90]
  return (
    <div className="w-full bg-almost-black border border-cliff-light-gray/20 rounded-lg p-3">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        {}
        <div className="col-span-1 md:col-span-2">
          <label className="text-xs text-cliff-light-gray">Arama</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="NEO adı veya ID"
            className="mt-1 w-full bg-pure-black border border-cliff-light-gray/20 rounded-md px-3 py-2 text-sm text-cliff-white placeholder:text-cliff-light-gray/50 outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        {}
        <div>
          <label className="text-xs text-cliff-light-gray">Risk</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {riskOptions.map((r) => {
              const active = risks.includes(r)
              return (
                <button
                  key={r}
                  onClick={() =>
                    setRisks((prev) =>
                      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
                    )
                  }
                  className={cn(
                    "text-xs px-2 py-1 rounded-md border transition-colors",
                    active
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-pure-black text-cliff-light-gray border-cliff-light-gray/20 hover:border-emerald-500/30"
                  )}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </div>
        {}
        <div>
          <label className="text-xs text-cliff-light-gray">Çap (km)</label>
          <div className="px-1 space-y-2">
            <div>
              <div className="text-[11px] text-cliff-light-gray/60 mb-1">Min</div>
              <Slider
                min={0}
                max={10}
                step={0.1}
                value={[diameter?.[0] ?? 0]}
                onValueChange={(v) => {
                  const nextMin = v[0]
                  const nextMax = Math.max(nextMin, diameter?.[1] ?? nextMin)
                  setDiameter([nextMin, nextMax])
                }}
              />
              <div className="text-[11px] text-cliff-light-gray/70 mt-1">{(diameter?.[0] ?? 0).toFixed(1)} km</div>
            </div>
            <div>
              <div className="text-[11px] text-cliff-light-gray/60 mb-1">Max</div>
              <Slider
                min={0}
                max={10}
                step={0.1}
                value={[diameter?.[1] ?? 5]}
                onValueChange={(v) => {
                  const nextMax = v[0]
                  const nextMin = Math.min(diameter?.[0] ?? nextMax, nextMax)
                  setDiameter([nextMin, nextMax])
                }}
              />
              <div className="text-[11px] text-cliff-light-gray/70 mt-1">{(diameter?.[1] ?? 5).toFixed(1)} km</div>
            </div>
          </div>
        </div>
        {}
        <div>
          <label className="text-xs text-cliff-light-gray">Maks. Mesafe (LD)</label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={maxLd ?? ''}
            onChange={(e) => setMaxLd(e.target.value === '' ? undefined : Number(e.target.value))}
            placeholder="örn. 5"
            className="mt-1 w-full bg-pure-black border border-cliff-light-gray/20 rounded-md px-3 py-2 text-sm text-cliff-white placeholder:text-cliff-light-gray/50 outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
        </div>
        {}
        <div>
          <label className="text-xs text-cliff-light-gray">Pencere / Sıralama</label>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex gap-1">
              {windowButtons.map((w) => (
                <button
                  key={w}
                  onClick={() => setWindowDays(w)}
                  className={cn(
                    "text-[11px] px-2 py-1 rounded-md border",
                    windowDays === w
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-pure-black text-cliff-light-gray border-cliff-light-gray/20 hover:border-emerald-500/30"
                  )}
                >
                  {w}g
                </button>
              ))}
            </div>
            <select
              className="bg-pure-black border border-cliff-light-gray/20 rounded-md px-2 py-1 text-xs text-cliff-white"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="-risk">Risk (azalan)</option>
              <option value="risk">Risk (artan)</option>
              <option value="date">Tarih (artan)</option>
              <option value="-date">Tarih (azalan)</option>
              <option value="diameter">Çap (artan)</option>
              <option value="-diameter">Çap (azalan)</option>
              <option value="name">İsim (A→Z)</option>
              <option value="-name">İsim (Z→A)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={clear} className="text-xs">
          Temizle
        </Button>
        <Button size="sm" onClick={apply} className="text-xs">
          Uygula
        </Button>
      </div>
    </div>
  )
}

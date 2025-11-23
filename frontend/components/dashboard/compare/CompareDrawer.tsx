"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { compareAsteroids } from '@/lib/api/asteroids'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
type CompareItem = {
  neoId: string
  name?: string
  risk_level?: string
  impact_probability?: number
  torino?: number
  palermo?: number
  diameter_min_km?: number
  diameter_max_km?: number
  next_approach?: {
    timestamp?: string
    distance_ld?: number
    relative_velocity_kms?: number
  }
}
type Props = {
  ids: string[]
  open: boolean
  onClose: () => void
}
export default function CompareDrawer({ ids, open, onClose }: Props) {
  const [items, setItems] = useState<CompareItem[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const run = async () => {
      if (!open || ids.length === 0) return
      setLoading(true)
      try {
        const res = await compareAsteroids(ids)
        setItems(res.items || [])
      } catch (e) {
        setItems([])
        console.error('compare failed', e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [open, ids])
  const radarData = useMemo(() => {
    return items.map((it) => ({
      subject: it.name || it.neoId,
      diameter: (it.diameter_max_km ?? it.diameter_min_km ?? 0) * 100, 
      probability: (it.impact_probability ?? 0) * 1000,
      velocity: (it.next_approach?.relative_velocity_kms ?? 0) * 3,
      proximity: Math.max(0, 100 - (it.next_approach?.distance_ld ?? 100)),
    }))
  }, [items])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-almost-black border-l border-cliff-light-gray/20 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-cliff-white">NEO Karşılaştırma Analizi</h3>
          <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">Kapat</Button>
        </div>
        {loading && (
          <div className="text-xs text-cliff-light-gray">Yükleniyor...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="text-xs text-cliff-light-gray">Seçili NEO bulunamadı.</div>
        )}
        {!loading && items.length > 0 && (
          <div className="space-y-3">
            <Card className="bg-pure-black/40 border-cliff-light-gray/20 p-3">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius={90}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    {radarData.map((_d, idx) => (
                      <Radar key={idx} dataKey={Object.keys(radarData[0] || {})[1 + (idx % 4)]} stroke="#34d399" fill="#10b981" fillOpacity={0.2} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-cliff-light-gray/80">
                  <tr className="text-left">
                    <th className="py-2">NEO</th>
                    <th>Risk</th>
                    <th>Torino</th>
                    <th>Palermo</th>
                    <th>Çap (km)</th>
                    <th>Mesafe (LD)</th>
                    <th>Hız (km/s)</th>
                  </tr>
                </thead>
                <tbody className="text-cliff-white/90">
                  {items.map((it) => (
                    <tr key={it.neoId} className="border-t border-cliff-light-gray/10">
                      <td className="py-2">{it.name || it.neoId}</td>
                      <td className="capitalize">{it.risk_level || 'none'}</td>
                      <td>{it.torino ?? '-'}</td>
                      <td>{it.palermo != null ? it.palermo.toFixed(2) : '-'}</td>
                      <td>{(it.diameter_max_km ?? it.diameter_min_km ?? 0).toFixed(3)}</td>
                      <td>{it.next_approach?.distance_ld != null ? it.next_approach.distance_ld.toFixed(2) : '-'}</td>
                      <td>{it.next_approach?.relative_velocity_kms != null ? it.next_approach.relative_velocity_kms.toFixed(2) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

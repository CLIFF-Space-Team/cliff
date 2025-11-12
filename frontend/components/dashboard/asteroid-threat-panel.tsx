'use client'
import React, { useEffect, useState } from 'react'
import { useNeoThreatOverview } from '@/hooks/use-neo-threat-overview'
import { getMessage } from '@/lib/messages'
interface Props { className?: string }
export const AsteroidThreatPanel: React.FC<Props> = ({ className }) => {
  const { data, loading, error } = useNeoThreatOverview()
  const [labels, setLabels] = useState({
    title: 'Gerçek Zamanlı Asteroit Tehdit Analizi',
    critical: 'Kritik', high: 'Yüksek', medium: 'Orta', low: 'Düşük', none: 'Yok'
  })
  useEffect(() => {
    ;(async () => {
      const title = await getMessage('threat.title', labels.title)
      const critical = await getMessage('threat.counters.critical', labels.critical)
      const high = await getMessage('threat.counters.high', labels.high)
      const medium = await getMessage('threat.counters.medium', labels.medium)
      const low = await getMessage('threat.counters.low', labels.low)
      const none = await getMessage('threat.counters.none', labels.none)
      setLabels({ title, critical, high, medium, low, none })
    })()
  }, [])
  const counters = data?.counters || { critical: 0, high: 0, medium: 0, low: 0, none: 0 }
  return (
    <div className={`rounded-xl backdrop-blur-lg bg-white/5 border border-white/10 p-4 ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">{labels.title}</h3>
        <span className="text-xs text-white/60">
          {loading ? 'Yükleniyor...' : new Date(data?.updatedAt || Date.now()).toLocaleString()}
        </span>
      </div>
      {}
      <div className="text-[11px] text-white/50 mb-2">
        {error ? 'Bağlantı yok - demo değerler gösteriliyor' : 'Canlı veri'}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { key: 'critical', label: labels.critical, color: 'bg-red-600/25 text-red-200 border-red-500/40 shadow-lg shadow-red-500/10' },
          { key: 'high', label: labels.high, color: 'bg-orange-600/25 text-orange-200 border-orange-500/40 shadow-lg shadow-orange-500/10' },
          { key: 'medium', label: labels.medium, color: 'bg-yellow-600/25 text-yellow-200 border-yellow-500/40 shadow-lg shadow-yellow-500/10' },
          { key: 'low', label: labels.low, color: 'bg-emerald-600/25 text-emerald-200 border-emerald-500/40 shadow-lg shadow-emerald-500/10' },
          { key: 'none', label: labels.none, color: 'bg-slate-600/20 text-slate-300 border-slate-500/30' },
        ].map((item: any) => (
          <div key={item.key} className={`rounded-lg border p-3 text-center ${item.color} transition-all hover:scale-105`}>
            <div className="text-xl font-bold">{(counters as any)[item.key] || 0}</div>
            <div className="text-xs font-medium">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default AsteroidThreatPanel

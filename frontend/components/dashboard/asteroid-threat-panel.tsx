'use client'
import React, { useEffect, useState } from 'react'
import { useNeoThreatOverview } from '@/hooks/use-neo-threat-overview'
import { getMessage } from '@/lib/messages'
import { motion } from 'framer-motion'
import { Shield, AlertTriangle, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
  const total = counters.critical + counters.high + counters.medium + counters.low + counters.none
  
  return (
    <div className={cn('rounded-xl bg-black/40 border border-cyan-500/20 p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">NEO Karşılaştırma</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-0 text-[10px] px-1.5 py-0">
            Live
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-cyan-400">{total}</div>
          <div className="text-[9px] text-gray-500">Total</div>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {[
          { 
            key: 'critical', 
            label: labels.critical, 
            gradient: 'from-red-600/20 to-red-500/10',
            border: 'border-red-500/30',
            text: 'text-red-400',
            glow: 'shadow-red-500/20',
            icon: '🔴'
          },
          { 
            key: 'high', 
            label: labels.high, 
            gradient: 'from-orange-600/20 to-orange-500/10',
            border: 'border-orange-500/30',
            text: 'text-orange-400',
            glow: 'shadow-orange-500/20',
            icon: '🟠'
          },
          { 
            key: 'medium', 
            label: labels.medium, 
            gradient: 'from-yellow-600/20 to-yellow-500/10',
            border: 'border-yellow-500/30',
            text: 'text-yellow-400',
            glow: 'shadow-yellow-500/20',
            icon: '🟡'
          },
          { 
            key: 'low', 
            label: labels.low, 
            gradient: 'from-green-600/20 to-green-500/10',
            border: 'border-green-500/30',
            text: 'text-green-400',
            glow: 'shadow-green-500/20',
            icon: '🟢'
          },
          { 
            key: 'none', 
            label: labels.none, 
            gradient: 'from-gray-600/20 to-gray-500/10',
            border: 'border-gray-500/30',
            text: 'text-gray-400',
            glow: 'shadow-gray-500/20',
            icon: '⚪'
          },
        ].map((item: any) => (
          <div
            key={item.key}
            className={`
              bg-gradient-to-br ${item.gradient}
              border ${item.border}
              rounded-lg p-2.5 text-center
              hover:scale-105 transition-all duration-200
            `}
          >
            <div className="text-lg mb-0.5">{item.icon}</div>
            <div className={`text-2xl font-bold ${item.text}`}>
              {(counters as any)[item.key] || 0}
            </div>
            <div className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">
              {item.label}
            </div>
            {total > 0 && (counters as any)[item.key] > 0 && (
              <div className="text-[9px] text-gray-500 mt-1">
                {Math.round(((counters as any)[item.key] / total) * 100)}%
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-cyan-500/10 flex justify-between items-center">
        <span className="text-[10px] text-gray-500">Güncelleme</span>
        <span className="text-[10px] text-cyan-400 font-mono">
          {loading ? '...' : new Date(data?.updatedAt || Date.now()).toLocaleTimeString('tr-TR')}
        </span>
      </div>
    </div>
  )
}
export default AsteroidThreatPanel
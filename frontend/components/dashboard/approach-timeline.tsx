'use client'

import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

interface Props { window?: '7d' | '30d' | '90d'; className?: string }

export const ApproachTimeline: React.FC<Props> = ({ window = '7d', className }) => {
  const [series, setSeries] = useState<{ date: string; value: number }[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${base}/api/v1/asteroids/approaches?window=${window}`)
        const json = await res.json()
        if (!cancelled) {
          setSeries((json.series || []).map((d: any) => ({ date: d[0], value: d[1] })))
        }
      } catch (e) {
        if (!cancelled) setSeries([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [window])

  return (
    <div className={`rounded-xl backdrop-blur-lg bg-white/5 border border-white/10 p-4 shadow-lg ${className || ''}`}>
      <div className="text-sm font-semibold text-white/90 mb-3">Yaklaşan Geçişler ({window})</div>
      <div style={{ width: '100%', height: 200 }}>
        {series.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-white/50">
            Veri yok
          </div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={series}>
            <defs>
              <linearGradient id="ldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
            <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.2)', color: 'white' }} />
            <Area type="monotone" dataKey="value" stroke="#22c55e" fill="url(#ldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default ApproachTimeline



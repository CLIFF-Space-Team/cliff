'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Calendar, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

interface Props { window?: '7d' | '30d' | '90d'; className?: string }

export const ApproachTimeline: React.FC<Props> = ({ window = '7d', className }) => {
  const [series, setSeries] = useState<{ date: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${base}/api/v1/asteroids/approaches?window=${window}`)
        const json = await res.json()
        if (!cancelled) {
          setSeries((json.series || []).map((d: any) => ({ date: d[0], value: d[1] })))
        }
      } catch (e) {
        if (!cancelled) setSeries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [window])
  
  const maxValue = Math.max(...series.map(s => s.value), 0)
  const totalApproaches = series.reduce((sum, s) => sum + s.value, 0)
  
  return (
    <div className={cn('rounded-xl bg-black/40 border border-green-500/20 p-4', className)}>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-bold text-white">Yaklaşan Geçişler</h3>
          <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px] px-1.5 py-0">
            {window}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-400">{totalApproaches}</div>
          <div className="text-[9px] text-gray-500">Total</div>
        </div>
      </div>
      
      {/* Chart - Compact */}
      <div className="relative" style={{ width: '100%', height: 180 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-400 border-t-transparent" />
          </div>
        ) : series.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <Calendar className="w-12 h-12 text-gray-600 mb-2" />
            <div className="text-sm text-gray-500">Veri bulunamadı</div>
          </div>
        ) : (
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="approachGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="50%" stopColor="#059669" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="#047857" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(148,163,184,0.1)" 
                vertical={false}
              />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                tickLine={false} 
                axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
              />
              <YAxis 
                tick={{ fill: '#9ca3af', fontSize: 10 }} 
                tickLine={false} 
                axisLine={{ stroke: 'rgba(148,163,184,0.2)' }}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'rgba(0,0,0,0.95)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                }}
                labelStyle={{ color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}
                itemStyle={{ color: '#fff', fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                fill="url(#approachGradient)" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Compact Stats */}
      {maxValue > 0 && (
        <div className="mt-3 pt-3 border-t border-green-500/10 flex justify-between items-center text-[10px]">
          <div>
            <span className="text-gray-500">Max: </span>
            <span className="text-green-400 font-bold">{maxValue}</span>
          </div>
          <div>
            <span className="text-gray-500">Avg: </span>
            <span className="text-cyan-400 font-bold">
              {series.length > 0 ? Math.round(totalApproaches / series.length) : 0}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
export default ApproachTimeline

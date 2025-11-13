'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchFuturePositions, fetchHybridAnalysis } from '@/lib/api/horizons'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
} from 'recharts'

type Props = {
  targetId: string
  days?: number
}

type TimelinePoint = {
  date: string
  distanceMk: number // million km
  lowerMk: number
  upperMk: number
}

export function UncertaintyTimeline({ targetId, days = 30 }: Props) {
  const [series, setSeries] = useState<any[] | null>(null)
  const [ci95, setCi95] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    Promise.all([fetchFuturePositions(targetId, days), fetchHybridAnalysis(targetId, days)])
      .then(([positions, hybrid]) => {
        if (!mounted) return
        const data =
          positions?.data?.result?.data ??
          positions?.data?.data ??
          positions?.result?.data ??
          positions?.data ??
          []
        setSeries(Array.isArray(data) ? data : [])
        const ci = hybrid?.monte_carlo?.ci95_km as [number, number] | undefined
        if (ci) setCi95(ci)
      })
      .catch((e) => {
        if (mounted) setError(String(e))
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [targetId, days])

  const points: TimelinePoint[] = useMemo(() => {
    if (!series) return []
    const KM_PER_AU = 149_597_870.7
    const lastDelta =
      series.length && typeof series[series.length - 1]?.delta === 'number'
        ? series[series.length - 1].delta * KM_PER_AU
        : null
    const spanKm = ci95 ? ci95[1] - ci95[0] : 0
    return series
      .map((row: any) => {
        const date = row?.datetime_str ?? row?.date ?? row?.time ?? ''
        const deltaAu = typeof row?.delta === 'number' ? row.delta : NaN
        if (!date || !isFinite(deltaAu)) return null
        const nominalKm = deltaAu * KM_PER_AU
        // Basit ölçekli belirsizlik: final CI genişliğini nominal mesafe oranına göre dağıt
        const scale =
          lastDelta && lastDelta > 0 ? Math.max(0.25, Math.min(1.5, nominalKm / lastDelta)) : 1
        const half = (spanKm * 0.5) * scale
        const lower = Math.max(0, nominalKm - half)
        const upper = nominalKm + half
        return {
          date,
          distanceMk: nominalKm / 1_000_000,
          lowerMk: lower / 1_000_000,
          upperMk: upper / 1_000_000,
        } as TimelinePoint
      })
      .filter(Boolean) as TimelinePoint[]
  }, [series, ci95])

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Belirsizlik Zaman Çizelgesi</CardTitle>
        <Badge variant="secondary">NASA + MC</Badge>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Yükleniyor...</div>
        ) : error ? (
          <div className="text-sm text-red-400">{error}</div>
        ) : points.length === 0 ? (
          <div className="text-sm text-muted-foreground">Veri bulunamadı</div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points}>
                <defs>
                  <linearGradient id="unc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FB8C00" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FB8C00" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `${v.toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value: any, name: string) => {
                    const label = name === 'distanceMk' ? 'Nominal' : name === 'upperMk' ? 'Üst' : 'Alt'
                    return [`${(value as number).toFixed(2)} M km`, label]
                  }}
                />
                <Area type="monotone" dataKey="upperMk" stroke="transparent" fill="url(#unc)" />
                <Area type="monotone" dataKey="lowerMk" stroke="transparent" fill="#000" fillOpacity={0.0} />
                <Line type="monotone" dataKey="distanceMk" stroke="#FF5252" dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UncertaintyTimeline



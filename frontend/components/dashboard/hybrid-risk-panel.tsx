'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { fetchHybridAnalysis, HybridAnalysis } from '@/lib/api/horizons'

type Props = {
  targetId: string
  days?: number
}

export function HybridRiskPanel({ targetId, days = 30 }: Props) {
  const [data, setData] = useState<HybridAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchHybridAnalysis(targetId, days)
      .then((d) => {
        if (mounted) {
          setData(d)
          setError(null)
        }
      })
      .catch((e) => {
        if (mounted) setError(String(e))
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [targetId, days])

  const probEntries = Object.entries(data?.ml_risk?.probabilities ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">Hibrit Risk Analizi</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">NASA</Badge>
          <Badge variant="secondary">ML</Badge>
          <Badge variant="secondary">MC</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <div className="text-sm text-muted-foreground">NASA Horizons verisi yükleniyor...</div>
          </div>
        ) : error || !data?.success ? (
          <div className="text-center py-8">
            <div className="text-sm text-red-400 mb-2">{error || data?.error || 'Veri yüklenemedi'}</div>
            <div className="text-xs text-muted-foreground">
              Asteroid ID: {targetId} için NASA Horizons verisi alınamadı
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Tehdit Sınıfı</div>
                <div className="text-lg font-semibold capitalize">{data?.ml_risk.label}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Güven</div>
                <div className="text-lg font-semibold">{Math.round((data?.ml_risk.confidence ?? 0) * 100)}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">95% CI Mesafe</div>
                <div className="text-lg font-semibold">
                  {data?.monte_carlo?.ci95_km ? `${(data.monte_carlo.ci95_km[0] / 1_000_000).toFixed(2)} - ${(data.monte_carlo.ci95_km[1] / 1_000_000).toFixed(2)} M km` : '—'}
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {probEntries.map(([label, p]) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize">{label}</span>
                    <span>{Math.round(p * 100)}%</span>
                  </div>
                  <Progress value={Math.round(p * 100)} />
                </div>
              ))}
            </div>
            {data?.explanation && (
              <p className="mt-3 text-xs text-muted-foreground">{data.explanation}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default HybridRiskPanel



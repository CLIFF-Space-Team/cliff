'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchHybridAnalysis, HybridAnalysis } from '@/lib/api/horizons'

type Props = {
  targetId: string
  days?: number
}

function Scene({ distanceKm, ci95 }: { distanceKm: number; ci95: [number, number] }) {
  const scale = 10_000_000 // 10M km = 1 unit
  const x = distanceKm / scale
  const rLow = Math.max(0, ci95[0] / scale)
  const rHigh = Math.max(0, ci95[1] / scale)
  return (
    <group>
      {/* Origin marker (Earth center) */}
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#4FC3F7" />
      </mesh>
      {/* Uncertainty band (simple line segment) */}
      <mesh position={[(rLow + rHigh) / 2, 0, 0]}>
        <boxGeometry args={[Math.max(0.05, rHigh - rLow), 0.02, 0.02]} />
        <meshBasicMaterial color="orange" transparent opacity={0.4} />
      </mesh>
      {/* Asteroid nominal point */}
      <mesh position={[x, 0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#FF5252" />
      </mesh>
    </group>
  )
}

export function NASAHybridOrbitViewer({ targetId, days = 30 }: Props) {
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
        if (mounted) {
          setError(String(e))
        }
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [targetId, days])

  const meanKm = data?.monte_carlo?.mean_km ?? 0
  const ci95 = (data?.monte_carlo?.ci95_km as [number, number]) ?? [0, 0]
  const label = data?.ml_risk?.label ?? 'unknown'
  const confidence = Math.round((data?.ml_risk?.confidence ?? 0) * 100)

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold">
          NASA Hibrit Yörünge Görselleştirici
        </CardTitle>
        <Badge variant="secondary">Powered by NASA JPL</Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Hedef</div>
            <div className="font-medium">{targetId}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">ML Tehdit</div>
            <div className="font-medium capitalize">{label} <span className="text-xs text-muted-foreground">({confidence}%)</span></div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Nominal Mesafe</div>
            <div className="font-medium">{meanKm ? `${(meanKm / 1_000_000).toFixed(2)} M km` : '—'}</div>
          </div>
        </div>
        <div className="h-48 w-full bg-black/40 rounded-md overflow-hidden border border-white/10">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
              Yükleniyor...
            </div>
          ) : error ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-red-400">
              {error}
            </div>
          ) : (
            <Canvas orthographic camera={{ position: [0, 5, 10], zoom: 50 }}>
              <ambientLight />
              <Scene distanceKm={meanKm} ci95={ci95} />
            </Canvas>
          )}
        </div>
        {data?.explanation && (
          <p className="mt-3 text-xs text-muted-foreground">{data.explanation}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default NASAHybridOrbitViewer



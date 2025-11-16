'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fetchFuturePositions, fetchHybridAnalysis } from '@/lib/api/horizons'
import { Loader2, Rocket, AlertTriangle } from 'lucide-react'

/**
 * Horizons API Test Panel
 * 
 * Büyük/tehlikeli asteroidler için NASA Horizons hybrid analysis
 * Çalışan asteroid'ler: 99942 (Apophis), 101955 (Bennu), 162173 (Ryugu)
 */
export function HorizonsTestPanel() {
  const [asteroidId, setAsteroidId] = useState('99942') // Default: Apophis
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testHorizons = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      console.log(`🛰️ Testing Horizons API for asteroid ${asteroidId}`)
      
      // Fetch hybrid analysis
      const analysis = await fetchHybridAnalysis(asteroidId, 7)
      
      if (analysis.success) {
        setResult(analysis)
        console.log('✅ Horizons hybrid analysis successful!')
      } else {
        setError(analysis.error || 'Analysis failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('❌ Horizons test failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const knownAsteroids = [
    { id: '99942', name: 'Apophis', note: 'Tehlikeli' },
    { id: '101955', name: 'Bennu', note: 'NASA misyonu' },
    { id: '162173', name: 'Ryugu', note: 'JAXA misyonu' },
    { id: '433', name: 'Eros', note: 'Büyük NEO' }
  ]

  return (
    <Card className="w-full max-w-2xl bg-pure-black border-cyan-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <Rocket className="h-5 w-5" />
          NASA Horizons Hybrid Analysis
        </CardTitle>
        <p className="text-sm text-gray-400 mt-2">
          Büyük asteroidler için NASA JPL Horizons + Monte Carlo + ML analizi
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <Input
            type="text"
            value={asteroidId}
            onChange={(e) => setAsteroidId(e.target.value)}
            placeholder="Asteroid ID (örn: 99942)"
            className="bg-gray-900 border-gray-700 text-white"
          />
          <Button
            onClick={testHorizons}
            disabled={loading || !asteroidId}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Yükleniyor
              </>
            ) : (
              'Analiz Et'
            )}
          </Button>
        </div>

        {/* Quick select */}
        <div className="flex flex-wrap gap-2">
          {knownAsteroids.map((ast) => (
            <Badge
              key={ast.id}
              variant="outline"
              className="cursor-pointer hover:bg-cyan-500/20 border-cyan-500/30"
              onClick={() => setAsteroidId(ast.id)}
            >
              {ast.name} ({ast.id}) - {ast.note}
            </Badge>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Hata:</span>
            </div>
            <p className="text-sm text-red-300 mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && result.success && (
          <div className="space-y-4 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Ephemeris Points</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {result.ephemeris.data_points}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">MC Samples</p>
                <p className="text-2xl font-bold text-purple-400">
                  {result.monte_carlo.samples.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-2">Risk Classification</p>
              <div className="flex items-center gap-3">
                <Badge 
                  className={`text-lg px-4 py-1 ${
                    result.ml_risk.label === 'critical' ? 'bg-red-500' :
                    result.ml_risk.label === 'high' ? 'bg-orange-500' :
                    result.ml_risk.label === 'medium' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                >
                  {result.ml_risk.label.toUpperCase()}
                </Badge>
                <span className="text-sm text-gray-300">
                  {Math.round(result.ml_risk.confidence * 100)}% güven
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-2">Distance Analysis</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-gray-900 rounded">
                  <p className="text-xs text-gray-400">Mean</p>
                  <p className="text-sm font-mono text-white">
                    {(result.monte_carlo.mean_km / 1000000).toFixed(2)} M km
                  </p>
                </div>
                <div className="p-2 bg-gray-900 rounded">
                  <p className="text-xs text-gray-400">Std Dev</p>
                  <p className="text-sm font-mono text-white">
                    {(result.monte_carlo.std_km / 1000).toFixed(1)} km
                  </p>
                </div>
                <div className="p-2 bg-gray-900 rounded">
                  <p className="text-xs text-gray-400">95% CI Width</p>
                  <p className="text-sm font-mono text-white">
                    {((result.monte_carlo.ci95_km[1] - result.monte_carlo.ci95_km[0]) / 1000).toFixed(1)} km
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-2">Explanation</p>
              <p className="text-sm text-gray-300 italic">
                {result.explanation}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default HorizonsTestPanel


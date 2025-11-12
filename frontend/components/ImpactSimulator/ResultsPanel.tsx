'use client'
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImpactResults, ImpactLocation } from './types'
import { AlertTriangle, Flame, Waves, Activity, Zap, Users } from 'lucide-react'
interface ResultsPanelProps {
  results: ImpactResults
  location: ImpactLocation
}
const HISTORICAL_COMPARISONS = [
  { name: 'Hiroşima Bombası', megatons: 0.015 },
  { name: 'Tunguska Olayı (1908)', megatons: 15 },
  { name: 'En Büyük H-Bombası', megatons: 50 },
  { name: 'Chicxulub (Dinozorlar)', megatons: 100000000 }
]
export function ResultsPanel({ results, location }: ResultsPanelProps) {
  const getComparison = () => {
    const energy = results.energy.megatonsTNT
    for (let i = HISTORICAL_COMPARISONS.length - 1; i >= 0; i--) {
      if (energy >= HISTORICAL_COMPARISONS[i].megatons) {
        const ratio = energy / HISTORICAL_COMPARISONS[i].megatons
        return {
          event: HISTORICAL_COMPARISONS[i].name,
          ratio: ratio.toExponential(2)
        }
      }
    }
    return {
      event: HISTORICAL_COMPARISONS[0].name,
      ratio: (energy / HISTORICAL_COMPARISONS[0].megatons).toFixed(1)
    }
  }
  const comparison = getComparison()
  return (
    <Card className="bg-pure-black/80 backdrop-blur-md border-cliff-white/10 h-full overflow-y-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-cliff-white">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Etki Analizi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {}
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-red-400" />
            <h4 className="text-sm font-semibold text-red-400">Enerji</h4>
          </div>
          <p className="text-2xl font-bold text-white">
            {results.energy.megatonsTNT.toFixed(2)} Megaton TNT
          </p>
          <p className="text-xs text-cliff-light-gray mt-1">
            {results.energy.joules.toExponential(2)} Joule
          </p>
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-xs text-cliff-white">
              📊 <strong>{comparison.event}</strong>'nin {comparison.ratio}x gücünde
            </p>
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-cliff-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-orange-400">Krater</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-cliff-light-gray">Yarıçap</p>
              <p className="text-xl font-bold text-white">{results.crater.radius_km.toFixed(2)} km</p>
            </div>
            <div>
              <p className="text-xs text-cliff-light-gray">Derinlik</p>
              <p className="text-xl font-bold text-white">{results.crater.depth_km.toFixed(2)} km</p>
            </div>
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-orange-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Waves className="h-4 w-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-orange-400">Hava Dalgası</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-cliff-light-gray">20 psi (Tüm binalar yıkılır)</span>
              <span className="text-sm font-semibold text-red-400">{results.airBlast.radius_20psi_km.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-cliff-light-gray">5 psi (Çoğu bina yıkılır)</span>
              <span className="text-sm font-semibold text-orange-400">{results.airBlast.radius_5psi_km.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-cliff-light-gray">1 psi (Camlar kırılır)</span>
              <span className="text-sm font-semibold text-yellow-400">{results.airBlast.radius_1psi_km.toFixed(2)} km</span>
            </div>
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-yellow-400" />
            <h4 className="text-sm font-semibold text-yellow-400">Termal Radyasyon</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-cliff-light-gray">3. derece yanık</span>
              <span className="text-sm font-semibold text-red-400">{results.thermal.thirdDegree_km.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-cliff-light-gray">2. derece yanık</span>
              <span className="text-sm font-semibold text-orange-400">{results.thermal.secondDegree_km.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-cliff-light-gray">1. derece yanık</span>
              <span className="text-sm font-semibold text-yellow-400">{results.thermal.firstDegree_km.toFixed(2)} km</span>
            </div>
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-purple-400">Deprem Etkisi</h4>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {results.seismic.magnitude.toFixed(1)} Richter
          </p>
          <p className="text-xs text-cliff-light-gray">
            {results.seismic.feltRadius_km.toFixed(0)} km mesafede hissedilebilir
          </p>
        </div>
        {}
        {results.tsunami && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-blue-400">Tsunami</h4>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {results.tsunami.maxHeight_m.toFixed(1)}m
            </p>
            <p className="text-xs text-cliff-light-gray">
              Kıyılara ~{results.tsunami.arrivalTime_minutes.toFixed(0)} dakikada ulaşır
            </p>
          </div>
        )}
        {}
        {!location.isOcean && results.casualties.estimated > 0 && (
          <div className={`border rounded-lg p-4 ${
            results.casualties.severity === 'catastrophic' ? 'bg-red-500/20 border-red-500/30' :
            results.casualties.severity === 'severe' ? 'bg-orange-500/20 border-orange-500/30' :
            results.casualties.severity === 'moderate' ? 'bg-yellow-500/20 border-yellow-500/30' :
            'bg-green-500/20 border-green-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-red-400" />
              <h4 className="text-sm font-semibold text-red-400">Etkilenen Nüfus</h4>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              ~{results.casualties.estimated.toLocaleString('tr-TR')} kişi
            </p>
            <p className="text-xs text-cliff-light-gray">
              Seviye: {
                results.casualties.severity === 'catastrophic' ? '🔴 Kitlesel' :
                results.casualties.severity === 'severe' ? '🟠 Ciddi' :
                results.casualties.severity === 'moderate' ? '🟡 Orta' :
                '🟢 Düşük'
              }
            </p>
          </div>
        )}
        {}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-blue-300">
            💡 <strong>Eğitici Not:</strong> Bu hesaplamalar NASA ve JPL formüllerine dayanır. 
            Gerçek etki atmosfer yoğunluğu, zemin yapısı ve meteorun kompozisyonuna göre değişebilir.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

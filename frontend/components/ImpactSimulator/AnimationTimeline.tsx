'use client'
import React from 'react'
import { motion } from 'framer-motion'
interface AnimationTimelineProps {
  progress: number
  isPlaying: boolean
  asteroidVelocity?: number
  asteroidDiameter?: number
  impactEnergy?: number
}
const TIMELINE_EVENTS = [
  { time: 0.0, label: 'Başlangıç', color: '#888', description: 'Uzayda (15 km mesafe)', scientific: 'v = 20 km/s' },
  { time: 0.08, label: 'Yaklaşma', color: '#4488ff', description: 'Hızlı yaklaşım', scientific: '5 km mesafe' },
  { time: 0.12, label: 'Atmosfer', color: '#ffaa00', description: '100 km yükseklikte', scientific: 'Sürtünme başlıyor' },
  { time: 0.18, label: 'Çarpma!', color: '#ff0000', description: 'Yüzeye temas (t=0)', scientific: 'E = mv²/2' },
  { time: 0.24, label: 'Fireball', color: '#ff6600', description: 'Patlama genişliyor', scientific: 'T = 7000K → 2000K' },
  { time: 0.32, label: 'Shock Wave', color: '#ff8800', description: 'Süpersonik şok dalgası', scientific: 'v = 343 m/s + psi yayılımı' },
  { time: 0.42, label: 'Termal', color: '#ffcc00', description: 'Işık hızı radyasyon', scientific: 'c = 299,792 km/s' },
  { time: 0.55, label: 'Debris', color: '#aa8866', description: 'Balistik enkaz fırlatma', scientific: 'h = v²/2g, v₀ ≤ 2 km/s' },
  { time: 0.72, label: 'Yayılım', color: '#666', description: 'Şok dalgası genişliyor', scientific: 'R ∝ t²/⁵ (Sedov-Taylor)' },
  { time: 0.88, label: 'Yerleşme', color: '#444', description: 'Gravitasyonel düşüş', scientific: 'a = -g = -9.8 m/s²' },
  { time: 1.0, label: 'Tamamlandı', color: '#00ff88', description: 'Simülasyon sonu', scientific: 'Final krater durumu' }
]
export function AnimationTimeline({ 
  progress, 
  isPlaying, 
  asteroidVelocity = 20, 
  asteroidDiameter = 100,
  impactEnergy = 0
}: AnimationTimelineProps) {
  const currentPhase = TIMELINE_EVENTS.reduce((prev, curr) => {
    return progress >= curr.time ? curr : prev
  }, TIMELINE_EVENTS[0])
  const currentVelocity = progress < 0.20 ? asteroidVelocity * (1 - progress * 0.1) : 0
  const currentTemperature = progress >= 0.20 && progress < 0.35 
    ? 7000 - (progress - 0.20) * 33333 
    : progress >= 0.15 && progress < 0.20
    ? 3000 + (progress - 0.15) * 80000 
    : 300
  const currentPressure = progress >= 0.23 && progress < 0.70
    ? 20 * Math.exp(-(progress - 0.23) * 10) 
    : 0
  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-4xl px-4">
      <div className="bg-pure-black/95 backdrop-blur-xl rounded-2xl border border-cliff-white/20 p-4 shadow-2xl">
        {}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-cliff-light-gray">Animasyon İlerlemesi</span>
            <span className="text-xs font-mono text-cliff-white">{Math.round(progress * 100)}%</span>
          </div>
          <div className="relative h-2 bg-cliff-light-gray/20 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-red-500 to-yellow-500 rounded-full"
              style={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1 }}
            />
            {TIMELINE_EVENTS.map((event, index) => (
              <div
                key={index}
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: `${event.time * 100}%` }}
              />
            ))}
          </div>
        </div>
        {}
        <div className="flex justify-between items-center text-xs">
          {TIMELINE_EVENTS.map((event, index) => {
            const isPassed = progress >= event.time
            const isCurrent = event === currentPhase
            return (
              <div
                key={index}
                className="flex flex-col items-center"
                style={{ opacity: isPassed ? 1 : 0.4 }}
              >
                <div
                  className={`w-2 h-2 rounded-full mb-1 ${
                    isCurrent ? 'animate-pulse' : ''
                  }`}
                  style={{ backgroundColor: event.color }}
                />
                <span className={`text-[10px] ${
                  isCurrent ? 'text-white font-semibold' : 'text-cliff-light-gray'
                }`}>
                  {event.label}
                </span>
              </div>
            )
          })}
        </div>
        {}
        <div className="mt-4 pt-4 border-t border-cliff-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPlaying && (
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentPhase.color }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
              <div>
                <span className="text-base text-cliff-white font-bold">
                  {currentPhase.label}
                </span>
                <p className="text-xs text-cliff-light-gray">
                  {(currentPhase as any).description}
                </p>
                <p className="text-[10px] text-blue-300 mt-0.5">
                  📐 {(currentPhase as any).scientific}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-cliff-white">
                {Math.round(progress * 100)}%
              </p>
              <p className="text-xs text-cliff-light-gray">Tamamlandı</p>
            </div>
          </div>
        </div>
        {}
        <div className="mt-3 pt-3 border-t border-cliff-white/10">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-blue-500/10 rounded-lg p-2 border border-blue-500/30">
              <p className="text-[10px] text-blue-300 mb-1">Hız</p>
              <p className="text-sm font-bold text-white font-mono">
                {currentVelocity > 0 ? `${currentVelocity.toFixed(1)} km/s` : '—'}
              </p>
            </div>
            <div className="bg-orange-500/10 rounded-lg p-2 border border-orange-500/30">
              <p className="text-[10px] text-orange-300 mb-1">Sıcaklık</p>
              <p className="text-sm font-bold text-white font-mono">
                {currentTemperature > 300 ? `${Math.round(currentTemperature)} K` : '300 K'}
              </p>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/30">
              <p className="text-[10px] text-red-300 mb-1">Basınç</p>
              <p className="text-sm font-bold text-white font-mono">
                {currentPressure > 0.1 ? `${currentPressure.toFixed(1)} PSI` : '—'}
              </p>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/30">
              <p className="text-[10px] text-yellow-300 mb-1">Enerji</p>
              <p className="text-sm font-bold text-white font-mono">
                {impactEnergy > 0 ? `${impactEnergy.toFixed(1)} MT` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

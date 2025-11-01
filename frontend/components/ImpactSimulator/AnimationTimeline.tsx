'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface AnimationTimelineProps {
  progress: number
  isPlaying: boolean
}

const TIMELINE_EVENTS = [
  { time: 0.0, label: 'Başlangıç', color: '#888', description: 'Uzayda (15 km mesafe)', scientific: 'v = 20 km/s' },
  { time: 0.12, label: 'Yaklaşma', color: '#4488ff', description: 'Hızlı yaklaşım', scientific: '5 km mesafe' },
  { time: 0.20, label: 'Atmosfer', color: '#ffaa00', description: '100 km yükseklikte', scientific: 'Sürtünme başlıyor' },
  { time: 0.25, label: 'Çarpma!', color: '#ff0000', description: 'Yüzeye temas (t=0)', scientific: 'E = mv²/2' },
  { time: 0.30, label: 'Fireball', color: '#ff6600', description: 'Patlama genişliyor', scientific: 'T = 7000K → 2000K' },
  { time: 0.45, label: 'Shock Wave', color: '#ff8800', description: 'Süpersonik şok dalgası', scientific: 'v = 343 m/s + psi yayılımı' },
  { time: 0.65, label: 'Termal', color: '#ffcc00', description: 'Yoğun ısı radyasyonu', scientific: 'Işık hızı (299,792 km/s)' },
  { time: 0.75, label: 'Debris', color: '#aa8866', description: 'Balistik enkaz fırlatma', scientific: 'h = v²/2g, v₀ ≤ 2 km/s' },
  { time: 0.88, label: 'Yerleşme', color: '#666', description: 'Gravitasyonel düşüş', scientific: 'a = -g = -9.8 m/s²' },
  { time: 1.0, label: 'Tamamlandı', color: '#00ff88', description: 'Enkaz yere yerleşti', scientific: 'Son krater oluşumu' }
]

export function AnimationTimeline({ progress, isPlaying }: AnimationTimelineProps) {
  const currentPhase = TIMELINE_EVENTS.reduce((prev, curr) => {
    return progress >= curr.time ? curr : prev
  }, TIMELINE_EVENTS[0])
  
  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-4xl px-4">
      <div className="bg-pure-black/95 backdrop-blur-xl rounded-2xl border border-cliff-white/20 p-4 shadow-2xl">
        {/* Progress Bar */}
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
        
        {/* Timeline Events */}
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
        
        {/* Current Phase - Enlarged */}
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
      </div>
    </div>
  )
}


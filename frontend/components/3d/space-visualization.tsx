'use client'
import React, { Suspense, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import { motion } from 'framer-motion'
import { NASARealisticSolarSystem } from './NASARealisticSolarSystem'
import { useDashboardStore } from '@/stores/useDashboardStore'
interface SpaceVisualizationProps {
  compact?: boolean
  fullscreen?: boolean
  asteroidData?: any[]
  earthEvents?: any[]
  className?: string
  useAdvancedEngine?: boolean
}
const AdvancedEngineWrapper = React.memo(() => {
  const { quality, showOrbits, enableRotation } = useDashboardStore()
  return (
    <NASARealisticSolarSystem
      quality={quality}
      showOrbits={showOrbits}
      enableRotation={enableRotation}
      displayMode="earth_focus"
    />
  )
})
AdvancedEngineWrapper.displayName = 'AdvancedEngineWrapper'
export function SpaceVisualization({
  compact = false,
  fullscreen = false,
  asteroidData = [],
  earthEvents = [],
  className = '',
  useAdvancedEngine = true,
}: SpaceVisualizationProps) {
  const [showControls, setShowControls] = useState(!compact)
  if (useAdvancedEngine) {
    return (
      <div className={`relative w-full h-full bg-gradient-to-b from-gray-900 to-black ${className}`}>
        <AdvancedEngineWrapper />
      </div>
    )
  }
  return (
    <div className={`relative w-full h-full bg-gradient-to-b from-gray-900 to-black ${className}`}>
      <div className="flex items-center justify-center h-full text-white">
        <div className="text-center">
          <div className="text-4xl mb-6 animate-pulse">🚀</div>
          <div className="text-xl mb-4">Legacy Güneş Sistemi Görünümü</div>
          <div className="text-gray-400 mb-6">Gelişmiş özellikler için Advanced Engine kullanın</div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all transform hover:scale-105"
          >
            🔄 Yenile
          </button>
        </div>
      </div>
    </div>
  )
}
export default SpaceVisualization
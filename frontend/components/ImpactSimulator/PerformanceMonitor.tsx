'use client'
import React, { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
export function PerformanceMonitor({ onPerformanceChange }: { onPerformanceChange?: (fps: number) => void }) {
  const [fps, setFps] = useState(60)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())
  useFrame(() => {
    frameCount.current++
    const currentTime = performance.now()
    const elapsed = currentTime - lastTime.current
    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCount.current * 1000) / elapsed)
      setFps(currentFps)
      if (onPerformanceChange) {
        onPerformanceChange(currentFps)
      }
      frameCount.current = 0
      lastTime.current = currentTime
    }
  })
  return null
}
export function PerformanceIndicator({ fps }: { fps: number }) {
  const getColor = () => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }
  const getStatus = () => {
    if (fps >= 55) return 'Mükemmel'
    if (fps >= 30) return 'İyi'
    return 'Düşük'
  }
  return (
    <div className="absolute top-20 right-4 z-10 bg-pure-black/80 backdrop-blur-md rounded-lg px-3 py-2 border border-cliff-white/10">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${fps >= 55 ? 'bg-green-400' : fps >= 30 ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
        <span className={`text-sm font-mono ${getColor()}`}>
          {fps} FPS
        </span>
        <span className="text-xs text-cliff-light-gray">
          ({getStatus()})
        </span>
      </div>
    </div>
  )
}

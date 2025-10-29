'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Monitor,
  Cpu,
  HardDrive
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FPSMonitorProps {
  className?: string
  compact?: boolean
  targetFPS?: number
  showGraph?: boolean
  showDetails?: boolean
}

interface PerformanceData {
  fps: number
  averageFPS: number
  frameTime: number
  memoryUsed: number
  drawCalls: number
  triangles: number
  visibleObjects: number
  totalObjects: number
  quality: string
  performanceRatio: number
}

const FPSMonitor: React.FC<FPSMonitorProps> = ({
  className,
  compact = false,
  targetFPS = 60,
  showGraph = true,
  showDetails = true
}) => {
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 60,
    averageFPS: 60,
    frameTime: 16.67,
    memoryUsed: 0,
    drawCalls: 0,
    triangles: 0,
    visibleObjects: 0,
    totalObjects: 0,
    quality: 'high',
    performanceRatio: 1.0
  })
  
  const [fpsHistory, setFpsHistory] = useState<number[]>([])
  const [isExpanded, setIsExpanded] = useState(!compact)
  const intervalRef = useRef<NodeJS.Timeout>()
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  // Simulated performance data (in real app, this would come from PerformanceManager)
  useEffect(() => {
    const updatePerformance = () => {
      const now = performance.now()
      const deltaTime = now - lastTimeRef.current
      frameCountRef.current++

      // Simulate realistic FPS variations
      const baseFPS = 58 + Math.random() * 8 // 58-66 FPS range
      const currentFPS = Math.max(30, Math.min(120, baseFPS))
      const avgFPS = fpsHistory.length > 0 
        ? fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length 
        : currentFPS

      const newData: PerformanceData = {
        fps: currentFPS,
        averageFPS: avgFPS,
        frameTime: 1000 / currentFPS,
        memoryUsed: 120 + Math.random() * 50, // MB
        drawCalls: 45 + Math.floor(Math.random() * 20),
        triangles: 850000 + Math.floor(Math.random() * 200000),
        visibleObjects: 12 + Math.floor(Math.random() * 8),
        totalObjects: 25 + Math.floor(Math.random() * 5),
        quality: currentFPS > 55 ? 'high' : currentFPS > 45 ? 'medium' : 'low',
        performanceRatio: currentFPS / targetFPS
      }

      setPerformanceData(newData)

      // Update FPS history
      setFpsHistory(prev => {
        const newHistory = [...prev, currentFPS]
        return newHistory.slice(-60) // Keep last 60 samples
      })

      lastTimeRef.current = now
    }

    intervalRef.current = setInterval(updatePerformance, 250) // 4 times per second
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [targetFPS])

  // Performance status
  const getPerformanceStatus = () => {
    if (performanceData.fps >= targetFPS * 0.95) {
      return { status: 'excellent', color: 'text-accent-success', bgColor: 'bg-accent-success/10', icon: CheckCircle }
    } else if (performanceData.fps >= targetFPS * 0.85) {
      return { status: 'good', color: 'text-accent-info', bgColor: 'bg-accent-info/10', icon: TrendingUp }
    } else if (performanceData.fps >= targetFPS * 0.7) {
      return { status: 'fair', color: 'text-accent-warning', bgColor: 'bg-accent-warning/10', icon: TrendingDown }
    } else {
      return { status: 'poor', color: 'text-accent-danger', bgColor: 'bg-accent-danger/10', icon: AlertTriangle }
    }
  }

  const performanceStatus = getPerformanceStatus()
  const StatusIcon = performanceStatus.icon

  // FPS Graph Component
  const FPSGraph = () => {
    const maxFPS = Math.max(targetFPS * 1.2, ...fpsHistory)
    const minFPS = Math.min(targetFPS * 0.5, ...fpsHistory)
    const range = maxFPS - minFPS

    return (
      <div className="relative h-16 w-full bg-cliff-dark-gray/20 rounded-lg overflow-hidden">
        {/* Target FPS line */}
        <div 
          className="absolute left-0 right-0 border-t border-accent-info/40 border-dashed z-10"
          style={{ top: `${((maxFPS - targetFPS) / range) * 100}%` }}
        />
        
        {/* FPS curve */}
        <svg className="absolute inset-0 w-full h-full">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-success"
            points={fpsHistory.map((fps, index) => {
              const x = (index / (fpsHistory.length - 1)) * 100
              const y = ((maxFPS - fps) / range) * 100
              return `${x},${y}`
            }).join(' ')}
          />
        </svg>

        {/* Performance indicators */}
        <div className="absolute top-1 left-1 text-xs text-cliff-light-gray/60">
          {Math.round(maxFPS)}
        </div>
        <div className="absolute bottom-1 left-1 text-xs text-cliff-light-gray/60">
          {Math.round(minFPS)}
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200",
          performanceStatus.bgColor
        )}>
          <StatusIcon className={cn("h-4 w-4", performanceStatus.color)} />
          <span className={cn("text-sm font-semibold", performanceStatus.color)}>
            {Math.round(performanceData.fps)} FPS
          </span>
        </div>
        
        <Badge variant="default" className="bg-cliff-dark-gray/30 text-cliff-light-gray border-cliff-dark-gray/50">
          {performanceData.quality.toUpperCase()}
        </Badge>
      </div>
    )
  }

  return (
    <Card className={cn(
      "bg-pure-black-gradient border-cliff-dark-gray/30 overflow-hidden",
      className
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              performanceStatus.bgColor
            )}>
              <Monitor className={cn("h-5 w-5", performanceStatus.color)} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Performans Monitörü</h3>
              <p className="text-sm text-cliff-light-gray">Real-time 3D render metrikleri</p>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-cliff-light-gray hover:text-white transition-colors"
          >
            <Activity className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Main FPS Display */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className={cn(
            "p-4 rounded-lg border transition-all duration-300",
            performanceStatus.bgColor,
            "border-cliff-dark-gray/30"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <StatusIcon className={cn("h-4 w-4", performanceStatus.color)} />
              <span className="text-sm font-medium text-cliff-light-gray">Anlık FPS</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn("text-2xl font-bold", performanceStatus.color)}>
                {Math.round(performanceData.fps)}
              </span>
              <span className="text-sm text-cliff-light-gray/60">/ {targetFPS}</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-cliff-dark-gray/30 bg-cliff-dark-gray/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-accent-info" />
              <span className="text-sm font-medium text-cliff-light-gray">Ortalama</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-accent-info">
                {Math.round(performanceData.averageFPS)}
              </span>
              <span className="text-sm text-cliff-light-gray/60">FPS</span>
            </div>
          </div>
        </div>

        {/* FPS Graph */}
        {showGraph && fpsHistory.length > 5 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cliff-light-gray">FPS Geçmişi</span>
              <span className="text-xs text-cliff-light-gray/60">Son 60 frame</span>
            </div>
            <FPSGraph />
          </div>
        )}

        {/* Detailed Metrics */}
        <AnimatePresence>
          {isExpanded && showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="border-t border-cliff-dark-gray/30 pt-3">
                <h4 className="text-sm font-semibold text-white mb-3">Render İstatistikleri</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cliff-light-gray">Frame Time</span>
                    <span className="text-sm text-white font-mono">
                      {performanceData.frameTime.toFixed(2)}ms
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cliff-light-gray">Quality</span>
                    <Badge variant="default" className={cn(
                      "text-xs",
                      performanceData.quality === 'high' ? 'bg-accent-success/20 text-accent-success border-accent-success/30' :
                      performanceData.quality === 'medium' ? 'bg-accent-warning/20 text-accent-warning border-accent-warning/30' :
                      'bg-accent-danger/20 text-accent-danger border-accent-danger/30'
                    )}>
                      {performanceData.quality.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cliff-light-gray">Draw Calls</span>
                    <span className="text-sm text-white font-mono">
                      {performanceData.drawCalls}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cliff-light-gray">Memory</span>
                    <span className="text-sm text-white font-mono">
                      {Math.round(performanceData.memoryUsed)}MB
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cliff-light-gray">Triangles</span>
                    <span className="text-sm text-white font-mono">
                      {Math.floor(performanceData.triangles / 1000)}K
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cliff-light-gray">Objects</span>
                    <span className="text-sm text-white font-mono">
                      {performanceData.visibleObjects}/{performanceData.totalObjects}
                    </span>
                  </div>
                </div>
              </div>

              {/* Performance Health */}
              <div className="border-t border-cliff-dark-gray/30 pt-3">
                <h4 className="text-sm font-semibold text-white mb-3">Performans Sağlığı</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-cliff-light-gray">Target Oranı</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-cliff-dark-gray/30 rounded-full h-2 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            performanceData.performanceRatio >= 0.95 ? "bg-accent-success" :
                            performanceData.performanceRatio >= 0.85 ? "bg-accent-info" :
                            performanceData.performanceRatio >= 0.7 ? "bg-accent-warning" :
                            "bg-accent-danger"
                          )}
                          style={{ width: `${Math.min(100, performanceData.performanceRatio * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-white font-mono">
                        {Math.round(performanceData.performanceRatio * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default FPSMonitor
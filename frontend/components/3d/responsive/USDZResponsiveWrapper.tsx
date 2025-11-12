'use client'
import React, { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stats } from '@react-three/drei'
import { USDZProfessionalSolarSystem } from '../USDZProfessionalSolarSystem'
import { PerformanceTracker, USDZPerformanceMetrics } from '../performance/USDZPerformanceManager'
interface DeviceCapabilities {
  isMobile: boolean
  isTablet: boolean  
  isDesktop: boolean
  supportsWebGL2: boolean
  maxTextureSize: number
  devicePixelRatio: number
  availableMemory: number
  hardwareConcurrency: number
}
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra'
interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  triangleCount: number
  drawCalls: number
  quality: QualityLevel
}
const useDeviceCapabilities = (): DeviceCapabilities => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    supportsWebGL2: true,
    maxTextureSize: 4096,
    devicePixelRatio: 1,
    availableMemory: 4096,
    hardwareConcurrency: 4
  })
  const [isClient, setIsClient] = useState(false)
  useEffect(() => {
    setIsClient(true)
    const detectCapabilities = () => {
      if (typeof window === 'undefined') return
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /mobile|android|iphone|ipod|blackberry|windows phone/.test(userAgent)
      const isTablet = /tablet|ipad/.test(userAgent) && !isMobile
      const isDesktop = !isMobile && !isTablet
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      const supportsWebGL2 = !!gl
      let maxTextureSize = 2048
      if (gl) {
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
        canvas.remove()
      }
      const devicePixelRatio = window.devicePixelRatio || 1
      const hardwareConcurrency = navigator.hardwareConcurrency || 4
      const availableMemory = (navigator as any).deviceMemory ? 
        (navigator as any).deviceMemory * 1024 : 
        (isMobile ? 2048 : isTablet ? 4096 : 8192)
      setCapabilities({
        isMobile,
        isTablet,
        isDesktop,
        supportsWebGL2,
        maxTextureSize,
        devicePixelRatio,
        availableMemory,
        hardwareConcurrency
      })
    }
    detectCapabilities()
  }, [])
  return capabilities
}
const determineOptimalQuality = (capabilities: DeviceCapabilities): QualityLevel => {
  const {
    isMobile,
    isTablet,
    maxTextureSize,
    availableMemory,
    hardwareConcurrency,
    devicePixelRatio
  } = capabilities
  let score = 0
  if (isMobile) score += 1
  else if (isTablet) score += 2
  else score += 3
  if (maxTextureSize >= 8192) score += 3
  else if (maxTextureSize >= 4096) score += 2
  else score += 1
  if (availableMemory >= 8192) score += 3
  else if (availableMemory >= 4096) score += 2
  else score += 1
  if (hardwareConcurrency >= 8) score += 3
  else if (hardwareConcurrency >= 4) score += 2
  else score += 1
  if (devicePixelRatio <= 1) score += 3
  else if (devicePixelRatio <= 2) score += 2
  else score += 1
  if (score >= 12) return 'ultra'
  else if (score >= 10) return 'high'
  else if (score >= 7) return 'medium'
  else return 'low'
}
const CanvasContent: React.FC<{
  currentQuality: QualityLevel
  onMetricsUpdate: (metrics: USDZPerformanceMetrics) => void
  capabilities: DeviceCapabilities
}> = ({ currentQuality, onMetricsUpdate, capabilities }) => {
  return (
    <>
      {}
      <PerformanceTracker 
        onMetricsUpdate={onMetricsUpdate}
        quality={currentQuality}
      />
      {}
      <PerspectiveCamera
        makeDefault
        position={[0, 0, 100]}
        fov={60}
        near={0.1}
        far={10000}
      />
      {}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={50}
        maxDistance={1000}
        dampingFactor={0.05}
        enableDamping={true}
        target={[0, 0, 0]}
      />
      {}
      <ambientLight intensity={0.2} />
      <directionalLight 
        position={[100, 100, 100]} 
        intensity={1}
        castShadow={currentQuality !== 'low'}
      />
      {}
      <Suspense fallback={null}>
        <USDZProfessionalSolarSystem 
          quality={currentQuality}
        />
      </Suspense>
      {}
      {process.env.NODE_ENV === 'development' && !capabilities.isMobile && <Stats />}
    </>
  )
}
export const USDZResponsiveWrapper: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const capabilities = useDeviceCapabilities()
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>('medium')
  const [performanceMetrics, setPerformanceMetrics] = useState<USDZPerformanceMetrics | null>(null)
  const metricsUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    setIsClient(true)
  }, [])
  useEffect(() => {
    if (isClient) {
      const optimalQuality = determineOptimalQuality(capabilities)
      setCurrentQuality(optimalQuality)
      console.log('🎯 Optimal quality determined:', optimalQuality, capabilities)
    }
  }, [capabilities, isClient])
  const canvasConfig = useMemo(() => {
    if (!isClient) return {}
    const baseConfig = {
      dpr: Math.min(capabilities.devicePixelRatio, capabilities.isMobile ? 1.5 : 2),
      antialias: !capabilities.isMobile,
      alpha: true,
      powerPreference: 'high-performance' as WebGLPowerPreference,
      stencil: false,
      depth: true,
    }
    if (capabilities.isMobile) {
      return {
        ...baseConfig,
        dpr: 1,
        antialias: false,
        powerPreference: 'default' as WebGLPowerPreference,
      }
    }
    return baseConfig
  }, [capabilities, isClient])
  const handleError = (error: Error) => {
    console.error('🚨 USDZ Wrapper Error:', error)
    setError(error.message)
  }
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false)
    console.log('✅ USDZ System loaded successfully')
  }, [])
  const handlePerformanceUpdate = useCallback((metrics: USDZPerformanceMetrics) => {
    if (metricsUpdateTimeoutRef.current) {
      clearTimeout(metricsUpdateTimeoutRef.current)
    }
    metricsUpdateTimeoutRef.current = setTimeout(() => {
      setPerformanceMetrics(metrics)
    }, 0)
  }, [])
  useEffect(() => {
    return () => {
      if (metricsUpdateTimeoutRef.current) {
        clearTimeout(metricsUpdateTimeoutRef.current)
      }
    }
  }, [])
  if (!isClient) {
    return (
      <div className={`relative w-full h-full bg-space-black ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cliff-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cliff-white text-lg font-semibold">USDZ Solar System</p>
            <p className="text-cliff-light-gray text-sm">Initializing...</p>
          </div>
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen bg-space-black ${className}`}>
        <div className="text-center p-8 bg-red-900/20 border border-red-500/30 rounded-lg max-w-md">
          <h3 className="text-red-400 text-lg font-semibold mb-4">
            ⚠️ USDZ Render Hatası
          </h3>
          <p className="text-red-300 text-sm mb-4">
            3D render sistemi başlatılırken bir sorun oluştu.
          </p>
          <details className="text-left text-xs text-red-200 bg-red-900/30 p-3 rounded">
            <summary className="cursor-pointer mb-2 font-medium">Teknik Detaylar</summary>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Sayfayı Yenile
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-space-black/80 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cliff-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cliff-white text-lg font-semibold">USDZ Solar System</p>
            <p className="text-cliff-light-gray text-sm">Yükleniyor...</p>
            <div className="text-xs text-cliff-light-gray mt-2">
              Kalite: {currentQuality.toUpperCase()} | {capabilities.isMobile ? 'Mobil' : capabilities.isTablet ? 'Tablet' : 'Masaüstü'}
            </div>
            {performanceMetrics && (
              <div className="text-xs text-cliff-blue mt-1">
                FPS: {performanceMetrics.fps} | Skor: {performanceMetrics.performanceScore}
              </div>
            )}
          </div>
        </div>
      )}
      <Canvas
        {...canvasConfig}
        className="w-full h-full"
        onCreated={({ gl, scene, camera }) => {
          console.log('🎨 Canvas created successfully')
          console.log('📊 WebGL Context:', gl.getContext())
          console.log('🔧 Quality:', currentQuality)
          handleLoadingComplete()
        }}
        onError={(error) => handleError(error)}
      >
        <CanvasContent 
          currentQuality={currentQuality}
          onMetricsUpdate={handlePerformanceUpdate}
          capabilities={capabilities}
        />
      </Canvas>
      {}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs text-white z-20">
          <div className="space-y-1">
            <div>FPS: {performanceMetrics.fps} (Avg: {performanceMetrics.averageFPS})</div>
            <div>Memory: {performanceMetrics.memoryUsage}MB</div>
            <div>Triangles: {performanceMetrics.triangleCount.toLocaleString()}</div>
            <div>Draw Calls: {performanceMetrics.drawCalls}</div>
            <div>LOD: {performanceMetrics.lodLevel.toUpperCase()}</div>
            <div>Score: {performanceMetrics.performanceScore}/100</div>
          </div>
        </div>
      )}
    </div>
  )
}
export default USDZResponsiveWrapper
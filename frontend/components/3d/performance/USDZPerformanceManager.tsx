'use client'

// 🔧 CRITICAL FIX: Dynamic import Three.js to prevent SSR dispatchEvent bug
import { useRef, useEffect, useState, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'

// USDZ Performance Metrics Interface
export interface USDZPerformanceMetrics {
  fps: number
  averageFPS: number
  memoryUsage: number
  drawCalls: number
  triangleCount: number
  textureMemory: number
  activeModels: number
  lodLevel: 'low' | 'medium' | 'high' | 'ultra'
  performanceScore: number
  recommendations: string[]
}

// USDZ LOD Configuration
interface USDZLODConfig {
  low: {
    maxDistance: number
    geometry: { segments: number, detail: number }
    texture: { resolution: number, anisotropy: number }
    effects: { shadows: boolean, reflections: boolean }
    particles: { count: number, quality: number }
  }
  medium: {
    maxDistance: number
    geometry: { segments: number, detail: number }
    texture: { resolution: number, anisotropy: number }
    effects: { shadows: boolean, reflections: boolean }
    particles: { count: number, quality: number }
  }
  high: {
    maxDistance: number
    geometry: { segments: number, detail: number }
    texture: { resolution: number, anisotropy: number }
    effects: { shadows: boolean, reflections: boolean }
    particles: { count: number, quality: number }
  }
  ultra: {
    maxDistance: number
    geometry: { segments: number, detail: number }
    texture: { resolution: number, anisotropy: number }
    effects: { shadows: boolean, reflections: boolean }
    particles: { count: number, quality: number }
  }
}

// Professional USDZ Performance Management System
export class USDZPerformanceManager {
  private static instance: USDZPerformanceManager
  private THREE: any = null
  
  // Performance tracking
  private frameHistory: number[] = []
  private lastFrameTime = 0
  private performanceHistory: USDZPerformanceMetrics[] = []
  private renderer?: any // THREE.WebGLRenderer
  private camera?: any // THREE.Camera
  private scene?: any // THREE.Scene
  
  // LOD Management
  private lodConfig: USDZLODConfig
  private currentLOD: 'low' | 'medium' | 'high' | 'ultra' = 'high'
  private autoLODEnabled = true
  private lodObjects: Map<string, any> = new Map() // THREE.Object3D
  
  // Performance thresholds
  private readonly PERFORMANCE_TARGETS = {
    targetFPS: 60,
    minAcceptableFPS: 30,
    criticalFPS: 20,
    maxMemoryMB: 512,
    maxDrawCalls: 1000
  }
  
  // Adaptive quality settings
  private adaptiveQualityEnabled = true
  private performanceMode = false
  private lastPerformanceCheck = 0
  
  constructor() {
    this.lodConfig = this.createLODConfiguration()
    this.initializePerformanceMonitoring()
    this.loadTHREE()
  }

  // Dynamic Three.js import
  private async loadTHREE(): Promise<void> {
    try {
      this.THREE = await import('three')
    } catch (error) {
      console.error('Failed to load Three.js in PerformanceManager:', error)
    }
  }

  static getInstance(): USDZPerformanceManager {
    if (!USDZPerformanceManager.instance) {
      USDZPerformanceManager.instance = new USDZPerformanceManager()
    }
    return USDZPerformanceManager.instance
  }

  // Initialize Performance Monitoring
  private initializePerformanceMonitoring(): void {
    // Memory usage monitoring
    if (typeof window !== 'undefined' && 'memory' in performance) {
      setInterval(() => {
        this.updateMemoryMetrics()
      }, 1000)
    }
  }

  // Create LOD Configuration
  private createLODConfiguration(): USDZLODConfig {
    return {
      low: {
        maxDistance: 100,
        geometry: { segments: 8, detail: 1 },
        texture: { resolution: 512, anisotropy: 1 },
        effects: { shadows: false, reflections: false },
        particles: { count: 50, quality: 0.3 }
      },
      medium: {
        maxDistance: 200,
        geometry: { segments: 16, detail: 2 },
        texture: { resolution: 1024, anisotropy: 4 },
        effects: { shadows: false, reflections: true },
        particles: { count: 100, quality: 0.6 }
      },
      high: {
        maxDistance: 400,
        geometry: { segments: 32, detail: 3 },
        texture: { resolution: 2048, anisotropy: 8 },
        effects: { shadows: true, reflections: true },
        particles: { count: 200, quality: 0.8 }
      },
      ultra: {
        maxDistance: 800,
        geometry: { segments: 64, detail: 4 },
        texture: { resolution: 4096, anisotropy: 16 },
        effects: { shadows: true, reflections: true },
        particles: { count: 400, quality: 1.0 }
      }
    }
  }

  // Initialize with Three.js context
  async initialize(renderer: any, camera: any, scene: any): Promise<void> {
    // Wait for THREE.js to load if not already loaded
    if (!this.THREE) {
      await this.loadTHREE()
    }
    
    this.renderer = renderer
    this.camera = camera
    this.scene = scene
    
    console.log('🚀 USDZ Performance Manager initialized')
    
    // Setup renderer optimizations
    this.optimizeRenderer()
  }

  private optimizeRenderer(): void {
    if (!this.renderer || !this.THREE) return

    // Professional renderer settings
    this.renderer.shadowMap.enabled = this.currentLOD === 'high' || this.currentLOD === 'ultra'
    this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = this.THREE.SRGBColorSpace
    this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    
    // Performance optimizations
    this.renderer.info.autoReset = false
    this.renderer.sortObjects = true
    this.renderer.autoClear = true
    
    // Pixel ratio optimization
    if (typeof window !== 'undefined') {
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      this.renderer.setPixelRatio(pixelRatio)
    }
  }

  // Update performance metrics
  update(deltaTime: number): USDZPerformanceMetrics {
    const currentTime = performance.now()
    const fps = 1 / deltaTime
    
    // Update frame history
    this.frameHistory.push(fps)
    if (this.frameHistory.length > 120) { // Keep 2 seconds at 60fps
      this.frameHistory.shift()
    }
    
    // Calculate metrics
    const averageFPS = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length
    const memoryUsage = this.getMemoryUsage()
    const drawCalls = this.getDrawCalls()
    const triangleCount = this.getTriangleCount()
    const textureMemory = this.getTextureMemory()
    const activeModels = this.lodObjects.size
    
    const metrics: USDZPerformanceMetrics = {
      fps: Math.round(fps),
      averageFPS: Math.round(averageFPS),
      memoryUsage,
      drawCalls,
      triangleCount,
      textureMemory,
      activeModels,
      lodLevel: this.currentLOD,
      performanceScore: this.calculatePerformanceScore(averageFPS, memoryUsage, drawCalls),
      recommendations: this.generateRecommendations(averageFPS, memoryUsage, drawCalls)
    }
    
    // Auto LOD adjustment
    if (this.autoLODEnabled && currentTime - this.lastPerformanceCheck > 2000) {
      this.adjustLODBasedOnPerformance(metrics)
      this.lastPerformanceCheck = currentTime
    }
    
    // Store performance history
    this.performanceHistory.push(metrics)
    if (this.performanceHistory.length > 60) { // Keep 1 minute of history
      this.performanceHistory.shift()
    }
    
    this.lastFrameTime = currentTime
    return metrics
  }

  // Auto LOD Adjustment
  private adjustLODBasedOnPerformance(metrics: USDZPerformanceMetrics): void {
    const { averageFPS, memoryUsage, drawCalls } = metrics
    
    // Performance scoring
    let targetLOD = this.currentLOD
    
    // Decrease quality if performance is poor
    if (averageFPS < this.PERFORMANCE_TARGETS.criticalFPS) {
      targetLOD = 'low'
    } else if (averageFPS < this.PERFORMANCE_TARGETS.minAcceptableFPS) {
      if (this.currentLOD === 'ultra') targetLOD = 'high'
      else if (this.currentLOD === 'high') targetLOD = 'medium'
      else if (this.currentLOD === 'medium') targetLOD = 'low'
    }
    // Increase quality if performance allows
    else if (averageFPS > this.PERFORMANCE_TARGETS.targetFPS * 0.9) {
      if (memoryUsage < this.PERFORMANCE_TARGETS.maxMemoryMB * 0.7 && 
          drawCalls < this.PERFORMANCE_TARGETS.maxDrawCalls * 0.7) {
        if (this.currentLOD === 'low') targetLOD = 'medium'
        else if (this.currentLOD === 'medium') targetLOD = 'high'
        else if (this.currentLOD === 'high') targetLOD = 'ultra'
      }
    }
    
    if (targetLOD !== this.currentLOD) {
      console.log(`🔧 USDZ LOD Auto-adjustment: ${this.currentLOD} → ${targetLOD} (FPS: ${averageFPS})`)
      this.setLOD(targetLOD)
    }
  }

  // Set LOD Level
  setLOD(level: 'low' | 'medium' | 'high' | 'ultra'): void {
    if (level === this.currentLOD) return
    
    this.currentLOD = level
    const config = this.lodConfig[level]
    
    // Apply LOD to all registered objects
    this.lodObjects.forEach((object, id) => {
      this.applyLODToObject(object, level, config)
    })
    
    // Update renderer settings
    this.optimizeRenderer()
    
    console.log(`🎯 USDZ LOD set to: ${level.toUpperCase()}`)
  }

  // Apply LOD to specific object
  private applyLODToObject(object: any, level: string, config: any): void {
    if (!this.THREE) return
    
    object.traverse((child: any) => {
      // Update geometry LOD
      if (child instanceof this.THREE.Mesh && child.geometry) {
        this.updateGeometryLOD(child, config.geometry)
      }
      
      // Update material LOD
      if (child instanceof this.THREE.Mesh && child.material) {
        this.updateMaterialLOD(child.material, config.texture)
      }
      
      // Update visibility based on distance
      if (this.camera && child.position) {
        const distance = this.camera.position.distanceTo(child.position)
        child.visible = distance <= config.maxDistance
      }
    })
  }

  private updateGeometryLOD(mesh: any, geometryConfig: any): void {
    // Geometry LOD updates would be implemented here
    // This is a simplified version - real implementation would swap geometries
  }

  private updateMaterialLOD(material: any, textureConfig: any): void {
    if (!this.THREE) return
    
    const materials = Array.isArray(material) ? material : [material]
    
    materials.forEach(mat => {
      if (mat instanceof this.THREE.MeshStandardMaterial || mat instanceof this.THREE.MeshPhysicalMaterial) {
        // Update texture resolution and anisotropy
        if (mat.map) {
          mat.map.anisotropy = textureConfig.anisotropy
          mat.map.needsUpdate = true
        }
      }
    })
  }

  // Register object for LOD management
  registerLODObject(id: string, object: any): void {
    this.lodObjects.set(id, object)
    this.applyLODToObject(object, this.currentLOD, this.lodConfig[this.currentLOD])
  }

  // Unregister object
  unregisterLODObject(id: string): void {
    this.lodObjects.delete(id)
  }

  // Performance metrics helpers
  private getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'memory' in performance && (performance as any).memory) {
      return Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
    }
    return 0
  }

  private getDrawCalls(): number {
    return this.renderer?.info.render.calls || 0
  }

  private getTriangleCount(): number {
    return this.renderer?.info.render.triangles || 0
  }

  private getTextureMemory(): number {
    return this.renderer?.info.memory.textures || 0
  }

  private updateMemoryMetrics(): void {
    if (this.renderer) {
      this.renderer.info.reset()
    }
  }

  // Performance score calculation
  private calculatePerformanceScore(fps: number, memory: number, drawCalls: number): number {
    let score = 100
    
    // FPS impact (50% of score)
    const fpsScore = Math.min((fps / this.PERFORMANCE_TARGETS.targetFPS) * 50, 50)
    
    // Memory impact (30% of score)
    const memoryScore = Math.max(30 - (memory / this.PERFORMANCE_TARGETS.maxMemoryMB) * 30, 0)
    
    // Draw calls impact (20% of score)
    const drawCallScore = Math.max(20 - (drawCalls / this.PERFORMANCE_TARGETS.maxDrawCalls) * 20, 0)
    
    score = fpsScore + memoryScore + drawCallScore
    return Math.round(Math.max(score, 0))
  }

  // Generate performance recommendations
  private generateRecommendations(fps: number, memory: number, drawCalls: number): string[] {
    const recommendations: string[] = []
    
    if (fps < this.PERFORMANCE_TARGETS.minAcceptableFPS) {
      recommendations.push('Consider reducing LOD level')
      recommendations.push('Disable advanced effects')
    }
    
    if (memory > this.PERFORMANCE_TARGETS.maxMemoryMB * 0.8) {
      recommendations.push('Reduce texture resolution')
      recommendations.push('Clear unused assets')
    }
    
    if (drawCalls > this.PERFORMANCE_TARGETS.maxDrawCalls * 0.8) {
      recommendations.push('Use instanced rendering')
      recommendations.push('Reduce model complexity')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal')
    }
    
    return recommendations
  }

  // Public API methods
  getCurrentLOD(): 'low' | 'medium' | 'high' | 'ultra' {
    return this.currentLOD
  }

  setAutoLOD(enabled: boolean): void {
    this.autoLODEnabled = enabled
    console.log(`🔄 Auto LOD ${enabled ? 'enabled' : 'disabled'}`)
  }

  setPerformanceMode(enabled: boolean): void {
    this.performanceMode = enabled
    if (enabled) {
      this.setLOD('low')
      this.setAutoLOD(false)
    }
    console.log(`⚡ Performance mode ${enabled ? 'enabled' : 'disabled'}`)
  }

  getPerformanceHistory(): USDZPerformanceMetrics[] {
    return [...this.performanceHistory]
  }

  // Clean up resources
  dispose(): void {
    this.frameHistory = []
    this.performanceHistory = []
    this.lodObjects.clear()
  }
}

// Canvas içinde çalışacak PerformanceTracker component
// Bu component R3F hook'larını kullandığı için sadece Canvas içinde çalışır
export const PerformanceTracker: React.FC<{
  onMetricsUpdate?: (metrics: USDZPerformanceMetrics) => void
  quality?: 'low' | 'medium' | 'high' | 'ultra'
}> = ({ onMetricsUpdate, quality = 'high' }) => {
  const managerRef = useRef<USDZPerformanceManager>()
  const [initialized, setInitialized] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const callbackQueueRef = useRef<USDZPerformanceMetrics[]>([])
  
  // Safe hook usage - bu hooks sadece Canvas içinde çalışır
  let threeState: any = null
  let gl: any = null // THREE.WebGLRenderer
  let camera: any = null // THREE.Camera
  let scene: any = null // THREE.Scene
  
  // Canvas context'ini güvenli şekilde kontrol et
  try {
    threeState = useThree()
    if (threeState) {
      gl = threeState.gl
      camera = threeState.camera
      scene = threeState.scene
      if (gl && camera && scene && !canvasReady) {
        setCanvasReady(true)
      }
    }
  } catch (error) {
    console.warn('PerformanceTracker: Canvas context not available:', error)
    return null
  }
  
  // Canvas context yoksa component'i render etme
  if (!threeState || !gl || !camera || !scene) {
    console.warn('PerformanceTracker: Missing Canvas context, skipping render')
    return null
  }
  
  // Manager instance'ını oluştur
  if (!managerRef.current) {
    managerRef.current = USDZPerformanceManager.getInstance()
  }
  
  // Initialize once when Canvas context is ready
  useEffect(() => {
    if (managerRef.current && gl && camera && scene && canvasReady && !initialized) {
      try {
        managerRef.current.initialize(gl, camera, scene)
        managerRef.current.setLOD(quality)
        setInitialized(true)
        console.log('✅ PerformanceTracker initialized successfully')
      } catch (error) {
        console.error('❌ Performance tracker initialization error:', error)
      }
    }
  }, [gl, camera, scene, canvasReady, initialized, quality])
  
  // Safe callback queue processing - render phase dışında
  useEffect(() => {
    const processCallbacks = () => {
      if (callbackQueueRef.current.length > 0 && onMetricsUpdate && typeof onMetricsUpdate === 'function') {
        try {
          const latestMetrics = callbackQueueRef.current[callbackQueueRef.current.length - 1]
          callbackQueueRef.current = [] // Clear queue
          onMetricsUpdate(latestMetrics)
        } catch (error) {
          console.error('❌ Performance metrics callback error:', error)
        }
      }
    }

    const intervalId = setInterval(processCallbacks, 100) // Process callbacks every 100ms
    return () => clearInterval(intervalId)
  }, [onMetricsUpdate])
  
  // Update performance metrics every frame - sadece Canvas context'inde
  useFrame((state, delta) => {
    if (!managerRef.current || !initialized || !canvasReady) return
    
    try {
      // Delta validasyonu
      if (typeof delta !== 'number' || delta <= 0 || delta > 1) {
        console.warn('Invalid delta time:', delta)
        return
      }
      
      const metrics = managerRef.current.update(delta)
      
      // Queue metrics for safe callback processing
      if (onMetricsUpdate && typeof onMetricsUpdate === 'function') {
        callbackQueueRef.current.push(metrics)
      }
    } catch (error) {
      console.error('❌ Performance metrics update error:', error)
    }
  })
  
  // Quality değişikliğinde LOD'u güncelle
  useEffect(() => {
    if (managerRef.current && initialized && quality) {
      try {
        managerRef.current.setLOD(quality)
      } catch (error) {
        console.error('❌ LOD update error:', error)
      }
    }
  }, [quality, initialized])
  
  // Cleanup
  useEffect(() => {
    return () => {
      try {
        callbackQueueRef.current = []
        if (managerRef.current) {
          managerRef.current.dispose()
        }
      } catch (error) {
        console.error('❌ Performance manager dispose error:', error)
      }
    }
  }, [])
  
  return null // Bu component render etmez, sadece performans takibi yapar
}

// React Hook for USDZ Performance Manager (Canvas dışında güvenli kullanım)
export function useUSDZPerformanceManager() {
  const [metrics, setMetrics] = useState<USDZPerformanceMetrics | null>(null)
  const managerRef = useRef<USDZPerformanceManager>()
  
  if (!managerRef.current) {
    managerRef.current = USDZPerformanceManager.getInstance()
  }
  
  const updateMetrics = useCallback((newMetrics: USDZPerformanceMetrics) => {
    setMetrics(newMetrics)
  }, [])
  
  useEffect(() => {
    return () => {
      managerRef.current?.dispose()
    }
  }, [])
  
  return {
    metrics,
    updateMetrics,
    setLOD: (level: 'low' | 'medium' | 'high' | 'ultra') => managerRef.current?.setLOD(level),
    setAutoLOD: (enabled: boolean) => managerRef.current?.setAutoLOD(enabled),
    setPerformanceMode: (enabled: boolean) => managerRef.current?.setPerformanceMode(enabled),
    registerLODObject: (id: string, object: any) => managerRef.current?.registerLODObject(id, object),
    unregisterLODObject: (id: string) => managerRef.current?.unregisterLODObject(id),
    getCurrentLOD: () => managerRef.current?.getCurrentLOD() || 'high',
    getPerformanceHistory: () => managerRef.current?.getPerformanceHistory() || []
  }
}

export default USDZPerformanceManager
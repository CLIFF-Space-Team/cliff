import * as THREE from 'three'
import { QUALITY_PRESETS, QualityPreset } from '../../../types/astronomical-data'
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  averageFPS: number
  deltaTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  memoryUsed: number
  textureMemory: number
  geometryMemory: number
  visibleObjects: number
  culledObjects: number
  totalObjects: number
  ultraLOD: number
  highLOD: number
  mediumLOD: number
  lowLOD: number
  gpuMemory?: number
  gpuUtilization?: number
}
export interface PerformanceConfig {
  targetFPS: number
  minFPS: number
  maxFPS: number
  enableAdaptiveQuality: boolean
  qualityAdjustmentThreshold: number
  maxTextureMemory: number
  maxGeometryMemory: number
  maxTotalMemory: number
  metricsUpdateInterval: number
  qualityCheckInterval: number
  lowPerformanceThreshold: number
  highPerformanceThreshold: number
  showDebugInfo: boolean
  logPerformanceWarnings: boolean
}
export interface PerformanceEvent {
  type: 'fps_drop' | 'memory_warning' | 'quality_changed' | 'optimization_applied'
  data: any
  timestamp: number
}
export class PerformanceManager {
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.Camera
  private config: PerformanceConfig
  private metrics: PerformanceMetrics
  private fpsHistory: number[]
  private frameTimeHistory: number[]
  private lastFrameTime: number
  private frameCount: number
  private currentQuality: QualityPreset
  private qualityHistory: string[]
  private lastQualityCheck: number
  private qualityLocked: boolean
  private textureCache: Map<string, THREE.Texture>
  private geometryCache: Map<string, THREE.BufferGeometry>
  private materialCache: Map<string, THREE.Material>
  private frustum: THREE.Frustum
  private cameraMatrix: THREE.Matrix4
  private visibleObjects: Set<THREE.Object3D>
  private culledObjects: Set<THREE.Object3D>
  private eventListeners: Map<string, Function[]>
  private lastMetricsUpdate: number
  private lastMemoryCheck: number
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<PerformanceConfig> = {}
  ) {
    this.renderer = renderer
    this.scene = scene
    this.camera = camera
    this.config = {
      targetFPS: 60,
      minFPS: 30,
      maxFPS: 120,
      enableAdaptiveQuality: true,
      qualityAdjustmentThreshold: 0.2,
      maxTextureMemory: 512,
      maxGeometryMemory: 256,
      maxTotalMemory: 1024,
      metricsUpdateInterval: 1000,
      qualityCheckInterval: 5000,
      lowPerformanceThreshold: 0.8,
      highPerformanceThreshold: 1.2,
      showDebugInfo: false,
      logPerformanceWarnings: true,
      ...config
    }
    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      averageFPS: 60,
      deltaTime: 0,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      memoryUsed: 0,
      textureMemory: 0,
      geometryMemory: 0,
      visibleObjects: 0,
      culledObjects: 0,
      totalObjects: 0,
      ultraLOD: 0,
      highLOD: 0,
      mediumLOD: 0,
      lowLOD: 0
    }
    this.fpsHistory = []
    this.frameTimeHistory = []
    this.qualityHistory = []
    this.currentQuality = QUALITY_PRESETS.high
    this.qualityLocked = false
    this.textureCache = new Map()
    this.geometryCache = new Map()
    this.materialCache = new Map()
    this.frustum = new THREE.Frustum()
    this.cameraMatrix = new THREE.Matrix4()
    this.visibleObjects = new Set()
    this.culledObjects = new Set()
    this.eventListeners = new Map()
    this.lastFrameTime = performance.now()
    this.frameCount = 0
    this.lastMetricsUpdate = 0
    this.lastMemoryCheck = 0
    this.lastQualityCheck = 0
    console.log('🚀 PerformanceManager initialized with target FPS:', this.config.targetFPS)
  }
  public update(deltaTime: number): void {
    const now = performance.now()
    this.updateFrameMetrics(deltaTime, now)
    this.updateFrustum()
    this.updateCullingStats()
    if (now - this.lastMetricsUpdate > this.config.metricsUpdateInterval) {
      this.updateDetailedMetrics()
      this.lastMetricsUpdate = now
    }
    if (now - this.lastMemoryCheck > 2000) {
      this.checkMemoryUsage()
      this.lastMemoryCheck = now
    }
    if (this.config.enableAdaptiveQuality && 
        now - this.lastQualityCheck > this.config.qualityCheckInterval) {
      this.checkAndAdjustQuality()
      this.lastQualityCheck = now
    }
  }
  private updateFrameMetrics(deltaTime: number, now: number): void {
    this.frameCount++
    const frameTime = now - this.lastFrameTime
    const currentFPS = 1000 / frameTime
    this.metrics.fps = currentFPS
    this.metrics.frameTime = frameTime
    this.metrics.deltaTime = deltaTime
    this.fpsHistory.push(currentFPS)
    this.frameTimeHistory.push(frameTime)
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift()
      this.frameTimeHistory.shift()
    }
    this.metrics.averageFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    this.lastFrameTime = now
  }
  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix, 
      this.camera.matrixWorldInverse
    )
    this.frustum.setFromProjectionMatrix(this.cameraMatrix)
  }
  private updateCullingStats(): void {
    this.visibleObjects.clear()
    this.culledObjects.clear()
    let totalObjects = 0
    this.scene.traverse((object) => {
      if (object.type === 'Mesh' || object.type === 'Group') {
        totalObjects++
        try {
          if (object.type === 'Mesh') {
            const mesh = object as THREE.Mesh
            if (mesh.geometry && !mesh.geometry.boundingSphere) {
              mesh.geometry.computeBoundingSphere()
            }
          }
          if (this.frustum.intersectsObject(object)) {
            this.visibleObjects.add(object)
            object.visible = true
          } else {
            this.culledObjects.add(object)
          }
        } catch (error) {
          this.visibleObjects.add(object) 
        }
      }
    })
    this.metrics.visibleObjects = this.visibleObjects.size
    this.metrics.culledObjects = this.culledObjects.size
    this.metrics.totalObjects = totalObjects
  }
  private updateDetailedMetrics(): void {
    const info = this.renderer.info
    this.metrics.drawCalls = info.render.calls
    this.metrics.triangles = info.render.triangles
    this.metrics.geometries = info.memory.geometries
    this.metrics.textures = info.memory.textures
    this.calculateMemoryUsage()
    this.emit('metricsUpdate', this.metrics)
    info.reset()
  }
  private calculateMemoryUsage(): void {
    let textureMemory = 0
    let geometryMemory = 0
    this.textureCache.forEach((texture) => {
      if (texture.image) {
        const width = texture.image.width || 1024
        const height = texture.image.height || 1024
        const bytes = width * height * 4 
        textureMemory += bytes
      }
    })
    this.geometryCache.forEach((geometry) => {
      const positions = geometry.getAttribute('position')
      const normals = geometry.getAttribute('normal')
      const uvs = geometry.getAttribute('uv')
      let bytes = 0
      if (positions) bytes += positions.count * positions.itemSize * 4 
      if (normals) bytes += normals.count * normals.itemSize * 4
      if (uvs) bytes += uvs.count * uvs.itemSize * 4
      geometryMemory += bytes
    })
    this.metrics.textureMemory = textureMemory / (1024 * 1024) 
    this.metrics.geometryMemory = geometryMemory / (1024 * 1024) 
    this.metrics.memoryUsed = this.metrics.textureMemory + this.metrics.geometryMemory
  }
  private checkMemoryUsage(): void {
    const { textureMemory, geometryMemory, memoryUsed } = this.metrics
    if (textureMemory > this.config.maxTextureMemory) {
      this.emit('memory_warning', {
        type: 'texture',
        usage: textureMemory,
        limit: this.config.maxTextureMemory
      })
      if (this.config.logPerformanceWarnings) {
        console.warn(`Texture memory usage: ${textureMemory.toFixed(2)}MB exceeds limit: ${this.config.maxTextureMemory}MB`)
      }
    }
    if (geometryMemory > this.config.maxGeometryMemory) {
      this.emit('memory_warning', {
        type: 'geometry',
        usage: geometryMemory,
        limit: this.config.maxGeometryMemory
      })
    }
    if (memoryUsed > this.config.maxTotalMemory) {
      this.emit('memory_warning', {
        type: 'total',
        usage: memoryUsed,
        limit: this.config.maxTotalMemory
      })
      this.performMemoryCleanup()
    }
  }
  private checkAndAdjustQuality(): void {
    if (this.qualityLocked) return
    const performanceRatio = this.metrics.averageFPS / this.config.targetFPS
    if (performanceRatio < this.config.lowPerformanceThreshold) {
      const currentQualityIndex = this.getQualityIndex(this.currentQuality.name)
      if (currentQualityIndex > 0) {
        const newQuality = this.getQualityByIndex(currentQualityIndex - 1)
        this.setQuality(newQuality)
        this.emit('quality_changed', {
          from: this.currentQuality.name,
          to: newQuality.name,
          reason: 'low_performance',
          fps: this.metrics.averageFPS
        })
        if (this.config.logPerformanceWarnings) {
          console.warn(`Quality reduced to ${newQuality.name} due to low FPS: ${this.metrics.averageFPS.toFixed(1)}`)
        }
      }
    }
    else if (performanceRatio > this.config.highPerformanceThreshold) {
      const currentQualityIndex = this.getQualityIndex(this.currentQuality.name)
      if (currentQualityIndex < 2) { 
        const newQuality = this.getQualityByIndex(currentQualityIndex + 1)
        this.setQuality(newQuality)
        this.emit('quality_changed', {
          from: this.currentQuality.name,
          to: newQuality.name,
          reason: 'high_performance',
          fps: this.metrics.averageFPS
        })
      }
    }
  }
  private getQualityIndex(qualityName: string): number {
    const qualities = ['DÃ¼ÅŸÃ¼k', 'Orta', 'YÃ¼ksek']
    return qualities.indexOf(qualityName)
  }
  private getQualityByIndex(index: number): QualityPreset {
    const qualities = ['low', 'medium', 'high']
    const qualityName = qualities[Math.max(0, Math.min(2, index))]
    return QUALITY_PRESETS[qualityName]
  }
  public setQuality(quality: QualityPreset): void {
    this.currentQuality = quality
    this.qualityHistory.push(quality.name)
    this.renderer.shadowMap.enabled = quality.effects_enabled
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.name === 'YÃ¼ksek' ? 2 : 1))
    if (this.qualityHistory.length > 10) {
      this.qualityHistory.shift()
    }
  }
  private performMemoryCleanup(): void {
    let cleaned = 0
    this.textureCache.forEach((texture, key) => {
      if (texture.image && !texture.image.complete) {
        texture.dispose()
        this.textureCache.delete(key)
        cleaned++
      }
    })
    this.geometryCache.forEach((geometry, key) => {
      if (!geometry.userData.inUse) {
        geometry.dispose()
        this.geometryCache.delete(key)
        cleaned++
      }
    })
    this.materialCache.forEach((material, key) => {
      if (!material.userData.inUse) {
        material.dispose()
        this.materialCache.delete(key)
        cleaned++
      }
    })
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} unused resources`)
      this.emit('optimization_applied', { type: 'memory_cleanup', resourcesCleaned: cleaned })
    }
  }
  public applyLODOptimization(object: THREE.Object3D, cameraDistance: number): void {
    const lodThresholds = {
      ultra: 10,
      high: 50,
      medium: 200,
      low: 1000
    }
    let targetLOD: keyof typeof lodThresholds
    if (cameraDistance < lodThresholds.ultra) targetLOD = 'ultra'
    else if (cameraDistance < lodThresholds.high) targetLOD = 'high'
    else if (cameraDistance < lodThresholds.medium) targetLOD = 'medium'
    else targetLOD = 'low'
    this.metrics[`${targetLOD}LOD` as keyof PerformanceMetrics] = 
      (this.metrics[`${targetLOD}LOD` as keyof PerformanceMetrics] as number) + 1
  }
  public registerTexture(key: string, texture: THREE.Texture): void {
    this.textureCache.set(key, texture)
  }
  public registerGeometry(key: string, geometry: THREE.BufferGeometry): void {
    this.geometryCache.set(key, geometry)
  }
  public registerMaterial(key: string, material: THREE.Material): void {
    this.materialCache.set(key, material)
  }
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }
  public getCurrentQuality(): QualityPreset {
    return this.currentQuality
  }
  public setTargetFPS(fps: number): void {
    this.config.targetFPS = fps
  }
  public lockQuality(locked: boolean): void {
    this.qualityLocked = locked
  }
  public isQualityLocked(): boolean {
    return this.qualityLocked
  }
  public getPerformanceRatio(): number {
    return this.metrics.averageFPS / this.config.targetFPS
  }
  public getMemoryPressure(): number {
    return this.metrics.memoryUsed / this.config.maxTotalMemory
  }
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }
  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }
  public getDebugInfo(): string {
    const perf = this.getPerformanceRatio()
    const memory = this.getMemoryPressure()
    return `FPS: ${this.metrics.fps.toFixed(1)} (avg: ${this.metrics.averageFPS.toFixed(1)})
Quality: ${this.currentQuality.name}
Performance: ${(perf * 100).toFixed(1)}%
Memory: ${this.metrics.memoryUsed.toFixed(1)}MB (${(memory * 100).toFixed(1)}%)
Visible/Total: ${this.metrics.visibleObjects}/${this.metrics.totalObjects}
Draw Calls: ${this.metrics.drawCalls}
Triangles: ${this.metrics.triangles}`
  }
  public dispose(): void {
    this.textureCache.forEach(texture => texture.dispose())
    this.geometryCache.forEach(geometry => geometry.dispose())
    this.materialCache.forEach(material => material.dispose())
    this.textureCache.clear()
    this.geometryCache.clear()
    this.materialCache.clear()
    this.eventListeners.clear()
    console.log('🗑️ PerformanceManager disposed')
  }
}
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private startTime: number = 0
  private markers: Map<string, number> = new Map()
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }
  public mark(name: string): void {
    this.markers.set(name, performance.now())
  }
  public measure(name: string, startMark?: string): number {
    const end = performance.now()
    const start = startMark ? this.markers.get(startMark) || 0 : this.startTime
    return end - start
  }
  public startFrame(): void {
    this.startTime = performance.now()
  }
  public endFrame(): number {
    return this.measure('frame')
  }
}
export function createPerformanceManager(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config?: Partial<PerformanceConfig>
): PerformanceManager {
  return new PerformanceManager(renderer, scene, camera, config)
}
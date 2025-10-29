// CLIFF 3D Solar System - Texture Streaming Manager
// Memory-efficient texture streaming with adaptive quality

import * as THREE from 'three'
import { TextureManager } from '../materials/TextureManager'
import { NASATextureAssetManager } from '../assets/NASATextureAssets'

export interface StreamingConfig {
  maxConcurrentLoads: number
  memoryBudgetMB: number
  streamingDistance: number
  preloadDistance: number
  unloadDistance: number
  qualityFalloffDistance: number
  enableAdaptiveQuality: boolean
  enableProgressiveLoading: boolean
}

export interface TextureStreamingRequest {
  id: string
  priority: number
  distance: number
  targetQuality: 'ultra' | 'high' | 'medium' | 'low'
  onLoaded?: (texture: THREE.Texture) => void
  onError?: (error: Error) => void
}

export interface StreamingMetrics {
  activeStreams: number
  pendingRequests: number
  memoryUsageMB: number
  bandwidthMbps: number
  averageLoadTime: number
  cacheHitRate: number
  qualityLevel: string
}

export class TextureStreamingManager {
  private textureManager: TextureManager
  private nasaAssetManager: NASATextureAssetManager
  
  // Configuration
  private config: StreamingConfig
  
  // Streaming queues
  private streamingQueue: TextureStreamingRequest[]
  private activeStreams: Map<string, Promise<THREE.Texture>>
  private loadedTextures: Map<string, THREE.Texture>
  private preloadedTextures: Map<string, THREE.Texture>
  
  // Performance tracking
  private metrics: StreamingMetrics
  private loadTimes: number[]
  private bandwidthSamples: number[]
  private lastMetricsUpdate: number = 0
  
  // Adaptive quality
  private currentQualityLevel: 'ultra' | 'high' | 'medium' | 'low' = 'high'
  private performanceHistory: number[] = []
  private lastPerformanceCheck: number = 0
  
  // Memory management
  private memoryUsage: number = 0
  private lastMemoryCheck: number = 0
  
  // Camera tracking for distance-based streaming
  private cameraPosition: THREE.Vector3 = new THREE.Vector3()
  private planetPositions: Map<string, THREE.Vector3> = new Map()
  
  constructor(config: Partial<StreamingConfig> = {}) {
    this.textureManager = TextureManager.getInstance()
    this.nasaAssetManager = NASATextureAssetManager.getInstance()
    
    this.config = {
      maxConcurrentLoads: 4,
      memoryBudgetMB: 512,
      streamingDistance: 50,
      preloadDistance: 100,
      unloadDistance: 200,
      qualityFalloffDistance: 150,
      enableAdaptiveQuality: true,
      enableProgressiveLoading: true,
      ...config
    }
    
    this.streamingQueue = []
    this.activeStreams = new Map()
    this.loadedTextures = new Map()
    this.preloadedTextures = new Map()
    this.loadTimes = []
    this.bandwidthSamples = []
    
    this.metrics = {
      activeStreams: 0,
      pendingRequests: 0,
      memoryUsageMB: 0,
      bandwidthMbps: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
      qualityLevel: this.currentQualityLevel
    }
    
    this.startStreamingLoop()
    this.startPerformanceMonitoring()
  }
  
  /**
   * Update camera position for distance-based streaming
   */
  public updateCameraPosition(position: THREE.Vector3): void {
    this.cameraPosition.copy(position)
  }
  
  /**
   * Update planet positions for distance calculations
   */
  public updatePlanetPosition(planetId: string, position: THREE.Vector3): void {
    this.planetPositions.set(planetId, position.clone())
  }
  
  /**
   * Request texture streaming for a planet
   */
  public requestTextureStream(
    planetId: string,
    textureType: string = 'primary',
    priority: number = 1
  ): Promise<THREE.Texture | null> {
    const planetPosition = this.planetPositions.get(planetId)
    if (!planetPosition) {
      return Promise.resolve(null)
    }
    
    const distance = this.cameraPosition.distanceTo(planetPosition)
    const targetQuality = this.getQualityForDistance(distance)
    
    const requestId = `${planetId}_${textureType}_${targetQuality}`
    
    // Check if already loaded
    if (this.loadedTextures.has(requestId)) {
      this.metrics.cacheHitRate++
      return Promise.resolve(this.loadedTextures.get(requestId)!)
    }
    
    // Check if already streaming
    if (this.activeStreams.has(requestId)) {
      return this.activeStreams.get(requestId)!
    }
    
    // Create streaming request
    const request: TextureStreamingRequest = {
      id: requestId,
      priority: this.calculatePriority(distance, priority, textureType),
      distance,
      targetQuality
    }
    
    // Add to queue
    this.addToStreamingQueue(request)
    
    // Create and store promise
    const streamPromise = this.createStreamingPromise(planetId, textureType, targetQuality)
    this.activeStreams.set(requestId, streamPromise)
    
    return streamPromise
  }
  
  /**
   * Get appropriate quality level based on distance
   */
  private getQualityForDistance(distance: number): 'ultra' | 'high' | 'medium' | 'low' {
    if (!this.config.enableAdaptiveQuality) {
      return this.currentQualityLevel
    }
    
    // Distance-based quality falloff
    if (distance < this.config.streamingDistance * 0.5) {
      return this.currentQualityLevel
    } else if (distance < this.config.streamingDistance) {
      return this.currentQualityLevel === 'ultra' ? 'high' : this.currentQualityLevel
    } else if (distance < this.config.qualityFalloffDistance) {
      return 'medium'
    } else {
      return 'low'
    }
  }
  
  /**
   * Calculate streaming priority
   */
  private calculatePriority(distance: number, userPriority: number, textureType: string): number {
    let priority = userPriority
    
    // Distance-based priority (closer = higher priority)
    priority += Math.max(0, 1 - (distance / this.config.streamingDistance))
    
    // Texture type priority
    const typeMultipliers = {
      primary: 1.0,
      normal: 0.8,
      specular: 0.6,
      emissive: 0.5,
      clouds: 0.7,
      atmosphere: 0.4
    }
    priority *= typeMultipliers[textureType as keyof typeof typeMultipliers] || 0.5
    
    return priority
  }
  
  /**
   * Add request to streaming queue with proper sorting
   */
  private addToStreamingQueue(request: TextureStreamingRequest): void {
    // Insert based on priority (higher priority first)
    let insertIndex = this.streamingQueue.length
    for (let i = 0; i < this.streamingQueue.length; i++) {
      if (this.streamingQueue[i].priority < request.priority) {
        insertIndex = i
        break
      }
    }
    
    this.streamingQueue.splice(insertIndex, 0, request)
    this.metrics.pendingRequests = this.streamingQueue.length
  }
  
  /**
   * Create streaming promise for texture loading
   */
  private createStreamingPromise(
    planetId: string,
    textureType: string,
    quality: 'ultra' | 'high' | 'medium' | 'low'
  ): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      // Get NASA asset for planet
      const planetAssets = this.nasaAssetManager.getPlanetTextureSet(planetId)
      if (!planetAssets) {
        reject(new Error(`No texture assets found for planet: ${planetId}`))
        return
      }
      
      // Select appropriate asset based on texture type
      let asset = planetAssets.primarySurface
      if (textureType === 'clouds' && planetAssets.cloudTextures) {
        asset = planetAssets.cloudTextures[0]
      } else if (textureType === 'atmosphere' && planetAssets.atmosphereTextures) {
        asset = planetAssets.atmosphereTextures[0]
      } else if (textureType === 'night' && planetAssets.nightTextures) {
        asset = planetAssets.nightTextures[0]
      }
      
      // Get texture URL for quality level
      const textureUrl = this.nasaAssetManager.getTextureURL(asset.id, quality)
      if (!textureUrl) {
        reject(new Error(`No texture URL found for asset: ${asset.id}`))
        return
      }
      
      // Load texture using texture manager
      const startTime = performance.now()
      this.textureManager.loadTexture(asset.id, {
        diffuse: textureUrl,
        resolutions: asset.variants,
        priority: 'high'
      }, quality)
        .then(texture => {
          const loadTime = performance.now() - startTime
          this.recordLoadMetrics(loadTime, asset.fileSize[quality] || 0)
          
          const requestId = `${planetId}_${textureType}_${quality}`
          this.loadedTextures.set(requestId, texture)
          this.activeStreams.delete(requestId)
          
          resolve(texture)
        })
        .catch(error => {
          const requestId = `${planetId}_${textureType}_${quality}`
          this.activeStreams.delete(requestId)
          reject(error)
        })
    })
  }
  
  /**
   * Process streaming queue
   */
  private processStreamingQueue(): void {
    while (
      this.streamingQueue.length > 0 &&
      this.activeStreams.size < this.config.maxConcurrentLoads &&
      this.memoryUsage < this.config.memoryBudgetMB * 1024 * 1024
    ) {
      const request = this.streamingQueue.shift()!
      this.metrics.pendingRequests = this.streamingQueue.length
      
      // Process the request if not already active
      if (!this.activeStreams.has(request.id)) {
        // The actual streaming is handled by createStreamingPromise
        // which was already called when the request was added
      }
    }
  }
  
  /**
   * Start streaming loop
   */
  private startStreamingLoop(): void {
    const loop = () => {
      this.processStreamingQueue()
      this.performMemoryManagement()
      this.updateMetrics()
      
      requestAnimationFrame(loop)
    }
    
    loop()
  }
  
  /**
   * Perform memory management
   */
  private performMemoryManagement(): void {
    const now = performance.now()
    if (now - this.lastMemoryCheck < 5000) return // Check every 5 seconds
    
    this.lastMemoryCheck = now
    
    // Calculate current memory usage
    this.memoryUsage = this.estimateMemoryUsage()
    this.metrics.memoryUsageMB = this.memoryUsage / (1024 * 1024)
    
    // If over budget, unload distant textures
    if (this.memoryUsage > this.config.memoryBudgetMB * 1024 * 1024 * 0.8) {
      this.unloadDistantTextures()
    }
  }
  
  /**
   * Unload textures for distant planets
   */
  private unloadDistantTextures(): void {
    const texturesWithDistance: Array<{id: string, distance: number}> = []
    
    this.loadedTextures.forEach((texture, id) => {
      const planetId = id.split('_')[0]
      const planetPosition = this.planetPositions.get(planetId)
      
      if (planetPosition) {
        const distance = this.cameraPosition.distanceTo(planetPosition)
        if (distance > this.config.unloadDistance) {
          texturesWithDistance.push({id, distance})
        }
      }
    })
    
    // Sort by distance (farthest first) and unload
    texturesWithDistance
      .sort((a, b) => b.distance - a.distance)
      .slice(0, Math.ceil(texturesWithDistance.length * 0.3)) // Unload 30% of distant textures
      .forEach(({id}) => {
        const texture = this.loadedTextures.get(id)
        if (texture) {
          texture.dispose()
          this.loadedTextures.delete(id)
        }
      })
  }
  
  /**
   * Estimate current memory usage
   */
  private estimateMemoryUsage(): number {
    let usage = 0
    
    this.loadedTextures.forEach(texture => {
      if (texture.image) {
        const width = texture.image.width || 1024
        const height = texture.image.height || 1024
        usage += width * height * 4 // RGBA
      }
    })
    
    return usage
  }
  
  /**
   * Start performance monitoring for adaptive quality
   */
  private startPerformanceMonitoring(): void {
    if (!this.config.enableAdaptiveQuality) return
    
    const monitor = () => {
      const now = performance.now()
      if (now - this.lastPerformanceCheck > 2000) { // Check every 2 seconds
        this.adjustQualityBasedOnPerformance()
        this.lastPerformanceCheck = now
      }
      
      requestAnimationFrame(monitor)
    }
    
    monitor()
  }
  
  /**
   * Adjust quality based on performance metrics
   */
  private adjustQualityBasedOnPerformance(): void {
    const averageFrameTime = this.performanceHistory.length > 0 ? 
      this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length : 16.67
    
    const targetFrameTime = 16.67 // 60 FPS
    
    if (averageFrameTime > targetFrameTime * 1.5) {
      // Performance is poor, decrease quality
      this.decreaseQuality()
    } else if (averageFrameTime < targetFrameTime * 0.8) {
      // Performance is good, can increase quality
      this.increaseQuality()
    }
    
    this.metrics.qualityLevel = this.currentQualityLevel
  }
  
  /**
   * Decrease quality level
   */
  private decreaseQuality(): void {
    const qualities: Array<'ultra' | 'high' | 'medium' | 'low'> = ['ultra', 'high', 'medium', 'low']
    const currentIndex = qualities.indexOf(this.currentQualityLevel)
    
    if (currentIndex < qualities.length - 1) {
      this.currentQualityLevel = qualities[currentIndex + 1]
      console.log(`📉 Texture quality decreased to: ${this.currentQualityLevel}`)
    }
  }
  
  /**
   * Increase quality level
   */
  private increaseQuality(): void {
    const qualities: Array<'ultra' | 'high' | 'medium' | 'low'> = ['ultra', 'high', 'medium', 'low']
    const currentIndex = qualities.indexOf(this.currentQualityLevel)
    
    if (currentIndex > 0) {
      this.currentQualityLevel = qualities[currentIndex - 1]
      console.log(`📈 Texture quality increased to: ${this.currentQualityLevel}`)
    }
  }
  
  /**
   * Record load performance metrics
   */
  private recordLoadMetrics(loadTime: number, fileSize: number): void {
    this.loadTimes.push(loadTime)
    if (this.loadTimes.length > 100) {
      this.loadTimes.shift()
    }
    
    if (fileSize > 0) {
      const bandwidth = (fileSize * 8) / (loadTime / 1000) // bits per second
      this.bandwidthSamples.push(bandwidth / 1000000) // Mbps
      if (this.bandwidthSamples.length > 50) {
        this.bandwidthSamples.shift()
      }
    }
  }
  
  /**
   * Update metrics
   */
  private updateMetrics(): void {
    const now = performance.now()
    if (now - this.lastMetricsUpdate < 1000) return // Update every second
    
    this.lastMetricsUpdate = now
    
    this.metrics.activeStreams = this.activeStreams.size
    this.metrics.pendingRequests = this.streamingQueue.length
    
    if (this.loadTimes.length > 0) {
      this.metrics.averageLoadTime = this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length
    }
    
    if (this.bandwidthSamples.length > 0) {
      this.metrics.bandwidthMbps = this.bandwidthSamples.reduce((a, b) => a + b, 0) / this.bandwidthSamples.length
    }
  }
  
  /**
   * Get current streaming metrics
   */
  public getMetrics(): StreamingMetrics {
    return { ...this.metrics }
  }
  
  /**
   * Get current quality level
   */
  public getCurrentQuality(): 'ultra' | 'high' | 'medium' | 'low' {
    return this.currentQualityLevel
  }
  
  /**
   * Force quality level (disables adaptive quality)
   */
  public setQualityLevel(quality: 'ultra' | 'high' | 'medium' | 'low'): void {
    this.currentQualityLevel = quality
    this.config.enableAdaptiveQuality = false
    this.metrics.qualityLevel = quality
  }
  
  /**
   * Preload textures for upcoming planets
   */
  public preloadUpcomingTextures(planetIds: string[]): void {
    planetIds.forEach(planetId => {
      const distance = this.planetPositions.get(planetId)?.distanceTo(this.cameraPosition) || Infinity
      
      if (distance < this.config.preloadDistance) {
        this.requestTextureStream(planetId, 'primary', 0.5) // Lower priority for preloading
      }
    })
  }
  
  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Cancel all active streams
    this.activeStreams.clear()
    this.streamingQueue.length = 0
    
    // Dispose all loaded textures
    this.loadedTextures.forEach(texture => texture.dispose())
    this.loadedTextures.clear()
    
    this.preloadedTextures.forEach(texture => texture.dispose())
    this.preloadedTextures.clear()
    
    console.log('🗑️ TextureStreamingManager disposed')
  }
}

export default TextureStreamingManager
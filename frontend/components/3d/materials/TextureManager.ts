import * as THREE from 'three'
export interface TextureConfig {
  diffuse?: string
  normal?: string
  specular?: string
  roughness?: string
  emissive?: string
  displacement?: string
  clouds?: string
  nightLights?: string
  atlasId?: string
  atlasRegion?: {
    x: number
    y: number
    width: number
    height: number
  }
  resolutions: {
    ultra: string
    high: string
    medium: string
    low: string
  }
  priority: 'critical' | 'high' | 'normal' | 'low'
  preload?: boolean
  compress?: boolean
  generateMipmaps?: boolean
}
export interface TextureLoadRequest {
  id: string
  url: string
  resolution: 'ultra' | 'high' | 'medium' | 'low'
  priority: number
  callback?: (texture: THREE.Texture) => void
  errorCallback?: (error: Error) => void
}
export interface TextureMetrics {
  totalMemoryMB: number
  activeTextures: number
  pendingLoads: number
  cacheHitRate: number
  compressionRatio: number
  streamingBandwidth: number
}
export class TextureManager {
  private static instance: TextureManager
  private loader: THREE.TextureLoader
  private compressedLoader: THREE.CompressedTextureLoader
  private cubeLoader: THREE.CubeTextureLoader
  private textureCache: Map<string, THREE.Texture>
  private loadingPromises: Map<string, Promise<THREE.Texture>>
  private compressionCache: Map<string, ArrayBuffer>
  private loadQueue: TextureLoadRequest[]
  private activeLoads: Set<string>
  private maxConcurrentLoads: number = 4
  private memoryBudgetMB: number = 1024
  private currentMemoryUsage: number = 0
  private lruCache: Map<string, number> // LRU timestamp tracking
  private metrics: TextureMetrics = {
    totalMemoryMB: 0,
    activeTextures: 0,
    pendingLoads: 0,
    cacheHitRate: 0,
    compressionRatio: 0,
    streamingBandwidth: 0
  }
  private atlasTextures: Map<string, THREE.Texture>
  private atlasConfigs: Map<string, any>
  private progressiveLoadEnabled: boolean = true
  private qualityUpgradeDelay: number = 2000 // ms
  private constructor() {
    this.loader = new THREE.TextureLoader()
    this.compressedLoader = new THREE.CompressedTextureLoader()
    this.cubeLoader = new THREE.CubeTextureLoader()
    this.textureCache = new Map()
    this.loadingPromises = new Map()
    this.compressionCache = new Map()
    this.loadQueue = []
    this.activeLoads = new Set()
    this.lruCache = new Map()
    this.atlasTextures = new Map()
    this.atlasConfigs = new Map()
    this.setupMemoryManagement()
    this.startLoadingWorker()
  }
  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager()
    }
    return TextureManager.instance
  }
  private setupMemoryManagement(): void {
    setInterval(() => {
      this.cleanupUnusedTextures()
      this.updateMetrics()
    }, 30000)
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory
        if (memInfo.usedJSHeapSize > memInfo.jsHeapSizeLimit * 0.8) {
          this.emergencyCleanup()
        }
      }, 5000)
    }
  }
  public async loadTexture(
    id: string, 
    config: TextureConfig, 
    targetQuality: 'ultra' | 'high' | 'medium' | 'low' = 'high'
  ): Promise<THREE.Texture> {
    const cacheKey = `${id}_${targetQuality}`
    if (this.textureCache.has(cacheKey)) {
      this.updateLRU(cacheKey)
      this.metrics.cacheHitRate++
      return this.textureCache.get(cacheKey)!
    }
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!
    }
    if (this.progressiveLoadEnabled && targetQuality !== 'low') {
      const lowerQuality = this.getLowerQuality(targetQuality)
      if (lowerQuality !== targetQuality) {
        const lowResPromise = this.loadTexture(id, config, lowerQuality)
        setTimeout(() => {
          this.upgradeTextureQuality(id, config, lowerQuality, targetQuality)
        }, this.qualityUpgradeDelay)
        return lowResPromise
      }
    }
    const textureUrl = config.resolutions[targetQuality] || config.diffuse!
    const loadPromise = this.performTextureLoad(id, textureUrl, targetQuality, config)
    this.loadingPromises.set(cacheKey, loadPromise)
    return loadPromise
  }
  private async performTextureLoad(
    id: string, 
    url: string, 
    quality: string, 
    config: TextureConfig
  ): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const request: TextureLoadRequest = {
        id: `${id}_${quality}`,
        url,
        resolution: quality as any,
        priority: this.getPriorityScore(config.priority),
        callback: (texture) => {
          this.processLoadedTexture(texture, config)
          this.cacheTexture(`${id}_${quality}`, texture)
          resolve(texture)
        },
        errorCallback: reject
      }
      this.queueTextureLoad(request)
    })
  }
  private processLoadedTexture(texture: THREE.Texture, config: TextureConfig): void {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.generateMipmaps = config.generateMipmaps !== false
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 16
    if (config.compress && this.supportsCompression()) {
      this.compressTexture(texture)
    }
    this.currentMemoryUsage += this.estimateTextureMemory(texture)
    this.metrics.totalMemoryMB = this.currentMemoryUsage / (1024 * 1024)
  }
  private queueTextureLoad(request: TextureLoadRequest): void {
    let insertIndex = this.loadQueue.length
    for (let i = 0; i < this.loadQueue.length; i++) {
      if (this.loadQueue[i].priority < request.priority) {
        insertIndex = i
        break
      }
    }
    this.loadQueue.splice(insertIndex, 0, request)
    this.metrics.pendingLoads = this.loadQueue.length
    this.processLoadQueue()
  }
  private processLoadQueue(): void {
    while (
      this.loadQueue.length > 0 && 
      this.activeLoads.size < this.maxConcurrentLoads &&
      this.currentMemoryUsage < this.memoryBudgetMB * 1024 * 1024
    ) {
      const request = this.loadQueue.shift()!
      this.activeLoads.add(request.id)
      this.loader.load(
        request.url,
        (texture) => {
          this.activeLoads.delete(request.id)
          if (request.callback) request.callback(texture)
          this.processLoadQueue() // Continue processing
        },
        undefined,
        (error) => {
          this.activeLoads.delete(request.id)
          console.error(`Failed to load texture: ${request.url}`, error)
          if (request.errorCallback) request.errorCallback(error as Error)
          this.processLoadQueue() // Continue processing
        }
      )
    }
    this.metrics.pendingLoads = this.loadQueue.length
  }
  private startLoadingWorker(): void {
    setInterval(() => {
      this.processLoadQueue()
    }, 100)
  }
  public async loadTextureSet(
    id: string,
    config: TextureConfig,
    quality: 'ultra' | 'high' | 'medium' | 'low' = 'high'
  ): Promise<{
    diffuse?: THREE.Texture
    normal?: THREE.Texture
    specular?: THREE.Texture
    roughness?: THREE.Texture
    emissive?: THREE.Texture
    displacement?: THREE.Texture
    clouds?: THREE.Texture
    nightLights?: THREE.Texture
  }> {
    const textureSet: any = {}
    const loadPromises: Promise<void>[] = []
    const textureTypes = ['diffuse', 'normal', 'specular', 'roughness', 'emissive', 'displacement', 'clouds', 'nightLights']
    for (const type of textureTypes) {
      if (config[type as keyof TextureConfig]) {
        const promise = this.loadTexture(`${id}_${type}`, {
          ...config,
          diffuse: config[type as keyof TextureConfig] as string
        }, quality).then(texture => {
          textureSet[type] = texture
        })
        loadPromises.push(promise)
      }
    }
    await Promise.all(loadPromises)
    return textureSet
  }
  public async createTextureAtlas(
    atlasId: string, 
    textures: { id: string, url: string, region: any }[],
    atlasSize: number = 2048
  ): Promise<THREE.Texture> {
    if (this.atlasTextures.has(atlasId)) {
      return this.atlasTextures.get(atlasId)!
    }
    const canvas = document.createElement('canvas')
    canvas.width = atlasSize
    canvas.height = atlasSize
    const ctx = canvas.getContext('2d')!
    const loadPromises = textures.map(async (textureInfo) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(
            img,
            textureInfo.region.x,
            textureInfo.region.y,
            textureInfo.region.width,
            textureInfo.region.height
          )
          resolve(null)
        }
        img.src = textureInfo.url
      })
    })
    await Promise.all(loadPromises)
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    this.atlasTextures.set(atlasId, texture)
    this.cacheTexture(atlasId, texture)
    return texture
  }
  private cacheTexture(key: string, texture: THREE.Texture): void {
    this.textureCache.set(key, texture)
    this.updateLRU(key)
    this.metrics.activeTextures = this.textureCache.size
    if (this.currentMemoryUsage > this.memoryBudgetMB * 1024 * 1024 * 0.8) {
      this.cleanupOldTextures()
    }
  }
  private updateLRU(key: string): void {
    this.lruCache.set(key, Date.now())
  }
  private cleanupOldTextures(): void {
    const now = Date.now()
    const maxAge = 300000 // 5 minutes
    const entriesToRemove: string[] = []
    this.lruCache.forEach((timestamp, key) => {
      if (now - timestamp > maxAge) {
        entriesToRemove.push(key)
      }
    })
    entriesToRemove.sort((a, b) => {
      return this.lruCache.get(a)! - this.lruCache.get(b)!
    })
    const removeCount = Math.min(entriesToRemove.length, Math.floor(this.textureCache.size * 0.2))
    for (let i = 0; i < removeCount; i++) {
      const key = entriesToRemove[i]
      this.removeTexture(key)
    }
  }
  private removeTexture(key: string): void {
    const texture = this.textureCache.get(key)
    if (texture) {
      const memorySize = this.estimateTextureMemory(texture)
      texture.dispose()
      this.currentMemoryUsage -= memorySize
      this.textureCache.delete(key)
      this.lruCache.delete(key)
      this.loadingPromises.delete(key)
      this.metrics.activeTextures = this.textureCache.size
      this.metrics.totalMemoryMB = this.currentMemoryUsage / (1024 * 1024)
    }
  }
  private emergencyCleanup(): void {
    console.warn('🚨 Emergency texture cleanup initiated')
    const keysToRemove: string[] = []
    this.textureCache.forEach((texture, key) => {
      if (key.includes('_low') || key.includes('_medium')) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach(key => this.removeTexture(key))
    if ('gc' in window) {
      (window as any).gc()
    }
  }
  private cleanupUnusedTextures(): void {
    this.cleanupOldTextures()
  }
  private estimateTextureMemory(texture: THREE.Texture): number {
    if (!texture.image) return 0
    const width = texture.image.width || 1024
    const height = texture.image.height || 1024
    const channels = 4 // RGBA
    const bytesPerChannel = 1
    let memorySize = width * height * channels * bytesPerChannel
    if (texture.generateMipmaps) {
      memorySize *= 1.33 // Approximately 33% more for mipmaps
    }
    return memorySize
  }
  private getLowerQuality(quality: string): 'ultra' | 'high' | 'medium' | 'low' {
    const qualityLevels = ['low', 'medium', 'high', 'ultra']
    const currentIndex = qualityLevels.indexOf(quality)
    const lowerIndex = Math.max(0, currentIndex - 1)
    return qualityLevels[lowerIndex] as any
  }
  private async upgradeTextureQuality(
    id: string,
    config: TextureConfig,
    fromQuality: string,
    toQuality: string
  ): Promise<void> {
    try {
      const upgradedTexture = await this.performTextureLoad(id, config.resolutions[toQuality as keyof typeof config.resolutions], toQuality, config)
      const oldKey = `${id}_${fromQuality}`
      const newKey = `${id}_${toQuality}`
      if (this.textureCache.has(oldKey)) {
        this.removeTexture(oldKey)
      }
      this.cacheTexture(newKey, upgradedTexture)
    } catch (error) {
      console.warn(`Failed to upgrade texture quality for ${id}:`, error)
    }
  }
  private getPriorityScore(priority: 'critical' | 'high' | 'normal' | 'low'): number {
    const scores = { critical: 100, high: 75, normal: 50, low: 25 }
    return scores[priority]
  }
  private supportsCompression(): boolean {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return false
    return !!(
      gl.getExtension('WEBGL_compressed_texture_s3tc') ||
      gl.getExtension('WEBGL_compressed_texture_etc1') ||
      gl.getExtension('WEBGL_compressed_texture_astc')
    )
  }
  private compressTexture(texture: THREE.Texture): void {
    texture.userData.compressed = true
  }
  private updateMetrics(): void {
    this.metrics.totalMemoryMB = this.currentMemoryUsage / (1024 * 1024)
    this.metrics.activeTextures = this.textureCache.size
    this.metrics.pendingLoads = this.loadQueue.length
  }
  public getMetrics(): TextureMetrics {
    this.updateMetrics()
    return { ...this.metrics }
  }
  public async preloadCriticalTextures(configs: { id: string, config: TextureConfig }[]): Promise<void> {
    const promises = configs.map(({ id, config }) => {
      config.priority = 'critical'
      return this.loadTexture(id, config, 'medium') // Start with medium quality for faster loading
    })
    await Promise.all(promises)
  }
  public dispose(): void {
    this.textureCache.forEach(texture => texture.dispose())
    this.atlasTextures.forEach(texture => texture.dispose())
    this.textureCache.clear()
    this.loadingPromises.clear()
    this.compressionCache.clear()
    this.atlasTextures.clear()
    this.lruCache.clear()
    this.loadQueue.length = 0
    this.activeLoads.clear()
    this.currentMemoryUsage = 0
    this.updateMetrics()
    console.log('🗑️ TextureManager disposed')
  }
}
export default TextureManager
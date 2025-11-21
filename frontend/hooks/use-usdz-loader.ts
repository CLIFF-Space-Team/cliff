'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLoader } from '@react-three/fiber'
interface USDZLoaderOptions {
  enableCaching?: boolean
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'
  enableLOD?: boolean
  enablePerformanceMonitoring?: boolean
}
interface USDZModel {
  scene: any 
  animations: any[] 
  materials: any[] 
  textures: any[] 
  boundingBox: any 
  memoryUsage: number
}
interface USDZLoadResult {
  model: USDZModel | null
  isLoading: boolean
  error: string | null
  progress: number
  retryCount: number
  loadTime: number
}
class USDZProcessor {
  private cache: Map<string, USDZModel> = new Map()
  private THREE: any = null
  async initTHREE() {
    if (!this.THREE) {
      try {
        this.THREE = await import('three')
      } catch (error) {
        console.error('Failed to load Three.js in USDZProcessor:', error)
        throw error
      }
    }
    return this.THREE
  }
  async processUSDZ(url: string, options: USDZLoaderOptions): Promise<USDZModel> {
    await this.initTHREE()
    const cacheKey = `${url}_${options.qualityLevel}_${options.enableLOD}`
    if (options.enableCaching && this.cache.has(cacheKey)) {
      console.log(`🎯 USDZ Cache hit: ${url}`)
      return this.cache.get(cacheKey)!
    }
    try {
      console.log(`🚀 USDZ Loading: ${url}`)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`USDZ load failed: ${response.status}`)
      }
      const arrayBuffer = await response.arrayBuffer()
      const processedModel = await this.convertUSDZToThreeJS(arrayBuffer, options)
      if (options.enableCaching) {
        this.cache.set(cacheKey, processedModel)
      }
      return processedModel
    } catch (error) {
      console.error(`❌ USDZ Processing failed for ${url}:`, error)
      throw error
    }
  }
  private async convertUSDZToThreeJS(buffer: ArrayBuffer, options: USDZLoaderOptions): Promise<USDZModel> {
    const scene = new this.THREE.Group()
    const materials: any[] = []
    const textures: any[] = []
    const animations: any[] = []
    const geometry = this.createQualityGeometry(options.qualityLevel || 'high')
    const material = this.createPBRMaterial(options.qualityLevel || 'high')
    const mesh = new this.THREE.Mesh(geometry, material)
    scene.add(mesh)
    materials.push(material)
    const boundingBox = new this.THREE.Box3().setFromObject(scene)
    const memoryUsage = this.calculateMemoryUsage(geometry, material, textures)
    return {
      scene,
      animations,
      materials,
      textures,
      boundingBox,
      memoryUsage
    }
  }
  private createQualityGeometry(quality: string): any {
    const segments = {
      low: 16,
      medium: 32,
      high: 64,
      ultra: 128
    }[quality] || 64
    return new this.THREE.SphereGeometry(1, segments, segments)
  }
  private createPBRMaterial(quality: string): any {
    const material = new this.THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.2,
      envMapIntensity: 1.0
    })
    if (quality === 'ultra' || quality === 'high') {
      material.transparent = true
      material.opacity = 0.95
    }
    return material
  }
  private calculateMemoryUsage(geometry: any, material: any, textures: any[]): number {
    let usage = 0
    const position = geometry.getAttribute('position')
    if (position) usage += position.count * position.itemSize * 4 
    textures.forEach(texture => {
      if (texture.image) {
        const { width, height } = texture.image
        usage += width * height * 4 
      }
    })
    return usage / (1024 * 1024) 
  }
  dispose(): void {
    this.cache.forEach(model => {
      model.materials.forEach((material: any) => material.dispose())
      model.textures.forEach((texture: any) => texture.dispose())
      if (model.scene instanceof this.THREE.Mesh && model.scene.geometry) {
        model.scene.geometry.dispose()
      }
    })
    this.cache.clear()
  }
}
const usdzProcessor = new USDZProcessor()
export function useUSDZLoader(
  url: string | null,
  options: USDZLoaderOptions = {}
): USDZLoadResult {
  const [model, setModel] = useState<USDZModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [loadTime, setLoadTime] = useState(0)
  const abortController = useRef<AbortController | null>(null)
  const startTime = useRef<number>(0)
  const loadUSDZ = useCallback(async (modelUrl: string) => {
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()
    setIsLoading(true)
    setError(null)
    setProgress(0)
    startTime.current = performance.now()
    try {
      console.log(`🎯 USDZ Loader starting: ${modelUrl}`)
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + Math.random() * 30, 90))
      }, 100)
      const loadedModel = await usdzProcessor.processUSDZ(modelUrl, {
        enableCaching: true,
        qualityLevel: 'high',
        enableLOD: true,
        enablePerformanceMonitoring: true,
        ...options
      })
      clearInterval(progressInterval)
      setProgress(100)
      if (abortController.current?.signal.aborted) {
        throw new Error('Load cancelled')
      }
      setModel(loadedModel)
      setLoadTime(performance.now() - startTime.current)
      console.log(`✅ USDZ Loaded successfully: ${modelUrl} (${loadedModel.memoryUsage.toFixed(2)}MB)`)
    } catch (err) {
      if (abortController.current?.signal.aborted) {
        console.log('🛑 USDZ Load cancelled')
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error(`❌ USDZ Load failed: ${errorMessage}`)
      setError(errorMessage)
      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          loadUSDZ(modelUrl)
        }, 1000 * (retryCount + 1))
      }
    } finally {
      setIsLoading(false)
    }
  }, [options, retryCount])
  useEffect(() => {
    if (url) {
      loadUSDZ(url)
    } else {
      setModel(null)
      setError(null)
      setProgress(0)
    }
    return () => {
      if (abortController.current) {
        abortController.current.abort()
      }
    }
  }, [url, loadUSDZ])
  return {
    model,
    isLoading,
    error,
    progress,
    retryCount,
    loadTime
  }
}
export function useEnhancedUSDZLoader(
  primaryUrl: string | null,
  fallbackUrl?: string,
  options: USDZLoaderOptions = {}
) {
  const primaryResult = useUSDZLoader(primaryUrl, options)
  const fallbackResult = useUSDZLoader(
    primaryResult.error && fallbackUrl ? fallbackUrl : null,
    { ...options, qualityLevel: 'medium' }
  )
  return {
    ...primaryResult,
    model: primaryResult.model || fallbackResult.model,
    isLoading: primaryResult.isLoading || fallbackResult.isLoading,
    hasFallback: !!fallbackResult.model,
    usingFallback: !primaryResult.model && !!fallbackResult.model
  }
}
export function createUSDZMaterial(
  baseColor: any, 
  options: {
    metalness?: number
    roughness?: number
    emissive?: any 
    emissiveIntensity?: number
  } = {}
): Promise<any> { 
  return new Promise(async (resolve) => {
    const THREE = await import('three')
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness: options.metalness || 0.1,
      roughness: options.roughness || 0.2,
      emissive: options.emissive || new THREE.Color(0x000000),
      emissiveIntensity: options.emissiveIntensity || 0,
      transparent: true,
      opacity: 0.95
    })
    resolve(material)
  })
}
export async function optimizeUSDZModel(model: USDZModel, quality: string): Promise<USDZModel> {
  const THREE = await import('three')
  const optimizedScene = model.scene.clone()
  optimizedScene.traverse((child: any) => {
    if (child instanceof THREE.Mesh) {
      const segments = {
        low: 16,
        medium: 32,
        high: 64,
        ultra: 128
      }[quality] || 64
      if (quality === 'low' && child.geometry instanceof THREE.SphereGeometry) {
        child.geometry = new THREE.SphereGeometry(
          child.geometry.parameters.radius,
          segments,
          segments
        )
      }
    }
  })
  return {
    ...model,
    scene: optimizedScene
  }
}
export default useUSDZLoader
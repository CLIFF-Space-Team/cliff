import * as THREE from 'three'
import {
  CelestialBody,
  QUALITY_PRESETS,
  ASTRONOMICAL_CONSTANTS
} from '../../../types/astronomical-data'
interface LOD_THRESHOLDS {
  high: number;
  medium: number;
  low: number;
}
interface RenderingQuality {
  name: string;
  sphere_segments: number;
  texture_size: number;
  effects_enabled: boolean;
  max_fps: number;
}
const LOD_THRESHOLDS: LOD_THRESHOLDS = {
  high: 1000,
  medium: 5000,
  low: 20000
};
export interface LODLevel {
  level: 'ultra' | 'high' | 'medium' | 'low' | 'invisible'
  distance: number
  geometry?: THREE.BufferGeometry
  material?: THREE.Material
  visible: boolean
  segments: number
  textureResolution: 'ultra' | 'high' | 'medium' | 'low'
}
export interface CelestialBodyInstance {
  id: string
  body: CelestialBody
  group: THREE.Group
  mesh: THREE.Mesh
  lodLevels: Map<string, LODLevel>
  currentLOD: LODLevel
  distanceFromCamera: number
  isVisible: boolean
  isInFrustum: boolean
  lastUpdate: number
  triangleCount: number
  textureMemory: number
  rotationSpeed: number
  orbitalPosition: THREE.Vector3
  orbitalVelocity: THREE.Vector3
  children: Set<string>
  parent?: string
}
export interface ManagerConfig {
  enableLOD: boolean
  enableFrustumCulling: boolean
  enableOclusionCulling: boolean
  maxVisibleBodies: number
  cullDistance: number
  updateFrequency: number 
  memoryBudgetMB: number
  enableDynamicLoading: boolean
}
export interface PerformanceMetrics {
  totalBodies: number
  visibleBodies: number
  culledBodies: number
  memoryUsageMB: number
  triangleCount: number
  lodDistribution: Record<string, number>
  updateTime: number
}
export class CelestialBodyManager {
  private bodies: Map<string, CelestialBodyInstance>
  private visibleBodies: Set<string>
  private culledBodies: Set<string>
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private config: ManagerConfig
  private frustum: THREE.Frustum
  private cameraMatrix: THREE.Matrix4
  private performanceMetrics: PerformanceMetrics
  private geometryCache: Map<string, THREE.BufferGeometry>
  private materialCache: Map<string, THREE.Material>
  private textureCache: Map<string, THREE.Texture>
  private lastUpdate: number
  private updateInterval: number
  private needsUpdate: boolean
  private qualitySettings: RenderingQuality
  private onBodyAdded?: (bodyId: string) => void
  private onBodyRemoved?: (bodyId: string) => void
  private onLODChanged?: (bodyId: string, level: LODLevel) => void
  constructor(
    scene: THREE.Scene, 
    camera: THREE.Camera, 
    renderer: THREE.WebGLRenderer,
    config: Partial<ManagerConfig> = {}
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.config = {
      enableLOD: true,
      enableFrustumCulling: true,
      enableOclusionCulling: false, 
      maxVisibleBodies: 1000,
      cullDistance: 1000, 
      updateFrequency: 10, 
      memoryBudgetMB: 512,
      enableDynamicLoading: true,
      ...config
    }
    this.bodies = new Map()
    this.visibleBodies = new Set()
    this.culledBodies = new Set()
    this.geometryCache = new Map()
    this.materialCache = new Map()
    this.textureCache = new Map()
    this.frustum = new THREE.Frustum()
    this.cameraMatrix = new THREE.Matrix4()
    this.lastUpdate = 0
    this.updateInterval = 1000 / this.config.updateFrequency
    this.needsUpdate = true
    this.performanceMetrics = {
      totalBodies: 0,
      visibleBodies: 0,
      culledBodies: 0,
      memoryUsageMB: 0,
      triangleCount: 0,
      lodDistribution: { ultra: 0, high: 0, medium: 0, low: 0, invisible: 0 },
      updateTime: 0
    }
    this.qualitySettings = QUALITY_PRESETS.high
    console.log('🌟 CelestialBodyManager initialized')
  }
  public addCelestialBody(body: CelestialBody): CelestialBodyInstance {
    if (this.bodies.has(body.id)) {
      console.warn(`Body ${body.id} already exists`)
      return this.bodies.get(body.id)!
    }
    const instance = this.createBodyInstance(body)
    this.bodies.set(body.id, instance)
    this.scene.add(instance.group)
    this.performanceMetrics.totalBodies++
    this.needsUpdate = true
    if (this.onBodyAdded) {
      this.onBodyAdded(body.id)
    }
    return instance
  }
  public removeCelestialBody(bodyId: string): boolean {
    const instance = this.bodies.get(bodyId)
    if (!instance) return false
    this.scene.remove(instance.group)
    this.disposeBodyInstance(instance)
    this.bodies.delete(bodyId)
    this.visibleBodies.delete(bodyId)
    this.culledBodies.delete(bodyId)
    this.performanceMetrics.totalBodies--
    this.needsUpdate = true
    if (this.onBodyRemoved) {
      this.onBodyRemoved(bodyId)
    }
    return true
  }
  private createBodyInstance(body: CelestialBody): CelestialBodyInstance {
    const group = new THREE.Group()
    group.name = body.id
    const mesh = this.createBodyMesh(body, 'high')
    group.add(mesh)
    const orbitalPosition = new THREE.Vector3()
    const orbitalVelocity = new THREE.Vector3()
    const rotationSpeed = body.physical.rotationPeriod > 0 ? 
      (2 * Math.PI) / (body.physical.rotationPeriod * 3600) : 0
    const lodLevels = this.createLODLevels(body)
    const currentLOD = lodLevels.get('high')!
    const instance: CelestialBodyInstance = {
      id: body.id,
      body,
      group,
      mesh,
      lodLevels,
      currentLOD,
      distanceFromCamera: 0,
      isVisible: true,
      isInFrustum: true,
      lastUpdate: 0,
      triangleCount: this.calculateTriangleCount(mesh),
      textureMemory: 0,
      rotationSpeed,
      orbitalPosition,
      orbitalVelocity,
      children: new Set(),
      parent: body.parent_id
    }
    if (body.parent_id) {
      const parent = this.bodies.get(body.parent_id)
      if (parent) {
        parent.children.add(body.id)
      }
    }
    return instance
  }
  private createLODLevels(body: CelestialBody): Map<string, LODLevel> {
    const levels = new Map<string, LODLevel>()
    const lodConfigs = [
      { level: 'ultra' as const, segments: 128, distance: 1, textureRes: 'ultra' as const },
      { level: 'high' as const, segments: 64, distance: 10, textureRes: 'high' as const },
      { level: 'medium' as const, segments: 32, distance: 100, textureRes: 'medium' as const },
      { level: 'low' as const, segments: 16, distance: 1000, textureRes: 'low' as const },
      { level: 'invisible' as const, segments: 0, distance: 10000, textureRes: 'low' as const }
    ]
    lodConfigs.forEach(config => {
      const lodLevel: LODLevel = {
        level: config.level,
        distance: config.distance,
        visible: config.level !== 'invisible',
        segments: config.segments,
        textureResolution: config.textureRes
      }
      if (config.segments > 0) {
        const radius = this.getScaledRadius(body)
        lodLevel.geometry = new THREE.SphereGeometry(radius, config.segments, config.segments)
        lodLevel.material = this.createBodyMaterial(body, config.level)
      }
      levels.set(config.level, lodLevel)
    })
    return levels
  }
  private createBodyMesh(body: CelestialBody, lodLevel: string = 'high'): THREE.Mesh {
    const radius = this.getScaledRadius(body)
    const segments = this.getSegmentsForLOD(body.type, lodLevel)
    const geometry = new THREE.SphereGeometry(radius, segments, segments)
    const material = this.createBodyMaterial(body, lodLevel)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `${body.id}_mesh`
    mesh.castShadow = body.type !== 'star'
    mesh.receiveShadow = body.type !== 'star'
    mesh.userData = { celestialBody: body }
    return mesh
  }
  private createBodyMaterial(body: CelestialBody, lodLevel: string): THREE.Material {
    const cacheKey = `${body.id}_${lodLevel}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!.clone()
    }
    let material: THREE.Material
    if (body.type === 'star') {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(body.color),
        emissive: new THREE.Color(body.type === 'star' ? body.color : '#000000'),
        emissiveIntensity: 0.8,
        roughness: 1.0,
        metalness: 0.0
      })
    } else {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(body.color),
        roughness: 0.8,
        metalness: 0.1
      })
    }
    this.loadTexturesForLOD(material, body, lodLevel)
    this.materialCache.set(cacheKey, material)
    return material.clone()
  }
  private loadTexturesForLOD(material: THREE.Material, body: CelestialBody, lodLevel: string): void {
    if (!(material instanceof THREE.MeshStandardMaterial)) return
    const textureLoader = new THREE.TextureLoader()
    const shouldLoadHighRes = lodLevel === 'ultra' || lodLevel === 'high'
    if (body.textures.diffuse && shouldLoadHighRes) {
      const cacheKey = `${body.textures.diffuse}_${lodLevel}`
      if (this.textureCache.has(cacheKey)) {
        material.map = this.textureCache.get(cacheKey)!
      } else {
        textureLoader.load(body.textures.diffuse, (texture) => {
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          material.map = texture
          material.needsUpdate = true
          this.textureCache.set(cacheKey, texture)
        })
      }
    }
    if (body.textures.normal && lodLevel === 'ultra') {
      textureLoader.load(body.textures.normal, (texture) => {
        material.normalMap = texture
        material.needsUpdate = true
      })
    }
  }
  private getSegmentsForLOD(bodyType: string, lodLevel: string): number {
    const baseSegments = {
      ultra: 128,
      high: 64,
      medium: 32,
      low: 16
    }[lodLevel] || 32
    switch (bodyType) {
      case 'star':
      case 'planet':
        return baseSegments
      case 'moon':
        return Math.max(baseSegments * 0.5, 8)
      default:
        return Math.max(baseSegments * 0.25, 6)
    }
  }
  private getScaledRadius(body: CelestialBody): number {
    const baseScale = body.type === 'star' ? 0.1 : 0.001
    return body.physical.radius * baseScale
  }
  private calculateTriangleCount(mesh: THREE.Mesh): number {
    const geometry = mesh.geometry
    if (geometry.index) {
      return geometry.index.count / 3
    }
    return geometry.attributes.position.count / 3
  }
  public update(deltaTime: number, currentTime: number): void {
    const now = performance.now()
    if (now - this.lastUpdate < this.updateInterval && !this.needsUpdate) {
      return
    }
    const updateStart = now
    if (this.config.enableFrustumCulling) {
      this.updateFrustum()
    }
    this.updateBodies(deltaTime, currentTime)
    if (this.config.enableLOD) {
      this.updateLODLevels()
    }
    this.performCulling()
    this.updatePerformanceMetrics()
    this.performanceMetrics.updateTime = performance.now() - updateStart
    this.lastUpdate = now
    this.needsUpdate = false
  }
  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(this.cameraMatrix)
  }
  private updateBodies(deltaTime: number, currentTime: number): void {
    this.bodies.forEach((instance) => {
      instance.distanceFromCamera = instance.group.position.distanceTo(this.camera.position)
      if (this.config.enableFrustumCulling) {
        instance.isInFrustum = this.frustum.intersectsObject(instance.group)
      } else {
        instance.isInFrustum = true
      }
      if (instance.rotationSpeed > 0) {
        instance.mesh.rotation.y += instance.rotationSpeed * deltaTime
      }
      instance.lastUpdate = currentTime
    })
  }
  private updateLODLevels(): void {
    this.bodies.forEach((instance) => {
      const distance = instance.distanceFromCamera
      let newLODLevel: LODLevel
      if (distance < LOD_THRESHOLDS.high) {
        newLODLevel = instance.lodLevels.get('ultra')!
      } else if (distance < LOD_THRESHOLDS.medium) {
        newLODLevel = instance.lodLevels.get('high')!
      } else if (distance < LOD_THRESHOLDS.low) {
        newLODLevel = instance.lodLevels.get('medium')!
      } else if (distance < this.config.cullDistance) {
        newLODLevel = instance.lodLevels.get('low')!
      } else {
        newLODLevel = instance.lodLevels.get('invisible')!
      }
      if (newLODLevel !== instance.currentLOD) {
        this.switchLODLevel(instance, newLODLevel)
      }
    })
  }
  private switchLODLevel(instance: CelestialBodyInstance, newLOD: LODLevel): void {
    instance.group.remove(instance.mesh)
    instance.mesh.geometry.dispose()
    if (Array.isArray(instance.mesh.material)) {
      instance.mesh.material.forEach(mat => mat.dispose())
    } else {
      instance.mesh.material.dispose()
    }
    if (newLOD.visible && newLOD.geometry && newLOD.material) {
      instance.mesh = new THREE.Mesh(newLOD.geometry.clone(), newLOD.material.clone())
      instance.mesh.name = `${instance.id}_mesh_${newLOD.level}`
      instance.mesh.castShadow = instance.body.type !== 'star'
      instance.mesh.receiveShadow = instance.body.type !== 'star'
      instance.mesh.userData = { celestialBody: instance.body }
      instance.group.add(instance.mesh)
      instance.triangleCount = this.calculateTriangleCount(instance.mesh)
    } else {
      const geometry = new THREE.SphereGeometry(0.001, 4, 4)
      const material = new THREE.MeshBasicMaterial({ visible: false })
      instance.mesh = new THREE.Mesh(geometry, material)
      instance.triangleCount = 0
    }
    instance.currentLOD = newLOD
    if (this.onLODChanged) {
      this.onLODChanged(instance.id, newLOD)
    }
  }
  private performCulling(): void {
    this.visibleBodies.clear()
    this.culledBodies.clear()
    this.bodies.forEach((instance, id) => {
      const isVisible = instance.isInFrustum && 
                       instance.distanceFromCamera < this.config.cullDistance &&
                       instance.currentLOD.visible
      instance.isVisible = isVisible
      instance.group.visible = isVisible
      if (isVisible) {
        this.visibleBodies.add(id)
      } else {
        this.culledBodies.add(id)
      }
    })
  }
  private updatePerformanceMetrics(): void {
    this.performanceMetrics.visibleBodies = this.visibleBodies.size
    this.performanceMetrics.culledBodies = this.culledBodies.size
    Object.keys(this.performanceMetrics.lodDistribution).forEach(key => {
      this.performanceMetrics.lodDistribution[key] = 0
    })
    let totalTriangles = 0
    this.bodies.forEach((instance) => {
      if (instance.isVisible) {
        totalTriangles += instance.triangleCount
        this.performanceMetrics.lodDistribution[instance.currentLOD.level]++
      }
    })
    this.performanceMetrics.triangleCount = totalTriangles
    this.performanceMetrics.memoryUsageMB = 
      (this.geometryCache.size * 0.5 + this.textureCache.size * 2) 
  }
  public getBody(id: string): CelestialBodyInstance | undefined {
    return this.bodies.get(id)
  }
  public getVisibleBodies(): CelestialBodyInstance[] {
    return Array.from(this.visibleBodies).map(id => this.bodies.get(id)!).filter(Boolean)
  }
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }
  public setQualityLevel(quality: RenderingQuality): void {
    this.qualitySettings = quality
    this.bodies.forEach((instance) => {
      instance.lodLevels = this.createLODLevels(instance.body)
      this.needsUpdate = true
    })
  }
  public forceUpdate(): void {
    this.needsUpdate = true
  }
  public setCallbacks(callbacks: {
    onBodyAdded?: (bodyId: string) => void
    onBodyRemoved?: (bodyId: string) => void
    onLODChanged?: (bodyId: string, level: LODLevel) => void
  }): void {
    this.onBodyAdded = callbacks.onBodyAdded
    this.onBodyRemoved = callbacks.onBodyRemoved
    this.onLODChanged = callbacks.onLODChanged
  }
  private disposeBodyInstance(instance: CelestialBodyInstance): void {
    instance.mesh.geometry.dispose()
    if (Array.isArray(instance.mesh.material)) {
      instance.mesh.material.forEach(material => material.dispose())
    } else {
      instance.mesh.material.dispose()
    }
    instance.lodLevels.forEach((lod) => {
      if (lod.geometry) lod.geometry.dispose()
      if (lod.material) lod.material.dispose()
    })
    if (instance.parent) {
      const parent = this.bodies.get(instance.parent)
      if (parent) {
        parent.children.delete(instance.id)
      }
    }
    instance.children.forEach(childId => {
      this.removeCelestialBody(childId)
    })
  }
  public dispose(): void {
    this.bodies.forEach((instance) => {
      this.disposeBodyInstance(instance)
    })
    this.geometryCache.forEach(geometry => geometry.dispose())
    this.materialCache.forEach(material => material.dispose())
    this.textureCache.forEach(texture => texture.dispose())
    this.bodies.clear()
    this.visibleBodies.clear()
    this.culledBodies.clear()
    this.geometryCache.clear()
    this.materialCache.clear()
    this.textureCache.clear()
    console.log('🗑️ CelestialBodyManager disposed')
  }
}
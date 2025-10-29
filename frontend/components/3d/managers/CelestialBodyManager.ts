// CLIFF 3D Solar System - Celestial Body Manager
// Manages lifecycle, LOD, and performance optimization of celestial bodies

import * as THREE from 'three'
import {
  CelestialBody,
  QUALITY_PRESETS,
  ASTRONOMICAL_CONSTANTS
} from '../../../types/astronomical-data'

// Define missing types locally
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

// Define default LOD thresholds
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
  
  // Performance metrics
  triangleCount: number
  textureMemory: number
  
  // Animation state
  rotationSpeed: number
  orbitalPosition: THREE.Vector3
  orbitalVelocity: THREE.Vector3
  
  // Satellites/children
  children: Set<string>
  parent?: string
}

export interface ManagerConfig {
  enableLOD: boolean
  enableFrustumCulling: boolean
  enableOclusionCulling: boolean
  maxVisibleBodies: number
  cullDistance: number
  updateFrequency: number // Hz
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
  // Core collections
  private bodies: Map<string, CelestialBodyInstance>
  private visibleBodies: Set<string>
  private culledBodies: Set<string>
  
  // Scene and camera references
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  
  // Performance management
  private config: ManagerConfig
  private frustum: THREE.Frustum
  private cameraMatrix: THREE.Matrix4
  private performanceMetrics: PerformanceMetrics
  
  // LOD and geometry management
  private geometryCache: Map<string, THREE.BufferGeometry>
  private materialCache: Map<string, THREE.Material>
  private textureCache: Map<string, THREE.Texture>
  
  // Update management
  private lastUpdate: number
  private updateInterval: number
  private needsUpdate: boolean
  
  // Quality settings
  private qualitySettings: RenderingQuality
  
  // Event callbacks
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
    
    // Initialize configuration
    this.config = {
      enableLOD: true,
      enableFrustumCulling: true,
      enableOclusionCulling: false, // Advanced feature for later
      maxVisibleBodies: 1000,
      cullDistance: 1000, // AU
      updateFrequency: 10, // 10 Hz
      memoryBudgetMB: 512,
      enableDynamicLoading: true,
      ...config
    }
    
    // Initialize collections
    this.bodies = new Map()
    this.visibleBodies = new Set()
    this.culledBodies = new Set()
    this.geometryCache = new Map()
    this.materialCache = new Map()
    this.textureCache = new Map()
    
    // Initialize performance objects
    this.frustum = new THREE.Frustum()
    this.cameraMatrix = new THREE.Matrix4()
    
    // Initialize timing
    this.lastUpdate = 0
    this.updateInterval = 1000 / this.config.updateFrequency
    this.needsUpdate = true
    
    // Initialize performance metrics
    this.performanceMetrics = {
      totalBodies: 0,
      visibleBodies: 0,
      culledBodies: 0,
      memoryUsageMB: 0,
      triangleCount: 0,
      lodDistribution: { ultra: 0, high: 0, medium: 0, low: 0, invisible: 0 },
      updateTime: 0
    }
    
    // Set default quality
    this.qualitySettings = QUALITY_PRESETS.high
    
    console.log('🌟 CelestialBodyManager initialized')
  }
  
  // Add a celestial body to management
  public addCelestialBody(body: CelestialBody): CelestialBodyInstance {
    if (this.bodies.has(body.id)) {
      console.warn(`Body ${body.id} already exists`)
      return this.bodies.get(body.id)!
    }
    
    const instance = this.createBodyInstance(body)
    this.bodies.set(body.id, instance)
    this.scene.add(instance.group)
    
    // Update metrics
    this.performanceMetrics.totalBodies++
    this.needsUpdate = true
    
    // Call callback
    if (this.onBodyAdded) {
      this.onBodyAdded(body.id)
    }
    
    return instance
  }
  
  // Remove a celestial body from management
  public removeCelestialBody(bodyId: string): boolean {
    const instance = this.bodies.get(bodyId)
    if (!instance) return false
    
    // Remove from scene
    this.scene.remove(instance.group)
    
    // Clean up resources
    this.disposeBodyInstance(instance)
    
    // Remove from collections
    this.bodies.delete(bodyId)
    this.visibleBodies.delete(bodyId)
    this.culledBodies.delete(bodyId)
    
    // Update metrics
    this.performanceMetrics.totalBodies--
    this.needsUpdate = true
    
    // Call callback
    if (this.onBodyRemoved) {
      this.onBodyRemoved(bodyId)
    }
    
    return true
  }
  
  // Create a celestial body instance with LOD levels
  private createBodyInstance(body: CelestialBody): CelestialBodyInstance {
    const group = new THREE.Group()
    group.name = body.id
    
    // Create base mesh
    const mesh = this.createBodyMesh(body, 'high')
    group.add(mesh)
    
    // Calculate orbital properties
    const orbitalPosition = new THREE.Vector3()
    const orbitalVelocity = new THREE.Vector3()
    
    // Calculate rotation speed
    const rotationSpeed = body.physical.rotationPeriod > 0 ? 
      (2 * Math.PI) / (body.physical.rotationPeriod * 3600) : 0
    
    // Create LOD levels
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
    
    // Set up parent-child relationships
    if (body.parent_id) {
      const parent = this.bodies.get(body.parent_id)
      if (parent) {
        parent.children.add(body.id)
      }
    }
    
    return instance
  }
  
  // Create different LOD levels for a body
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
      
      // Create geometry for this LOD level
      if (config.segments > 0) {
        const radius = this.getScaledRadius(body)
        lodLevel.geometry = new THREE.SphereGeometry(radius, config.segments, config.segments)
        lodLevel.material = this.createBodyMaterial(body, config.level)
      }
      
      levels.set(config.level, lodLevel)
    })
    
    return levels
  }
  
  // Create mesh for celestial body
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
  
  // Create material for celestial body with LOD considerations
  private createBodyMaterial(body: CelestialBody, lodLevel: string): THREE.Material {
    const cacheKey = `${body.id}_${lodLevel}`
    
    // Check cache first
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
    
    // Load textures based on LOD level
    this.loadTexturesForLOD(material, body, lodLevel)
    
    // Cache the material
    this.materialCache.set(cacheKey, material)
    
    return material.clone()
  }
  
  // Load textures based on LOD level
  private loadTexturesForLOD(material: THREE.Material, body: CelestialBody, lodLevel: string): void {
    if (!(material instanceof THREE.MeshStandardMaterial)) return
    
    const textureLoader = new THREE.TextureLoader()
    const shouldLoadHighRes = lodLevel === 'ultra' || lodLevel === 'high'
    
    // Load diffuse texture
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
    
    // Load normal map for high quality only
    if (body.textures.normal && lodLevel === 'ultra') {
      textureLoader.load(body.textures.normal, (texture) => {
        material.normalMap = texture
        material.needsUpdate = true
      })
    }
  }
  
  // Get segments count based on body type and LOD level
  private getSegmentsForLOD(bodyType: string, lodLevel: string): number {
    const baseSegments = {
      ultra: 128,
      high: 64,
      medium: 32,
      low: 16
    }[lodLevel] || 32
    
    // Adjust based on body type
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
  
  // Get scaled radius for rendering
  private getScaledRadius(body: CelestialBody): number {
    const baseScale = body.type === 'star' ? 0.1 : 0.001
    return body.physical.radius * baseScale
  }
  
  // Calculate triangle count for a mesh
  private calculateTriangleCount(mesh: THREE.Mesh): number {
    const geometry = mesh.geometry
    if (geometry.index) {
      return geometry.index.count / 3
    }
    return geometry.attributes.position.count / 3
  }
  
  // Main update loop - called by the engine
  public update(deltaTime: number, currentTime: number): void {
    const now = performance.now()
    
    // Check if update is needed based on frequency
    if (now - this.lastUpdate < this.updateInterval && !this.needsUpdate) {
      return
    }
    
    const updateStart = now
    
    // Update camera frustum
    if (this.config.enableFrustumCulling) {
      this.updateFrustum()
    }
    
    // Update all bodies
    this.updateBodies(deltaTime, currentTime)
    
    // Update LOD levels
    if (this.config.enableLOD) {
      this.updateLODLevels()
    }
    
    // Perform culling
    this.performCulling()
    
    // Update performance metrics
    this.updatePerformanceMetrics()
    
    // Record timing
    this.performanceMetrics.updateTime = performance.now() - updateStart
    this.lastUpdate = now
    this.needsUpdate = false
  }
  
  // Update camera frustum for culling
  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(this.cameraMatrix)
  }
  
  // Update all body instances
  private updateBodies(deltaTime: number, currentTime: number): void {
    this.bodies.forEach((instance) => {
      // Update distance from camera
      instance.distanceFromCamera = instance.group.position.distanceTo(this.camera.position)
      
      // Update frustum culling
      if (this.config.enableFrustumCulling) {
        instance.isInFrustum = this.frustum.intersectsObject(instance.group)
      } else {
        instance.isInFrustum = true
      }
      
      // Update rotation
      if (instance.rotationSpeed > 0) {
        instance.mesh.rotation.y += instance.rotationSpeed * deltaTime
      }
      
      instance.lastUpdate = currentTime
    })
  }
  
  // Update LOD levels based on distance
  private updateLODLevels(): void {
    this.bodies.forEach((instance) => {
      const distance = instance.distanceFromCamera
      let newLODLevel: LODLevel
      
      // Determine appropriate LOD level
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
      
      // Update if LOD changed
      if (newLODLevel !== instance.currentLOD) {
        this.switchLODLevel(instance, newLODLevel)
      }
    })
  }
  
  // Switch to a different LOD level
  private switchLODLevel(instance: CelestialBodyInstance, newLOD: LODLevel): void {
    // Remove current mesh
    instance.group.remove(instance.mesh)
    
    // Dispose old geometry and material if not cached
    instance.mesh.geometry.dispose()
    if (Array.isArray(instance.mesh.material)) {
      instance.mesh.material.forEach(mat => mat.dispose())
    } else {
      instance.mesh.material.dispose()
    }
    
    if (newLOD.visible && newLOD.geometry && newLOD.material) {
      // Create new mesh with new LOD
      instance.mesh = new THREE.Mesh(newLOD.geometry.clone(), newLOD.material.clone())
      instance.mesh.name = `${instance.id}_mesh_${newLOD.level}`
      instance.mesh.castShadow = instance.body.type !== 'star'
      instance.mesh.receiveShadow = instance.body.type !== 'star'
      instance.mesh.userData = { celestialBody: instance.body }
      
      instance.group.add(instance.mesh)
      instance.triangleCount = this.calculateTriangleCount(instance.mesh)
    } else {
      // Create invisible placeholder
      const geometry = new THREE.SphereGeometry(0.001, 4, 4)
      const material = new THREE.MeshBasicMaterial({ visible: false })
      instance.mesh = new THREE.Mesh(geometry, material)
      instance.triangleCount = 0
    }
    
    instance.currentLOD = newLOD
    
    // Call callback
    if (this.onLODChanged) {
      this.onLODChanged(instance.id, newLOD)
    }
  }
  
  // Perform frustum and distance culling
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
  
  // Update performance metrics
  private updatePerformanceMetrics(): void {
    this.performanceMetrics.visibleBodies = this.visibleBodies.size
    this.performanceMetrics.culledBodies = this.culledBodies.size
    
    // Reset LOD distribution
    Object.keys(this.performanceMetrics.lodDistribution).forEach(key => {
      this.performanceMetrics.lodDistribution[key] = 0
    })
    
    // Count triangles and LOD distribution
    let totalTriangles = 0
    this.bodies.forEach((instance) => {
      if (instance.isVisible) {
        totalTriangles += instance.triangleCount
        this.performanceMetrics.lodDistribution[instance.currentLOD.level]++
      }
    })
    
    this.performanceMetrics.triangleCount = totalTriangles
    
    // Estimate memory usage (simplified)
    this.performanceMetrics.memoryUsageMB = 
      (this.geometryCache.size * 0.5 + this.textureCache.size * 2) // Rough estimate
  }
  
  // Public API methods
  
  // Get body instance by ID
  public getBody(id: string): CelestialBodyInstance | undefined {
    return this.bodies.get(id)
  }
  
  // Get all visible bodies
  public getVisibleBodies(): CelestialBodyInstance[] {
    return Array.from(this.visibleBodies).map(id => this.bodies.get(id)!).filter(Boolean)
  }
  
  // Get performance metrics
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics }
  }
  
  // Set quality level
  public setQualityLevel(quality: RenderingQuality): void {
    this.qualitySettings = quality
    
    // Rebuild all LOD levels with new quality settings
    this.bodies.forEach((instance) => {
      instance.lodLevels = this.createLODLevels(instance.body)
      this.needsUpdate = true
    })
  }
  
  // Force update of all bodies
  public forceUpdate(): void {
    this.needsUpdate = true
  }
  
  // Set event callbacks
  public setCallbacks(callbacks: {
    onBodyAdded?: (bodyId: string) => void
    onBodyRemoved?: (bodyId: string) => void
    onLODChanged?: (bodyId: string, level: LODLevel) => void
  }): void {
    this.onBodyAdded = callbacks.onBodyAdded
    this.onBodyRemoved = callbacks.onBodyRemoved
    this.onLODChanged = callbacks.onLODChanged
  }
  
  // Dispose body instance and clean up resources
  private disposeBodyInstance(instance: CelestialBodyInstance): void {
    // Dispose geometry
    instance.mesh.geometry.dispose()
    
    // Dispose materials
    if (Array.isArray(instance.mesh.material)) {
      instance.mesh.material.forEach(material => material.dispose())
    } else {
      instance.mesh.material.dispose()
    }
    
    // Dispose LOD geometries and materials
    instance.lodLevels.forEach((lod) => {
      if (lod.geometry) lod.geometry.dispose()
      if (lod.material) lod.material.dispose()
    })
    
    // Remove from parent's children
    if (instance.parent) {
      const parent = this.bodies.get(instance.parent)
      if (parent) {
        parent.children.delete(instance.id)
      }
    }
    
    // Remove children
    instance.children.forEach(childId => {
      this.removeCelestialBody(childId)
    })
  }
  
  // Clean up all resources
  public dispose(): void {
    // Dispose all bodies
    this.bodies.forEach((instance) => {
      this.disposeBodyInstance(instance)
    })
    
    // Clear caches
    this.geometryCache.forEach(geometry => geometry.dispose())
    this.materialCache.forEach(material => material.dispose())
    this.textureCache.forEach(texture => texture.dispose())
    
    // Clear collections
    this.bodies.clear()
    this.visibleBodies.clear()
    this.culledBodies.clear()
    this.geometryCache.clear()
    this.materialCache.clear()
    this.textureCache.clear()
    
    console.log('🗑️ CelestialBodyManager disposed')
  }
}
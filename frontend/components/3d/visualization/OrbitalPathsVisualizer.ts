// CLIFF 3D Solar System - Orbital Paths Visualizer
// Advanced orbital mechanics visualization system

import * as THREE from 'three'
import { 
  CelestialBody, 
  OrbitalElements, 
  Vector3D, 
  ASTRONOMICAL_CONSTANTS 
} from '../../../types/astronomical-data'
import { OrbitalMechanicsEngine } from '../engines/OrbitalMechanicsEngine'

export interface OrbitVisualizationConfig {
  showOrbits: boolean
  showTrajectories: boolean
  showPeriapsisApoapsis: boolean
  showLagrangePoints: boolean
  animateTrajectories: boolean
  
  // Visual settings
  orbitOpacity: number
  orbitWidth: number
  trajectoryOpacity: number
  trajectoryLength: number
  
  // Animation settings
  animationSpeed: number
  trailFadeTime: number
  
  // Quality settings
  orbitSegments: number
  trajectorySegments: number
  adaptiveDetail: boolean
  
  // Color settings
  orbitColors: {
    planet: string
    moon: string
    asteroid: string
    comet: string
  }
}

export interface OrbitPathData {
  id: string
  body: CelestialBody
  geometry: THREE.BufferGeometry
  material: THREE.LineBasicMaterial | THREE.LineDashedMaterial
  mesh: THREE.Line
  points: THREE.Vector3[]
  visible: boolean
  lastUpdate: number
}

export interface TrajectoryData {
  id: string
  body: CelestialBody
  startTime: number
  endTime: number
  points: THREE.Vector3[]
  times: number[]
  geometry: THREE.BufferGeometry
  material: THREE.LineBasicMaterial
  mesh: THREE.Line
  animationProgress: number
}

export interface OrbitalMarker {
  id: string
  type: 'periapsis' | 'apoapsis' | 'ascending_node' | 'descending_node' | 'lagrange_point'
  position: THREE.Vector3
  mesh: THREE.Mesh
  label?: THREE.Sprite
  body: CelestialBody
}

export class OrbitalPathsVisualizer {
  // Core systems
  private scene: THREE.Scene
  private camera: THREE.Camera
  private orbitalEngine: OrbitalMechanicsEngine
  
  // Configuration
  private config: OrbitVisualizationConfig
  
  // Data collections
  private orbits: Map<string, OrbitPathData>
  private trajectories: Map<string, TrajectoryData>
  private markers: Map<string, OrbitalMarker>
  
  // Animation state
  private currentTime: number
  private animationDelta: number
  private lastUpdate: number
  
  // Optimization
  private frustum: THREE.Frustum
  private cameraMatrix: THREE.Matrix4
  private visibilityCache: Map<string, boolean>
  
  // Materials cache
  private materialCache: Map<string, THREE.Material>
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, config: Partial<OrbitVisualizationConfig> = {}) {
    this.scene = scene
    this.camera = camera
    this.orbitalEngine = new OrbitalMechanicsEngine()
    
    // Initialize configuration
    this.config = {
      showOrbits: true,
      showTrajectories: false,
      showPeriapsisApoapsis: true,
      showLagrangePoints: false,
      animateTrajectories: true,
      orbitOpacity: 0.3,
      orbitWidth: 1,
      trajectoryOpacity: 0.8,
      trajectoryLength: 365, // days
      animationSpeed: 1.0,
      trailFadeTime: 30, // days
      orbitSegments: 128,
      trajectorySegments: 256,
      adaptiveDetail: true,
      orbitColors: {
        planet: '#4A90E2',
        moon: '#F5A623',
        asteroid: '#D0021B',
        comet: '#7ED321'
      },
      ...config
    }
    
    // Initialize collections
    this.orbits = new Map()
    this.trajectories = new Map()
    this.markers = new Map()
    this.materialCache = new Map()
    
    // Initialize state
    this.currentTime = ASTRONOMICAL_CONSTANTS.J2000_EPOCH
    this.animationDelta = 0
    this.lastUpdate = 0
    
    // Initialize optimization
    this.frustum = new THREE.Frustum()
    this.cameraMatrix = new THREE.Matrix4()
    this.visibilityCache = new Map()
    
    console.log('🛰️ OrbitalPathsVisualizer initialized')
  }
  
  // Add orbital path for a celestial body
  public addOrbitPath(body: CelestialBody): OrbitPathData {
    if (this.orbits.has(body.id)) {
      return this.orbits.get(body.id)!
    }
    
    const orbitData = this.createOrbitPath(body)
    this.orbits.set(body.id, orbitData)
    this.scene.add(orbitData.mesh)
    
    // Add orbital markers
    if (this.config.showPeriapsisApoapsis) {
      this.addOrbitalMarkers(body)
    }
    
    return orbitData
  }
  
  // Create orbital path geometry and mesh
  private createOrbitPath(body: CelestialBody): OrbitPathData {
    const segments = this.getAdaptiveSegmentCount(body)
    const points: THREE.Vector3[] = []
    
    // Calculate orbital path points
    for (let i = 0; i <= segments; i++) {
      const meanAnomaly = (i / segments) * 2 * Math.PI
      const position = this.calculateOrbitalPosition(body, meanAnomaly)
      points.push(new THREE.Vector3(position.x, position.y, position.z))
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    
    // Create material
    const color = this.getOrbitColor(body)
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: this.config.orbitOpacity,
      linewidth: this.config.orbitWidth
    })
    
    // Create mesh
    const mesh = new THREE.Line(geometry, material)
    mesh.name = `orbit_${body.id}`
    mesh.userData = { bodyId: body.id, type: 'orbit' }
    
    return {
      id: body.id,
      body,
      geometry,
      material,
      mesh,
      points,
      visible: true,
      lastUpdate: this.currentTime
    }
  }
  
  // Calculate orbital position for given mean anomaly
  private calculateOrbitalPosition(body: CelestialBody, meanAnomaly: number): Vector3D {
    const { semiMajorAxis, eccentricity } = body.orbital
    
    // Simple elliptical orbit calculation
    const eccentricAnomaly = meanAnomaly + eccentricity * Math.sin(meanAnomaly)
    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
    )
    
    const distance = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly))
    
    // Transform to 3D coordinates with orbital inclination
    const cosOmega = Math.cos(body.orbital.longitudeOfAscendingNode * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS)
    const sinOmega = Math.sin(body.orbital.longitudeOfAscendingNode * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS)
    const cosI = Math.cos(body.orbital.inclination * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS)
    const sinI = Math.sin(body.orbital.inclination * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS)
    const cosW = Math.cos(body.orbital.argumentOfPeriapsis * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS)
    const sinW = Math.sin(body.orbital.argumentOfPeriapsis * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS)
    
    // Orbital plane coordinates
    const xOrbit = distance * Math.cos(trueAnomaly)
    const yOrbit = distance * Math.sin(trueAnomaly)
    
    // Transform to global frame
    const x = (cosOmega * cosW - sinOmega * sinW * cosI) * xOrbit + 
              (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrbit
    const y = (sinOmega * cosW + cosOmega * sinW * cosI) * xOrbit + 
              (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrbit
    const z = (sinW * sinI) * xOrbit + (cosW * sinI) * yOrbit
    
    return { x, y, z }
  }
  
  // Add trajectory path for a celestial body
  public addTrajectoryPath(body: CelestialBody, startTime: number, duration: number): TrajectoryData {
    const trajectoryId = `${body.id}_trajectory`
    
    if (this.trajectories.has(trajectoryId)) {
      return this.trajectories.get(trajectoryId)!
    }
    
    const endTime = startTime + duration
    const segments = this.config.trajectorySegments
    const timeStep = duration / segments
    
    const points: THREE.Vector3[] = []
    const times: number[] = []
    
    // Calculate trajectory points
    for (let i = 0; i <= segments; i++) {
      const time = startTime + i * timeStep
      const state = this.orbitalEngine.calculateOrbitalState(body, time)
      
      points.push(new THREE.Vector3(state.position.x, state.position.y, state.position.z))
      times.push(time)
    }
    
    // Create geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    
    // Create material with gradient effect
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.getOrbitColor(body)),
      transparent: true,
      opacity: this.config.trajectoryOpacity
    })
    
    // Create mesh
    const mesh = new THREE.Line(geometry, material)
    mesh.name = `trajectory_${body.id}`
    mesh.userData = { bodyId: body.id, type: 'trajectory' }
    
    const trajectoryData: TrajectoryData = {
      id: trajectoryId,
      body,
      startTime,
      endTime,
      points,
      times,
      geometry,
      material,
      mesh,
      animationProgress: 0
    }
    
    this.trajectories.set(trajectoryId, trajectoryData)
    this.scene.add(mesh)
    
    return trajectoryData
  }
  
  // Add orbital markers (periapsis, apoapsis, nodes)
  private addOrbitalMarkers(body: CelestialBody): void {
    const { semiMajorAxis, eccentricity } = body.orbital
    
    // Periapsis marker
    const periapsisDistance = semiMajorAxis * (1 - eccentricity)
    const periapsisPosition = this.calculateOrbitalPosition(body, 0) // True anomaly = 0
    this.createOrbitalMarker(
      `${body.id}_periapsis`,
      'periapsis',
      new THREE.Vector3(periapsisPosition.x, periapsisPosition.y, periapsisPosition.z),
      body
    )
    
    // Apoapsis marker
    const apoapsisDistance = semiMajorAxis * (1 + eccentricity)
    const apoapsisPosition = this.calculateOrbitalPosition(body, Math.PI) // True anomaly = π
    this.createOrbitalMarker(
      `${body.id}_apoapsis`,
      'apoapsis',
      new THREE.Vector3(apoapsisPosition.x, apoapsisPosition.y, apoapsisPosition.z),
      body
    )
  }
  
  // Create orbital marker
  private createOrbitalMarker(
    id: string,
    type: OrbitalMarker['type'],
    position: THREE.Vector3,
    body: CelestialBody
  ): void {
    // Create marker geometry
    const geometry = new THREE.SphereGeometry(0.002, 8, 8)
    
    // Marker colors
    const colors = {
      periapsis: '#FF4444',
      apoapsis: '#44FF44',
      ascending_node: '#4444FF',
      descending_node: '#FFFF44',
      lagrange_point: '#FF44FF'
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors[type]),
      transparent: true,
      opacity: 0.8
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.name = `marker_${id}`
    
    const marker: OrbitalMarker = {
      id,
      type,
      position,
      mesh,
      body
    }
    
    this.markers.set(id, marker)
    this.scene.add(mesh)
  }
  
  // Update visualization system
  public update(currentTime: number, deltaTime: number): void {
    this.currentTime = currentTime
    this.animationDelta = deltaTime
    
    // Update frustum for visibility culling
    this.updateFrustum()
    
    // Update orbit visibility
    this.updateOrbitVisibility()
    
    // Update trajectory animations
    if (this.config.animateTrajectories) {
      this.updateTrajectoryAnimations()
    }
    
    // Update marker visibility
    this.updateMarkerVisibility()
    
    this.lastUpdate = performance.now()
  }
  
  // Update camera frustum for culling
  private updateFrustum(): void {
    this.cameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    )
    this.frustum.setFromProjectionMatrix(this.cameraMatrix)
  }
  
  // Update orbit visibility based on distance and frustum culling
  private updateOrbitVisibility(): void {
    this.orbits.forEach((orbitData, id) => {
      const distance = orbitData.mesh.position.distanceTo(this.camera.position)
      const inFrustum = this.frustum.intersectsObject(orbitData.mesh)
      
      // Distance-based LOD
      let visible = this.config.showOrbits && inFrustum
      
      if (this.config.adaptiveDetail && distance > 100) {
        // Reduce detail for distant orbits
        visible = visible && (distance < 500)
        orbitData.material.opacity = Math.max(0.1, this.config.orbitOpacity * (500 / distance))
      }
      
      orbitData.mesh.visible = visible
      orbitData.visible = visible
      this.visibilityCache.set(id, visible)
    })
  }
  
  // Update trajectory animations
  private updateTrajectoryAnimations(): void {
    this.trajectories.forEach((trajectoryData) => {
      if (!trajectoryData.mesh.visible) return
      
      // Animate trajectory progress
      trajectoryData.animationProgress += this.animationDelta * this.config.animationSpeed
      
      if (trajectoryData.animationProgress > 1) {
        trajectoryData.animationProgress = 0 // Loop animation
      }
      
      // Update visible portion of trajectory
      const visiblePoints = Math.floor(trajectoryData.points.length * trajectoryData.animationProgress)
      const animatedPoints = trajectoryData.points.slice(0, Math.max(1, visiblePoints))
      
      trajectoryData.geometry.setFromPoints(animatedPoints)
      trajectoryData.geometry.attributes.position.needsUpdate = true
    })
  }
  
  // Update marker visibility
  private updateMarkerVisibility(): void {
    this.markers.forEach((marker) => {
      const distance = marker.mesh.position.distanceTo(this.camera.position)
      const visible = this.config.showPeriapsisApoapsis && distance < 50
      
      marker.mesh.visible = visible
      
      // Scale markers based on distance
      const scale = Math.max(0.5, Math.min(2, 10 / distance))
      marker.mesh.scale.setScalar(scale)
    })
  }
  
  // Get adaptive segment count based on body importance and distance
  private getAdaptiveSegmentCount(body: CelestialBody): number {
    if (!this.config.adaptiveDetail) {
      return this.config.orbitSegments
    }
    
    // Base segments on body type
    const baseSegments = {
      star: 8,
      planet: this.config.orbitSegments,
      dwarf_planet: this.config.orbitSegments * 0.75,
      moon: this.config.orbitSegments * 0.5,
      asteroid: this.config.orbitSegments * 0.25,
      comet: this.config.orbitSegments * 0.5
    }
    
    return Math.floor(baseSegments[body.type] || this.config.orbitSegments)
  }
  
  // Get orbit color based on body type
  private getOrbitColor(body: CelestialBody): string {
    const { orbitColors } = this.config
    
    switch (body.type) {
      case 'planet':
      case 'dwarf_planet':
        return orbitColors.planet
      case 'moon':
        return orbitColors.moon
      case 'asteroid':
        return orbitColors.asteroid
      case 'comet':
        return orbitColors.comet
      default:
        return orbitColors.planet
    }
  }
  
  // Public API methods
  
  public showOrbits(show: boolean): void {
    this.config.showOrbits = show
    this.orbits.forEach((orbitData) => {
      orbitData.mesh.visible = show && orbitData.visible
    })
  }
  
  public showTrajectories(show: boolean): void {
    this.config.showTrajectories = show
    this.trajectories.forEach((trajectoryData) => {
      trajectoryData.mesh.visible = show
    })
  }
  
  public showMarkers(show: boolean): void {
    this.config.showPeriapsisApoapsis = show
    this.markers.forEach((marker) => {
      marker.mesh.visible = show
    })
  }
  
  public setOrbitOpacity(opacity: number): void {
    this.config.orbitOpacity = Math.max(0, Math.min(1, opacity))
    this.orbits.forEach((orbitData) => {
      orbitData.material.opacity = this.config.orbitOpacity
    })
  }
  
  public setTrajectoryOpacity(opacity: number): void {
    this.config.trajectoryOpacity = Math.max(0, Math.min(1, opacity))
    this.trajectories.forEach((trajectoryData) => {
      trajectoryData.material.opacity = this.config.trajectoryOpacity
    })
  }
  
  public setAnimationSpeed(speed: number): void {
    this.config.animationSpeed = Math.max(0, speed)
  }
  
  public removeOrbitPath(bodyId: string): boolean {
    const orbitData = this.orbits.get(bodyId)
    if (!orbitData) return false
    
    this.scene.remove(orbitData.mesh)
    orbitData.geometry.dispose()
    orbitData.material.dispose()
    this.orbits.delete(bodyId)
    
    // Remove associated markers
    this.markers.forEach((marker, markerId) => {
      if (marker.body.id === bodyId) {
        this.scene.remove(marker.mesh)
        this.markers.delete(markerId)
      }
    })
    
    return true
  }
  
  public removeTrajectoryPath(bodyId: string): boolean {
    const trajectoryId = `${bodyId}_trajectory`
    const trajectoryData = this.trajectories.get(trajectoryId)
    if (!trajectoryData) return false
    
    this.scene.remove(trajectoryData.mesh)
    trajectoryData.geometry.dispose()
    trajectoryData.material.dispose()
    this.trajectories.delete(trajectoryId)
    
    return true
  }
  
  public getVisibilityStats(): { visibleOrbits: number; totalOrbits: number; visibleTrajectories: number } {
    const visibleOrbits = Array.from(this.orbits.values()).filter(orbit => orbit.visible).length
    const visibleTrajectories = Array.from(this.trajectories.values()).filter(traj => traj.mesh.visible).length
    
    return {
      visibleOrbits,
      totalOrbits: this.orbits.size,
      visibleTrajectories
    }
  }
  
  // Cleanup
  public dispose(): void {
    // Dispose orbits
    this.orbits.forEach((orbitData) => {
      this.scene.remove(orbitData.mesh)
      orbitData.geometry.dispose()
      orbitData.material.dispose()
    })
    
    // Dispose trajectories
    this.trajectories.forEach((trajectoryData) => {
      this.scene.remove(trajectoryData.mesh)
      trajectoryData.geometry.dispose()
      trajectoryData.material.dispose()
    })
    
    // Dispose markers
    this.markers.forEach((marker) => {
      this.scene.remove(marker.mesh)
      if (marker.mesh.geometry) marker.mesh.geometry.dispose()
      if (marker.mesh.material) (marker.mesh.material as THREE.Material).dispose()
    })
    
    // Clear collections
    this.orbits.clear()
    this.trajectories.clear()
    this.markers.clear()
    this.materialCache.clear()
    this.visibilityCache.clear()
    
    // Dispose orbital engine
    this.orbitalEngine.dispose()
    
    console.log('🗑️ OrbitalPathsVisualizer disposed')
  }
}
// CLIFF 3D Solar System - Orbital Mechanics Engine
// Advanced orbital mechanics calculations using Kepler's laws and real astronomical data

import { 
  CelestialBody, 
  OrbitalElements, 
  Vector3D, 
  ASTRONOMICAL_CONSTANTS 
} from '../../../types/astronomical-data'

export interface OrbitalState {
  position: Vector3D           // Position in AU
  velocity: Vector3D           // Velocity in AU/day
  distance: number             // Distance from parent body in AU
  trueAnomaly: number          // True anomaly in radians
  eccentricAnomaly: number     // Eccentric anomaly in radians
  meanAnomaly: number          // Mean anomaly in radians
  timeFromPeriapsis: number    // Time from periapsis in days
}

export interface TrajectoryPoint {
  time: number                 // Julian day
  position: Vector3D
  velocity: Vector3D
  distance: number
  phase: number               // Orbital phase (0-2π)
}

export interface OrbitalPrediction {
  bodyId: string
  startTime: number           // Julian day
  endTime: number            // Julian day
  trajectory: TrajectoryPoint[]
  period: number             // Orbital period in days
  nextPeriapsis: number      // Time of next periapsis
  nextApoapsis: number       // Time of next apoapsis
}

export class OrbitalMechanicsEngine {
  // Numerical precision settings
  private static readonly KEPLER_TOLERANCE = 1e-12
  private static readonly MAX_ITERATIONS = 100
  private static readonly CONVERGENCE_FACTOR = 1e-15
  
  // Time step settings for integration
  private static readonly DEFAULT_TIME_STEP = 0.1 // days
  private static readonly ADAPTIVE_STEP_MIN = 0.001 // days
  private static readonly ADAPTIVE_STEP_MAX = 1.0 // days
  
  // Cache for orbital calculations
  private orbitalStatesCache: Map<string, { state: OrbitalState, time: number }>
  private trajectoryCache: Map<string, OrbitalPrediction>
  
  // Performance tracking
  private calculationCount: number
  private cacheHits: number
  private cacheMisses: number
  
  constructor() {
    this.orbitalStatesCache = new Map()
    this.trajectoryCache = new Map()
    this.calculationCount = 0
    this.cacheHits = 0
    this.cacheMisses = 0
    
    console.log('🌌 OrbitalMechanicsEngine initialized')
  }
  
  /**
   * Calculate current orbital state for a celestial body.
   * Handles nested orbits (moons around planets).
   */
   public calculateOrbitalState(
     body: CelestialBody,
     julianDay: number,
     allBodies?: ReadonlyMap<string, CelestialBody>,
     // Internal cache for recursive calls within a single frame to avoid re-computation
     frameCache: Map<string, OrbitalState> = new Map()
   ): OrbitalState {
     // Check frame-specific cache first (for recursion)
     if (frameCache.has(body.id)) {
       return frameCache.get(body.id)!;
     }
 
     const cacheKey = `${body.id}_${julianDay.toFixed(6)}`;
 
     // Check long-term cache for the final absolute state
     const cached = this.orbitalStatesCache.get(cacheKey);
     if (cached && Math.abs(cached.time - julianDay) < 0.000001) {
       this.cacheHits++;
       frameCache.set(body.id, cached.state); // Populate frame cache
       return cached.state;
     }
 
     this.cacheMisses++;
     this.calculationCount++;
 
     // --- Standard orbital calculation (relative to parent) ---
     const timeSinceEpoch = julianDay - body.orbital.epoch;
     const meanMotion = body.orbital.meanMotion * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
     const meanAnomaly = this.normalizeAngle(
       body.orbital.meanAnomalyAtEpoch * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS +
       meanMotion * timeSinceEpoch
     );
     const eccentricAnomaly = this.solveKeplersEquation(meanAnomaly, body.orbital.eccentricity);
     const trueAnomaly = this.calculateTrueAnomaly(eccentricAnomaly, body.orbital.eccentricity);
     const distance = body.orbital.semiMajorAxis * (1 - body.orbital.eccentricity * Math.cos(eccentricAnomaly));
     const orbitalPosition = this.calculateOrbitalPlanePosition(distance, trueAnomaly, body.orbital);
     const relativePosition = this.transformToGlobalFrame(orbitalPosition, body.orbital);
     const relativeVelocity = this.calculateOrbitalVelocity(body.orbital, distance, trueAnomaly, eccentricAnomaly);
     const timeFromPeriapsis = this.calculateTimeFromPeriapsis(eccentricAnomaly, body.orbital.eccentricity, body.orbital.orbitalPeriod);
 
     // --- Handle parent body position ---
     let parentPosition: Vector3D = { x: 0, y: 0, z: 0 };
     let parentVelocity: Vector3D = { x: 0, y: 0, z: 0 };
 
     if (body.parent_id && allBodies) {
       const parentBody = allBodies.get(body.parent_id);
       if (parentBody) {
         const parentState = this.calculateOrbitalState(parentBody, julianDay, allBodies, frameCache);
         parentPosition = parentState.position;
         parentVelocity = parentState.velocity;
       }
     }
 
     const finalState: OrbitalState = {
       position: {
         x: relativePosition.x + parentPosition.x,
         y: relativePosition.y + parentPosition.y,
         z: relativePosition.z + parentPosition.z,
       },
       velocity: {
         x: relativeVelocity.x + parentVelocity.x,
         y: relativeVelocity.y + parentVelocity.y,
         z: relativeVelocity.z + parentVelocity.z,
       },
       distance,
       trueAnomaly,
       eccentricAnomaly,
       meanAnomaly,
       timeFromPeriapsis
     };
 
     // Cache the final, absolute state
     this.orbitalStatesCache.set(cacheKey, { state: finalState, time: julianDay });
     frameCache.set(body.id, finalState);
 
     if (this.orbitalStatesCache.size > 1000) {
       const iterator = this.orbitalStatesCache.keys().next();
       if (!iterator.done) this.orbitalStatesCache.delete(iterator.value);
     }
 
     return finalState;
   }
  
  /**
   * Solve Kepler's equation: E - e*sin(E) = M
   * Uses Newton-Raphson method with adaptive convergence
   */
  private solveKeplersEquation(meanAnomaly: number, eccentricity: number): number {
    // Initial guess for eccentric anomaly
    let E = meanAnomaly + eccentricity * Math.sin(meanAnomaly)
    
    // Newton-Raphson iteration
    for (let i = 0; i < OrbitalMechanicsEngine.MAX_ITERATIONS; i++) {
      const f = E - eccentricity * Math.sin(E) - meanAnomaly
      const df = 1 - eccentricity * Math.cos(E)
      
      const deltaE = f / df
      E -= deltaE
      
      // Check convergence
      if (Math.abs(deltaE) < OrbitalMechanicsEngine.KEPLER_TOLERANCE) {
        return E
      }
      
      // Secondary convergence check for highly elliptical orbits
      if (Math.abs(f) < OrbitalMechanicsEngine.CONVERGENCE_FACTOR) {
        return E
      }
    }
    
    // Fallback to bisection method for problematic cases
    return this.solveKeplersEquationBisection(meanAnomaly, eccentricity)
  }
  
  /**
   * Fallback bisection method for Kepler's equation
   */
  private solveKeplersEquationBisection(meanAnomaly: number, eccentricity: number): number {
    let lower = 0
    let upper = 2 * Math.PI
    let E = Math.PI
    
    for (let i = 0; i < OrbitalMechanicsEngine.MAX_ITERATIONS; i++) {
      const f = E - eccentricity * Math.sin(E) - meanAnomaly
      
      if (Math.abs(f) < OrbitalMechanicsEngine.KEPLER_TOLERANCE) {
        return E
      }
      
      if (f > 0) {
        upper = E
      } else {
        lower = E
      }
      
      E = (lower + upper) / 2
    }
    
    console.warn('Kepler equation failed to converge, using approximation')
    return E
  }
  
  /**
   * Calculate true anomaly from eccentric anomaly
   */
  private calculateTrueAnomaly(eccentricAnomaly: number, eccentricity: number): number {
    return 2 * Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
    )
  }
  
  /**
   * Calculate position in the orbital plane
   */
  private calculateOrbitalPlanePosition(
    distance: number, 
    trueAnomaly: number, 
    orbital: OrbitalElements
  ): Vector3D {
    // Position in orbital plane coordinates
    const x = distance * Math.cos(trueAnomaly)
    const y = distance * Math.sin(trueAnomaly)
    
    return { x, y, z: 0 }
  }
  
  /**
   * Transform orbital plane coordinates to global 3D frame
   */
  private transformToGlobalFrame(orbitalPosition: Vector3D, orbital: OrbitalElements): Vector3D {
    // Convert angles to radians
    const i = orbital.inclination * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS
    const omega = orbital.longitudeOfAscendingNode * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS
    const w = orbital.argumentOfPeriapsis * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS
    
    // Rotation matrices
    const cosOmega = Math.cos(omega)
    const sinOmega = Math.sin(omega)
    const cosI = Math.cos(i)
    const sinI = Math.sin(i)
    const cosW = Math.cos(w)
    const sinW = Math.sin(w)
    
    // Combined rotation matrix elements
    const p11 = cosOmega * cosW - sinOmega * sinW * cosI
    const p12 = -cosOmega * sinW - sinOmega * cosW * cosI
    const p13 = sinOmega * sinI
    
    const p21 = sinOmega * cosW + cosOmega * sinW * cosI
    const p22 = -sinOmega * sinW + cosOmega * cosW * cosI
    const p23 = -cosOmega * sinI
    
    const p31 = sinW * sinI
    const p32 = cosW * sinI
    const p33 = cosI
    
    // Transform position
    return {
      x: p11 * orbitalPosition.x + p12 * orbitalPosition.y + p13 * orbitalPosition.z,
      y: p21 * orbitalPosition.x + p22 * orbitalPosition.y + p23 * orbitalPosition.z,
      z: p31 * orbitalPosition.x + p32 * orbitalPosition.y + p33 * orbitalPosition.z
    }
  }
  
  /**
   * Calculate orbital velocity vector
   */
  private calculateOrbitalVelocity(
    orbital: OrbitalElements,
    distance: number,
    trueAnomaly: number,
    eccentricAnomaly: number
  ): Vector3D {
    // Standard gravitational parameter (simplified for Sun)
    const mu = 4 * Math.PI * Math.PI // AU³/year² for solar system
    const muDaily = mu / (365.25 * 365.25) // Convert to AU³/day²
    
    // Velocity magnitude from vis-viva equation
    const velocityMagnitude = Math.sqrt(muDaily * (2 / distance - 1 / orbital.semiMajorAxis))
    
    // Velocity components in orbital plane
    const sinE = Math.sin(eccentricAnomaly)
    const cosE = Math.cos(eccentricAnomaly)
    const beta = Math.sqrt(1 - orbital.eccentricity * orbital.eccentricity)
    
    const vx = -velocityMagnitude * sinE / (1 - orbital.eccentricity * cosE)
    const vy = velocityMagnitude * beta * cosE / (1 - orbital.eccentricity * cosE)
    
    const orbitalVelocity = { x: vx, y: vy, z: 0 }
    
    // Transform to global frame
    return this.transformToGlobalFrame(orbitalVelocity, orbital)
  }
  
  /**
   * Calculate time from periapsis
   */
  private calculateTimeFromPeriapsis(
    eccentricAnomaly: number,
    eccentricity: number,
    orbitalPeriod: number
  ): number {
    const meanAnomaly = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly)
    return (meanAnomaly / (2 * Math.PI)) * orbitalPeriod
  }
  
  /**
   * Generate trajectory prediction for a celestial body
   */
  public generateTrajectoryPrediction(
   body: CelestialBody,
   startTime: number,
   duration: number,
   allBodies?: ReadonlyMap<string, CelestialBody>,
   timeStep: number = 1.0
 ): OrbitalPrediction {
    const cacheKey = `${body.id}_${startTime}_${duration}_${timeStep}`
    
    // Check cache
    if (this.trajectoryCache.has(cacheKey)) {
      this.cacheHits++
      return this.trajectoryCache.get(cacheKey)!
    }
    
    this.cacheMisses++
    
    const trajectory: TrajectoryPoint[] = []
    const endTime = startTime + duration
    
    // Generate trajectory points
    for (let t = startTime; t <= endTime; t += timeStep) {
     const state = this.calculateOrbitalState(body, t, allBodies)
      
      trajectory.push({
        time: t,
        position: state.position,
        velocity: state.velocity,
        distance: state.distance,
        phase: this.normalizeAngle(state.trueAnomaly)
      })
    }
    
    // Calculate next periapsis and apoapsis
    const currentState = this.calculateOrbitalState(body, startTime, allBodies)
    const timeToNextPeriapsis = this.calculateTimeToNextPeriapsis(currentState, body.orbital)
    const timeToNextApoapsis = this.calculateTimeToNextApoapsis(currentState, body.orbital)
    
    const prediction: OrbitalPrediction = {
      bodyId: body.id,
      startTime,
      endTime,
      trajectory,
      period: body.orbital.orbitalPeriod,
      nextPeriapsis: startTime + timeToNextPeriapsis,
      nextApoapsis: startTime + timeToNextApoapsis
    }
    
    // Cache the prediction
    this.trajectoryCache.set(cacheKey, prediction)
    
    // Limit cache size
    if (this.trajectoryCache.size > 50) {
      const iterator = this.trajectoryCache.keys().next()
      if (!iterator.done) this.trajectoryCache.delete(iterator.value)
    }
    
    return prediction
  }
  
  /**
   * Calculate time to next periapsis
   */
  private calculateTimeToNextPeriapsis(state: OrbitalState, orbital: OrbitalElements): number {
    const timeInPeriod = state.timeFromPeriapsis % orbital.orbitalPeriod
    return orbital.orbitalPeriod - timeInPeriod
  }
  
  /**
   * Calculate time to next apoapsis
   */
  private calculateTimeToNextApoapsis(state: OrbitalState, orbital: OrbitalElements): number {
    const halfPeriod = orbital.orbitalPeriod / 2
    const timeInPeriod = state.timeFromPeriapsis % orbital.orbitalPeriod
    
    if (timeInPeriod < halfPeriod) {
      return halfPeriod - timeInPeriod
    } else {
      return orbital.orbitalPeriod + halfPeriod - timeInPeriod
    }
  }
  
  /**
   * Calculate orbital elements from state vectors (inverse problem)
   */
  public calculateOrbitalElementsFromState(
    position: Vector3D,
    velocity: Vector3D,
    time: number,
    centralBodyMass: number = 1.0 // Solar masses
  ): OrbitalElements {
    // Standard gravitational parameter
    const mu = 4 * Math.PI * Math.PI * centralBodyMass // AU³/year²
    const muDaily = mu / (365.25 * 365.25) // AU³/day²
    
    // Position and velocity magnitudes
    const r = Math.sqrt(position.x * position.x + position.y * position.y + position.z * position.z)
    const v = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z)
    
    // Specific orbital energy
    const energy = v * v / 2 - muDaily / r
    
    // Semi-major axis
    const semiMajorAxis = -muDaily / (2 * energy)
    
    // Angular momentum vector
    const h = {
      x: position.y * velocity.z - position.z * velocity.y,
      y: position.z * velocity.x - position.x * velocity.z,
      z: position.x * velocity.y - position.y * velocity.x
    }
    const hMag = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z)
    
    // Eccentricity vector
    const eMag = Math.sqrt(1 - (hMag * hMag) / (muDaily * semiMajorAxis))
    
    // Inclination
    const inclination = Math.acos(h.z / hMag) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES
    
    // Node vector
    const n = {
      x: -h.y,
      y: h.x,
      z: 0
    }
    const nMag = Math.sqrt(n.x * n.x + n.y * n.y)
    
    // Longitude of ascending node
    let longitudeOfAscendingNode = Math.acos(n.x / nMag) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES
    if (n.y < 0) {
      longitudeOfAscendingNode = 360 - longitudeOfAscendingNode
    }
    
    // Calculate other elements (simplified)
    const argumentOfPeriapsis = 0 // Would require more complex calculation
    const meanAnomalyAtEpoch = 0  // Would require more complex calculation
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / muDaily)
    const meanMotion = 360 / orbitalPeriod // degrees/day
    
    return {
      semiMajorAxis,
      eccentricity: eMag,
      inclination,
      longitudeOfAscendingNode,
      argumentOfPeriapsis,
      meanAnomalyAtEpoch,
      epoch: time,
      orbitalPeriod,
      meanMotion,
      distance_from_sun: semiMajorAxis,
      orbital_period_days: orbitalPeriod,
      rotation_period_hours: 24,
      tilt_degrees: inclination
    }
  }
  
  /**
   * Calculate closest approach between two bodies
   */
  public calculateClosestApproach(
   body1: CelestialBody,
   body2: CelestialBody,
   startTime: number,
   searchDuration: number = 365.25, // 1 year
   allBodies?: ReadonlyMap<string, CelestialBody>
 ): { time: number, distance: number, relativeVelocity: number } {
    let minDistance = Number.POSITIVE_INFINITY
    let closestTime = startTime
    let relativeVelocity = 0
    
    const timeStep = Math.min(body1.orbital.orbitalPeriod, body2.orbital.orbitalPeriod) / 100
    
    for (let t = startTime; t <= startTime + searchDuration; t += timeStep) {
     const state1 = this.calculateOrbitalState(body1, t, allBodies)
     const state2 = this.calculateOrbitalState(body2, t, allBodies)
      
      const dx = state1.position.x - state2.position.x
      const dy = state1.position.y - state2.position.y
      const dz = state1.position.z - state2.position.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      
      if (distance < minDistance) {
        minDistance = distance
        closestTime = t
        
        const dvx = state1.velocity.x - state2.velocity.x
        const dvy = state1.velocity.y - state2.velocity.y
        const dvz = state1.velocity.z - state2.velocity.z
        relativeVelocity = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz)
      }
    }
    
    return {
      time: closestTime,
      distance: minDistance,
      relativeVelocity
    }
  }
  
  /**
   * Normalize angle to [0, 2π) range
   */
  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 2 * Math.PI
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI
    return angle
  }
  
  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    calculationCount: number
    cacheHitRatio: number
    cacheSize: number
    trajectoryCacheSize: number
  } {
    const totalRequests = this.cacheHits + this.cacheMisses
    return {
      calculationCount: this.calculationCount,
      cacheHitRatio: totalRequests > 0 ? this.cacheHits / totalRequests : 0,
      cacheSize: this.orbitalStatesCache.size,
      trajectoryCacheSize: this.trajectoryCache.size
    }
  }
  
  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.orbitalStatesCache.clear()
    this.trajectoryCache.clear()
    this.calculationCount = 0
    this.cacheHits = 0
    this.cacheMisses = 0
  }
  
  /**
   * Dispose and clean up resources
   */
  public dispose(): void {
    this.clearCaches()
    console.log('🗑️ OrbitalMechanicsEngine disposed')
  }
}

// Utility functions for orbital mechanics

/**
 * Convert orbital elements to Cartesian coordinates
 */
export function orbitalElementsToCartesian(
  orbital: OrbitalElements,
  julianDay: number
): { position: Vector3D, velocity: Vector3D } {
  const engine = new OrbitalMechanicsEngine()
  
  // Create a temporary celestial body for calculation
  const tempBody: CelestialBody = {
    id: 'temp',
    name: 'Temporary',
    turkish_name: 'Geçici',
    type: 'asteroid',
    info: {
      radius_km: 1,
      mass_relative_to_earth: 0.001,
      gravity_relative_to_earth: 0.001,
      has_atmosphere: false,
      has_rings: false,
      moon_count: 0,
      surface_temp_celsius: { min: -200, max: -200, average: -200 }
    },
    orbit: {
      distance_from_sun: orbital.semiMajorAxis,
      orbital_period_days: orbital.orbitalPeriod,
      rotation_period_hours: 24,
      tilt_degrees: orbital.inclination
    },
    orbital,
    physical: {
      radius: 1,
      mass: 1,
      density: 1,
      gravity: 1,
      escapeVelocity: 1,
      rotationPeriod: 24,
      axialTilt: 0,
      albedo: 0.1
    },
    atmosphere: { hasAtmosphere: false },
    textures: { diffuse: '' },
    color: '#ffffff',
    description: 'Temporary body for calculations',
    interesting_facts: []
  }
  
  const state = engine.calculateOrbitalState(tempBody, julianDay)
  engine.dispose()
  
  return {
    position: state.position,
    velocity: state.velocity
  }
}

/**
 * Calculate synodic period between two bodies
 */
export function calculateSynodicPeriod(period1: number, period2: number): number {
  if (period1 === period2) return Number.POSITIVE_INFINITY
  return Math.abs(1 / (1 / period1 - 1 / period2))
}

/**
 * Calculate Hill sphere radius
 */
export function calculateHillSphere(
  bodyMass: number,
  primaryMass: number,
  semiMajorAxis: number
): number {
  return semiMajorAxis * Math.pow(bodyMass / (3 * primaryMass), 1/3)
}

export default OrbitalMechanicsEngine;

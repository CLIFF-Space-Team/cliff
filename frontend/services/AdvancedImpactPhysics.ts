/**
 * Advanced Impact Physics Calculator
 * Based on NASA/JPL research and peer-reviewed scientific papers
 * 
 * References:
 * - Collins et al. (2005) - Earth Impact Effects Program
 * - Holsapple & Housen (2007) - Crater scaling laws
 * - Melosh (1989) - Impact Cratering: A Geologic Process
 * - Ivanov (2005) - Numerical modeling of largest terrestrial meteorite craters
 */

export interface ProjectileProperties {
  diameter_m: number
  density_kgm3: number
  velocity_ms: number
  angle_deg: number
}

export interface TargetProperties {
  density_kgm3: number
  gravity_ms2: number
  isOcean: boolean
  waterDepth_m?: number
  latitude: number
}

export interface AtmosphericBreakup {
  occurredInAtmosphere: boolean
  breakupAltitude_m: number
  finalVelocity_ms: number
  impactEnergy_fraction: number
  airburstEnergy_joules: number
  fireballRadius_m: number
}

export interface CraterDimensions {
  transientDiameter_m: number
  transientDepth_m: number
  finalDiameter_m: number
  finalDepth_m: number
  rimHeight_m: number
  rimDiameter_m: number
  ejectaBlanketThickness_m: number
  ejectaBlanketRange_m: number
  hasCentralPeak: boolean
  centralPeakHeight_m?: number
  craterType: 'simple' | 'complex' | 'basin'
}

export interface ThermalEffects {
  fireball_duration_s: number
  fireball_maxRadius_m: number
  fireball_maxTemperature_K: number
  thermalFluence_Jm2: number
  noIgnition_km: number
  ignitesWood_km: number
  firstDegree_km: number
  secondDegree_km: number
  thirdDegree_km: number
}

export interface AirBlastEffects {
  peakOverpressure_Pa: number
  arrivalTime_s: number
  duration_s: number
  windSpeed_ms: number
  radius_1psi_km: number
  radius_5psi_km: number
  radius_10psi_km: number
  radius_20psi_km: number
  decayWithDistance: Array<{ distance_km: number; overpressure_Pa: number }>
}

export interface SeismicEffects {
  magnitude_Richter: number
  magnitude_Moment: number
  seismicEnergy_joules: number
  feltRadius_km: number
  mercalliIntensity: number[]
  seismicWaveSpeed_ms: number
  groundMotion_ms2: number
}

export interface EjectaEffects {
  totalEjectaMass_kg: number
  ejectaVelocity_ms: number
  maxEjectaRange_km: number
  landslideMass_kg: number
  meltVolume_m3: number
  vaporizedMass_kg: number
}

export class AdvancedImpactPhysics {
  private readonly EARTH_RADIUS = 6371000 // meters
  private readonly STANDARD_GRAVITY = 9.81 // m/s²
  private readonly AIR_DENSITY_SL = 1.225 // kg/m³
  private readonly SCALE_HEIGHT = 8500 // meters
  
  /**
   * Calculate atmospheric entry and possible breakup
   * Based on Chyba et al. (1993) and Hills & Goda (1993)
   */
  calculateAtmosphericEntry(
    projectile: ProjectileProperties,
    target: TargetProperties
  ): AtmosphericBreakup {
    const v = projectile.velocity_ms
    const d = projectile.diameter_m
    const rho_p = projectile.density_kgm3
    const rho_a = this.AIR_DENSITY_SL
    const angle = projectile.angle_deg * Math.PI / 180
    
    // Strength of asteroid (Pa) - varies by type
    const strength = this.estimateAsteroidStrength(rho_p)
    
    // Breakup altitude (Hills & Goda 1993)
    const breakupPressure = strength
    const q_breakup = 0.5 * rho_a * v * v // dynamic pressure
    
    // Altitude where dynamic pressure equals strength
    let h_breakup = -this.SCALE_HEIGHT * Math.log(breakupPressure / q_breakup)
    
    if (h_breakup > 100000) {
      h_breakup = -1 // No breakup
    }
    
    // Pancake model for atmospheric deformation
    const L = d * Math.sqrt(rho_p / rho_a) // Penetration depth
    
    let finalVelocity = v
    let impactFraction = 1.0
    let airburstEnergy = 0
    let fireballRadius = 0
    
    if (h_breakup > 0 && d < 200) {
      // Small asteroids break up in atmosphere
      const deceleration = (3 * rho_a * v * v) / (8 * rho_p * d)
      const timeToBreakup = (v - Math.sqrt(v*v - 2*deceleration*h_breakup)) / deceleration
      
      finalVelocity = v - deceleration * timeToBreakup
      impactFraction = (finalVelocity / v) ** 2
      
      const mass = (4/3) * Math.PI * Math.pow(d/2, 3) * rho_p
      airburstEnergy = 0.5 * mass * (v*v - finalVelocity*finalVelocity)
      
      // Fireball from airburst
      fireballRadius = Math.pow(airburstEnergy / (4.2e6 * 4/3 * Math.PI), 1/3)
      
      return {
        occurredInAtmosphere: true,
        breakupAltitude_m: h_breakup,
        finalVelocity_ms: finalVelocity,
        impactEnergy_fraction: impactFraction,
        airburstEnergy_joules: airburstEnergy,
        fireballRadius_m: fireballRadius
      }
    }
    
    return {
      occurredInAtmosphere: false,
      breakupAltitude_m: -1,
      finalVelocity_ms: v,
      impactEnergy_fraction: 1.0,
      airburstEnergy_joules: 0,
      fireballRadius_m: 0
    }
  }
  
  /**
   * Calculate crater dimensions using pi-group scaling
   * Based on Holsapple & Housen (2007) and Collins et al. (2005)
   */
  calculateCraterDimensions(
    projectile: ProjectileProperties,
    target: TargetProperties,
    atmosphericEntry: AtmosphericBreakup
  ): CraterDimensions {
    const L = projectile.diameter_m
    const rho_p = projectile.density_kgm3
    const rho_t = target.density_kgm3
    const v_impact = atmosphericEntry.finalVelocity_ms
    const g = target.gravity_ms2
    const theta = projectile.angle_deg * Math.PI / 180
    
    // Impact energy
    const mass = (4/3) * Math.PI * Math.pow(L/2, 3) * rho_p
    const E = 0.5 * mass * v_impact * v_impact * atmosphericEntry.impactEnergy_fraction
    
    // Pi-group scaling constants (Holsapple 2007)
    const mu = 0.55 // Coupling parameter for hard rock
    const nu = 0.4  // Velocity exponent
    const C1 = 1.6  // Scaling constant for diameter
    const C2 = 0.3  // Depth-to-diameter ratio
    
    // Angle correction (Pierazzo & Melosh 2000)
    const f_angle = Math.pow(Math.sin(theta), 1/3)
    
    // Transient crater diameter (Collins et al. 2005)
    const D_tr = C1 * L * Math.pow(
      (rho_p / rho_t), 1/(3*nu)
    ) * Math.pow(
      v_impact * Math.sqrt(rho_p / (g * L * rho_t)), 2*nu/(3*nu)
    ) * f_angle
    
    // Transient crater depth
    const d_tr = C2 * D_tr
    
    // Simple-to-complex transition (Pike 1980, 1988)
    const D_transition = 3000 // meters for Earth
    
    let D_final: number
    let d_final: number
    let hasCentralPeak = false
    let centralPeakHeight = 0
    let craterType: 'simple' | 'complex' | 'basin'
    
    if (D_tr < D_transition) {
      // Simple crater
      D_final = D_tr
      d_final = d_tr
      craterType = 'simple'
    } else {
      // Complex crater with central peak
      hasCentralPeak = true
      
      // Rim-to-rim diameter enlargement
      D_final = 1.13 * Math.pow(D_tr, 1.02)
      
      // Depth reduction due to collapse
      d_final = 0.3 * Math.pow(D_final / 1000, 0.3) * 1000
      
      // Central peak height (Grieve & Pilkington 1996)
      centralPeakHeight = 0.086 * Math.pow(D_final / 1000, 0.42) * 1000
      
      if (D_final > 300000) {
        craterType = 'basin'
      } else {
        craterType = 'complex'
      }
    }
    
    // Rim height (Melosh 1989)
    const h_rim = 0.04 * D_final
    const D_rim = D_final * 1.2
    
    // Ejecta blanket (McGetchin et al. 1973)
    const ejecta_thickness = 0.14 * Math.pow(D_final / 2, 0.74) * Math.pow(D_final, -0.74)
    const ejecta_range = 2 * D_final
    
    return {
      transientDiameter_m: D_tr,
      transientDepth_m: d_tr,
      finalDiameter_m: D_final,
      finalDepth_m: d_final,
      rimHeight_m: h_rim,
      rimDiameter_m: D_rim,
      ejectaBlanketThickness_m: ejecta_thickness,
      ejectaBlanketRange_m: ejecta_range,
      hasCentralPeak,
      centralPeakHeight_m: hasCentralPeak ? centralPeakHeight : undefined,
      craterType
    }
  }
  
  /**
   * Calculate thermal radiation effects
   * Based on Glasstone & Dolan (1977) and Collins et al. (2005)
   */
  calculateThermalEffects(
    energy_joules: number,
    altitude_m: number
  ): ThermalEffects {
    const E_MT = energy_joules / 4.184e15 // Megatons TNT
    
    // Fireball parameters (Glasstone & Dolan 1977)
    const fireball_maxRadius = 440 * Math.pow(E_MT, 0.4) // meters
    const fireball_duration = 7.03 * Math.pow(E_MT, 0.44) // seconds
    const fireball_maxTemp = 6000 + 2000 * Math.pow(E_MT, 0.1) // Kelvin
    
    // Thermal fluence (energy per unit area)
    const radiationEfficiency = 0.3 // 30% of energy as thermal radiation
    const Q = radiationEfficiency * energy_joules / (4 * Math.PI) // J/m²/sr
    
    // Distance for various burn levels (Collins et al. 2005)
    const attenuation = Math.exp(-altitude_m / 8000) // Atmospheric attenuation
    
    // No ignition: Q = 1.0e5 J/m²
    const r_noIgnition = Math.sqrt(Q / (1.0e5 * attenuation)) / 1000 // km
    
    // Ignites wood: Q = 2.0e5 J/m²  
    const r_ignitesWood = Math.sqrt(Q / (2.0e5 * attenuation)) / 1000 // km
    
    // First degree burn: Q = 3.0e5 J/m²
    const r_firstDegree = Math.sqrt(Q / (3.0e5 * attenuation)) / 1000 // km
    
    // Second degree burn: Q = 5.0e5 J/m²
    const r_secondDegree = Math.sqrt(Q / (5.0e5 * attenuation)) / 1000 // km
    
    // Third degree burn: Q = 1.0e6 J/m²
    const r_thirdDegree = Math.sqrt(Q / (1.0e6 * attenuation)) / 1000 // km
    
    return {
      fireball_duration_s: fireball_duration,
      fireball_maxRadius_m: fireball_maxRadius,
      fireball_maxTemperature_K: fireball_maxTemp,
      thermalFluence_Jm2: Q,
      noIgnition_km: r_noIgnition,
      ignitesWood_km: r_ignitesWood,
      firstDegree_km: r_firstDegree,
      secondDegree_km: r_secondDegree,
      thirdDegree_km: r_thirdDegree
    }
  }
  
  /**
   * Calculate air blast effects using Kinney-Graham equations
   */
  calculateAirBlast(
    energy_joules: number,
    distances_m: number[]
  ): { distance_m: number; overpressure_Pa: number; windSpeed_ms: number; arrivalTime_s: number }[] {
    const E = energy_joules
    const results = []
    
    for (const R of distances_m) {
      // Scaled distance (Kinney & Graham 1985)
      const Z = R / Math.pow(E / 101325, 1/3)
      
      // Overpressure (Pa) - Kinney-Graham equation
      let P_over: number
      
      if (Z < 0.1) {
        P_over = 1.4e6 * Math.pow(Z, -3)
      } else if (Z < 1) {
        P_over = 6.7e5 / Z - 2.4e4
      } else {
        P_over = 2.7e4 / Math.pow(Z, 2) + 7.0e3 / Math.pow(Z, 3)
      }
      
      // Wind speed (Rankine-Hugoniot relations)
      const P_ambient = 101325 // Pa
      const gamma = 1.4
      const windSpeed = Math.sqrt(
        (5 * (P_over / P_ambient + 1)) / (7 * (P_ambient + 7 * P_over / P_ambient))
      ) * 340 // m/s
      
      // Arrival time
      const soundSpeed = 340 // m/s
      const arrivalTime = R / soundSpeed
      
      results.push({
        distance_m: R,
        overpressure_Pa: P_over,
        windSpeed_ms: windSpeed,
        arrivalTime_s: arrivalTime
      })
    }
    
    return results
  }
  
  /**
   * Calculate seismic effects
   * Based on Schultz & Gault (1975) and Ivanov (2005)
   */
  calculateSeismicEffects(
    energy_joules: number,
    distance_km: number
  ): SeismicEffects {
    // Seismic efficiency (% of impact energy converted to seismic waves)
    const efficiency = 0.001 // 0.1% typical for impacts
    const E_seismic = energy_joules * efficiency
    
    // Moment magnitude
    const M_w = (2/3) * Math.log10(E_seismic / 1e4) - 6.0
    
    // Richter magnitude (approximate conversion)
    const M_L = M_w * 1.05 - 0.15
    
    // Felt radius (Schultz & Gault 1975)
    const feltRadius = 100 * Math.pow(10, 0.5 * M_L)
    
    // Ground motion at distance (simplified)
    const groundMotion = (E_seismic / (4 * Math.PI * Math.pow(distance_km * 1000, 2))) / 1000
    
    // Mercalli intensity scale (simplified)
    const mercalliIntensities = []
    for (let d = 10; d <= feltRadius; d *= 2) {
      const intensity = Math.max(1, Math.min(12, 12 - Math.log10(d / 10) * 3))
      mercalliIntensities.push(Math.round(intensity))
    }
    
    return {
      magnitude_Richter: M_L,
      magnitude_Moment: M_w,
      seismicEnergy_joules: E_seismic,
      feltRadius_km: feltRadius,
      mercalliIntensity: mercalliIntensities,
      seismicWaveSpeed_ms: 5000, // P-wave velocity in crust
      groundMotion_ms2: groundMotion
    }
  }
  
  /**
   * Estimate asteroid strength based on density
   */
  private estimateAsteroidStrength(density_kgm3: number): number {
    // Empirical relationship from Benz & Asphaug (1999)
    if (density_kgm3 < 1500) {
      return 1e6 // Weak, porous (C-type)
    } else if (density_kgm3 < 2500) {
      return 5e6 // Medium strength (S-type)
    } else {
      return 1e7 // Strong, solid (M-type, iron)
    }
  }
  
  /**
   * Calculate ejecta characteristics
   */
  calculateEjecta(
    crater: CraterDimensions,
    projectile: ProjectileProperties,
    energy_joules: number
  ): EjectaEffects {
    const D = crater.finalDiameter_m
    const d = crater.finalDepth_m
    
    // Total ejecta mass (Melosh 1989)
    const volume = Math.PI * Math.pow(D/2, 2) * d / 3
    const density = 2700 // Average crustal density
    const totalMass = volume * density
    
    // Ejecta velocity (Maxwell Z-model)
    const v_ejecta = Math.sqrt(2 * energy_joules / totalMass) * 0.3
    
    // Max range (ballistic trajectory)
    const g = 9.81
    const maxRange = (v_ejecta * v_ejecta) / g / 1000 // km
    
    // Melt volume (Pierazzo et al. 1997)
    const meltVolume = Math.pow(D / 1000, 3) * 1e6 // m³
    
    // Vaporized mass (very high energy impacts)
    const vaporizedMass = totalMass * 0.01 // ~1%
    
    return {
      totalEjectaMass_kg: totalMass,
      ejectaVelocity_ms: v_ejecta,
      maxEjectaRange_km: maxRange,
      landslideMass_kg: totalMass * 0.3,
      meltVolume_m3: meltVolume,
      vaporizedMass_kg: vaporizedMass
    }
  }
}

export const advancedImpactPhysics = new AdvancedImpactPhysics()


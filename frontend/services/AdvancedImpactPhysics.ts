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
  private readonly EARTH_RADIUS = 6371000 
  private readonly STANDARD_GRAVITY = 9.81 
  private readonly AIR_DENSITY_SL = 1.225 
  private readonly SCALE_HEIGHT = 8500 
  calculateAtmosphericEntry(
    projectile: ProjectileProperties,
    target: TargetProperties
  ): AtmosphericBreakup {
    const v = projectile.velocity_ms
    const d = projectile.diameter_m
    const rho_p = projectile.density_kgm3
    const rho_a = this.AIR_DENSITY_SL
    const angle = projectile.angle_deg * Math.PI / 180
    const strength = this.estimateAsteroidStrength(rho_p)
    const breakupPressure = strength
    const q_breakup = 0.5 * rho_a * v * v 
    let h_breakup = -this.SCALE_HEIGHT * Math.log(breakupPressure / q_breakup)
    if (h_breakup > 100000) {
      h_breakup = -1 
    }
    const L = d * Math.sqrt(rho_p / rho_a) 
    let finalVelocity = v
    let impactFraction = 1.0
    let airburstEnergy = 0
    let fireballRadius = 0
    if (h_breakup > 0 && d < 200) {
      const deceleration = (3 * rho_a * v * v) / (8 * rho_p * d)
      const timeToBreakup = (v - Math.sqrt(v*v - 2*deceleration*h_breakup)) / deceleration
      finalVelocity = v - deceleration * timeToBreakup
      impactFraction = (finalVelocity / v) ** 2
      const mass = (4/3) * Math.PI * Math.pow(d/2, 3) * rho_p
      airburstEnergy = 0.5 * mass * (v*v - finalVelocity*finalVelocity)
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
    const mass = (4/3) * Math.PI * Math.pow(L/2, 3) * rho_p
    const E = 0.5 * mass * v_impact * v_impact * atmosphericEntry.impactEnergy_fraction
    const mu = 0.55 
    const nu = 0.4  
    const C1 = 1.6  
    const C2 = 0.3  
    const f_angle = Math.pow(Math.sin(theta), 1/3)
    const D_tr = C1 * L * Math.pow(
      (rho_p / rho_t), 1/(3*nu)
    ) * Math.pow(
      v_impact * Math.sqrt(rho_p / (g * L * rho_t)), 2*nu/(3*nu)
    ) * f_angle
    const d_tr = C2 * D_tr
    const D_transition = 3000 
    let D_final: number
    let d_final: number
    let hasCentralPeak = false
    let centralPeakHeight = 0
    let craterType: 'simple' | 'complex' | 'basin'
    if (D_tr < D_transition) {
      D_final = D_tr
      d_final = d_tr
      craterType = 'simple'
    } else {
      hasCentralPeak = true
      D_final = 1.13 * Math.pow(D_tr, 1.02)
      d_final = 0.3 * Math.pow(D_final / 1000, 0.3) * 1000
      centralPeakHeight = 0.086 * Math.pow(D_final / 1000, 0.42) * 1000
      if (D_final > 300000) {
        craterType = 'basin'
      } else {
        craterType = 'complex'
      }
    }
    const h_rim = 0.04 * D_final
    const D_rim = D_final * 1.2
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
  calculateThermalEffects(
    energy_joules: number,
    altitude_m: number
  ): ThermalEffects {
    const E_MT = energy_joules / 4.184e15 
    const fireball_maxRadius = 440 * Math.pow(E_MT, 0.4) 
    const fireball_duration = 7.03 * Math.pow(E_MT, 0.44) 
    const fireball_maxTemp = 6000 + 2000 * Math.pow(E_MT, 0.1) 
    const radiationEfficiency = 0.3 
    const Q = radiationEfficiency * energy_joules / (4 * Math.PI) 
    const attenuation = Math.exp(-altitude_m / 8000) 
    const r_noIgnition = Math.sqrt(Q / (1.0e5 * attenuation)) / 1000 
    const r_ignitesWood = Math.sqrt(Q / (2.0e5 * attenuation)) / 1000 
    const r_firstDegree = Math.sqrt(Q / (3.0e5 * attenuation)) / 1000 
    const r_secondDegree = Math.sqrt(Q / (5.0e5 * attenuation)) / 1000 
    const r_thirdDegree = Math.sqrt(Q / (1.0e6 * attenuation)) / 1000 
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
  calculateAirBlast(
    energy_joules: number,
    distances_m: number[]
  ): { distance_m: number; overpressure_Pa: number; windSpeed_ms: number; arrivalTime_s: number }[] {
    const E = energy_joules
    const results = []
    for (const R of distances_m) {
      const Z = R / Math.pow(E / 101325, 1/3)
      let P_over: number
      if (Z < 0.1) {
        P_over = 1.4e6 * Math.pow(Z, -3)
      } else if (Z < 1) {
        P_over = 6.7e5 / Z - 2.4e4
      } else {
        P_over = 2.7e4 / Math.pow(Z, 2) + 7.0e3 / Math.pow(Z, 3)
      }
      const P_ambient = 101325 
      const gamma = 1.4
      const windSpeed = Math.sqrt(
        (5 * (P_over / P_ambient + 1)) / (7 * (P_ambient + 7 * P_over / P_ambient))
      ) * 340 
      const soundSpeed = 340 
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
  calculateSeismicEffects(
    energy_joules: number,
    distance_km: number
  ): SeismicEffects {
    const efficiency = 0.001 
    const E_seismic = energy_joules * efficiency
    const M_w = (2/3) * Math.log10(E_seismic / 1e4) - 6.0
    const M_L = M_w * 1.05 - 0.15
    const feltRadius = 100 * Math.pow(10, 0.5 * M_L)
    const groundMotion = (E_seismic / (4 * Math.PI * Math.pow(distance_km * 1000, 2))) / 1000
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
      seismicWaveSpeed_ms: 5000, 
      groundMotion_ms2: groundMotion
    }
  }
  private estimateAsteroidStrength(density_kgm3: number): number {
    if (density_kgm3 < 1500) {
      return 1e6 
    } else if (density_kgm3 < 2500) {
      return 5e6 
    } else {
      return 1e7 
    }
  }
  calculateEjecta(
    crater: CraterDimensions,
    projectile: ProjectileProperties,
    energy_joules: number
  ): EjectaEffects {
    const D = crater.finalDiameter_m
    const d = crater.finalDepth_m
    const volume = Math.PI * Math.pow(D/2, 2) * d / 3
    const density = 2700 
    const totalMass = volume * density
    const v_ejecta = Math.sqrt(2 * energy_joules / totalMass) * 0.3
    const g = 9.81
    const maxRange = (v_ejecta * v_ejecta) / g / 1000 
    const meltVolume = Math.pow(D / 1000, 3) * 1e6 
    const vaporizedMass = totalMass * 0.01 
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

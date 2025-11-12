import {
  advancedImpactPhysics,
  AtmosphericBreakup,
  CraterDimensions,
  ThermalEffects,
  SeismicEffects,
  EjectaEffects
} from './AdvancedImpactPhysics'
export interface AsteroidParams {
  diameter_m: number
  velocity_kms: number
  angle_deg: number
  density?: number
}
export interface ImpactLocation {
  lat: number
  lng: number
  isOcean: boolean
  depth?: number
  population?: number
  cityName?: string
}
export interface ImpactResults {
  energy: {
    joules: number
    megatonsTNT: number
    kilotonsTNT: number
  }
  atmospheric: AtmosphericBreakup
  crater: CraterDimensions & {
    radius_km: number
    depth_km: number
    volume_km3: number
  }
  airBlast: {
    radius_20psi_km: number
    radius_10psi_km: number
    radius_5psi_km: number
    radius_1psi_km: number
    shockWaveSpeed_ms: number
  }
  thermal: ThermalEffects & {
    thirdDegree_km: number
    secondDegree_km: number
    firstDegree_km: number
  }
  seismic: SeismicEffects & {
    magnitude: number
    feltRadius_km: number
  }
  ejecta: EjectaEffects
  tsunami?: {
    maxHeight_m: number
    arrivalTime_minutes: number
    waveSpeed_ms: number
  }
  casualties: {
    estimated: number
    severity: 'catastrophic' | 'severe' | 'moderate' | 'minor'
  }
  comparison: {
    realWorldEvent: string
    multiplier: number
  }
}
export class ImpactCalculator {
  calculate(
    asteroid: AsteroidParams,
    location: ImpactLocation
  ): ImpactResults {
    const density = asteroid.density || 2600
    const velocity_ms = asteroid.velocity_kms * 1000
    const atmospheric = advancedImpactPhysics.calculateAtmosphericEntry(
      {
        diameter_m: asteroid.diameter_m,
        density_kgm3: density,
        velocity_ms,
        angle_deg: asteroid.angle_deg
      },
      {
        density_kgm3: location.isOcean ? 1000 : 2700,
        gravity_ms2: 9.81,
        isOcean: location.isOcean,
        waterDepth_m: location.depth,
        latitude: location.lat
      }
    )
    const mass = (4/3) * Math.PI * Math.pow(asteroid.diameter_m/2, 3) * density
    const totalEnergy = 0.5 * mass * velocity_ms * velocity_ms
    const impactEnergy = totalEnergy * atmospheric.impactEnergy_fraction
    const megatonsTNT = impactEnergy / 4.184e15
    const kilotonsTNT = megatonsTNT * 1000
    const craterDims = advancedImpactPhysics.calculateCraterDimensions(
      {
        diameter_m: asteroid.diameter_m,
        density_kgm3: density,
        velocity_ms: atmospheric.finalVelocity_ms,
        angle_deg: asteroid.angle_deg
      },
      {
        density_kgm3: location.isOcean ? 1000 : 2700,
        gravity_ms2: 9.81,
        isOcean: location.isOcean,
        waterDepth_m: location.depth,
        latitude: location.lat
      },
      atmospheric
    )
    const craterVolume = Math.PI * Math.pow(craterDims.finalDiameter_m / 2000, 2) * (craterDims.finalDepth_m / 1000)
    const thermalEffects = advancedImpactPhysics.calculateThermalEffects(
      impactEnergy,
      atmospheric.breakupAltitude_m > 0 ? atmospheric.breakupAltitude_m : 0
    )
    const airBlastDistances = [1000, 5000, 10000, 20000, 50000, 100000]
    const airBlastData = advancedImpactPhysics.calculateAirBlast(impactEnergy, airBlastDistances)
    let radius_1psi = 0, radius_5psi = 0, radius_10psi = 0, radius_20psi = 0
    for (const data of airBlastData) {
      const psi = data.overpressure_Pa / 6894.76
      if (psi >= 1 && radius_1psi === 0) radius_1psi = data.distance_m / 1000
      if (psi >= 5 && radius_5psi === 0) radius_5psi = data.distance_m / 1000
      if (psi >= 10 && radius_10psi === 0) radius_10psi = data.distance_m / 1000
      if (psi >= 20 && radius_20psi === 0) radius_20psi = data.distance_m / 1000
    }
    const seismicEffects = advancedImpactPhysics.calculateSeismicEffects(impactEnergy, 100)
    const ejectaEffects = advancedImpactPhysics.calculateEjecta(
      craterDims,
      {
        diameter_m: asteroid.diameter_m,
        density_kgm3: density,
        velocity_ms,
        angle_deg: asteroid.angle_deg
      },
      impactEnergy
    )
    const tsunami = location.isOcean && location.depth
      ? this.calculateTsunami(megatonsTNT, location.depth)
      : undefined
    const casualties = this.estimateCasualties(
      location,
      { radius_5psi_km: radius_5psi },
      { secondDegree_km: thermalEffects.secondDegree_km }
    )
    const comparison = this.getRealWorldComparison(megatonsTNT)
    return {
      energy: {
        joules: impactEnergy,
        megatonsTNT,
        kilotonsTNT
      },
      atmospheric,
      crater: {
        ...craterDims,
        radius_km: craterDims.finalDiameter_m / 2000,
        depth_km: craterDims.finalDepth_m / 1000,
        volume_km3: craterVolume
      },
      airBlast: {
        radius_20psi_km: radius_20psi || thermalEffects.thirdDegree_km * 0.3,
        radius_10psi_km: radius_10psi || thermalEffects.thirdDegree_km * 0.5,
        radius_5psi_km: radius_5psi || thermalEffects.secondDegree_km * 0.6,
        radius_1psi_km: radius_1psi || thermalEffects.firstDegree_km * 0.8,
        shockWaveSpeed_ms: 343
      },
      thermal: {
        ...thermalEffects,
        thirdDegree_km: thermalEffects.thirdDegree_km,
        secondDegree_km: thermalEffects.secondDegree_km,
        firstDegree_km: thermalEffects.firstDegree_km
      },
      seismic: {
        ...seismicEffects,
        magnitude: seismicEffects.magnitude_Richter,
        feltRadius_km: seismicEffects.feltRadius_km
      },
      ejecta: ejectaEffects,
      tsunami,
      casualties,
      comparison
    }
  }
  private calculateTsunami(energy_megatons: number, waterDepth_m: number) {
    if (waterDepth_m < 100) return null
    const maxHeight_m = 2.5 * Math.pow(energy_megatons, 0.4)
    const arrivalTime_minutes = 30
    const waveSpeed_ms = Math.sqrt(9.81 * waterDepth_m)
    return { maxHeight_m, arrivalTime_minutes, waveSpeed_ms }
  }
  private getRealWorldComparison(megatonsTNT: number): { realWorldEvent: string; multiplier: number } {
    const comparisons = [
      { name: 'Chelyabinsk Meteor (2013)', megatons: 0.5 },
      { name: 'Hiroshima Atom Bombası', megatons: 0.015 },
      { name: 'Tunguska Olayı (1908)', megatons: 15 },
      { name: 'Tsar Bomba (En Büyük H-Bombası)', megatons: 50 },
      { name: 'Barringer Krateri (Arizona)', megatons: 10 },
      { name: 'Chesapeake Bay Etkisi', megatons: 1e6 },
      { name: 'Chicxulub Etkisi (Dinozorların Sonu)', megatons: 1e8 }
    ]
    let bestMatch = comparisons[0]
    let minDiff = Math.abs(Math.log10(megatonsTNT) - Math.log10(comparisons[0].megatons))
    for (const comp of comparisons) {
      const diff = Math.abs(Math.log10(megatonsTNT) - Math.log10(comp.megatons))
      if (diff < minDiff) {
        minDiff = diff
        bestMatch = comp
      }
    }
    return {
      realWorldEvent: bestMatch.name,
      multiplier: megatonsTNT / bestMatch.megatons
    }
  }
  private estimateCasualties(
    location: ImpactLocation,
    airBlast: { radius_5psi_km: number },
    thermal: { secondDegree_km: number }
  ) {
    if (location.isOcean) {
      return { estimated: 0, severity: 'minor' as const }
    }
    const affectedArea_km2 = Math.PI * Math.pow(airBlast.radius_5psi_km, 2)
    const populationDensity = (location.population || 0) / 1000
    const estimated = Math.floor(affectedArea_km2 * populationDensity * 0.1)
    let severity: 'catastrophic' | 'severe' | 'moderate' | 'minor'
    if (estimated > 1000000) severity = 'catastrophic'
    else if (estimated > 100000) severity = 'severe'
    else if (estimated > 10000) severity = 'moderate'
    else severity = 'minor'
    return { estimated, severity }
  }
}
export const impactCalculator = new ImpactCalculator()

export class ImpactPhysics {
  private readonly SOUND_SPEED = 343
  private readonly EARTH_RADIUS = 6371
  private readonly GRAVITY = 9.8
  
  calculateImpactTimeline(
    diameter_m: number,
    velocity_kms: number,
    distance_km: number
  ) {
    const velocity_ms = velocity_kms * 1000
    
    const approachTime = (distance_km * 1000) / velocity_ms
    
    const atmosphereTime = 100000 / velocity_ms
    
    const craterFormationTime = diameter_m / velocity_ms
    
    const shockWaveSpeed = this.SOUND_SPEED
    const maxShockRadius = 100
    const shockDuration = (maxShockRadius * 1000) / shockWaveSpeed
    
    const thermalSpeed = 299792458
    const thermalDuration = 0.1
    
    const debrisEjectionTime = Math.sqrt((2 * 2000) / this.GRAVITY)
    
    const totalDuration = approachTime + atmosphereTime + craterFormationTime + 
                          shockDuration + debrisEjectionTime
    
    return {
      phases: {
        approach: {
          start: 0,
          end: approachTime / totalDuration,
          duration: approachTime,
          description: 'Asteroid uzaydan yaklaşıyor'
        },
        atmosphereEntry: {
          start: approachTime / totalDuration,
          end: (approachTime + atmosphereTime) / totalDuration,
          duration: atmosphereTime,
          description: 'Atmosfere giriş (100km yükseklik)'
        },
        impact: {
          start: (approachTime + atmosphereTime) / totalDuration,
          end: (approachTime + atmosphereTime + craterFormationTime) / totalDuration,
          duration: craterFormationTime,
          description: 'Yüzeye temas ve krater oluşumu'
        },
        fireball: {
          start: (approachTime + atmosphereTime) / totalDuration,
          end: (approachTime + atmosphereTime + craterFormationTime + 5) / totalDuration,
          duration: 5,
          description: 'Fireball genişlemesi'
        },
        shockWave: {
          start: (approachTime + atmosphereTime + craterFormationTime) / totalDuration,
          end: (approachTime + atmosphereTime + craterFormationTime + shockDuration) / totalDuration,
          duration: shockDuration,
          speed: shockWaveSpeed,
          description: `Ses hızında yayılma (${shockWaveSpeed} m/s)`
        },
        thermal: {
          start: (approachTime + atmosphereTime + craterFormationTime) / totalDuration,
          end: (approachTime + atmosphereTime + craterFormationTime + thermalDuration) / totalDuration,
          duration: thermalDuration,
          speed: thermalSpeed,
          description: 'Işık hızında termal radyasyon'
        },
        debris: {
          start: (approachTime + atmosphereTime + craterFormationTime) / totalDuration,
          end: (approachTime + atmosphereTime + craterFormationTime + debrisEjectionTime) / totalDuration,
          duration: debrisEjectionTime,
          maxHeight: 2000,
          description: `Debris ${debrisEjectionTime.toFixed(1)}s içinde ${2000}m yüksekliğe çıkar`
        }
      },
      totalDuration,
      scientificData: {
        approachVelocity: velocity_ms,
        atmosphereEntryAltitude: 100000,
        craterFormationTime,
        shockWaveSpeed,
        thermalRadiationSpeed: thermalSpeed,
        debrisMaxHeight: 2000,
        debrisFlightTime: debrisEjectionTime
      }
    }
  }
  
  normalizeToAnimationProgress(
    realTime: number,
    totalDuration: number,
    targetDuration: number = 20
  ): number {
    return (realTime / totalDuration) * (totalDuration / targetDuration)
  }
}

export const impactPhysics = new ImpactPhysics()


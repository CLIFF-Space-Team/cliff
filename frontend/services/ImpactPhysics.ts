export class ImpactPhysics {
  private readonly SOUND_SPEED = 343
  private readonly EARTH_RADIUS = 6371
  private readonly GRAVITY = 9.8
  calculateImpactTimeline(
    diameter_m: number,
    velocity_kms: number,
    distance_km: number
  ) {
    const approachPhase = 0.35      
    const atmospherePhase = 0.10    
    const impactPhase = 0.03        
    const fireballPhase = 0.15      
    const shockPhase = 0.30         
    const debrisPhase = 0.20        
    return {
      phases: {
        approach: {
          start: 0,
          end: approachPhase,
          duration: approachPhase,
          description: 'Asteroid uzaydan yaklaşıyor'
        },
        atmosphereEntry: {
          start: approachPhase - 0.05,
          end: approachPhase + atmospherePhase,
          duration: atmospherePhase,
          description: 'Atmosfere giriş (100km yükseklik)'
        },
        impact: {
          start: approachPhase + atmospherePhase,
          end: approachPhase + atmospherePhase + impactPhase,
          duration: impactPhase,
          description: 'Yüzeye temas ve krater oluşumu'
        },
        fireball: {
          start: approachPhase + atmospherePhase,
          end: approachPhase + atmospherePhase + fireballPhase,
          duration: fireballPhase,
          description: 'Fireball genişlemesi'
        },
        shockWave: {
          start: approachPhase + atmospherePhase + impactPhase,
          end: approachPhase + atmospherePhase + impactPhase + shockPhase,
          duration: shockPhase,
          speed: this.SOUND_SPEED,
          description: `Ses hızında yayılma (${this.SOUND_SPEED} m/s)`
        },
        thermal: {
          start: approachPhase + atmospherePhase + impactPhase,
          end: approachPhase + atmospherePhase + impactPhase + 0.05,
          duration: 0.05,
          speed: 299792458,
          description: 'Işık hızında termal radyasyon'
        },
        debris: {
          start: approachPhase + atmospherePhase + impactPhase + 0.05,
          end: approachPhase + atmospherePhase + impactPhase + debrisPhase,
          duration: debrisPhase,
          maxHeight: 2000,
          description: `Debris fırlatılıyor`
        }
      },
      totalDuration: 1.0, 
      scientificData: {
        approachVelocity: velocity_kms * 1000,
        atmosphereEntryAltitude: 100000,
        craterFormationTime: diameter_m / (velocity_kms * 1000),
        shockWaveSpeed: this.SOUND_SPEED,
        thermalRadiationSpeed: 299792458,
        debrisMaxHeight: 2000,
        debrisFlightTime: Math.sqrt((2 * 2000) / this.GRAVITY)
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

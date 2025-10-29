// CLIFF 3D Solar System - Planetary Effects Manager
// Specialized visual effects for different planets

import * as THREE from 'three'
import { MaterialManager } from '../materials/MaterialManager'

export interface JupiterEffectConfig {
  greatRedSpotIntensity: number
  stormSystemCount: number
  bandAnimationSpeed: number
  turbulenceStrength: number
  atmosphericGlow: boolean
}

export interface MarsEffectConfig {
  dustStormIntensity: number
  polarIceCapSize: number
  seasonalChangeRate: number
  atmosphericThinness: number
  dustDevilCount: number
}

export interface VenusEffectConfig {
  lightningFrequency: number
  atmosphericDensity: number
  sulfuricAcidClouds: boolean
  retrogradeRotationEffect: boolean
  greenhouseIntensity: number
}

export interface EarthEffectConfig {
  auroraIntensity: number
  cityLightsBrightness: number
  cloudDynamics: boolean
  oceanReflection: number
  magnetosphereVisible: boolean
}

export interface SaturnEffectConfig {
  ringParticleDensity: number
  hexagonalStormVisible: boolean
  ringCastsShadows: boolean
  titanAtmosphere: boolean
  spokes: boolean // Ring spokes phenomenon
}

export class PlanetaryEffectsManager {
  private scene: THREE.Scene
  private materialManager: MaterialManager
  private effectObjects: Map<string, THREE.Object3D[]>
  private animatedUniforms: Map<string, any>
  
  // Effect-specific geometries and materials
  private lightningGeometry?: THREE.BufferGeometry
  private auroraGeometry?: THREE.BufferGeometry
  private dustStormGeometry?: THREE.BufferGeometry
  private atmosphericGlowMaterial?: THREE.ShaderMaterial
  
  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.materialManager = MaterialManager.getInstance()
    this.effectObjects = new Map()
    this.animatedUniforms = new Map()
    
    this.initializeEffectAssets()
  }
  
  /**
   * Initialize reusable effect assets
   */
  private initializeEffectAssets(): void {
    // Lightning geometry
    this.lightningGeometry = new THREE.BufferGeometry()
    
    // Aurora geometry (ring-like structure)
    this.auroraGeometry = new THREE.TorusGeometry(1.05, 0.02, 8, 32)
    
    // Dust storm particle system geometry
    this.dustStormGeometry = new THREE.BufferGeometry()
    
    // Atmospheric glow material
    this.atmosphericGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        glowColor: { value: new THREE.Color(0x88aaff) },
        intensity: { value: 0.5 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 glowColor;
        uniform float intensity;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float fresnel = dot(vNormal, vec3(0.0, 0.0, 1.0));
          float glow = pow(0.8 - abs(fresnel), 2.0) * intensity;
          
          // Add animation
          glow *= (sin(time * 2.0) * 0.2 + 0.8);
          
          gl_FragColor = vec4(glowColor, glow);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
  }
  
  /**
   * Create Jupiter-specific effects
   */
  public createJupiterEffects(
    planetMesh: THREE.Mesh, 
    config: JupiterEffectConfig
  ): void {
    const effects: THREE.Object3D[] = []
    
    // Great Red Spot overlay
    if (config.greatRedSpotIntensity > 0) {
      const spotGeometry = new THREE.SphereGeometry(1.01, 32, 32, 0, Math.PI * 0.3, Math.PI * 0.3, Math.PI * 0.2)
      const spotMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xff4444),
        transparent: true,
        opacity: config.greatRedSpotIntensity,
        blending: THREE.AdditiveBlending
      })
      
      const greatRedSpot = new THREE.Mesh(spotGeometry, spotMaterial)
      greatRedSpot.position.copy(planetMesh.position)
      greatRedSpot.rotation.y = Math.PI * 0.2 // Position on Jupiter
      
      effects.push(greatRedSpot)
      this.scene.add(greatRedSpot)
      
      // Animate the spot
      this.animatedUniforms.set(`jupiter_spot_rotation`, {
        object: greatRedSpot,
        rotationSpeed: config.bandAnimationSpeed * 0.1
      })
    }
    
    // Atmospheric storm systems
    for (let i = 0; i < config.stormSystemCount; i++) {
      const stormRadius = 1.005 + (i * 0.002)
      const stormGeometry = new THREE.SphereGeometry(stormRadius, 16, 16)
      
      const stormMaterial = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          stormIntensity: { value: 0.3 + Math.random() * 0.4 },
          stormColor: { value: new THREE.Color().setHSL(0.1 + Math.random() * 0.2, 0.8, 0.6) }
        },
        vertexShader: `
          uniform float time;
          varying vec2 vUv;
          varying float vStormPattern;
          
          void main() {
            vUv = uv;
            
            // Create spiral storm pattern
            float angle = atan(position.z, position.x) + time * 0.5;
            float radius = length(position.xz);
            vStormPattern = sin(angle * 8.0 - radius * 10.0 + time * 2.0) * 0.5 + 0.5;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float stormIntensity;
          uniform vec3 stormColor;
          varying vec2 vUv;
          varying float vStormPattern;
          
          void main() {
            float alpha = vStormPattern * stormIntensity;
            gl_FragColor = vec4(stormColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
      })
      
      const stormSystem = new THREE.Mesh(stormGeometry, stormMaterial)
      stormSystem.position.copy(planetMesh.position)
      
      effects.push(stormSystem)
      this.scene.add(stormSystem)
    }
    
    // Atmospheric glow
    if (config.atmosphericGlow) {
      const glowGeometry = new THREE.SphereGeometry(1.1, 32, 32)
      const glowMaterial = this.atmosphericGlowMaterial!.clone()
      glowMaterial.uniforms.glowColor.value = new THREE.Color(0xffaa44)
      glowMaterial.uniforms.intensity.value = 0.3
      
      const atmosphericGlow = new THREE.Mesh(glowGeometry, glowMaterial)
      atmosphericGlow.position.copy(planetMesh.position)
      
      effects.push(atmosphericGlow)
      this.scene.add(atmosphericGlow)
    }
    
    this.effectObjects.set('jupiter', effects)
  }
  
  /**
   * Create Mars-specific effects
   */
  public createMarsEffects(
    planetMesh: THREE.Mesh, 
    config: MarsEffectConfig
  ): void {
    const effects: THREE.Object3D[] = []
    
    // Polar ice caps
    if (config.polarIceCapSize > 0) {
      // North pole ice cap
      const northCapGeometry = new THREE.SphereGeometry(
        1.002, 16, 16, 0, Math.PI * 2, 0, Math.PI * config.polarIceCapSize
      )
      const iceCapMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0.8
      })
      
      const northIceCap = new THREE.Mesh(northCapGeometry, iceCapMaterial)
      northIceCap.position.copy(planetMesh.position)
      
      // South pole ice cap
      const southIceCap = northIceCap.clone()
      southIceCap.rotation.x = Math.PI
      
      effects.push(northIceCap, southIceCap)
      this.scene.add(northIceCap, southIceCap)
    }
    
    // Global dust storms
    if (config.dustStormIntensity > 0) {
      const dustParticleCount = 5000
      const dustGeometry = new THREE.BufferGeometry()
      const dustPositions = new Float32Array(dustParticleCount * 3)
      const dustColors = new Float32Array(dustParticleCount * 3)
      
      const dustColor = new THREE.Color(0xd2691e)
      
      for (let i = 0; i < dustParticleCount; i++) {
        // Distribute particles around Mars
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        const radius = 1.01 + Math.random() * 0.05
        
        dustPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
        dustPositions[i * 3 + 1] = radius * Math.cos(phi)
        dustPositions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
        
        // Vary dust color
        const colorVariation = 0.8 + Math.random() * 0.4
        dustColors[i * 3] = dustColor.r * colorVariation
        dustColors[i * 3 + 1] = dustColor.g * colorVariation
        dustColors[i * 3 + 2] = dustColor.b * colorVariation
      }
      
      dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
      dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3))
      
      const dustMaterial = new THREE.PointsMaterial({
        size: 0.005,
        vertexColors: true,
        transparent: true,
        opacity: config.dustStormIntensity,
        blending: THREE.AdditiveBlending
      })
      
      const dustStorm = new THREE.Points(dustGeometry, dustMaterial)
      dustStorm.position.copy(planetMesh.position)
      
      effects.push(dustStorm)
      this.scene.add(dustStorm)
      
      // Animate dust storm
      this.animatedUniforms.set(`mars_dust_animation`, {
        object: dustStorm,
        rotationSpeed: 0.002
      })
    }
    
    // Thin atmosphere effect
    if (config.atmosphericThinness > 0) {
      const thinAtmosphereGeometry = new THREE.SphereGeometry(1.02, 32, 32)
      const thinAtmosphereMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffaa88),
        transparent: true,
        opacity: 0.1 * config.atmosphericThinness,
        side: THREE.BackSide
      })
      
      const thinAtmosphere = new THREE.Mesh(thinAtmosphereGeometry, thinAtmosphereMaterial)
      thinAtmosphere.position.copy(planetMesh.position)
      
      effects.push(thinAtmosphere)
      this.scene.add(thinAtmosphere)
    }
    
    this.effectObjects.set('mars', effects)
  }
  
  /**
   * Create Venus-specific effects
   */
  public createVenusEffects(
    planetMesh: THREE.Mesh, 
    config: VenusEffectConfig
  ): void {
    const effects: THREE.Object3D[] = []
    
    // Dense atmosphere with sulfuric acid clouds
    if (config.sulfuricAcidClouds) {
      const cloudLayers = 3
      
      for (let layer = 0; layer < cloudLayers; layer++) {
        const cloudRadius = 1.03 + (layer * 0.01)
        const cloudGeometry = new THREE.SphereGeometry(cloudRadius, 32, 32)
        
        const cloudMaterial = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            cloudSpeed: { value: 0.1 + layer * 0.05 },
            density: { value: config.atmosphericDensity },
            acidColor: { value: new THREE.Color(0xffff99) }
          },
          vertexShader: `
            uniform float time;
            uniform float cloudSpeed;
            varying vec2 vUv;
            
            void main() {
              vUv = uv;
              vUv.x += time * cloudSpeed;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float density;
            uniform vec3 acidColor;
            varying vec2 vUv;
            
            void main() {
              // Create swirling cloud pattern
              float pattern = sin(vUv.x * 20.0) * sin(vUv.y * 15.0);
              pattern += sin(vUv.x * 35.0 + vUv.y * 25.0) * 0.5;
              
              float alpha = (pattern * 0.5 + 0.5) * density * 0.4;
              gl_FragColor = vec4(acidColor, alpha);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending
        })
        
        const cloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial)
        cloudLayer.position.copy(planetMesh.position)
        
        effects.push(cloudLayer)
        this.scene.add(cloudLayer)
      }
    }
    
    // Atmospheric lightning
    if (config.lightningFrequency > 0) {
      this.createVenusLightning(planetMesh, config.lightningFrequency, effects)
    }
    
    // Intense greenhouse effect glow
    if (config.greenhouseIntensity > 0) {
      const greenhouseGlowGeometry = new THREE.SphereGeometry(1.08, 32, 32)
      const greenhouseGlowMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xff6600),
        transparent: true,
        opacity: config.greenhouseIntensity * 0.2,
        side: THREE.BackSide
      })
      
      const greenhouseGlow = new THREE.Mesh(greenhouseGlowGeometry, greenhouseGlowMaterial)
      greenhouseGlow.position.copy(planetMesh.position)
      
      effects.push(greenhouseGlow)
      this.scene.add(greenhouseGlow)
    }
    
    this.effectObjects.set('venus', effects)
  }
  
  /**
   * Create lightning effects for Venus
   */
  private createVenusLightning(
    planetMesh: THREE.Mesh, 
    frequency: number, 
    effects: THREE.Object3D[]
  ): void {
    const lightningCount = Math.floor(frequency * 5)
    
    for (let i = 0; i < lightningCount; i++) {
      // Create lightning bolt geometry
      const lightningPoints: THREE.Vector3[] = []
      const startPoint = new THREE.Vector3().randomDirection().multiplyScalar(1.05)
      const endPoint = new THREE.Vector3().randomDirection().multiplyScalar(1.03)
      
      // Create jagged lightning path
      const segments = 8
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const point = startPoint.clone().lerp(endPoint, t)
        
        // Add random jitter
        if (j > 0 && j < segments) {
          point.add(new THREE.Vector3().randomDirection().multiplyScalar(0.02))
        }
        
        lightningPoints.push(point)
      }
      
      const lightningGeometry = new THREE.BufferGeometry().setFromPoints(lightningPoints)
      const lightningMaterial = new THREE.LineBasicMaterial({
        color: new THREE.Color(0xffffff),
        transparent: true,
        opacity: 0,
        linewidth: 3
      })
      
      const lightningBolt = new THREE.Line(lightningGeometry, lightningMaterial)
      lightningBolt.position.copy(planetMesh.position)
      
      effects.push(lightningBolt)
      this.scene.add(lightningBolt)
      
      // Animate lightning flashes
      this.animatedUniforms.set(`venus_lightning_${i}`, {
        material: lightningMaterial,
        flashFrequency: frequency,
        lastFlash: 0
      })
    }
  }
  
  /**
   * Update all animated effects
   */
  public update(deltaTime: number, currentTime: number): void {
    // Update material time uniforms
    this.materialManager.updateAnimatedMaterials(deltaTime)
    
    // Update custom animations
    this.animatedUniforms.forEach((animData, key) => {
      if (animData.object && animData.rotationSpeed) {
        animData.object.rotation.y += animData.rotationSpeed * deltaTime
      }
      
      if (animData.material && animData.flashFrequency) {
        // Lightning flash animation
        if (currentTime - animData.lastFlash > (1000 / animData.flashFrequency)) {
          animData.material.opacity = 1.0
          animData.lastFlash = currentTime
          
          // Fade out quickly
          setTimeout(() => {
            if (animData.material) {
              animData.material.opacity = 0
            }
          }, 100)
        }
      }
    })
    
    // Update atmospheric glow
    if (this.atmosphericGlowMaterial) {
      this.atmosphericGlowMaterial.uniforms.time.value = currentTime * 0.001
    }
  }
  
  /**
   * Remove effects for a planet
   */
  public removeEffects(planetId: string): void {
    const effects = this.effectObjects.get(planetId)
    if (effects) {
      effects.forEach(effect => {
        this.scene.remove(effect)
        if (effect instanceof THREE.Mesh) {
          effect.geometry.dispose()
          if (Array.isArray(effect.material)) {
            effect.material.forEach(mat => mat.dispose())
          } else {
            effect.material.dispose()
          }
        }
      })
      this.effectObjects.delete(planetId)
    }
    
    // Remove related animated uniforms
    const keysToRemove: string[] = []
    this.animatedUniforms.forEach((_, key) => {
      if (key.includes(planetId)) {
        keysToRemove.push(key)
      }
    })
    keysToRemove.forEach(key => this.animatedUniforms.delete(key))
  }
  
  /**
   * Dispose all resources
   */
  public dispose(): void {
    // Remove all effects
    this.effectObjects.forEach((effects, planetId) => {
      this.removeEffects(planetId)
    })
    
    // Dispose shared geometries and materials
    if (this.lightningGeometry) this.lightningGeometry.dispose()
    if (this.auroraGeometry) this.auroraGeometry.dispose()
    if (this.dustStormGeometry) this.dustStormGeometry.dispose()
    if (this.atmosphericGlowMaterial) this.atmosphericGlowMaterial.dispose()
    
    this.effectObjects.clear()
    this.animatedUniforms.clear()
    
    console.log('🗑️ PlanetaryEffectsManager disposed')
  }
}

export default PlanetaryEffectsManager
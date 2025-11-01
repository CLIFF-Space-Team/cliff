/**
 * Real Asteroid Texture Generation System
 * Based on NASA OSIRIS-REx (Bennu) and Hayabusa2 (Ryugu) mission data
 * Generates photorealistic procedural textures for different asteroid types
 */

import * as THREE from 'three'

export type AsteroidType = 'C-type' | 'S-type' | 'M-type' | 'mixed'

interface AsteroidTextureSet {
  diffuse: THREE.Texture
  normal: THREE.Texture
  roughness: THREE.Texture
  displacement: THREE.Texture
  ao: THREE.Texture
}

export class RealAsteroidTextures {
  private static instance: RealAsteroidTextures
  private textureCache: Map<string, AsteroidTextureSet> = new Map()
  
  static getInstance(): RealAsteroidTextures {
    if (!RealAsteroidTextures.instance) {
      RealAsteroidTextures.instance = new RealAsteroidTextures()
    }
    return RealAsteroidTextures.instance
  }
  
  /**
   * Generate complete texture set for asteroid
   */
  generateAsteroidTextures(
    type: AsteroidType,
    resolution: number = 2048,
    seed: number = Math.random()
  ): AsteroidTextureSet {
    const cacheKey = `${type}_${resolution}_${seed}`
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!
    }
    
    const textureSet = {
      diffuse: this.generateDiffuseMap(type, resolution, seed),
      normal: this.generateNormalMap(type, resolution, seed),
      roughness: this.generateRoughnessMap(type, resolution, seed),
      displacement: this.generateDisplacementMap(type, resolution, seed),
      ao: this.generateAOMap(type, resolution, seed)
    }
    
    this.textureCache.set(cacheKey, textureSet)
    return textureSet
  }
  
  /**
   * Generate photorealistic diffuse map
   * Based on real asteroid color data from spectroscopy
   */
  private generateDiffuseMap(type: AsteroidType, resolution: number, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(resolution, resolution)
    const data = imageData.data
    
    // Base colors from real asteroid spectroscopy
    const baseColors = this.getAsteroidBaseColors(type)
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4
        
        // Multi-octave Perlin-like noise
        const noise1 = this.noise2D(x * 0.01 + seed, y * 0.01, 4)
        const noise2 = this.noise2D(x * 0.05 + seed, y * 0.05, 8)
        const noise3 = this.noise2D(x * 0.1 + seed, y * 0.1, 16)
        
        // Boulder patterns (large rocks on surface)
        const boulderNoise = this.worleyNoise(x * 0.02, y * 0.02, seed)
        const boulderMask = boulderNoise > 0.7 ? 1 : 0
        
        // Crater patterns
        const craterNoise = this.worleyNoise(x * 0.03, y * 0.03, seed + 100)
        const craterDepth = Math.pow(Math.max(0, 1 - craterNoise), 3)
        
        // Regolith (fine dust) texture
        const regolithNoise = this.noise2D(x * 0.5 + seed, y * 0.5, 32)
        
        // Combine all noise layers
        const combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2
        
        // Color variation based on asteroid type
        let r = baseColors.base.r
        let g = baseColors.base.g
        let b = baseColors.base.b
        
        // Boulder color (slightly lighter/different composition)
        if (boulderMask > 0) {
          r = baseColors.boulder.r
          g = baseColors.boulder.g
          b = baseColors.boulder.b
        }
        
        // Crater darkening (shadow and exposed material)
        r *= (1 - craterDepth * 0.4)
        g *= (1 - craterDepth * 0.4)
        b *= (1 - craterDepth * 0.4)
        
        // Add regolith fine detail
        r += regolithNoise * 0.05
        g += regolithNoise * 0.05
        b += regolithNoise * 0.05
        
        // Add overall color variation
        r += combinedNoise * 0.15
        g += combinedNoise * 0.15
        b += combinedNoise * 0.15
        
        // Clamp values
        data[i] = Math.min(255, Math.max(0, r * 255))
        data[i + 1] = Math.min(255, Math.max(0, g * 255))
        data[i + 2] = Math.min(255, Math.max(0, b * 255))
        data[i + 3] = 255
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 16
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    
    return texture
  }
  
  /**
   * Generate high-quality normal map
   * Creates depth illusion from surface features
   */
  private generateNormalMap(type: AsteroidType, resolution: number, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(resolution, resolution)
    const data = imageData.data
    
    // Height map for normal calculation
    const heightMap = new Float32Array(resolution * resolution)
    
    // Generate height map
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = y * resolution + x
        
        // Multi-scale height features
        const largeCraters = this.worleyNoise(x * 0.01, y * 0.01, seed) * 0.5
        const smallCraters = this.worleyNoise(x * 0.05, y * 0.05, seed + 50) * 0.3
        const boulders = this.worleyNoise(x * 0.03, y * 0.03, seed + 100)
        const boulderHeight = boulders > 0.7 ? (boulders - 0.7) * 2 : 0
        
        const microDetail = this.noise2D(x * 0.2 + seed, y * 0.2, 32) * 0.1
        
        heightMap[i] = largeCraters + smallCraters + boulderHeight + microDetail
      }
    }
    
    // Calculate normals from height map
    const strength = 3.5
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4
        
        // Sample neighboring heights
        const xm1 = Math.max(0, x - 1)
        const xp1 = Math.min(resolution - 1, x + 1)
        const ym1 = Math.max(0, y - 1)
        const yp1 = Math.min(resolution - 1, y + 1)
        
        const hL = heightMap[y * resolution + xm1]
        const hR = heightMap[y * resolution + xp1]
        const hD = heightMap[ym1 * resolution + x]
        const hU = heightMap[yp1 * resolution + x]
        
        // Calculate gradient
        const dx = (hR - hL) * strength
        const dy = (hU - hD) * strength
        
        // Normal vector
        const nx = -dx
        const ny = -dy
        const nz = 1.0
        
        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        
        // Convert to RGB (0-255 range, with 128 as neutral)
        data[i] = ((nx / len) * 0.5 + 0.5) * 255
        data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
        data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
        data[i + 3] = 255
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 16
    texture.generateMipmaps = true
    
    return texture
  }
  
  /**
   * Generate roughness map
   * Varies surface roughness based on material composition
   */
  private generateRoughnessMap(type: AsteroidType, resolution: number, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(resolution, resolution)
    const data = imageData.data
    
    const baseRoughness = this.getAsteroidRoughness(type)
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4
        
        // Smooth vs rough patches
        const smoothPatches = this.worleyNoise(x * 0.04, y * 0.04, seed + 200)
        const smoothFactor = smoothPatches > 0.6 ? 0.7 : 1.0
        
        // Fine grain variation
        const grain = this.noise2D(x * 0.3 + seed, y * 0.3, 64) * 0.1
        
        const roughness = baseRoughness * smoothFactor + grain
        const roughnessValue = Math.min(255, Math.max(0, roughness * 255))
        
        data[i] = roughnessValue
        data[i + 1] = roughnessValue
        data[i + 2] = roughnessValue
        data[i + 3] = 255
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    texture.generateMipmaps = true
    
    return texture
  }
  
  /**
   * Generate displacement map
   * Creates actual 3D geometry displacement
   */
  private generateDisplacementMap(type: AsteroidType, resolution: number, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(resolution, resolution)
    const data = imageData.data
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4
        
        // Large features (craters and boulders)
        const largeCraters = this.worleyNoise(x * 0.008, y * 0.008, seed)
        const craterDepth = Math.pow(Math.max(0, 1 - largeCraters), 4) * -0.8
        
        const boulders = this.worleyNoise(x * 0.02, y * 0.02, seed + 150)
        const boulderHeight = boulders > 0.65 ? Math.pow(boulders - 0.65, 2) * 3 : 0
        
        // Medium features
        const mediumNoise = this.noise2D(x * 0.05 + seed, y * 0.05, 8) * 0.3
        
        // Fine detail
        const fineNoise = this.noise2D(x * 0.2 + seed, y * 0.2, 32) * 0.1
        
        // Combine all displacement layers
        const displacement = 0.5 + craterDepth + boulderHeight + mediumNoise + fineNoise
        const displacementValue = Math.min(255, Math.max(0, displacement * 255))
        
        data[i] = displacementValue
        data[i + 1] = displacementValue
        data[i + 2] = displacementValue
        data[i + 3] = 255
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 16
    texture.generateMipmaps = true
    
    return texture
  }
  
  /**
   * Generate ambient occlusion map
   * Enhances depth perception
   */
  private generateAOMap(type: AsteroidType, resolution: number, seed: number): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = resolution
    canvas.height = resolution
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(resolution, resolution)
    const data = imageData.data
    
    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const i = (y * resolution + x) * 4
        
        // Crater occlusion
        const craters = this.worleyNoise(x * 0.02, y * 0.02, seed)
        const craterAO = Math.pow(Math.max(0, 1 - craters), 2)
        
        // Crevice occlusion
        const crevices = this.noise2D(x * 0.1 + seed, y * 0.1, 16)
        const creviceAO = crevices < 0.3 ? crevices : 1
        
        // Combine AO
        const ao = 0.3 + craterAO * 0.5 + creviceAO * 0.2
        const aoValue = Math.min(255, Math.max(0, ao * 255))
        
        data[i] = aoValue
        data[i + 1] = aoValue
        data[i + 2] = aoValue
        data[i + 3] = 255
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    texture.generateMipmaps = true
    
    return texture
  }
  
  /**
   * Get base colors for asteroid types from real spectroscopy data
   */
  private getAsteroidBaseColors(type: AsteroidType): {
    base: { r: number, g: number, b: number },
    boulder: { r: number, g: number, b: number }
  } {
    switch (type) {
      case 'C-type': // Carbonaceous (like Bennu) - dark, carbon-rich
        return {
          base: { r: 0.18, g: 0.16, b: 0.14 },
          boulder: { r: 0.22, g: 0.20, b: 0.18 }
        }
      
      case 'S-type': // Silicaceous (like Itokawa) - rocky, silicate
        return {
          base: { r: 0.45, g: 0.38, b: 0.28 },
          boulder: { r: 0.52, g: 0.44, b: 0.32 }
        }
      
      case 'M-type': // Metallic - iron-nickel
        return {
          base: { r: 0.55, g: 0.52, b: 0.48 },
          boulder: { r: 0.62, g: 0.58, b: 0.54 }
        }
      
      case 'mixed': // Mixed composition
        return {
          base: { r: 0.35, g: 0.30, b: 0.25 },
          boulder: { r: 0.42, g: 0.36, b: 0.30 }
        }
    }
  }
  
  /**
   * Get roughness value for asteroid type
   */
  private getAsteroidRoughness(type: AsteroidType): number {
    switch (type) {
      case 'C-type': return 0.95 // Very rough, porous
      case 'S-type': return 0.88 // Rocky, moderately rough
      case 'M-type': return 0.65 // Metallic, smoother
      case 'mixed': return 0.90
    }
  }
  
  /**
   * Multi-octave Perlin-style noise
   */
  private noise2D(x: number, y: number, octaves: number): number {
    let value = 0
    let amplitude = 1
    let frequency = 1
    let maxValue = 0
    
    for (let i = 0; i < octaves; i++) {
      value += this.simpleNoise(x * frequency, y * frequency) * amplitude
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }
    
    return value / maxValue
  }
  
  /**
   * Simple hash-based noise
   */
  private simpleNoise(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }
  
  /**
   * Worley/Voronoi noise for cellular patterns (craters, boulders)
   */
  private worleyNoise(x: number, y: number, seed: number): number {
    const cellSize = 1.0
    const cellX = Math.floor(x / cellSize)
    const cellY = Math.floor(y / cellSize)
    
    let minDist = Infinity
    
    // Check 3x3 neighboring cells
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const neighborX = cellX + dx
        const neighborY = cellY + dy
        
        // Feature point in this cell (deterministic based on cell position)
        const hash = this.hash2D(neighborX, neighborY, seed)
        const featureX = (neighborX + hash) * cellSize
        const featureY = (neighborY + this.hash2D(neighborY, neighborX, seed)) * cellSize
        
        const dist = Math.sqrt(
          Math.pow(x - featureX, 2) + Math.pow(y - featureY, 2)
        )
        
        minDist = Math.min(minDist, dist)
      }
    }
    
    return Math.min(1, minDist / cellSize)
  }
  
  /**
   * Hash function for deterministic randomness
   */
  private hash2D(x: number, y: number, seed: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.3) * 43758.5453
    return n - Math.floor(n)
  }
}

export const realAsteroidTextures = RealAsteroidTextures.getInstance()


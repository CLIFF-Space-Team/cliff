import * as THREE from 'three'
import { TextureManager } from './TextureManager'
import { CelestialBody } from '../../../types/astronomical-data'
export interface PBRMaterialConfig {
  albedo: THREE.Color
  metallic: number
  roughness: number
  normalScale: number
  emissiveIntensity: number
  transmission?: number
  thickness?: number
  ior?: number
  clearcoat?: number
  clearcoatRoughness?: number
  sheen?: THREE.Color
  sheenRoughness?: number
  specularIntensity?: number
  specularColor?: THREE.Color
}
export interface AtmosphericConfig {
  scatteringStrength: number
  scatteringColor: THREE.Color
  absorptionColor: THREE.Color
  density: number
  falloff: number
  enableRayleighScattering: boolean
  enableMieScattering: boolean
}
export interface GasGiantConfig {
  bandCount: number
  bandColors: THREE.Color[]
  stormIntensity: number
  windSpeed: number
  turbulence: number
  animationSpeed: number
}
export class MaterialManager {
  private static instance: MaterialManager
  private textureManager: TextureManager
  private materialCache: Map<string, THREE.Material>
  private uniformBuffers: Map<string, any>
  private atmosphereVertexShader: string = ''
  private atmosphereFragmentShader: string = ''
  private gasGiantVertexShader: string = ''
  private gasGiantFragmentShader: string = ''
  private ringParticleVertexShader: string = ''
  private ringParticleFragmentShader: string = ''
  private cityLightsVertexShader: string = ''
  private cityLightsFragmentShader: string = ''
  private constructor() {
    this.textureManager = TextureManager.getInstance()
    this.materialCache = new Map()
    this.uniformBuffers = new Map()
    this.initializeShaders()
  }
  public static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager()
    }
    return MaterialManager.instance
  }
  private initializeShaders(): void {
    this.atmosphereVertexShader = `
      uniform float time;
      uniform vec3 lightPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      varying vec3 vLightDirection;
      varying float vAtmosphereIntensity;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * worldPosition;
        vWorldPosition = worldPosition.xyz;
        vViewPosition = viewPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        vLightDirection = normalize(lightPosition - worldPosition.xyz);
        vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
        float fresnel = 1.0 - abs(dot(vNormal, viewDirection));
        vAtmosphereIntensity = pow(fresnel, 2.0);
        gl_Position = projectionMatrix * viewPosition;
      }
    `
    this.atmosphereFragmentShader = `
      uniform float time;
      uniform vec3 scatteringColor;
      uniform vec3 absorptionColor;
      uniform float scatteringStrength;
      uniform float density;
      uniform float falloff;
      uniform bool enableRayleighScattering;
      uniform bool enableMieScattering;
      varying vec3 vWorldPosition;
      varying vec3 vViewPosition;
      varying vec3 vNormal;
      varying vec3 vLightDirection;
      varying float vAtmosphereIntensity;
      vec3 rayleighScattering(float cosTheta, vec3 color) {
        float phase = 3.0 / (16.0 * 3.14159) * (1.0 + cosTheta * cosTheta);
        return color * phase;
      }
      vec3 mieScattering(float cosTheta, vec3 color, float g) {
        float g2 = g * g;
        float phase = (3.0 * (1.0 - g2)) / (2.0 * (2.0 + g2)) * 
                      (1.0 + cosTheta * cosTheta) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5);
        return color * phase;
      }
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float cosTheta = dot(viewDirection, vLightDirection);
        vec3 scattering = vec3(0.0);
        if (enableRayleighScattering) {
          scattering += rayleighScattering(cosTheta, scatteringColor) * scatteringStrength;
        }
        if (enableMieScattering) {
          scattering += mieScattering(cosTheta, vec3(0.8, 0.8, 1.0), 0.76) * scatteringStrength * 0.1;
        }
        float heightFalloff = exp(-distance(vWorldPosition, vec3(0.0)) * falloff);
        scattering *= heightFalloff * density;
        float alpha = vAtmosphereIntensity * scatteringStrength * 0.8;
        float pulse = sin(time * 0.5) * 0.1 + 0.9;
        scattering *= pulse;
        gl_FragColor = vec4(scattering, alpha);
      }
    `
    this.gasGiantVertexShader = `
      uniform float time;
      uniform float windSpeed;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vLatitude;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        vec3 normalizedPos = normalize(position);
        vLatitude = normalizedPos.y;
        vUv.x += sin(vLatitude * 10.0 + time * windSpeed) * 0.1;
        vUv.x += time * windSpeed * 0.05;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `
    this.gasGiantFragmentShader = `
      uniform float time;
      uniform int bandCount;
      uniform vec3 bandColors[8];
      uniform float stormIntensity;
      uniform float turbulence;
      uniform float animationSpeed;
      uniform sampler2D noiseTexture;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vLatitude;
      float noise(vec2 p) {
        return texture2D(noiseTexture, p).r;
      }
      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for(int i = 0; i < 4; i++) {
          value += amplitude * noise(p * frequency);
          amplitude *= 0.5;
          frequency *= 2.0;
        }
        return value;
      }
      vec3 getGasGiantColor(float latitude, vec2 uv) {
        float bandPosition = (latitude + 1.0) * 0.5 * float(bandCount);
        int lowerBand = int(floor(bandPosition));
        int upperBand = int(ceil(bandPosition));
        float bandMix = fract(bandPosition);
        lowerBand = clamp(lowerBand, 0, bandCount - 1);
        upperBand = clamp(upperBand, 0, bandCount - 1);
        vec3 color1 = bandColors[lowerBand];
        vec3 color2 = bandColors[upperBand];
        vec3 baseColor = mix(color1, color2, bandMix);
        vec2 turbulentUv = uv + vec2(
          fbm(uv * 3.0 + time * animationSpeed) * turbulence,
          fbm(uv * 2.0 - time * animationSpeed * 0.7) * turbulence * 0.5
        );
        float stormPattern = fbm(turbulentUv * 5.0 + time * animationSpeed * 2.0);
        vec3 stormColor = vec3(1.2, 0.8, 0.6); // Storm color (orangish)
        float stormMask = smoothstep(0.6, 0.8, stormPattern) * stormIntensity;
        baseColor = mix(baseColor, stormColor, stormMask);
        float bandEdge = abs(sin(bandPosition * 3.14159)) * 0.3;
        baseColor *= (1.0 - bandEdge);
        return baseColor;
      }
      void main() {
        vec3 color = getGasGiantColor(vLatitude, vUv);
        vec3 lightDirection = normalize(vec3(1.0, 0.5, 0.5));
        float ndotl = max(0.0, dot(vNormal, lightDirection));
        color *= (0.3 + 0.7 * ndotl);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = 1.0 - abs(dot(vNormal, viewDirection));
        vec3 atmosphereGlow = color * fresnel * 0.2;
        gl_FragColor = vec4(color + atmosphereGlow, 1.0);
      }
    `
    this.ringParticleVertexShader = `
      uniform float time;
      uniform float rotationSpeed;
      attribute float size;
      attribute float phase;
      attribute float distance;
      varying float vOpacity;
      varying vec3 vColor;
      void main() {
        vec3 pos = position;
        float angle = phase + time * rotationSpeed / distance;
        pos.x = cos(angle) * distance;
        pos.z = sin(angle) * distance;
        pos.y += sin(angle * 3.0 + time) * 0.001;
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = size * (1000.0 / -mvPosition.z);
        vOpacity = 1.0 / (1.0 + distance * 0.1);
        vColor = mix(vec3(0.8, 0.6, 0.4), vec3(0.9, 0.8, 0.7), distance / 10.0);
      }
    `
    this.ringParticleFragmentShader = `
      varying float vOpacity;
      varying vec3 vColor;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vOpacity;
        gl_FragColor = vec4(vColor, alpha);
      }
    `
    this.cityLightsVertexShader = `
      uniform vec3 lightPosition;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying float vLightIntensity;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        vec3 lightDirection = normalize(lightPosition - worldPosition.xyz);
        float ndotl = dot(vNormal, lightDirection);
        vLightIntensity = smoothstep(-0.2, 0.2, -ndotl); // Inverted for night side
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `
    this.cityLightsFragmentShader = `
      uniform sampler2D cityLightsTexture;
      uniform float intensity;
      varying vec2 vUv;
      varying float vLightIntensity;
      void main() {
        vec3 cityLights = texture2D(cityLightsTexture, vUv).rgb;
        cityLights *= vLightIntensity * intensity;
        gl_FragColor = vec4(cityLights, 1.0);
      }
    `
  }
  public async createPBRMaterial(
    id: string,
    body: CelestialBody,
    config: Partial<PBRMaterialConfig> = {}
  ): Promise<THREE.MeshStandardMaterial> {
    const cacheKey = `pbr_${id}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshStandardMaterial
    }
    const materialConfig: PBRMaterialConfig = {
      albedo: new THREE.Color(body.color),
      metallic: 0.0,
      roughness: 0.8,
      normalScale: 1.0,
      emissiveIntensity: body.type === 'star' ? 0.8 : 0.0,
      ...config
    }
    const material = new THREE.MeshStandardMaterial({
      color: materialConfig.albedo,
      metalness: materialConfig.metallic,
      roughness: materialConfig.roughness,
      emissiveIntensity: materialConfig.emissiveIntensity
    })
    if (body.textures) {
      try {
        const textureSet = await this.textureManager.loadTextureSet(id, {
          diffuse: body.textures.diffuse,
          normal: body.textures.normal,
          specular: body.textures.specular,
          emissive: body.textures.emissive,
          displacement: body.textures.displacement,
          clouds: body.textures.clouds,
          nightLights: body.textures.nightLights,
          resolutions: {
            ultra: body.textures.diffuse || '',
            high: body.textures.diffuse || '',
            medium: body.textures.diffuse || '',
            low: body.textures.diffuse || ''
          },
          priority: 'high'
        })
        if (textureSet.diffuse) material.map = textureSet.diffuse
        if (textureSet.normal) {
          material.normalMap = textureSet.normal
          material.normalScale = new THREE.Vector2(materialConfig.normalScale, materialConfig.normalScale)
        }
        if (textureSet.specular) material.roughnessMap = textureSet.specular // Specular map as roughness
        if (textureSet.emissive && body.type === 'star') material.emissiveMap = textureSet.emissive
      } catch (error) {
        console.warn(`Failed to load textures for ${id}:`, error)
      }
    }
    this.applyBodyTypeProperties(material, body)
    this.materialCache.set(cacheKey, material)
    return material
  }
  public createAtmosphereMaterial(
    id: string,
    config: AtmosphericConfig
  ): THREE.ShaderMaterial {
    const cacheKey = `atmosphere_${id}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.ShaderMaterial
    }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        lightPosition: { value: new THREE.Vector3(0, 0, 0) },
        scatteringColor: { value: config.scatteringColor },
        absorptionColor: { value: config.absorptionColor },
        scatteringStrength: { value: config.scatteringStrength },
        density: { value: config.density },
        falloff: { value: config.falloff },
        enableRayleighScattering: { value: config.enableRayleighScattering },
        enableMieScattering: { value: config.enableMieScattering }
      },
      vertexShader: this.atmosphereVertexShader,
      fragmentShader: this.atmosphereFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    this.materialCache.set(cacheKey, material)
    return material
  }
  public async createGasGiantMaterial(
    id: string,
    config: GasGiantConfig
  ): Promise<THREE.ShaderMaterial> {
    const cacheKey = `gas_giant_${id}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.ShaderMaterial
    }
    const noiseTexture = await this.createNoiseTexture(512, 512)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        bandCount: { value: config.bandCount },
        bandColors: { value: config.bandColors.slice(0, 8) }, // Max 8 bands for uniform array
        stormIntensity: { value: config.stormIntensity },
        windSpeed: { value: config.windSpeed },
        turbulence: { value: config.turbulence },
        animationSpeed: { value: config.animationSpeed },
        noiseTexture: { value: noiseTexture }
      },
      vertexShader: this.gasGiantVertexShader,
      fragmentShader: this.gasGiantFragmentShader
    })
    this.materialCache.set(cacheKey, material)
    return material
  }
  public createRingParticleMaterial(id: string): THREE.ShaderMaterial {
    const cacheKey = `ring_particles_${id}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.ShaderMaterial
    }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        rotationSpeed: { value: 0.01 }
      },
      vertexShader: this.ringParticleVertexShader,
      fragmentShader: this.ringParticleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    this.materialCache.set(cacheKey, material)
    return material
  }
  public async createCityLightsMaterial(
    id: string,
    cityLightsTextureUrl: string
  ): Promise<THREE.ShaderMaterial> {
    const cacheKey = `city_lights_${id}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.ShaderMaterial
    }
    const cityLightsTexture = await this.textureManager.loadTexture(`${id}_city_lights`, {
      diffuse: cityLightsTextureUrl,
      resolutions: {
        ultra: cityLightsTextureUrl,
        high: cityLightsTextureUrl,
        medium: cityLightsTextureUrl,
        low: cityLightsTextureUrl
      },
      priority: 'normal'
    })
    const material = new THREE.ShaderMaterial({
      uniforms: {
        lightPosition: { value: new THREE.Vector3(0, 0, 0) },
        cityLightsTexture: { value: cityLightsTexture },
        intensity: { value: 1.0 }
      },
      vertexShader: this.cityLightsVertexShader,
      fragmentShader: this.cityLightsFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
    this.materialCache.set(cacheKey, material)
    return material
  }
  private applyBodyTypeProperties(material: THREE.MeshStandardMaterial, body: CelestialBody): void {
    switch (body.type) {
      case 'star':
        material.emissive = new THREE.Color(body.color)
        material.emissiveIntensity = 0.8
        break
      case 'planet':
        if (body.id === 'earth') {
          material.roughness = 0.6
          material.metalness = 0.1
        } else if (body.id === 'mars') {
          material.roughness = 0.9
          material.metalness = 0.05
          material.color = new THREE.Color(0xCD5C5C)
        } else if (body.id === 'venus') {
          material.roughness = 0.3
          material.metalness = 0.0
          material.color = new THREE.Color(0xFFC649)
        }
        break
      case 'moon':
        material.roughness = 0.95
        material.metalness = 0.0
        material.color = new THREE.Color(0xC0C0C0)
        break
      case 'asteroid':
        material.roughness = 1.0
        material.metalness = 0.2
        material.color = new THREE.Color(0x8C7853)
        break
    }
  }
  private async createNoiseTexture(width: number, height: number): Promise<THREE.DataTexture> {
    const size = width * height
    const data = new Uint8Array(3 * size)
    for (let i = 0; i < size; i++) {
      const x = i % width
      const y = Math.floor(i / width)
      let noise = 0
      let amplitude = 1
      let frequency = 0.01
      for (let octave = 0; octave < 4; octave++) {
        noise += amplitude * this.perlinNoise(x * frequency, y * frequency)
        amplitude *= 0.5
        frequency *= 2
      }
      const value = Math.floor((noise + 1) * 0.5 * 255)
      data[i * 3] = value     // R
      data[i * 3 + 1] = value // G
      data[i * 3 + 2] = value // B
    }
    const texture = new THREE.DataTexture(data, width, height)
    texture.needsUpdate = true
    return texture
  }
  private perlinNoise(x: number, y: number): number {
    return Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1
  }
  public updateAnimatedMaterials(deltaTime: number): void {
    this.materialCache.forEach((material) => {
      if (material instanceof THREE.ShaderMaterial && material.uniforms.time) {
        material.uniforms.time.value += deltaTime
      }
    })
  }
  public updateLighting(lightPosition: THREE.Vector3): void {
    this.materialCache.forEach((material) => {
      if (material instanceof THREE.ShaderMaterial && material.uniforms.lightPosition) {
        material.uniforms.lightPosition.value.copy(lightPosition)
      }
    })
  }
  public getMaterial(id: string): THREE.Material | undefined {
    return this.materialCache.get(id)
  }
  public disposeMaterial(id: string): void {
    const material = this.materialCache.get(id)
    if (material) {
      material.dispose()
      this.materialCache.delete(id)
    }
  }
  public dispose(): void {
    this.materialCache.forEach(material => material.dispose())
    this.materialCache.clear()
    this.uniformBuffers.clear()
    console.log('🗑️ MaterialManager disposed')
  }
}
export default MaterialManager

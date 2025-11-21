'use client'
import * as THREE from 'three'
import { useMemo, useRef, useEffect } from 'react'
export type USDZMaterialPresetType = 'earth' | 'sun' | 'asteroid' | 'metal' | 'ice' | 'rock'
export class USDZMaterialSystem {
  private static instance: USDZMaterialSystem
  private materialCache: Map<string, THREE.Material> = new Map()
  private textureLoader = new THREE.TextureLoader()
  private cubeTextureLoader = new THREE.CubeTextureLoader()
  public static readonly MATERIAL_PRESETS = {
    earth: {
      baseColor: '#4A90E2',
      metalness: 0.0,
      roughness: 0.6,
      normal: 2.0,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      clearcoat: 0.1,
      clearcoatRoughness: 0.0
    },
    sun: {
      baseColor: '#FDB813',
      metalness: 0.0,
      roughness: 0.9,
      normal: 1.0,
      emissive: '#FF6B00',
      emissiveIntensity: 2.5,
      clearcoat: 0.0,
      clearcoatRoughness: 0.0
    },
    asteroid: {
      baseColor: '#8B7355',
      metalness: 0.1,
      roughness: 0.95,
      normal: 3.0,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 0.8
    },
    metal: {
      baseColor: '#C0C0C0',
      metalness: 1.0,
      roughness: 0.15,
      normal: 1.5,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1
    },
    ice: {
      baseColor: '#E6F3FF',
      metalness: 0.0,
      roughness: 0.05,
      normal: 0.5,
      emissive: '#C8E6FF',
      emissiveIntensity: 0.1,
      clearcoat: 0.9,
      clearcoatRoughness: 0.0
    },
    rock: {
      baseColor: '#8B6F47',
      metalness: 0.0,
      roughness: 0.9,
      normal: 2.5,
      emissive: '#000000',
      emissiveIntensity: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 1.0
    }
  } as const
  static createUSDZVertexShader(): string {
    return `
      #include <common>
      #include <uv_pars_vertex>
      #include <envmap_pars_vertex>
      #include <color_pars_vertex>
      #include <fog_pars_vertex>
      #include <normal_pars_vertex>
      #include <morphtarget_pars_vertex>
      #include <skinning_pars_vertex>
      #include <logdepthbuf_pars_vertex>
      #include <clipping_planes_pars_vertex>
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      uniform float uTime;
      uniform float uAnimationSpeed;
      uniform float uDisplacementScale;
      float getDisplacement(vec3 position, float time) {
        float displacement = 0.0;
        vec3 p = position * 0.5;
        displacement += sin(p.x * 10.0 + time) * 0.1;
        displacement += sin(p.y * 15.0 + time * 0.7) * 0.05;
        displacement += sin(p.z * 8.0 + time * 1.3) * 0.08;
        displacement += sin(p.x * 50.0) * 0.02;
        displacement += sin(p.y * 35.0) * 0.015;
        return displacement * uDisplacementScale;
      }
      void main() {
        #include <uv_vertex>
        #include <color_vertex>
        #include <morphcolor_vertex>
        #include <beginnormal_vertex>
        #include <morphnormal_vertex>
        #include <skinbase_vertex>
        #include <skinnormal_vertex>
        #include <defaultnormal_vertex>
        #include <normal_vertex>
        #include <begin_vertex>
        #include <morphtarget_vertex>
        #include <skinning_vertex>
        float displacement = getDisplacement(transformed, uTime * uAnimationSpeed);
        transformed += normalize(objectNormal) * displacement;
        #include <project_vertex>
        #include <logdepthbuf_vertex>
        #include <clipping_planes_vertex>
        vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewPosition = -mvPosition.xyz;
        #include <worldpos_vertex>
        #include <envmap_vertex>
        #include <fog_vertex>
      }
    `
  }
  static createUSDZFragmentShader(): string {
    return `
      #include <common>
      #include <packing>
      #include <dithering_pars_fragment>
      #include <color_pars_fragment>
      #include <uv_pars_fragment>
      #include <map_pars_fragment>
      #include <alphamap_pars_fragment>
      #include <alphatest_pars_fragment>
      #include <normalmap_pars_fragment>
      #include <emissivemap_pars_fragment>
      #include <envmap_common_pars_fragment>
      #include <envmap_pars_fragment>
      #include <fog_pars_fragment>
      #include <bsdfs>
      #include <lights_pars_begin>
      #include <normal_pars_fragment>
      #include <lights_physical_pars_fragment>
      #include <transmission_pars_fragment>
      #include <shadowmap_pars_fragment>
      #include <bumpmap_pars_fragment>
      #include <normalmap_pars_fragment>
      #include <clearcoat_pars_fragment>
      #include <iridescence_pars_fragment>
      #include <roughnessmap_pars_fragment>
      #include <metalnessmap_pars_fragment>
      #include <logdepthbuf_pars_fragment>
      #include <clipping_planes_pars_fragment>
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      uniform float uTime;
      uniform float uMetalness;
      uniform float uRoughness;
      uniform float uClearcoat;
      uniform float uClearcoatRoughness;
      uniform float uEmissiveIntensity;
      uniform vec3 uEmissiveColor;
      uniform float uNormalScale;
      uniform float uEnvironmentIntensity;
      uniform bool uUsePBR;
      uniform bool uUseSSR;
      vec3 calculatePBRLighting(vec3 albedo, float metalness, float roughness, vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor) {
        vec3 halfwayDir = normalize(lightDir + viewDir);
        vec3 F0 = mix(vec3(0.04), albedo, metalness);
        vec3 F = F0 + (1.0 - F0) * pow(clamp(1.0 - max(dot(halfwayDir, viewDir), 0.0), 0.0, 1.0), 5.0);
        float alpha = roughness * roughness;
        float alpha2 = alpha * alpha;
        float NdotH = max(dot(normal, halfwayDir), 0.0);
        float NdotH2 = NdotH * NdotH;
        float denom = NdotH2 * (alpha2 - 1.0) + 1.0;
        float D = alpha2 / (PI * denom * denom);
        float NdotV = max(dot(normal, viewDir), 0.0);
        float NdotL = max(dot(normal, lightDir), 0.0);
        float ggx2 = GeometrySchlickGGX(NdotV, roughness);
        float ggx1 = GeometrySchlickGGX(NdotL, roughness);
        float G = ggx1 * ggx2;
        vec3 numerator = D * G * F;
        float denominator = 4.0 * NdotV * NdotL + 0.0001;
        vec3 specular = numerator / denominator;
        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
        kD *= 1.0 - metalness;
        return (kD * albedo / PI + specular) * lightColor * NdotL;
      }
      float GeometrySchlickGGX(float NdotV, float roughness) {
        float r = (roughness + 1.0);
        float k = (r * r) / 8.0;
        float nom = NdotV;
        float denom = NdotV * (1.0 - k) + k;
        return nom / denom;
      }
      vec3 calculateAtmosphericScattering(vec3 rayDir, vec3 sunDir, float height) {
        float cosTheta = dot(rayDir, sunDir);
        float rayleigh = 3.0 / (16.0 * PI) * (1.0 + cosTheta * cosTheta);
        float mie = 3.0 / (8.0 * PI) * ((1.0 - 0.9 * 0.9) * (1.0 + cosTheta * cosTheta)) / ((1.0 + 0.9 * 0.9 - 2.0 * 0.9 * cosTheta) * sqrt(1.0 + 0.9 * 0.9 - 2.0 * 0.9 * cosTheta));
        vec3 rayleighColor = vec3(0.3, 0.6, 1.0) * rayleigh;
        vec3 mieColor = vec3(1.0, 0.9, 0.8) * mie;
        float heightFactor = exp(-height * 0.1);
        return (rayleighColor + mieColor) * heightFactor;
      }
      void main() {
        #include <clipping_planes_fragment>
        vec4 diffuseColor = vec4(diffuse, opacity);
        #include <logdepthbuf_fragment>
        #include <map_fragment>
        #include <color_fragment>
        #include <alphamap_fragment>
        #include <alphatest_fragment>
        #include <roughnessmap_fragment>
        #include <metalnessmap_fragment>
        #include <normal_fragment_begin>
        #include <normal_fragment_maps>
        #include <clearcoat_normal_fragment_begin>
        #include <clearcoat_normal_fragment_maps>
        #include <emissivemap_fragment>
        float metalnessFactor = uMetalness;
        float roughnessFactor = uRoughness;
        if (uTime > 0.0) {
          float timeVariation = sin(uTime * 0.5 + vWorldPosition.x * 0.1) * 0.1;
          roughnessFactor = clamp(roughnessFactor + timeVariation, 0.0, 1.0);
        }
        if (uUsePBR) {
          vec3 normal = normalize(vWorldNormal);
          vec3 viewDir = normalize(vViewPosition);
          vec3 totalLighting = vec3(0.0);
          if (length(uEmissiveColor) > 0.1) {
            vec3 atmosphere = calculateAtmosphericScattering(viewDir, vec3(0.0, 0.0, 1.0), length(vWorldPosition) * 0.001);
            totalLighting += atmosphere * 0.3;
          }
          diffuseColor.rgb = totalLighting;
        }
        vec3 emissive = uEmissiveColor * uEmissiveIntensity;
        if (uEmissiveIntensity > 1.0) {
          float glowFactor = pow(uEmissiveIntensity / 2.0, 2.0);
          emissive *= (1.0 + glowFactor * 0.5);
        }
        #include <lights_physical_fragment>
        #include <lights_fragment_begin>
        #include <lights_fragment_maps>
        #include <lights_fragment_end>
        if (uClearcoat > 0.0) {
          vec3 clearcoatNormal = normalize(vWorldNormal);
          float clearcoatFactor = uClearcoat;
          outgoingLight = mix(outgoingLight, outgoingLight + clearcoatFactor * 0.1, clearcoatFactor);
        }
        #include <aomap_fragment>
        vec3 totalEmissiveRadiance = emissive;
        #include <envmap_fragment>
        #include <opaque_fragment>
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        #include <premultiplied_alpha_fragment>
        #include <dithering_fragment>
        gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 1.2, 0.1); 
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(0.95)); 
      }
    `
  }
  static getInstance(): USDZMaterialSystem {
    if (!USDZMaterialSystem.instance) {
      USDZMaterialSystem.instance = new USDZMaterialSystem()
    }
    return USDZMaterialSystem.instance
  }
  createUSDZMaterial(
    type: USDZMaterialPresetType,
    options: {
      quality?: 'low' | 'medium' | 'high' | 'ultra'
      textureUrls?: {
        diffuse?: string
        normal?: string
        roughness?: string
        metalness?: string
        emissive?: string
        ao?: string
      }
      animated?: boolean
      environmentMap?: THREE.CubeTexture
    } = {}
  ): THREE.MeshPhysicalMaterial {
    const cacheKey = `${type}_${options.quality || 'high'}_${JSON.stringify(options.textureUrls || {})}`
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey) as THREE.MeshPhysicalMaterial
    }
    const preset = USDZMaterialSystem.MATERIAL_PRESETS[type]
    const quality = options.quality || 'high'
    const qualitySettings = {
      low: { resolution: 512, anisotropy: 1 },
      medium: { resolution: 1024, anisotropy: 4 },
      high: { resolution: 2048, anisotropy: 8 },
      ultra: { resolution: 4096, anisotropy: 16 }
    }
    const settings = qualitySettings[quality]
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(preset.baseColor),
      metalness: preset.metalness,
      roughness: preset.roughness,
      emissive: new THREE.Color(preset.emissive),
      emissiveIntensity: preset.emissiveIntensity,
      clearcoat: preset.clearcoat,
      clearcoatRoughness: preset.clearcoatRoughness,
      transparent: false,
      side: THREE.FrontSide,
      shadowSide: THREE.DoubleSide
    })
    if (options.textureUrls) {
      const { diffuse, normal, roughness, metalness, emissive, ao } = options.textureUrls
      if (diffuse) {
        const diffuseTexture = this.textureLoader.load(diffuse)
        this.configureTexture(diffuseTexture, settings)
        material.map = diffuseTexture
      }
      if (normal) {
        const normalTexture = this.textureLoader.load(normal)
        this.configureTexture(normalTexture, settings)
        material.normalMap = normalTexture
        material.normalScale.set(preset.normal, preset.normal)
      }
      if (roughness) {
        const roughnessTexture = this.textureLoader.load(roughness)
        this.configureTexture(roughnessTexture, settings, false)
        material.roughnessMap = roughnessTexture
      }
      if (metalness) {
        const metalnessTexture = this.textureLoader.load(metalness)
        this.configureTexture(metalnessTexture, settings, false)
        material.metalnessMap = metalnessTexture
      }
      if (emissive) {
        const emissiveTexture = this.textureLoader.load(emissive)
        this.configureTexture(emissiveTexture, settings)
        material.emissiveMap = emissiveTexture
      }
      if (ao) {
        const aoTexture = this.textureLoader.load(ao)
        this.configureTexture(aoTexture, settings, false)
        material.aoMap = aoTexture
        material.aoMapIntensity = 1.0
      }
    }
    if (options.environmentMap) {
      material.envMap = options.environmentMap
      material.envMapIntensity = 1.0
    }
    if (options.animated) {
      material.userData.animated = true
      material.userData.animationSpeed = 1.0
    }
    if (quality === 'ultra') {
      material.clearcoat = Math.max(material.clearcoat, 0.1)
      material.reflectivity = 0.9
      material.ior = 1.5 
    }
    this.materialCache.set(cacheKey, material)
    return material
  }
  private configureTexture(
    texture: THREE.Texture, 
    settings: { resolution: number; anisotropy: number },
    sRGB: boolean = true
  ): void {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = settings.anisotropy
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    if (sRGB) {
      texture.colorSpace = THREE.SRGBColorSpace
    }
    texture.flipY = false 
  }
  createEnvironmentMap(quality: 'low' | 'medium' | 'high' | 'ultra' = 'high'): Promise<THREE.CubeTexture> {
    const urls = [
      '/textures/environment/space_px.jpg', 
      '/textures/environment/space_nx.jpg', 
      '/textures/environment/space_py.jpg', 
      '/textures/environment/space_ny.jpg', 
      '/textures/environment/space_pz.jpg', 
      '/textures/environment/space_nz.jpg', 
    ]
    return new Promise((resolve, reject) => {
      const envMap = this.cubeTextureLoader.load(urls, 
        (texture) => {
          const qualitySettings = {
            low: 256,
            medium: 512, 
            high: 1024,
            ultra: 2048
          }
          texture.generateMipmaps = quality !== 'low'
          texture.minFilter = quality === 'low' ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter
          texture.magFilter = THREE.LinearFilter
          resolve(texture)
        },
        undefined,
        reject
      )
    })
  }
  getPresetInfo(type: USDZMaterialPresetType) {
    return USDZMaterialSystem.MATERIAL_PRESETS[type]
  }
  clearCache(): void {
    this.materialCache.forEach(material => {
      material.dispose()
    })
    this.materialCache.clear()
  }
  updateAnimatedMaterials(deltaTime: number): void {
    this.materialCache.forEach(material => {
      if (material.userData.animated && material.userData.animationSpeed) {
        if (material instanceof THREE.ShaderMaterial && material.uniforms.uTime) {
          material.uniforms.uTime.value += deltaTime * material.userData.animationSpeed
        }
      }
    })
  }
}
export function useUSDZMaterialSystem() {
  const materialSystemRef = useRef<USDZMaterialSystem>()
  if (!materialSystemRef.current) {
    materialSystemRef.current = USDZMaterialSystem.getInstance()
  }
  const createMaterial = useMemo(() => {
    return materialSystemRef.current!.createUSDZMaterial.bind(materialSystemRef.current!)
  }, [])
  const createEnvironmentMap = useMemo(() => {
    return materialSystemRef.current!.createEnvironmentMap.bind(materialSystemRef.current!)
  }, [])
  useEffect(() => {
    const interval = setInterval(() => {
      materialSystemRef.current?.updateAnimatedMaterials(0.016) 
    }, 16)
    return () => {
      clearInterval(interval)
      materialSystemRef.current?.clearCache()
    }
  }, [])
  return {
    createMaterial,
    createEnvironmentMap,
    getPresetInfo: (type: USDZMaterialPresetType) => 
      materialSystemRef.current!.getPresetInfo(type),
    clearCache: () => materialSystemRef.current!.clearCache()
  }
}
export default USDZMaterialSystem

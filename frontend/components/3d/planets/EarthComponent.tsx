'use client'
import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { 
  BasePlanetComponent, 
  PlanetComponentProps 
} from './BasePlanetComponent'
import { useSolarSystemStore } from '@/stores/solarSystemStore'
import { NASATextureAssetManager, NASA_TEXTURE_CATALOG } from '@/components/3d/assets/NASATextureAssets'
interface EarthComponentProps extends PlanetComponentProps {
  showClouds?: boolean
  showAtmosphere?: boolean
  showNightLights?: boolean
  showMoon?: boolean
  atmosphereIntensity?: number
  cloudOpacity?: number
  detail?: number
  useNASATextures?: boolean
}
export const EarthComponent: React.FC<EarthComponentProps> = ({
  showClouds = true,
  showAtmosphere = true,
  showNightLights = true,
  showMoon = true,
  atmosphereIntensity = 0.4,
  cloudOpacity = 0.4,
  qualityLevel = 'high',
  detail,
  useNASATextures = true,
  ...props
}) => {
  const earthData = useSolarSystemStore.getState().storeObjects['earth']
  const moonData = useSolarSystemStore.getState().storeObjects['moon']
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const moonGroupRef = useRef<THREE.Group>(null)
  const moonMeshRef = useRef<THREE.Mesh>(null)
  const textureManager = useMemo(() => NASATextureAssetManager.getInstance(), [])
  const textureURLs = useMemo(() => {
    if (!useNASATextures) {
      return {
        earthDay: '/textures/earth-day.jpg',
        earthNight: '/textures/earth-night.jpg',
        earthNormal: '/textures/earth-normal.jpg',
        earthSpecular: '/textures/earth-specular.jpg',
        earthClouds: '/textures/earth-clouds.jpg',
        moonTexture: '/textures/moon-surface.jpg',
        moonNormal: '/textures/moon-normal.jpg'
      }
    }
    const earthTextureSet = textureManager.getPlanetTextureSet('earth')
    if (!earthTextureSet) {
      console.warn('NASA Earth texture set not found, falling back to default textures')
      return {
        earthDay: '/textures/earth-day.jpg',
        earthNight: '/textures/earth-night.jpg',
        earthNormal: '/textures/earth-normal.jpg',
        earthSpecular: '/textures/earth-specular.jpg',
        earthClouds: '/textures/earth-clouds.jpg',
        moonTexture: '/textures/moon-surface.jpg',
        moonNormal: '/textures/moon-normal.jpg'
      }
    }
    const quality = qualityLevel === 'ultra' ? 'ultra' : qualityLevel === 'high' ? 'high' : qualityLevel === 'medium' ? 'medium' : 'low'
    return {
      earthDay: earthTextureSet.primarySurface.variants[quality] || earthTextureSet.primarySurface.variants.high,
      earthNight: earthTextureSet.nightTextures?.[0]?.variants[quality] || '/textures/earth-night.jpg',
      earthNormal: earthTextureSet.primarySurface.companions?.normal || '/textures/earth-normal.jpg',
      earthSpecular: earthTextureSet.primarySurface.companions?.specular || '/textures/earth-specular.jpg',
      earthClouds: earthTextureSet.cloudTextures?.[0]?.variants[quality] || '/textures/earth-clouds.jpg',
      moonTexture: '/textures/moon-surface.jpg',
      moonNormal: '/textures/moon-normal.jpg'
    }
  }, [useNASATextures, qualityLevel, textureManager])
  const [
    earthDayTexture,
    earthNightTexture, 
    earthNormalTexture,
    earthSpecularTexture,
    earthCloudsTexture,
    moonTexture,
    moonNormalTexture
  ] = useLoader(THREE.TextureLoader, [
    textureURLs.earthDay,
    textureURLs.earthNight,
    textureURLs.earthNormal,
    textureURLs.earthSpecular,
    textureURLs.earthClouds,
    textureURLs.moonTexture,
    textureURLs.moonNormal
  ])
  const earthMaterial = useMemo(() => {
    earthDayTexture.wrapS = earthDayTexture.wrapT = THREE.RepeatWrapping
    earthDayTexture.anisotropy = 16 // High anisotropy for surface detail
    earthDayTexture.colorSpace = THREE.SRGBColorSpace
    if (earthNormalTexture) {
      earthNormalTexture.wrapS = earthNormalTexture.wrapT = THREE.RepeatWrapping
      earthNormalTexture.anisotropy = 16
    }
    if (earthSpecularTexture) {
      earthSpecularTexture.wrapS = earthSpecularTexture.wrapT = THREE.RepeatWrapping
      earthSpecularTexture.anisotropy = 8
    }
    const material = new THREE.MeshStandardMaterial({
      map: earthDayTexture,
      normalMap: earthNormalTexture,
      roughnessMap: earthSpecularTexture,
      roughness: 0.7, // More realistic surface roughness
      metalness: 0.05, // Earth's surface is not metallic
      normalScale: new THREE.Vector2(1.5, 1.5), // Enhanced normal mapping
    })
    if (showNightLights && earthNightTexture) {
      earthNightTexture.wrapS = earthNightTexture.wrapT = THREE.RepeatWrapping
      earthNightTexture.anisotropy = 8
      material.emissiveMap = earthNightTexture
      material.emissiveIntensity = 0.3 // Brighter night lights for realism
      material.emissive = new THREE.Color(0.1, 0.1, 0.05) // Warm light color
    }
    return material
  }, [earthDayTexture, earthNightTexture, earthNormalTexture, earthSpecularTexture, showNightLights])
  const cloudGeometry = useMemo(() => {
    if (!showClouds) return null
    const segments = detail || (qualityLevel === 'ultra' ? 64 : qualityLevel === 'high' ? 32 : 16)
    const radius = (earthData.radius * 0.001) * 1.008 // Realistic cloud altitude (8km scaled)
    return new THREE.SphereGeometry(radius, segments, segments)
  }, [showClouds, qualityLevel, earthData, detail])
  const cloudMaterial = useMemo(() => {
    if (!showClouds) return null
    earthCloudsTexture.wrapS = earthCloudsTexture.wrapT = THREE.RepeatWrapping
    earthCloudsTexture.anisotropy = 8
    earthCloudsTexture.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({
      map: earthCloudsTexture,
      transparent: true,
      opacity: cloudOpacity * 0.8, // Slightly more transparent for realism
      depthWrite: false,
      side: THREE.DoubleSide,
      alphaTest: 0.1, // Remove fully transparent pixels
      roughness: 0.9, // Clouds are not reflective
      metalness: 0.0,
      emissive: new THREE.Color(0.02, 0.02, 0.02), // Subtle cloud glow
    })
  }, [showClouds, earthCloudsTexture, cloudOpacity])
  const atmosphereGeometry = useMemo(() => {
    if (!showAtmosphere) return null
    const segments = detail || (qualityLevel === 'high' ? 32 : 16)
    const radius = (earthData.radius * 0.001) * 1.025 // Realistic atmosphere thickness
    return new THREE.SphereGeometry(radius, segments, segments)
  }, [showAtmosphere, qualityLevel, earthData, detail])
  const atmosphereMaterial = useMemo(() => {
    if (!showAtmosphere) return null
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        atmosphereColor: { value: new THREE.Color(0.4, 0.7, 1.0) }, // Earth's blue atmosphere
        sunPosition: { value: new THREE.Vector3(5, 0, 0) }, // Sun position for scattering
        intensity: { value: atmosphereIntensity },
        scatteringStrength: { value: 0.8 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 atmosphereColor;
        uniform vec3 sunPosition;
        uniform float intensity;
        uniform float scatteringStrength;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
          vec3 sunDirection = normalize(sunPosition);
          float fresnel = dot(vNormal, viewDirection);
          float atmosphereIntensity = pow(0.9 - fresnel, 1.5);
          float sunDot = dot(viewDirection, sunDirection);
          float scattering = 1.0 + sunDot * sunDot * scatteringStrength;
          vec3 scatteredColor = mix(
            atmosphereColor * 0.6, 
            atmosphereColor * vec3(1.0, 0.8, 0.6), 
            max(0.0, sunDot * 0.5 + 0.5)
          );
          float alpha = atmosphereIntensity * intensity * scattering;
          gl_FragColor = vec4(scatteredColor, alpha);
        }
      `
    })
  }, [showAtmosphere, atmosphereIntensity])
  const moonGeometry = useMemo(() => {
    if (!showMoon || !moonData) return null
    const segments = detail || (qualityLevel === 'ultra' ? 32 : qualityLevel === 'high' ? 24 : 16)
    const radius = moonData.radius * 0.001
    return new THREE.SphereGeometry(radius, segments, segments)
  }, [showMoon, moonData, qualityLevel, detail])
  const moonMaterial = useMemo(() => {
    if (!showMoon) return null
    moonTexture.wrapS = moonTexture.wrapT = THREE.RepeatWrapping
    moonTexture.anisotropy = 16
    if (moonNormalTexture) {
      moonNormalTexture.wrapS = moonNormalTexture.wrapT = THREE.RepeatWrapping
      moonNormalTexture.anisotropy = 8
    }
    return new THREE.MeshStandardMaterial({
      map: moonTexture,
      normalMap: moonNormalTexture,
      roughness: 0.95, // Moon's surface is very rough
      metalness: 0.0,
      normalScale: new THREE.Vector2(2.0, 2.0) // Enhanced lunar surface detail
    })
  }, [showMoon, moonTexture, moonNormalTexture])
  useFrame((state, delta) => {
    if (cloudsRef.current && showClouds) {
      cloudsRef.current.rotation.y += delta * 0.025 // Slightly faster than Earth rotation
    }
    if (atmosphereRef.current && showAtmosphere && atmosphereMaterial) {
      atmosphereRef.current.rotation.y += delta * 0.008 // Slow atmospheric circulation
      if ('uniforms' in atmosphereMaterial) {
        const shaderMaterial = atmosphereMaterial as THREE.ShaderMaterial
        shaderMaterial.uniforms.time.value += delta
        const sunAngle = state.clock.elapsedTime * 0.1
        shaderMaterial.uniforms.sunPosition.value.set(
          Math.cos(sunAngle) * 5,
          Math.sin(sunAngle * 0.3) * 2,
          Math.sin(sunAngle) * 5
        )
      }
    }
    if (moonGroupRef.current && moonMeshRef.current && showMoon && moonData) {
      const time = state.clock.elapsedTime * 0.05 // Realistic lunar orbital period
      const moonDistance = 0.015 // Scaled Earth-Moon distance
      const orbitalInclination = Math.PI * 0.089 // 5.1 degrees scaled
      moonGroupRef.current.position.x = Math.cos(time) * moonDistance
      moonGroupRef.current.position.z = Math.sin(time) * moonDistance * Math.cos(orbitalInclination)
      moonGroupRef.current.position.y = Math.sin(time) * moonDistance * Math.sin(orbitalInclination)
      moonMeshRef.current.rotation.y = time
    }
  })
  return (
    <BasePlanetComponent 
      celestialBody={earthData as any} 
      qualityLevel={qualityLevel}
      {...props}
    >
      {}
      {}
      {showClouds && cloudGeometry && cloudMaterial && (
        <mesh 
          ref={cloudsRef} 
          geometry={cloudGeometry} 
          material={cloudMaterial}
          renderOrder={1}
          castShadow
        />
      )}
      {}
      {showAtmosphere && atmosphereGeometry && atmosphereMaterial && (
        <mesh 
          ref={atmosphereRef} 
          geometry={atmosphereGeometry} 
          material={atmosphereMaterial}
          renderOrder={2}
        />
      )}
      {}
      {showMoon && moonData && moonGeometry && moonMaterial && (
        <group ref={moonGroupRef}>
          <mesh 
            ref={moonMeshRef}
            geometry={moonGeometry}
            material={moonMaterial}
            castShadow
            receiveShadow
          />
          {}
          {props.showTrails && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.0140, 0.0150, 128]} />
              <meshStandardMaterial 
                color="#666688" 
                transparent 
                opacity={0.2} 
                side={THREE.DoubleSide} 
              />
            </mesh>
          )}
          {}
          {qualityLevel === 'ultra' && (
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
              <ringGeometry args={[0.0155, 0.0165, 64]} />
              <meshStandardMaterial 
                color="#ffdd88" 
                transparent 
                opacity={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      )}
      {}
      {qualityLevel === 'ultra' && (
        <group>
          {}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.009, 0.0008, 16, 64]} />
            <meshStandardMaterial 
              color="#00ff88" 
              transparent 
              opacity={0.15}
              wireframe
            />
          </mesh>
          {}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.016, 0.0012, 16, 64]} />
            <meshStandardMaterial 
              color="#0088ff" 
              transparent 
              opacity={0.12}
              wireframe
            />
          </mesh>
          {}
          <group rotation={[0.4, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.0065, 0.0003, 8, 32]} />
              <meshStandardMaterial 
                color="#44ff66" 
                transparent 
                opacity={0.3}
                emissive={new THREE.Color(0.1, 0.4, 0.2)}
                emissiveIntensity={0.5}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.0063, 0.0003, 8, 32]} />
              <meshStandardMaterial 
                color="#6644ff" 
                transparent 
                opacity={0.25}
                emissive={new THREE.Color(0.2, 0.1, 0.4)}
                emissiveIntensity={0.4}
              />
            </mesh>
          </group>
        </group>
      )}
      {}
      {(qualityLevel === 'high' || qualityLevel === 'ultra') && (
        <group>
          {}
          <mesh rotation={[0.9, 0, 0]}>
            <ringGeometry args={[0.0067, 0.0068, 128]} />
            <meshStandardMaterial 
              color="#ffaa44" 
              transparent 
              opacity={0.4}
            />
          </mesh>
          {}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.0235, 0.0237, 256]} />
            <meshStandardMaterial 
              color="#44aaff" 
              transparent 
              opacity={0.2}
            />
          </mesh>
        </group>
      )}
      {}
      {useNASATextures && (
        <group>
          {}
          <mesh>
            <cylinderGeometry args={[0.00001, 0.00001, (earthData.radius * 0.001) * 2.2, 4]} />
            <meshStandardMaterial 
              color="#ffff88" 
              transparent 
              opacity={0.6}
              emissive={new THREE.Color(0.2, 0.2, 0.1)}
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      )}
    </BasePlanetComponent>
  )
}
export function calculateDayNightTerminator(earthRotation: number): number {
  return (earthRotation % (2 * Math.PI)) / (2 * Math.PI)
}
export function getSeasonalTilt(julianDay: number): number {
  const dayOfYear = (julianDay % 365.25) / 365.25
  const seasonalAngle = dayOfYear * 2 * Math.PI
  return Math.sin(seasonalAngle) * 23.44 // degrees - actual Earth axial tilt
}
export function calculateEarthPhase(sunAngle: number, viewAngle: number): number {
  const angleDiff = Math.abs(sunAngle - viewAngle)
  return Math.cos(angleDiff)
}
export function getNASATextureMetadata(textureId: string): {
  source: string
  captureDate: string
  instrument: string
  resolution: string
} | null {
  const manager = NASATextureAssetManager.getInstance()
  const metadata = manager.getAssetMetadata(textureId)
  if (!metadata.asset) return null
  return {
    source: metadata.asset.source,
    captureDate: metadata.asset.captureDate || 'Unknown',
    instrument: metadata.asset.instrument || 'Unknown',
    resolution: `${metadata.asset.originalResolution.width}x${metadata.asset.originalResolution.height}`
  }
}
export default EarthComponent
'use client'
import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { 
  BasePlanetComponent, 
  PlanetComponentProps 
} from './BasePlanetComponent'
import { SIMPLE_PLANETS } from '../../../types/astronomical-data'
import { MaterialManager } from '../materials/MaterialManager'
import { PlanetaryEffectsManager } from '../effects/PlanetaryEffectsManager'
interface MarsComponentProps extends PlanetComponentProps {
  showDustStorms?: boolean
  showPolarIceCaps?: boolean
  showSeasonalChanges?: boolean
  dustStormIntensity?: number
  polarIceSize?: number
  seasonalPhase?: number 
  showThinAtmosphere?: boolean
  showPhobosDeimos?: boolean
}
export const MarsComponent: React.FC<MarsComponentProps> = ({
  showDustStorms = true,
  showPolarIceCaps = true,
  showSeasonalChanges = false,
  dustStormIntensity = 0.3,
  polarIceSize = 0.1,
  seasonalPhase = 0.5,
  showThinAtmosphere = true,
  showPhobosDeimos = true,
  qualityLevel = 'high',
  ...props
}) => {
  const marsData = SIMPLE_PLANETS.mars
  const marsGroupRef = useRef<THREE.Group>(null)
  const dustStormRef = useRef<THREE.Points>(null)
  const northIceCapRef = useRef<THREE.Mesh>(null)
  const southIceCapRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const phobosRef = useRef<THREE.Group>(null)
  const deimosRef = useRef<THREE.Group>(null)
  const materialManager = useMemo(() => MaterialManager.getInstance(), [])
  const effectsManager = useRef<PlanetaryEffectsManager | null>(null)
  const dustStormGeometry = useMemo(() => {
    if (!showDustStorms) return null
    const particleCount = qualityLevel === 'ultra' ? 10000 : 
                         qualityLevel === 'high' ? 5000 : 
                         qualityLevel === 'medium' ? 2000 : 1000
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const dustColor = new THREE.Color(0xD2691E)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = marsData.info.radius_km * 0.00001 * (1.001 + Math.random() * 0.02)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      const colorVar = 0.7 + Math.random() * 0.6
      colors[i * 3] = dustColor.r * colorVar
      colors[i * 3 + 1] = dustColor.g * colorVar
      colors[i * 3 + 2] = dustColor.b * colorVar
      sizes[i] = Math.random() * 0.003 + 0.001
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geometry
  }, [showDustStorms, qualityLevel, marsData])
  const dustStormMaterial = useMemo(() => {
    if (!showDustStorms) return null
    return new THREE.PointsMaterial({
      size: 0.002,
      vertexColors: true,
      transparent: true,
      opacity: dustStormIntensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [showDustStorms, dustStormIntensity])
  const polarIceGeometry = useMemo(() => {
    if (!showPolarIceCaps) return null
    const segments = qualityLevel === 'ultra' ? 32 : 16
    const radius = marsData.info.radius_km * 0.00001 * 1.002
    return new THREE.SphereGeometry(
      radius, 
      segments, 
      segments,
      0, Math.PI * 2,
      0, Math.PI * polarIceSize
    )
  }, [showPolarIceCaps, polarIceSize, qualityLevel, marsData])
  const iceCapMaterial = useMemo(() => {
    if (!showPolarIceCaps) return null
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color(0xFFFFFF),
      transparent: true,
      opacity: 0.9
    })
  }, [showPolarIceCaps])
  const [thinAtmosphereMaterial, setThinAtmosphereMaterial] = useState<THREE.ShaderMaterial | null>(null)
  useEffect(() => {
    if (showThinAtmosphere && materialManager) {
      const atmMaterial = materialManager.createAtmosphereMaterial('mars_atmosphere', {
        scatteringStrength: 0.1,
        scatteringColor: new THREE.Color(0xFF8888),
        absorptionColor: new THREE.Color(0xFF4444),
        density: 0.2,
        falloff: 0.8,
        enableRayleighScattering: true,
        enableMieScattering: false
      })
      setThinAtmosphereMaterial(atmMaterial)
    }
  }, [showThinAtmosphere, materialManager])
  const moonMaterials = useMemo(() => ({
    phobos: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x8B4513),
      roughness: 0.95,
      metalness: 0.05
    }),
    deimos: new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x696969),
      roughness: 0.9,
      metalness: 0.1
    })
  }), [])
  useEffect(() => {
    if (marsGroupRef.current) {
      effectsManager.current = new PlanetaryEffectsManager(marsGroupRef.current.parent as THREE.Scene)
    }
    return () => {
      if (effectsManager.current) {
        effectsManager.current.dispose()
      }
    }
  }, [])
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    if (dustStormRef.current && showDustStorms) {
      dustStormRef.current.rotation.y += delta * 0.01
      const positions = dustStormRef.current.geometry.attributes.position
      if (positions) {
        for (let i = 0; i < positions.count; i++) {
          const y = positions.getY(i)
          const windEffect = Math.sin(time * 0.5 + i * 0.01) * 0.0001
          positions.setX(i, positions.getX(i) + windEffect)
        }
        positions.needsUpdate = true
      }
    }
    if (showPolarIceCaps && showSeasonalChanges) {
      const northCapScale = 0.8 + 0.4 * Math.sin(seasonalPhase * Math.PI * 2)
      const southCapScale = 0.8 + 0.4 * Math.sin((seasonalPhase + 0.5) * Math.PI * 2)
      if (northIceCapRef.current) {
        northIceCapRef.current.scale.setScalar(northCapScale)
      }
      if (southIceCapRef.current) {
        southIceCapRef.current.scale.setScalar(southCapScale)
      }
    }
    if (thinAtmosphereMaterial && thinAtmosphereMaterial.uniforms) {
      thinAtmosphereMaterial.uniforms.time.value = time
    }
    if (showPhobosDeimos) {
      if (phobosRef.current) {
        const phobosAngle = time * 0.3 
        const phobosDistance = 0.008
        phobosRef.current.position.x = Math.cos(phobosAngle) * phobosDistance
        phobosRef.current.position.z = Math.sin(phobosAngle) * phobosDistance
        phobosRef.current.rotation.y = phobosAngle 
      }
      if (deimosRef.current) {
        const deimosAngle = time * 0.1 
        const deimosDistance = 0.015
        deimosRef.current.position.x = Math.cos(deimosAngle) * deimosDistance
        deimosRef.current.position.z = Math.sin(deimosAngle) * deimosDistance
        deimosRef.current.rotation.y = deimosAngle 
      }
    }
    if (effectsManager.current) {
      effectsManager.current.update(delta, time * 1000)
    }
  })
  useEffect(() => {
    if (effectsManager.current && marsGroupRef.current) {
      const marsMesh = marsGroupRef.current.children.find(child => child.name.includes('mesh')) as THREE.Mesh
      if (marsMesh) {
        effectsManager.current.createMarsEffects(marsMesh, {
          dustStormIntensity,
          polarIceCapSize: polarIceSize,
          seasonalChangeRate: 0.1,
          atmosphericThinness: showThinAtmosphere ? 0.3 : 0,
          dustDevilCount: 3
        })
      }
    }
  }, [dustStormIntensity, polarIceSize, showThinAtmosphere])
  return (
    <BasePlanetComponent 
      celestialBody={marsData} 
      qualityLevel={qualityLevel}
      {...props}
    >
      <group ref={marsGroupRef}>
        {}
        {showThinAtmosphere && thinAtmosphereMaterial && (
          <mesh 
            ref={atmosphereRef}
            scale={1.05}
          >
            <sphereGeometry args={[
              marsData.info.radius_km * 0.00001,
              qualityLevel === 'ultra' ? 32 : 16,
              qualityLevel === 'ultra' ? 32 : 16
            ]} />
            <primitive object={thinAtmosphereMaterial} />
          </mesh>
        )}
        {}
        {showDustStorms && dustStormGeometry && dustStormMaterial && (
          <points 
            ref={dustStormRef}
            geometry={dustStormGeometry}
            material={dustStormMaterial}
          />
        )}
        {}
        {showPolarIceCaps && polarIceGeometry && iceCapMaterial && (
          <>
            {}
            <mesh 
              ref={northIceCapRef}
              geometry={polarIceGeometry}
              material={iceCapMaterial}
            />
            {}
            <mesh 
              ref={southIceCapRef}
              geometry={polarIceGeometry}
              material={iceCapMaterial}
              rotation={[Math.PI, 0, 0]}
            />
          </>
        )}
        {}
        {showPhobosDeimos && (
          <group ref={phobosRef}>
            <mesh material={moonMaterials.phobos}>
              <sphereGeometry args={[0.00001, 8, 8]} /> {}
            </mesh>
            {}
            {props.showTrails && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.0075, 0.0085, 32]} />
                <meshBasicMaterial 
                  color={moonMaterials.phobos.color}
                  transparent 
                  opacity={0.2} 
                  side={THREE.DoubleSide} 
                />
              </mesh>
            )}
          </group>
        )}
        {}
        {showPhobosDeimos && (
          <group ref={deimosRef}>
            <mesh material={moonMaterials.deimos}>
              <sphereGeometry args={[0.000006, 6, 6]} /> {}
            </mesh>
            {}
            {props.showTrails && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.014, 0.016, 32]} />
                <meshBasicMaterial 
                  color={moonMaterials.deimos.color}
                  transparent 
                  opacity={0.15} 
                  side={THREE.DoubleSide} 
                />
              </mesh>
            )}
          </group>
        )}
      </group>
    </BasePlanetComponent>
  )
}
export function calculateDustStormSeason(marsYear: number): number {
  const cycle = (marsYear * 0.53) % 1 
  return Math.max(0, Math.sin(cycle * Math.PI * 2) - 0.3) * 2
}
export function getMarsSeasonalTilt(marsDay: number): number {
  const marsYear = 687 
  const seasonPhase = (marsDay % marsYear) / marsYear
  return Math.sin(seasonPhase * 2 * Math.PI) * 25.19 
}
export function calculatePolarIceExtent(season: number, hemisphere: 'north' | 'south'): number {
  const baseSize = 0.05
  const seasonalVariation = 0.03
  const phaseOffset = hemisphere === 'south' ? Math.PI : 0
  return baseSize + seasonalVariation * Math.sin(season * 2 * Math.PI + phaseOffset)
}
export default MarsComponent
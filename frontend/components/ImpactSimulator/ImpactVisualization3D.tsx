'use client'
import React, { useRef, useState, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Vector2 } from 'three'
import { ImpactLocation, ImpactResults } from './types'
import { EnhancedEarth } from '../3d/planets/EnhancedEarth'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { ExplosionParticles } from './ExplosionParticles'
import { ShockWave } from './ShockWave'
import { Fireball } from './Fireball'
import { DebrisCloud } from './DebrisCloud'
import { PremiumAsteroidModel } from './PremiumAsteroidModel'
import { PlasmaTrail } from './PlasmaTrail'
import { AtmosphericDistortion } from './AtmosphericDistortion'
import { HeatHaze } from './HeatHaze'
import { RealisticCraterFormation } from './RealisticCraterFormation'
import { SedovTaylorShock } from './SedovTaylorShock'
import { SeismicWaves } from './SeismicWaves'
import { BallisticDebris } from './BallisticDebris'
import { MushroomCloud } from './MushroomCloud'
import { EnhancedAtmosphericEntry } from './EnhancedAtmosphericEntry'
import { CraterEarthOverlay } from './CraterEarthOverlay'
import { CraterCrossSection } from './CraterCrossSection'
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import { ImpactPhysics } from '@/services/ImpactPhysics'
import { SphericalShockWave } from './SphericalShockWave'
import { AtmosphericPressureWave } from './AtmosphericPressureWave'
interface ImpactVisualization3DProps {
  location: ImpactLocation
  results: ImpactResults | null
  isAnimating: boolean
  onAnimationComplete?: () => void
  onProgressChange?: (progress: number) => void
  animationSpeed?: number
  enableEffects?: boolean
  enablePostProcessing?: boolean
  particleMultiplier?: number
  externalProgress?: number
  shouldResetAnimation?: boolean
  asteroidParams?: {
    diameter_m: number
    velocity_kms: number
  }
}
function latLngToVector3(lat: number, lng: number, radius: number = 1.8): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = lng * (Math.PI / 180)
  const x = radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(x, y, z)
}
function EffectRing({
  center,
  radius_km,
  color,
  opacity,
  progress,
  delay,
  earthRadius = 1.8
}: {
  center: ImpactLocation
  radius_km: number
  color: string
  opacity: number
  progress: number
  delay: number
  earthRadius?: number
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)
  const centerPos = useMemo(
    () => latLngToVector3(center.lat, center.lng, earthRadius * 1.01),
    [center.lat, center.lng, earthRadius]
  )
  useFrame(() => {
    if (!ringRef.current || !materialRef.current) return
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    if (adjustedProgress <= 0) {
      ringRef.current.visible = false
      return
    }
    ringRef.current.visible = true
    const earthRadius_km = 6371
    const scale = (radius_km / earthRadius_km) * earthRadius * adjustedProgress
    ringRef.current.scale.set(scale, scale, scale)
    ringRef.current.position.copy(centerPos)
    materialRef.current.opacity = opacity * (1 - adjustedProgress * 0.7)
  })
  const normal = useMemo(() => {
    return centerPos.clone().normalize()
  }, [centerPos])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  return (
    <mesh
      ref={ringRef}
      position={centerPos}
      quaternion={quaternion}
      visible={false}
    >
      <ringGeometry args={[0.9, 1, 64]} />
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
function ImpactFlash({
  location,
  progress
}: {
  location: ImpactLocation
  progress: number
}) {
  const lightRef = useRef<THREE.PointLight>(null)
  const flashRef = useRef<THREE.Mesh>(null)
  const shockwaveRef = useRef<THREE.Mesh>(null)
  const position = useMemo(
    () => latLngToVector3(location.lat, location.lng, 1.85),
    [location.lat, location.lng]
  )
  useFrame((state) => {
    if (!lightRef.current) return
    if (progress > 0 && progress < 0.4) {
      const flashProgress = progress / 0.4
      const intensity = Math.sin(flashProgress * Math.PI) * 120
      lightRef.current.intensity = intensity
    } else {
      lightRef.current.intensity = 0
    }
    if (flashRef.current && progress > 0 && progress < 0.3) {
      const pulse = Math.sin(state.clock.elapsedTime * 10) * 0.05 + 1
      flashRef.current.scale.setScalar((0.1 + progress * 0.5) * pulse)
    }
    if (shockwaveRef.current && progress > 0.1 && progress < 0.4) {
      const waveProgress = (progress - 0.1) / 0.3
      shockwaveRef.current.scale.setScalar(waveProgress * 2)
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(waveProgress * Math.PI) * 0.7
    }
  })
  const normal = useMemo(() => position.clone().normalize(), [position])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  return (
    <>
      {}
      <pointLight
        ref={lightRef}
        position={position}
        color="#ffaa44"
        intensity={0}
        distance={8}
        decay={1.5}
      />
      {}
      {progress > 0 && progress < 0.3 && (
        <mesh ref={flashRef} position={position}>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={Math.sin(progress / 0.3 * Math.PI) * 0.95}
            toneMapped={false}
          />
        </mesh>
      )}
      {}
      {progress > 0.1 && progress < 0.4 && (
        <mesh ref={shockwaveRef} position={position} quaternion={quaternion}>
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial
            color="#ff6600"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </>
  )
}
function AsteroidApproach({
  targetLocation,
  progress,
  size = 0.05,
  velocity = 20,
  isAnimating = true
}: {
  targetLocation: ImpactLocation
  progress: number
  size?: number
  velocity?: number
  isAnimating?: boolean
}) {
  const asteroidRef = useRef<THREE.Group>(null)
  const targetPos = useMemo(
    () => latLngToVector3(targetLocation.lat, targetLocation.lng, 1.8),
    [targetLocation.lat, targetLocation.lng]
  )
  const { startPos, direction } = useMemo(() => {
    const surfaceNormal = targetPos.clone().normalize()
    const startDistance = 15
    const angle = 45 * Math.PI / 180
    const tangent = new THREE.Vector3()
    if (Math.abs(surfaceNormal.y) < 0.99) {
      tangent.crossVectors(surfaceNormal, new THREE.Vector3(0, 1, 0)).normalize()
    } else {
      tangent.crossVectors(surfaceNormal, new THREE.Vector3(1, 0, 0)).normalize()
    }
    const radialComponent = surfaceNormal.clone().multiplyScalar(Math.cos(angle))
    const tangentialComponent = tangent.clone().multiplyScalar(Math.sin(angle))
    const offsetDirection = radialComponent.clone().add(tangentialComponent).normalize()
    const startPos = targetPos.clone().add(offsetDirection.multiplyScalar(startDistance - 1.8))
    const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize()
    return { startPos, direction }
  }, [targetPos])
  const asteroidPos = useMemo(() => {
    const t = progress // 0 to 1
    const initialVelocity = direction.clone().multiplyScalar(-velocity)
    const gravity = targetPos.clone().normalize().multiplyScalar(-0.5)
    const displacement = initialVelocity.clone().multiplyScalar(t)
    const gravityDisplacement = gravity.clone().multiplyScalar(0.5 * t * t)
    const currentPos = startPos.clone().add(displacement).add(gravityDisplacement)
    const linearPos = new THREE.Vector3().lerpVectors(startPos, targetPos, t)
    const mixFactor = Math.pow(t, 2) // Karesel artış
    return new THREE.Vector3().lerpVectors(linearPos, currentPos, mixFactor * 0.3)
  }, [startPos, targetPos, direction, progress, velocity])
  const atmosphereProgress = progress > 0.5 ? (progress - 0.5) / 0.5 : 0
  const isInAtmosphere = atmosphereProgress > 0
  const asteroidQuaternion = useMemo(() => {
    const lookDirection = new THREE.Vector3().subVectors(targetPos, asteroidPos).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    const mx = new THREE.Matrix4().lookAt(asteroidPos, targetPos, up)
    quaternion.setFromRotationMatrix(mx)
    return quaternion
  }, [asteroidPos, targetPos])
  const rotationRef = useRef(0)
  useFrame((state, delta) => {
    if (!asteroidRef.current || !isAnimating) return
    rotationRef.current += delta * (0.5 + progress * 1.5)
    asteroidRef.current.rotation.z = rotationRef.current
  })
  return (
    <group ref={asteroidRef} position={asteroidPos} quaternion={asteroidQuaternion}>
      {!isInAtmosphere ? (
        <>
          <group scale={size * 2}>
            <PremiumAsteroidModel
              diameter={100}
              atmosphereProgress={0}
              velocity={velocity}
              asteroidType="C-type"
              quality="high"
            />
          </group>
          {}
          <pointLight
            color="#ffffff"
            intensity={15}
            distance={size * 20}
            decay={2}
          />
          {}
          <pointLight
            position={direction.clone().multiplyScalar(0.5).toArray()}
            color="#6699ff"
            intensity={8}
            distance={size * 15}
            decay={2}
          />
        </>
      ) : (
        <EnhancedAtmosphericEntry
          asteroidPosition={asteroidPos}
          targetPosition={targetPos}
          progress={atmosphereProgress}
          diameter={100}
          velocity={velocity}
          isAnimating={isAnimating}
        />
      )}
    </group>
  )
}
export function ImpactVisualization3D({
  location,
  results,
  isAnimating,
  onAnimationComplete,
  onProgressChange,
  animationSpeed = 1,
  enableEffects = true,
  enablePostProcessing = true,
  particleMultiplier = 1,
  externalProgress = 0,
  shouldResetAnimation = false,
  asteroidParams
}: ImpactVisualization3DProps) {
  const [animationProgress, setAnimationProgress] = useState(externalProgress)
  const { camera } = useThree()
  const originalCameraPosition = useRef(camera.position.clone())
  const previousResetFlag = useRef(shouldResetAnimation)
  const impactPosition = useMemo(
    () => latLngToVector3(location.lat, location.lng, 1.85),
    [location.lat, location.lng]
  )
  const physicsTimeline = useMemo(() => {
    if (!asteroidParams) return null
    const physics = new ImpactPhysics()
    return physics.calculateImpactTimeline(
      asteroidParams.diameter_m,
      asteroidParams.velocity_kms,
      15 // başlangıç mesafesi km
    )
  }, [asteroidParams])
  useFrame((state, delta) => {
    if (!isAnimating) return
    // Animasyon süresini daha dengeli yap: ~20 saniye yerine ~30-40 saniye
    // delta * 0.025 ile progress artışını yavaşlat
    const progressIncrement = delta * 0.025 * animationSpeed
    const newProgress = Math.min(animationProgress + progressIncrement, 1)
    setAnimationProgress(newProgress)
    if (onProgressChange) {
      onProgressChange(newProgress)
    }
    if (newProgress >= 0.95 && onAnimationComplete) {
      onAnimationComplete()
    }
    if (newProgress < timeline.approachEnd) {
      const targetCameraPos = impactPosition.clone().multiplyScalar(0.5)
      targetCameraPos.z += 6
      targetCameraPos.y += 2
      camera.position.lerp(targetCameraPos, 0.02)
      camera.lookAt(impactPosition)
    } else if (newProgress >= timeline.impactStart && newProgress < timeline.impactEnd + 0.02) {
      const zoomTarget = impactPosition.clone()
      zoomTarget.z += 3.5
      zoomTarget.y += 1.5
      camera.position.lerp(zoomTarget, 0.15)
      camera.lookAt(impactPosition)
    } else if (newProgress >= timeline.impactEnd && newProgress < timeline.impactEnd + 0.10) {
      const shakeIntensity = Math.sin((newProgress - timeline.impactEnd) / 0.10 * Math.PI) * 0.20
      camera.position.x = originalCameraPosition.current.x + (Math.random() - 0.5) * shakeIntensity
      camera.position.y = originalCameraPosition.current.y + (Math.random() - 0.5) * shakeIntensity
      camera.position.z = originalCameraPosition.current.z + (Math.random() - 0.5) * shakeIntensity
    } else if (newProgress >= timeline.shockStart && newProgress < timeline.shockEnd) {
      const wideAngleTarget = new THREE.Vector3(0, 8, 8)
      camera.position.lerp(wideAngleTarget, 0.01)
      camera.lookAt(0, 0, 0)
    } else {
      camera.position.lerp(originalCameraPosition.current, 0.05)
    }
  })
  useEffect(() => {
    if (shouldResetAnimation && shouldResetAnimation !== previousResetFlag.current) {
      setAnimationProgress(0)
      originalCameraPosition.current = camera.position.clone()
      previousResetFlag.current = shouldResetAnimation
    }
  }, [shouldResetAnimation, camera])
  useEffect(() => {
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  useEffect(() => {
    if (location && !results) {
      const targetPos = latLngToVector3(location.lat, location.lng, 1.8)
      const cameraOffset = targetPos.clone().normalize().multiplyScalar(6)
      camera.position.copy(cameraOffset)
      camera.lookAt(0, 0, 0)
    }
  }, [location, results, camera])
  useEffect(() => {
    setAnimationProgress(externalProgress)
  }, [externalProgress])
  const impactIntensity = results?.energy.megatonsTNT || 1
  const earthDayTexture = useLoader(TextureLoader, '/textures/earth-day.jpg')
  const earthNormalTexture = useLoader(TextureLoader, '/textures/earth-normal.jpg')
  const timeline = useMemo(() => {
    if (physicsTimeline) {
      return {
        approachEnd: physicsTimeline.phases.approach.end,
        atmosphereStart: physicsTimeline.phases.atmosphereEntry.start,
        atmosphereEnd: physicsTimeline.phases.atmosphereEntry.end,
        impactStart: physicsTimeline.phases.impact.start,
        impactEnd: physicsTimeline.phases.impact.end,
        fireballStart: physicsTimeline.phases.fireball.start,
        fireballEnd: physicsTimeline.phases.fireball.end,
        shockStart: physicsTimeline.phases.shockWave.start,
        shockEnd: physicsTimeline.phases.shockWave.end,
        thermalStart: physicsTimeline.phases.thermal.start,
        debrisStart: physicsTimeline.phases.debris.start,
        debrisEnd: physicsTimeline.phases.debris.end
      }
    }
    return {
      approachEnd: 0.20,
      atmosphereStart: 0.15,
      atmosphereEnd: 0.20,
      impactStart: 0.20,
      impactEnd: 0.22,
      fireballStart: 0.20,
      fireballEnd: 0.35,
      shockStart: 0.22,
      shockEnd: 0.70,
      thermalStart: 0.23,
      debrisStart: 0.30,
      debrisEnd: 0.85
    }
  }, [physicsTimeline])
  const chromaticOffset = useMemo(() => {
    if (animationProgress > timeline.impactStart && animationProgress < timeline.impactEnd + 0.08) {
      const value = 0.003 * Math.sin((animationProgress - timeline.impactStart) / 0.13 * Math.PI)
      return new Vector2(value, value)
    }
    return new Vector2(0, 0)
  }, [animationProgress, timeline])
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[-20, 10, 5]} intensity={1.5} />
      <pointLight position={[10, 10, 10]} intensity={0.4} />
      <EnhancedEarth
        position={[0, 0, 0]}
        scale={1.8}
        quality="medium"
        showClouds={false}
        showAtmosphere={false}
        showAurora={false}
        showCityLights={false}
        enableRotation={false}
        sunPosition={new THREE.Vector3(-20, 0, 0)}
        showEarthEvents={false}
        nasaTexture="/textures/earth-day.jpg"
      />
      {results && animationProgress >= 0 && animationProgress < timeline.approachEnd && (
        <AsteroidApproach
          targetLocation={location}
          progress={animationProgress / timeline.approachEnd}
          size={Math.min(0.3, impactIntensity / 300)}
          velocity={asteroidParams?.velocity_kms || 20}
          isAnimating={isAnimating}
        />
      )}
      {animationProgress >= timeline.impactStart && animationProgress < timeline.fireballEnd && (
        <>
          <ImpactFlash 
            location={location} 
            progress={(animationProgress - timeline.impactStart) / (timeline.fireballEnd - timeline.impactStart)} 
          />
          {enableEffects && (
            <>
              <Fireball
                position={impactPosition}
                progress={(animationProgress - timeline.fireballStart) / (timeline.fireballEnd - timeline.fireballStart)}
                maxSize={Math.min(0.7, impactIntensity / 120)}
              />
              <ExplosionParticles
                position={impactPosition}
                progress={(animationProgress - timeline.impactEnd) / (timeline.fireballEnd - timeline.impactEnd)}
                intensity={Math.min(2, impactIntensity / 50) * particleMultiplier}
              />
            </>
          )}
        </>
      )}
      {animationProgress >= timeline.debrisStart && animationProgress < 1 && enableEffects && (
        <BallisticDebris
          impactPosition={impactPosition}
          progress={(animationProgress - timeline.debrisStart) / (1 - timeline.debrisStart)}
          intensity={Math.min(2, impactIntensity / 50) * particleMultiplier}
        />
      )}
      {results && animationProgress > timeline.impactEnd && (
        <>
          <RealisticCraterFormation
            impactPosition={impactPosition}
            crater={results.crater}
            progress={(animationProgress - timeline.impactEnd) / (1 - timeline.impactEnd)}
          />
          {}
          <CraterEarthOverlay
            impactPosition={impactPosition}
            craterDiameter_m={results.crater.finalDiameter_m}
            craterDepth_m={results.crater.finalDepth_m}
            progress={(animationProgress - timeline.impactEnd) / (1 - timeline.impactEnd)}
            earthTexture={earthDayTexture}
            earthNormalMap={earthNormalTexture}
          />
        </>
      )}
      {results && animationProgress > timeline.shockStart && (
        <SeismicWaves
          impactPosition={impactPosition}
          magnitude={results.seismic.magnitude}
          progress={(animationProgress - timeline.shockStart) / (1 - timeline.shockStart)}
        />
      )}
      {results && animationProgress > timeline.fireballStart && animationProgress < 0.95 && enableEffects && (
        <MushroomCloud
          position={impactPosition}
          energy_megatons={results.energy.megatonsTNT}
          progress={(animationProgress - timeline.fireballStart) / (0.95 - timeline.fireballStart)}
        />
      )}
      {results && animationProgress > timeline.shockStart && animationProgress < 1 && (
        <>
          {}
          <SedovTaylorShock
            impactPosition={impactPosition}
            progress={animationProgress}
            delay={timeline.shockStart}
            energy_joules={results.energy.joules}
          />
          {}
          <SphericalShockWave
            center={impactPosition}
            progress={animationProgress}
            maxRadius_km={results.crater.radius_km * 5}
            color="#ff2200"
            opacity={1.8}
            delay={timeline.shockStart}
            intensity={2.5}
          />
          {}
          <AtmosphericPressureWave
            impactPosition={impactPosition}
            progress={animationProgress}
            pressure_psi={20}
            radius_km={results.airBlast.radius_20psi_km}
            delay={timeline.shockStart + 0.01}
          />
          <AtmosphericPressureWave
            impactPosition={impactPosition}
            progress={animationProgress}
            pressure_psi={10}
            radius_km={results.airBlast.radius_10psi_km}
            delay={timeline.shockStart + 0.02}
          />
          <AtmosphericPressureWave
            impactPosition={impactPosition}
            progress={animationProgress}
            pressure_psi={5}
            radius_km={results.airBlast.radius_5psi_km}
            delay={timeline.shockStart + 0.03}
          />
          <AtmosphericPressureWave
            impactPosition={impactPosition}
            progress={animationProgress}
            pressure_psi={1}
            radius_km={results.airBlast.radius_1psi_km}
            delay={timeline.shockStart + 0.05}
          />
          {}
          <SphericalShockWave
            center={impactPosition}
            progress={animationProgress}
            maxRadius_km={results.airBlast.radius_1psi_km * 2}
            color="#ffaa44"
            opacity={1.2}
            delay={timeline.shockStart + 0.08}
            intensity={1.5}
          />
          {}
          <SphericalShockWave
            center={impactPosition}
            progress={animationProgress}
            maxRadius_km={results.thermal.firstDegree_km}
            color="#ffdd88"
            opacity={0.8}
            delay={timeline.thermalStart}
            intensity={1.0}
          />
          <AtmosphericDistortion
            impactPosition={impactPosition}
            progress={animationProgress}
            maxRadius={results.airBlast.radius_1psi_km / 6371 * 1.8}
          />
          <HeatHaze
            position={impactPosition}
            radius={results.thermal.secondDegree_km / 6371 * 1.8}
            progress={animationProgress}
            intensity={Math.min(impactIntensity / 400, 2)}
            delay={timeline.thermalStart}
          />
        </>
      )}
      {enablePostProcessing && (
        <EffectComposer>
          {}
          <Bloom
            intensity={
              animationProgress >= timeline.impactStart && animationProgress < timeline.fireballEnd 
                ? 1.2 
                : animationProgress >= timeline.shockStart && animationProgress < timeline.shockEnd
                ? 0.3
                : 0.05
            }
            luminanceThreshold={0.7}
            luminanceSmoothing={0.95}
            blendFunction={BlendFunction.ADD}
          />
          {}
          {animationProgress >= timeline.impactStart && animationProgress < timeline.impactEnd + 0.05 && (
            <ChromaticAberration
              offset={chromaticOffset}
              radialModulation={false}
              modulationOffset={0}
            />
          )}
        </EffectComposer>
      )}
    </>
  )
}

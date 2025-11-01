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
}

function latLngToVector3(lat: number, lng: number, radius: number = 1.8): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  
  const x = -radius * Math.sin(phi) * Math.cos(theta)
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
    
    ringRef.current.scale.set(scale, scale, 1)
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
    
    // Pulsating flash sphere
    if (flashRef.current && progress > 0 && progress < 0.3) {
      const pulse = Math.sin(state.clock.elapsedTime * 10) * 0.05 + 1
      flashRef.current.scale.setScalar((0.1 + progress * 0.5) * pulse)
    }
    
    // Expanding shockwave ring
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
      {/* Intense flash light */}
      <pointLight
        ref={lightRef}
        position={position}
        color="#ffaa44"
        intensity={0}
        distance={8}
        decay={1.5}
      />
      
      {/* Bright flash sphere */}
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
      
      {/* Impact shockwave ring */}
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
  
  // Sabit hedef pozisyon - değişmez!
  const targetPos = useMemo(
    () => latLngToVector3(targetLocation.lat, targetLocation.lng, 1.8),
    [targetLocation.lat, targetLocation.lng]
  )
  
  // Sabit başlangıç pozisyonu ve yörünge hesaplama
  const { startPos, direction } = useMemo(() => {
    const direction = targetPos.clone().normalize()
    const startDistance = 15
    const startPos = direction.clone().multiplyScalar(startDistance)
    
    return { startPos, direction }
  }, [targetPos])
  
  // Fiziksel düşüş animasyonu
  const asteroidPos = useMemo(() => {
    // Gravitasyonel ivme simülasyonu
    const t = progress // 0 to 1
    
    // Başlangıç hızı (sabit yön)
    const initialVelocity = direction.clone().multiplyScalar(-velocity)
    
    // Gravitasyonel çekim (Dünya'ya doğru)
    const gravity = targetPos.clone().normalize().multiplyScalar(-0.5)
    
    // Kinematik hareket: s = s₀ + v₀t + ½at²
    const displacement = initialVelocity.clone().multiplyScalar(t)
    const gravityDisplacement = gravity.clone().multiplyScalar(0.5 * t * t)
    
    const currentPos = startPos.clone().add(displacement).add(gravityDisplacement)
    
    // Düz çizgi interpolation (daha kararlı)
    const linearPos = new THREE.Vector3().lerpVectors(startPos, targetPos, t)
    
    // İkisini karıştır - başta düz, sonda eğri
    const mixFactor = Math.pow(t, 2) // Karesel artış
    return new THREE.Vector3().lerpVectors(linearPos, currentPos, mixFactor * 0.3)
  }, [startPos, targetPos, direction, progress, velocity])
  
  const atmosphereProgress = progress > 0.5 ? (progress - 0.5) / 0.5 : 0
  const isInAtmosphere = atmosphereProgress > 0
  
  // Asteroid yönelimi - hedefe doğru bak
  const asteroidQuaternion = useMemo(() => {
    const lookDirection = new THREE.Vector3().subVectors(targetPos, asteroidPos).normalize()
    const up = new THREE.Vector3(0, 1, 0)
    const quaternion = new THREE.Quaternion()
    
    const mx = new THREE.Matrix4().lookAt(asteroidPos, targetPos, up)
    quaternion.setFromRotationMatrix(mx)
    
    return quaternion
  }, [asteroidPos, targetPos])
  
  // Rotasyon ref - sadece animasyon çalışırken güncellenir
  const rotationRef = useRef(0)
  
  useFrame((state, delta) => {
    if (!asteroidRef.current || !isAnimating) return
    
    // Sadece animasyon çalışırken dönüş
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
          
          {/* Bright glow around asteroid */}
          <pointLight
            color="#ffffff"
            intensity={15}
            distance={size * 20}
            decay={2}
          />
          
          {/* Trailing glow */}
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
  shouldResetAnimation = false
}: ImpactVisualization3DProps) {
  const [animationProgress, setAnimationProgress] = useState(externalProgress)
  const { camera } = useThree()
  const originalCameraPosition = useRef(camera.position.clone())
  const previousResetFlag = useRef(shouldResetAnimation)
  
  const impactPosition = useMemo(
    () => latLngToVector3(location.lat, location.lng, 1.85),
    [location.lat, location.lng]
  )
  
  useFrame((state, delta) => {
    if (!isAnimating) return
    
    const newProgress = Math.min(animationProgress + delta * 0.03 * animationSpeed, 1)
    setAnimationProgress(newProgress)
    
    if (onProgressChange) {
      onProgressChange(newProgress)
    }
    
    if (newProgress >= 0.95 && onAnimationComplete) {
      onAnimationComplete()
    }
    
    if (newProgress > 0.25 && newProgress < 0.35) {
      const shakeIntensity = Math.sin((newProgress - 0.25) / 0.10 * Math.PI) * 0.15
      camera.position.x = originalCameraPosition.current.x + (Math.random() - 0.5) * shakeIntensity
      camera.position.y = originalCameraPosition.current.y + (Math.random() - 0.5) * shakeIntensity
      camera.position.z = originalCameraPosition.current.z + (Math.random() - 0.5) * shakeIntensity
    } else {
      camera.position.lerp(originalCameraPosition.current, 0.1)
    }
  })
  
  useEffect(() => {
    // Sadece reset flag değiştiğinde sıfırla
    if (shouldResetAnimation && shouldResetAnimation !== previousResetFlag.current) {
      setAnimationProgress(0)
      originalCameraPosition.current = camera.position.clone()
      previousResetFlag.current = shouldResetAnimation
    }
  }, [shouldResetAnimation])
  
  // External progress değiştiğinde sync et
  useEffect(() => {
    setAnimationProgress(externalProgress)
  }, [externalProgress])
  
  const impactIntensity = results?.energy.megatonsTNT || 1
  
  // Load Earth textures for overlay
  const earthDayTexture = useLoader(TextureLoader, '/textures/earth-day.jpg')
  const earthNormalTexture = useLoader(TextureLoader, '/textures/earth-normal.jpg')
  
  const chromaticOffset = useMemo(() => {
    if (animationProgress > 0.25 && animationProgress < 0.38) {
      const value = 0.003 * Math.sin((animationProgress - 0.25) / 0.13 * Math.PI)
      return new Vector2(value, value)
    }
    return new Vector2(0, 0)
  }, [animationProgress])
  
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
      
      {results && animationProgress >= 0 && animationProgress < 0.25 && (
        <AsteroidApproach
          targetLocation={location}
          progress={animationProgress / 0.25}
          size={Math.min(0.3, impactIntensity / 300)}
          velocity={20}
          isAnimating={isAnimating}
        />
      )}
      
      {animationProgress >= 0.25 && animationProgress < 0.80 && (
        <>
          <ImpactFlash location={location} progress={(animationProgress - 0.25) / 0.55} />
          {enableEffects && (
            <>
              <Fireball
                position={impactPosition}
                progress={(animationProgress - 0.25) / 0.55}
                maxSize={Math.min(0.7, impactIntensity / 120)}
              />
              <ExplosionParticles
                position={impactPosition}
                progress={(animationProgress - 0.28) / 0.52}
                intensity={Math.min(2, impactIntensity / 50) * particleMultiplier}
              />
            </>
          )}
        </>
      )}
      
      {animationProgress >= 0.75 && animationProgress < 1 && enableEffects && (
        <BallisticDebris
          impactPosition={impactPosition}
          progress={animationProgress}
          intensity={Math.min(2, impactIntensity / 50) * particleMultiplier}
        />
      )}
      
      {results && animationProgress > 0.30 && (
        <>
          <RealisticCraterFormation
            impactPosition={impactPosition}
            crater={results.crater}
            progress={animationProgress}
          />
          
          {/* Crater-Earth seamless overlay */}
          <CraterEarthOverlay
            impactPosition={impactPosition}
            craterDiameter_m={results.crater.finalDiameter_m}
            craterDepth_m={results.crater.finalDepth_m}
            progress={animationProgress}
            earthTexture={earthDayTexture}
            earthNormalMap={earthNormalTexture}
          />
        </>
      )}
      
      {results && animationProgress > 0.28 && (
        <SeismicWaves
          impactPosition={impactPosition}
          magnitude={results.seismic.magnitude}
          progress={animationProgress}
        />
      )}
      
      {results && animationProgress > 0.35 && animationProgress < 0.95 && enableEffects && (
        <MushroomCloud
          position={impactPosition}
          energy_megatons={results.energy.megatonsTNT}
          progress={animationProgress}
        />
      )}
      
      {results && animationProgress > 0.25 && animationProgress < 1 && (
        <>
          <SedovTaylorShock
            impactPosition={impactPosition}
            energy_joules={results.energy.joules}
            progress={animationProgress}
            delay={0.30}
          />
          
          <ShockWave
            center={impactPosition}
            progress={animationProgress}
            maxRadius={results.crater.radius_km / 6371 * 1.8}
            color="#ff0000"
            opacity={0.9}
            delay={0.45}
          />
          
          <EffectRing
            center={location}
            radius_km={results.crater.radius_km}
            color="#ff0000"
            opacity={0.9}
            progress={animationProgress}
            delay={0.28}
          />
          
          <EffectRing
            center={location}
            radius_km={results.airBlast.radius_20psi_km}
            color="#ff4400"
            opacity={0.8}
            progress={animationProgress}
            delay={0.40}
          />
          
          <ShockWave
            center={impactPosition}
            progress={animationProgress}
            maxRadius={results.airBlast.radius_5psi_km / 6371 * 1.8}
            color="#ff6600"
            opacity={0.7}
            delay={0.48}
          />
          
          <EffectRing
            center={location}
            radius_km={results.airBlast.radius_5psi_km}
            color="#ff8800"
            opacity={0.7}
            progress={animationProgress}
            delay={0.52}
          />
          
          <AtmosphericDistortion
            impactPosition={impactPosition}
            progress={animationProgress}
            maxRadius={results.airBlast.radius_1psi_km / 6371 * 1.8}
          />
          
          <EffectRing
            center={location}
            radius_km={results.airBlast.radius_1psi_km}
            color="#ffaa00"
            opacity={0.6}
            progress={animationProgress}
            delay={0.60}
          />
          
          <HeatHaze
            position={impactPosition}
            radius={results.thermal.secondDegree_km / 6371 * 1.8}
            progress={animationProgress}
            intensity={Math.min(impactIntensity / 400, 2)}
            delay={0.65}
          />
          
          <EffectRing
            center={location}
            radius_km={results.thermal.thirdDegree_km}
            color="#ffcc00"
            opacity={0.6}
            progress={animationProgress}
            delay={0.68}
          />
          
          <EffectRing
            center={location}
            radius_km={results.thermal.secondDegree_km}
            color="#ffdd00"
            opacity={0.5}
            progress={animationProgress}
            delay={0.72}
          />
          
          <EffectRing
            center={location}
            radius_km={results.thermal.firstDegree_km}
            color="#ffee88"
            opacity={0.4}
            progress={animationProgress}
            delay={0.76}
          />
        </>
      )}
      
      {enablePostProcessing && (
        <EffectComposer>
          <Bloom
            intensity={animationProgress > 0.25 && animationProgress < 0.40 ? 0.7 : 0.05}
            luminanceThreshold={0.85}
            luminanceSmoothing={0.9}
            blendFunction={BlendFunction.ADD}
          />
          {animationProgress > 0.25 && animationProgress < 0.38 && (
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


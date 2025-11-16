'use client'
import React, { useMemo, useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { NASATextureAssetManager } from './assets/NASATextureAssets'
import { EnhancedSun } from './stars/EnhancedSun'
import { EnhancedEarth } from './planets/EnhancedEarth'
import { EnhancedMars } from './planets/EnhancedMars'
import { EnhancedJupiter } from './planets/EnhancedJupiter'
import { EnhancedSaturn } from './planets/EnhancedSaturn'
import { Moon } from './planets/Moon'
import { CosmicDust } from './particles/CosmicDust'
import { EnhancedStarField } from './stars/EnhancedStarField'
import FPSMonitor from './performance/FPSMonitor'
import { PerformanceManager, createPerformanceManager } from './performance/PerformanceManager'
import PostProcessingManager from './rendering/PostProcessingManager'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { ProceduralAsteroidSystem } from './asteroids/ProceduralAsteroidSystem'
interface NASARealisticSolarSystemProps {
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  showOrbits?: boolean
  showStars?: boolean
  enableRotation?: boolean
  displayMode?: 'full' | 'earth_focus'
}
function ScenePerformanceManager({ quality, onQualityChange }: any) {
  const { gl, scene, camera } = useThree()
  const perfManagerRef = useRef<PerformanceManager | null>(null)
  const postProcessingRef = useRef<PostProcessingManager | null>(null)
  const [metrics, setMetrics] = useState<any>(null)
  useEffect(() => {
    perfManagerRef.current = createPerformanceManager(gl, scene, camera, {
      targetFPS: 60,
      enableAdaptiveQuality: true,
      showDebugInfo: false,
      logPerformanceWarnings: true
    })
    postProcessingRef.current = new PostProcessingManager(scene, camera, gl, {
      enableHDR: quality !== 'low',
      enableBloom: quality !== 'low',
      enableColorGrading: quality !== 'low',
      enableAntiAliasing: quality !== 'low',
      bloomStrength: quality === 'ultra' ? 0.3 : quality === 'high' ? 0.2 : 0.15,
      renderScale: quality === 'low' ? 0.75 : 1.0
    })
    perfManagerRef.current.on('quality_changed', (data: any) => {
      console.log('🎯 Quality auto-adjusted:', data)
      onQualityChange?.(data.to)
    })
    const metricsInterval = setInterval(() => {
      if (perfManagerRef.current) {
        setMetrics(perfManagerRef.current.getMetrics())
      }
    }, 500)
    return () => {
      clearInterval(metricsInterval)
      perfManagerRef.current?.dispose()
      postProcessingRef.current?.dispose()
    }
  }, [gl, scene, camera, quality])
  useFrame((state, delta) => {
    if (perfManagerRef.current) {
      perfManagerRef.current.update(delta)
    }
  })
  return null
}
function OrbitalPath({ radius, color = "#4A90E2", opacity = 0.1 }: any) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
function SolarSystemScene({ 
  quality = 'high',
  showOrbits = true,
  enableRotation = true,
  enableShadows = true,
  enableReflections = true,
  displayMode = 'full'
}: any) {
  const { camera } = useThree()
  const sunPosition = useMemo(() => new THREE.Vector3(-35, 0, 0), [])
  const earthPosition = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const [cameraPos, setCameraPos] = useState(new THREE.Vector3(0, 20, 35))
  useFrame(() => {
    setCameraPos(camera.position.clone())
  })
  return (
    <>
      {}
      <ambientLight intensity={0.15} />
      {}
      <directionalLight
        position={[-35, 10, 0]}
        intensity={2.5}
        castShadow={enableShadows && quality !== 'low'}
        shadow-mapSize-width={quality === 'ultra' ? 4096 : quality === 'high' ? 2048 : 1024}
        shadow-mapSize-height={quality === 'ultra' ? 4096 : quality === 'high' ? 2048 : 1024}
        shadow-camera-near={1}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0001}
      />
      {}
      <pointLight position={[20, 20, 20]} intensity={0.3} />
      <pointLight position={[-20, -20, -20]} intensity={0.2} />
      {}
      {enableReflections && quality !== 'low' && (
        <Environment preset="sunset" background={false} />
      )}
      {}
      <EnhancedSun
        position={[-35, 0, 0]}
        scale={4.5}
        quality={quality}
        enableCorona={quality !== 'low'}
        enableFlares={quality === 'high' || quality === 'ultra'}
        enableAnimation={enableRotation}
        coronaIntensity={1.0}
        lightIntensity={15}
      />
      {}
      <group castShadow receiveShadow>
        <EnhancedEarth
          position={[0, 0, 0]}
          scale={1.8}
          quality={quality}
          showClouds={quality !== 'low'}
          showAtmosphere={quality !== 'low'}
          showAurora={quality === 'high' || quality === 'ultra'}
          showCityLights={true}
          enableRotation={enableRotation}
          sunPosition={sunPosition}
          nasaTexture="/textures/earth-night.jpg"
          showEarthEvents={true}
        />
        {}
        {displayMode === 'full' && (
          <Moon 
            earthPosition={earthPosition}
            scale={0.35}
            quality={quality}
          />
        )}
      </group>
      {}
      {displayMode === 'full' && (quality === 'high' || quality === 'ultra') && (
        <group castShadow receiveShadow>
          <EnhancedMars
            position={[8, 0, -5]}
            scale={1.0}
            quality={quality}
            showAtmosphere={true}
            enableRotation={enableRotation}
          />
        </group>
      )}
      {}
      {displayMode === 'full' && (quality === 'high' || quality === 'ultra') && (
        <group castShadow receiveShadow>
          <EnhancedJupiter
            position={[18, 0, 8]}
            scale={2.6}
            quality={quality}
            enableAnimation={true}
            enableRotation={enableRotation}
          />
        </group>
      )}
      {}
      {displayMode === 'full' && (quality === 'high' || quality === 'ultra') && (
        <group castShadow receiveShadow>
          <EnhancedSaturn
            position={[28, 0, -10]}
            scale={2.2}
            quality={quality}
            showRings={true}
            enableRotation={enableRotation}
            sunPosition={sunPosition}
          />
        </group>
      )}
      {}
      <ProceduralAsteroidSystem
        count={quality === 'ultra' ? 100 : quality === 'high' ? 50 : quality === 'medium' ? 30 : 20}
        quality={quality}
        enableAnimation={false}
        enableOrbitalMechanics={false}
        distributionRadius={[14, 28]}
        enableThreatVisualization={false}
        enableOrbitalMechanics={false}
        maxAsteroids={100}
      />
      {}
      {displayMode === 'full' && quality !== 'low' && (
        <CosmicDust
          count={quality === 'ultra' ? 2000 : quality === 'high' ? 1200 : 800}
          quality={quality}
          radius={60}
        />
      )}
      {}
      <EnhancedStarField
        count={quality === 'ultra' ? 8000 : quality === 'high' ? 5000 : quality === 'medium' ? 3000 : 2000}
        quality={quality}
        radius={120}
        enableTwinkling={quality !== 'low'}
      />
      {}
      {showOrbits && (
        <>
          {}
          {displayMode === 'full' && (
            <>
              <OrbitalPath radius={Math.sqrt(8*8 + 5*5)} color="#E74C3C" opacity={0.08} />
              <OrbitalPath radius={Math.sqrt(18*18 + 8*8)} color="#F39C12" opacity={0.08} />
              <OrbitalPath radius={Math.sqrt(28*28 + 10*10)} color="#F1C40F" opacity={0.08} />
            </>
          )}
          {}
          <OrbitalPath radius={20} color="#888888" opacity={0.05} />
          <OrbitalPath radius={25} color="#888888" opacity={0.05} />
        </>
      )}
    </>
  )
}
export function NASARealisticSolarSystem({
  quality = 'high',
  showOrbits = true,
  showStars = true,
  enableRotation = true,
  displayMode = 'full'
}: NASARealisticSolarSystemProps) {
  const [showFPSMonitor] = useState(true) // Enable FPS monitoring for performance tracking
  const shadowsEnabled = quality !== 'low'
  const reflectionsEnabled = quality !== 'low'
  const setQuality = useDashboardStore((s) => s.setQuality)
  const mapQualityNameToLevel = (name: string): 'low' | 'medium' | 'high' => {
    const n = (name || '').toLowerCase()
    if (n.includes('düş') || n.includes('dus')) return 'low'
    if (n.includes('orta')) return 'medium'
    return 'high'
  }
  const cameraConfig = useMemo(() => {
    if (displayMode === 'earth_focus') {
      return {
        position: [15, 10, 20] as [number, number, number],
        fov: 45,
        target: [0, 0, 0] as [number, number, number], // Focus on Earth
        minDistance: 5,
        maxDistance: 50
      }
    }
    return {
      position: [0, 20, 35] as [number, number, number],
      fov: 50,
      target: [0, 0, 0] as [number, number, number],
      minDistance: 8,
      maxDistance: 150
    }
  }, [displayMode])
  return (
    <div className="h-full w-full relative bg-gradient-to-b from-space-black via-space-dark to-space-black">
      <Canvas
      camera={{ position: cameraConfig.position, fov: cameraConfig.fov }}
      shadows={shadowsEnabled}
      gl={{
        antialias: quality !== 'low',
        powerPreference: quality === 'low' ? 'low-power' : 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.0
      }}
    >
      <Suspense fallback={null}>
        {}
        <ScenePerformanceManager 
          quality={quality}
          onQualityChange={(to: string) => {
            try {
              const lvl = mapQualityNameToLevel(to)
              setQuality(lvl)
            } catch {}
          }}
        />
        <SolarSystemScene
          quality={quality}
          showOrbits={showOrbits}
          enableRotation={enableRotation}
          enableShadows={shadowsEnabled}
          enableReflections={reflectionsEnabled}
          displayMode={displayMode}
        />
          {}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={cameraConfig.minDistance}
            maxDistance={cameraConfig.maxDistance}
            maxPolarAngle={Math.PI / 1.5}
            target={cameraConfig.target}
          />
        </Suspense>
      </Canvas>
      {}
      {showFPSMonitor && (
        <div className="absolute top-4 right-4 z-20">
          <FPSMonitor
            compact={quality === 'low' || quality === 'medium'}
            showGraph={quality === 'high' || quality === 'ultra'}
            showDetails={quality === 'ultra'}
          />
        </div>
      )}
    </div>
  )
}
export default NASARealisticSolarSystem
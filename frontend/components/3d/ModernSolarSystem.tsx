'use client'
import React, { useMemo, useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { OptimizedEarth } from './OptimizedEarth'
import { PerformantAsteroids } from './PerformantAsteroids'
import { useAsteroidData } from '@/hooks/use-asteroid-data'
interface ModernSolarSystemProps {
  enablePerformanceMode?: boolean
  quality?: 'low' | 'medium' | 'high'
}
const sunMaterialCache = new Map<string, THREE.Material>()
const ModernSun = React.memo(({ quality = 'high' }: { quality?: 'low' | 'medium' | 'high' }) => {
  const sunRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  const lastUpdateTime = useRef(0)
  const updateInterval = useRef(16) 
  const sunSize = useMemo(() => {
    switch (quality) {
      case 'low': return 2.5
      case 'medium': return 3.5
      case 'high': return 4.5
      default: return 4.5
    }
  }, [quality])
  const segments = useMemo(() => {
    switch (quality) {
      case 'low': return 16
      case 'medium': return 32
      case 'high': return 48
      default: return 48
    }
  }, [quality])
  const sunMaterial = useMemo(() => {
    const cacheKey = `sun_material_${quality}`
    if (sunMaterialCache.has(cacheKey)) {
      return sunMaterialCache.get(cacheKey)!
    }
    const material = new THREE.MeshBasicMaterial({
      color: '#FDB813'
    })
    sunMaterialCache.set(cacheKey, material)
    return material
  }, [quality])
  const coronaMaterial = useMemo(() => {
    const cacheKey = `corona_material_${quality}`
    if (sunMaterialCache.has(cacheKey)) {
      return sunMaterialCache.get(cacheKey) as THREE.ShaderMaterial
    }
    const material = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        time: { value: 0 },
        intensity: { value: quality === 'high' ? 0.7 : 0.4 }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
          rim = smoothstep(0.3, 1.0, rim);
          float pulse = sin(time * 1.5) * 0.2 + 0.8;
          float flicker = sin(time * 8.0) * 0.1 + 0.9;
          vec3 color = vec3(1.0, 0.7, 0.2) * rim * pulse * flicker * intensity;
          gl_FragColor = vec4(color, rim * 0.8);
        }
      `
    })
    sunMaterialCache.set(cacheKey, material)
    return material
  }, [quality])
  useFrame((state, delta) => {
    const now = performance.now()
    if (now - lastUpdateTime.current < updateInterval.current) return
    lastUpdateTime.current = now
    if (sunRef.current) {
      sunRef.current.rotation.y += delta * 0.1
    }
    if (coronaRef.current && coronaMaterial.uniforms) {
      coronaMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })
  return (
    <group position={[-20, 0, 0]}>
      <mesh ref={sunRef}>
        <sphereGeometry args={[sunSize, segments, segments]} />
        <primitive object={sunMaterial} />
      </mesh>
      {quality !== 'low' && (
        <mesh ref={coronaRef} scale={sunSize * 1.15}>
          <sphereGeometry args={[1, segments / 2, segments / 2]} />
          <primitive object={coronaMaterial} />
        </mesh>
      )}
      <pointLight
        position={[0, 0, 0]}
        intensity={quality === 'high' ? 10 : quality === 'medium' ? 8 : 6}
        distance={300}
        color="#FDB813"
        castShadow={quality === 'high'}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </group>
  )
})
const starFieldCache = new Map<string, { positions: Float32Array, colors: Float32Array }>()
const starMaterialCache = new Map<string, THREE.PointsMaterial>()
const StarField = React.memo(({ count = 1000, quality }: { count?: number, quality: 'low' | 'medium' | 'high' }) => {
  const starsRef = useRef<THREE.Points>(null)
  const lastUpdateTime = useRef(0)
  const updateInterval = useRef(32) 
  const starCount = useMemo(() => {
    switch (quality) {
      case 'low': return Math.min(count, 300)
      case 'medium': return Math.min(count, 600) 
      case 'high': return count
      default: return count
    }
  }, [count, quality])
  const [positions, colors] = useMemo(() => {
    const cacheKey = `starfield_${starCount}_${quality}`
    if (starFieldCache.has(cacheKey)) {
      const cached = starFieldCache.get(cacheKey)!
      return [cached.positions, cached.colors]
    }
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * 500
      positions[i3 + 1] = (Math.random() - 0.5) * 500
      positions[i3 + 2] = (Math.random() - 0.5) * 500
      const intensity = Math.random() * 0.8 + 0.2
      colors[i3] = intensity
      colors[i3 + 1] = intensity * 0.9
      colors[i3 + 2] = intensity * 0.8
    }
    starFieldCache.set(cacheKey, { positions, colors })
    return [positions, colors]
  }, [starCount, quality])
  const starMaterial = useMemo(() => {
    const cacheKey = `star_material_${quality}`
    if (starMaterialCache.has(cacheKey)) {
      return starMaterialCache.get(cacheKey)!
    }
    const material = new THREE.PointsMaterial({
      size: quality === 'high' ? 2 : 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
    starMaterialCache.set(cacheKey, material)
    return material
  }, [quality])
  useFrame((state, delta) => {
    const now = performance.now()
    if (now - lastUpdateTime.current < updateInterval.current) return
    lastUpdateTime.current = now
    if (starsRef.current) {
      starsRef.current.rotation.y += delta * 0.001
      starsRef.current.rotation.x += delta * 0.0005
    }
  })
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <primitive object={new THREE.BufferAttribute(positions, 3)} attach="attributes-position" />
        <primitive object={new THREE.BufferAttribute(colors, 3)} attach="attributes-color" />
      </bufferGeometry>
      <primitive object={starMaterial} />
    </points>
  )
})
export const ModernSolarSystem = React.memo(({
  enablePerformanceMode = false,
  quality = 'high'
}: ModernSolarSystemProps) => {
  const [currentQuality, setCurrentQuality] = useState(quality)
  const { asteroids, isLoading, error } = useAsteroidData({
    autoRefresh: false,
    refreshInterval: 300000 
  })
  useEffect(() => {
    if (enablePerformanceMode) {
      setCurrentQuality('low')
    } else {
      setCurrentQuality(quality)
    }
  }, [enablePerformanceMode, quality])
  const asteroidCount = useMemo(() => {
    if (isLoading || error) {
      switch (currentQuality) {
        case 'low': return 20
        case 'medium': return 50
        case 'high': return 100
        default: return 100
      }
    }
    const realCount = asteroids.length
    switch (currentQuality) {
      case 'low': return Math.min(realCount, 20)
      case 'medium': return Math.min(realCount, 50)
      case 'high': return Math.min(realCount, 100)
      default: return Math.min(realCount, 100)
    }
  }, [currentQuality, asteroids.length, isLoading, error])
  const starCount = useMemo(() => {
    switch (currentQuality) {
      case 'low': return 1000
      case 'medium': return 1500
      case 'high': return 2000
      default: return 2000
    }
  }, [currentQuality])
  return (
    <group>
      <StarField count={starCount} quality={currentQuality} />
      <ModernSun quality={currentQuality} />
      <OptimizedEarth
        position={[0, 0, 0]}
        scale={1.5}
        quality={currentQuality}
        showClouds={currentQuality !== 'low'}
        showAtmosphere={currentQuality === 'high'}
      />
      <PerformantAsteroids
        count={asteroidCount}
        enableAnimation={false}
        quality={currentQuality}
        distributionRadius={[12, 25]}
        nasaAsteroidsData={asteroids}
        useRealData={true}
      />
      {currentQuality === 'high' && (
        <>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[11.5, 12.5, 64]} />
            <meshBasicMaterial
              color="#4444ff"
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[24, 26, 32]} />
            <meshBasicMaterial
              color="#ff4444"
              transparent
              opacity={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  )
})
export default ModernSolarSystem
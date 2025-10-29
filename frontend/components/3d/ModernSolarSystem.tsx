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

const ModernSun = React.memo(({ quality = 'high' }: { quality?: 'low' | 'medium' | 'high' }) => {
  const sunRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  
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
    return new THREE.MeshBasicMaterial({
      color: '#FDB813'
    })
  }, [])

  const coronaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
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
  }, [quality])

  useFrame((state, delta) => {
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

const StarField = React.memo(({ count = 1000, quality }: { count?: number, quality: 'low' | 'medium' | 'high' }) => {
  const starsRef = useRef<THREE.Points>(null)
  
  const starCount = useMemo(() => {
    switch (quality) {
      case 'low': return Math.min(count, 300)
      case 'medium': return Math.min(count, 600) 
      case 'high': return count
      default: return count
    }
  }, [count, quality])

  const [positions, colors] = useMemo(() => {
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
    
    return [positions, colors]
  }, [starCount])

  const starMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: quality === 'high' ? 2 : 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
  }, [quality])

  useFrame((state, delta) => {
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
  
  // NASA API'sinden gerçek asteroid verileri al
  const { asteroids, isLoading, error } = useAsteroidData({
    autoRefresh: false,
    refreshInterval: 300000 // 5 dakika
  })
  
  useEffect(() => {
    if (enablePerformanceMode) {
      setCurrentQuality('low')
    } else {
      setCurrentQuality(quality)
    }
  }, [enablePerformanceMode, quality])

  // Kalite ve NASA verisi durumuna göre asteroid sayısını belirle
  const asteroidCount = useMemo(() => {
    if (isLoading || error) {
      // Yükleme/hata durumunda fallback sayısı
      switch (currentQuality) {
        case 'low': return 20
        case 'medium': return 50
        case 'high': return 100
        default: return 100
      }
    }
    
    // NASA API'sinden gelen gerçek veri sayısı
    const realCount = asteroids.length
    
    // Kalite ayarına göre sınırla
    switch (currentQuality) {
      case 'low': return Math.min(realCount, 20)
      case 'medium': return Math.min(realCount, 50)
      case 'high': return Math.min(realCount, 100)
      default: return Math.min(realCount, 100)
    }
  }, [currentQuality, asteroids.length, isLoading, error])

  console.log(`🌌 ModernSolarSystem: ${asteroids.length} NASA asteroids, showing ${asteroidCount}`)

  return (
    <group>
      <StarField count={currentQuality === 'high' ? 2000 : 1000} quality={currentQuality} />
      
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
        enableAnimation={!enablePerformanceMode}
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
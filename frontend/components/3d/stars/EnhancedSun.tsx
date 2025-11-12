'use client'
import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { createSolarCoronaMaterial, updateSolarCorona } from '../shaders/SolarCoronaShader'
interface EnhancedSunProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  enableCorona?: boolean
  enableFlares?: boolean
  enableAnimation?: boolean
  coronaIntensity?: number
  lightIntensity?: number
  nasaTexture?: string
}
function SolarFlares({ 
  parentScale, 
  quality,
  count = 100 
}: { 
  parentScale: number
  quality: 'low' | 'medium' | 'high' | 'ultra'
  count?: number 
}) {
  const particlesRef = useRef<THREE.Points>(null)
  const particleCount = useMemo(() => {
    const multipliers = { low: 0.3, medium: 0.5, high: 0.75, ultra: 1.0 }
    return Math.floor(count * multipliers[quality])
  }, [count, quality])
  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = parentScale * (1.0 + Math.random() * 0.3)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      const colorVariation = Math.random()
      colors[i * 3] = 1.0
      colors[i * 3 + 1] = 0.6 + colorVariation * 0.4
      colors[i * 3 + 2] = 0.2 + colorVariation * 0.3
      sizes[i] = 0.1 + Math.random() * 0.3
    }
    return { positions, colors, sizes }
  }, [particleCount, parentScale])
  useFrame((state, delta) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3
        const x = positions[idx]
        const y = positions[idx + 1]
        const z = positions[idx + 2]
        const length = Math.sqrt(x * x + y * y + z * z)
        if (length < parentScale * 2.0) {
          positions[idx] += (x / length) * delta * 0.5
          positions[idx + 1] += (y / length) * delta * 0.5
          positions[idx + 2] += (z / length) * delta * 0.5
        } else {
          const theta = Math.random() * Math.PI * 2
          const phi = Math.acos(2 * Math.random() - 1)
          const radius = parentScale * (1.0 + Math.random() * 0.1)
          positions[idx] = radius * Math.sin(phi) * Math.cos(theta)
          positions[idx + 1] = radius * Math.sin(phi) * Math.sin(theta)
          positions[idx + 2] = radius * Math.cos(phi)
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.rotation.y += delta * 0.05
    }
  })
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <primitive object={new THREE.BufferAttribute(positions, 3)} attach="attributes-position" />
        <primitive object={new THREE.BufferAttribute(colors, 3)} attach="attributes-color" />
        <primitive object={new THREE.BufferAttribute(sizes, 1)} attach="attributes-size" />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}
export function EnhancedSun({
  position = [-20, 0, 0],
  scale = 4.5,
  quality = 'high',
  enableCorona = true,
  enableFlares = true,
  enableAnimation = true,
  coronaIntensity = 1.0,
  lightIntensity = 15,
  nasaTexture = '/textures/nasa/sun/sun_sdo_2k.jpg'
}: EnhancedSunProps) {
  const sunRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  const corona2Ref = useRef<THREE.Mesh>(null)
  const sunTexture = useLoader(THREE.TextureLoader, nasaTexture)
  const coronaMaterial = useMemo(() => {
    if (!enableCorona) return null
    return createSolarCoronaMaterial({
      intensity: coronaIntensity,
      glowColor: new THREE.Color(0xffaa33),
      coronaScale: 1.2,
      pulseSpeed: 1.0,
    })
  }, [enableCorona, coronaIntensity])
  const corona2Material = useMemo(() => {
    if (!enableCorona) return null
    return createSolarCoronaMaterial({
      intensity: coronaIntensity * 0.6,
      glowColor: new THREE.Color(0xff8833),
      coronaScale: 1.4,
      pulseSpeed: 0.7,
    })
  }, [enableCorona, coronaIntensity])
  useFrame((state, delta) => {
    if (enableAnimation && sunRef.current) {
      sunRef.current.rotation.y += delta * 0.05
    }
    if (coronaMaterial && coronaRef.current) {
      updateSolarCorona(coronaMaterial, delta)
    }
    if (corona2Material && corona2Ref.current) {
      updateSolarCorona(corona2Material, delta)
    }
  })
  return (
    <group position={position}>
      {}
      <mesh ref={sunRef}>
        <sphereGeometry args={[scale, 64, 64]} />
        <meshStandardMaterial
          map={sunTexture}
          emissive="#ffaa33"
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>
      {}
      {enableCorona && coronaMaterial && (
        <mesh ref={coronaRef} scale={1.15}>
          <sphereGeometry args={[scale, 64, 64]} />
          <primitive object={coronaMaterial} attach="material" />
        </mesh>
      )}
      {}
      {enableCorona && quality !== 'low' && corona2Material && (
        <mesh ref={corona2Ref} scale={1.35}>
          <sphereGeometry args={[scale, 48, 48]} />
          <primitive object={corona2Material} attach="material" />
        </mesh>
      )}
      {}
      {enableFlares && (quality === 'high' || quality === 'ultra') && (
        <SolarFlares 
          parentScale={scale} 
          quality={quality}
          count={quality === 'ultra' ? 150 : 100}
        />
      )}
      {}
      <pointLight
        intensity={lightIntensity}
        distance={100}
        decay={2}
        color="#ffffff"
        castShadow={quality === 'ultra'}
      />
      {}
      {quality !== 'low' && (
        <pointLight
          intensity={lightIntensity * 0.3}
          distance={150}
          decay={1.5}
          color="#ffaa33"
        />
      )}
    </group>
  )
}
export default EnhancedSun
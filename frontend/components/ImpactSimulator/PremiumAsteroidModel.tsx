'use client'

import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { realAsteroidTextures, AsteroidType } from '@/services/RealAsteroidTextures'

interface PremiumAsteroidModelProps {
  diameter: number
  atmosphereProgress?: number
  velocity?: number
  asteroidType?: AsteroidType
  quality?: 'low' | 'medium' | 'high' | 'ultra'
}

function getBlackbodyColor(temperature: number): THREE.Color {
  if (temperature > 6000) return new THREE.Color(1.0, 1.0, 1.0)
  if (temperature > 4000) return new THREE.Color(1.0, 0.9, 0.7)
  if (temperature > 2500) return new THREE.Color(1.0, 0.6, 0.2)
  if (temperature > 1500) return new THREE.Color(1.0, 0.3, 0.1)
  return new THREE.Color(0.5, 0.1, 0.0)
}

export function PremiumAsteroidModel({ 
  diameter, 
  atmosphereProgress = 0,
  velocity = 20,
  asteroidType = 'C-type',
  quality = 'high'
}: PremiumAsteroidModelProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  
  // Determine geometry detail level based on quality
  const subdivisionLevel = useMemo(() => {
    switch (quality) {
      case 'ultra': return 6
      case 'high': return 5
      case 'medium': return 4
      case 'low': return 3
    }
  }, [quality])
  
  // Generate high-detail asteroid geometry
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, subdivisionLevel)
    const positions = geo.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      // Multi-scale procedural displacement
      const largeFeatures = Math.sin(vertex.x * 5) * Math.cos(vertex.y * 4) * Math.sin(vertex.z * 6)
      const mediumFeatures = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 10) * Math.sin(vertex.z * 15)
      const smallFeatures = Math.sin(vertex.x * 24) * Math.cos(vertex.y * 20) * Math.sin(vertex.z * 30)
      const microFeatures = Math.sin(vertex.x * 48) * Math.cos(vertex.y * 40) * Math.sin(vertex.z * 60)
      
      // Crater depressions
      const craterNoise = Math.sin(vertex.x * 8) * Math.cos(vertex.y * 7) * Math.sin(vertex.z * 9)
      const deepCraters = Math.pow(Math.max(0, craterNoise), 3) * -0.4
      
      // Boulder protrusions
      const boulderNoise = Math.abs(Math.sin(vertex.x * 6)) * Math.abs(Math.cos(vertex.z * 7))
      const boulders = boulderNoise > 0.7 ? Math.pow(boulderNoise - 0.7, 2) * 1.5 : 0
      
      // Ridge formations
      const ridges = Math.abs(Math.sin(vertex.x * 10) * Math.cos(vertex.y * 10)) * 0.15
      
      const combinedDisplacement = 
        largeFeatures * 0.25 + 
        mediumFeatures * 0.15 + 
        smallFeatures * 0.08 + 
        microFeatures * 0.04 +
        deepCraters +
        boulders +
        ridges
      
      vertex.normalize()
      vertex.multiplyScalar(1.0 + combinedDisplacement * 0.6)
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    geo.computeVertexNormals()
    geo.computeTangents()
    return geo
  }, [subdivisionLevel])
  
  // Generate real NASA-quality textures
  const asteroidTextures = useMemo(() => {
    const resolution = quality === 'ultra' ? 2048 : quality === 'high' ? 1024 : 512
    return realAsteroidTextures.generateAsteroidTextures(asteroidType, resolution, diameter)
  }, [asteroidType, quality, diameter])
  
  const heatIntensity = atmosphereProgress * (velocity / 30)
  const temperature = 300 + heatIntensity * 6000
  const heatColor = getBlackbodyColor(temperature)
  
  const atmosphereShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        glowColor: { value: heatColor },
        intensity: { value: heatIntensity },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        uniform float time;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0, 0, 1))), 2.0);
          float flicker = sin(time * 10.0) * 0.1 + 0.9;
          float alpha = fresnel * intensity * flicker;
          
          gl_FragColor = vec4(glowColor, alpha);
        }
      `
    })
  }, [heatColor, heatIntensity])
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x += delta * 0.1
    }
    
    if (glowRef.current && atmosphereProgress > 0) {
      const pulsate = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 1
      glowRef.current.scale.setScalar(1 + atmosphereProgress * 0.3 * pulsate)
    }
    
    if (atmosphereShader.uniforms) {
      atmosphereShader.uniforms.time.value = state.clock.elapsedTime
      atmosphereShader.uniforms.intensity.value = heatIntensity
      atmosphereShader.uniforms.glowColor.value = heatColor
    }
  })
  
  // Ultra-realistic PBR material
  const asteroidMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      map: asteroidTextures.diffuse,
      normalMap: asteroidTextures.normal,
      normalScale: new THREE.Vector2(3.5, 3.5),
      roughnessMap: asteroidTextures.roughness,
      roughness: 0.92,
      metalnessMap: asteroidType === 'M-type' ? asteroidTextures.roughness : undefined,
      metalness: asteroidType === 'M-type' ? 0.6 : 0.08,
      displacementMap: asteroidTextures.displacement,
      displacementScale: 0.15,
      aoMap: asteroidTextures.ao,
      aoMapIntensity: 1.2,
      emissive: heatColor,
      emissiveIntensity: Math.min(heatIntensity * 1.5, 2.0),
      clearcoat: asteroidType === 'M-type' ? 0.3 : 0.0,
      clearcoatRoughness: 0.4,
      envMapIntensity: 0.5,
      reflectivity: asteroidType === 'M-type' ? 0.5 : 0.1
    })
    
    material.needsUpdate = true
    return material
  }, [asteroidTextures, heatColor, heatIntensity, asteroidType])
  
  // Update material on heat changes
  useEffect(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshPhysicalMaterial
      mat.emissive = heatColor
      mat.emissiveIntensity = Math.min(heatIntensity * 1.5, 2.0)
    }
  }, [heatColor, heatIntensity])
  
  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <primitive object={asteroidMaterial} attach="material" />
      </mesh>
      
      {atmosphereProgress > 0 && (
        <mesh ref={glowRef} geometry={geometry} scale={1.15}>
          <primitive object={atmosphereShader} attach="material" />
        </mesh>
      )}
    </group>
  )
}


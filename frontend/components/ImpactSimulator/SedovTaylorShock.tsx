'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SedovTaylorShockProps {
  impactPosition: THREE.Vector3
  energy_joules: number
  progress: number
  delay: number
}

export function SedovTaylorShock({
  impactPosition,
  energy_joules,
  progress,
  delay
}: SedovTaylorShockProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const calculateShockRadius = (time_s: number, energy: number): number => {
    const xi = 1.03
    const rho_air = 1.225
    const t_squared = time_s * time_s
    
    const R = xi * Math.pow((energy * t_squared) / rho_air, 0.2)
    
    return R / 1000
  }
  
  const shockMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        shockRadius: { value: 0 },
        maxRadius: { value: 10 },
        progress: { value: 0 }
      },
      vertexShader: `
        uniform float shockRadius;
        uniform float progress;
        
        varying vec2 vUv;
        varying float vDistance;
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          float dist = length(pos.xy);
          vDistance = dist;
          
          float wave = sin((dist - shockRadius) * 50.0) * 0.03;
          wave *= smoothstep(shockRadius + 0.5, shockRadius, dist);
          wave *= smoothstep(0.0, shockRadius - 0.5, dist);
          
          pos.z += wave * progress;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float shockRadius;
        uniform float progress;
        uniform float time;
        
        varying vec2 vUv;
        varying float vDistance;
        
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          
          float shockFront = abs(vDistance - shockRadius);
          float frontIntensity = 1.0 - smoothstep(0.0, 0.3, shockFront);
          
          float wave = sin((vDistance - shockRadius) * 40.0 + time * 10.0) * 0.5 + 0.5;
          
          vec3 color = mix(
            vec3(1.0, 0.5, 0.0),
            vec3(1.0, 1.0, 0.5),
            frontIntensity
          );
          
          float alpha = frontIntensity * wave * progress * 0.7;
          
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  }, [])
  
  useFrame((state) => {
    if (!meshRef.current) return
    
    if (progress < delay || progress > 0.95) {
      meshRef.current.visible = false
      return
    }
    
    meshRef.current.visible = true
    
    const localProgress = (progress - delay) / (0.95 - delay)
    const time_s = localProgress * 30
    
    const R_km = calculateShockRadius(time_s, energy_joules)
    const R_scaled = (R_km / 6371) * 1.8
    
    if (shockMaterial.uniforms) {
      shockMaterial.uniforms.time.value = state.clock.elapsedTime
      shockMaterial.uniforms.shockRadius.value = R_scaled
      shockMaterial.uniforms.progress.value = Math.min(localProgress * 1.5, 1)
    }
    
    meshRef.current.scale.setScalar(R_scaled * 3)
  })
  
  const normal = useMemo(() => impactPosition.clone().normalize(), [impactPosition])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  
  return (
    <mesh
      ref={meshRef}
      position={impactPosition}
      quaternion={quaternion}
      visible={false}
    >
      <planeGeometry args={[2, 2, 64, 64]} />
      <primitive object={shockMaterial} attach="material" />
    </mesh>
  )
}


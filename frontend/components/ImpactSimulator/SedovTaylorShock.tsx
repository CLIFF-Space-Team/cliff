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
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          float dist = length(position.xy) / 2.0;
          vDistance = dist;
          float wave = sin((dist - shockRadius) * 30.0) * 0.04;
          wave *= smoothstep(shockRadius + 0.1, shockRadius, dist);
          wave *= smoothstep(0.0, shockRadius - 0.1, dist);
          vec3 displaced = position + normal * wave * progress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float shockRadius;
        uniform float progress;
        uniform float time;
        varying vec2 vUv;
        varying float vDistance;
        varying vec3 vNormal;
        void main() {
          float dist = vDistance;
          float shockFront = abs(dist - shockRadius);
          float frontIntensity = 1.0 - smoothstep(0.0, 0.15, shockFront);
          float wave = sin((dist - shockRadius) * 35.0 + time * 8.0) * 0.5 + 0.5;
          vec3 color = mix(
            vec3(1.0, 0.4, 0.0),  // Turuncu
            vec3(1.0, 1.0, 0.7),  // Sarı-beyaz
            frontIntensity
          );
          float alpha = frontIntensity * wave * progress * 1.5;
          float edgeFade = smoothstep(0.0, 0.05, dist) * smoothstep(1.0, 0.85, dist);
          alpha *= edgeFade;
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
    meshRef.current.position.copy(impactPosition)
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
      {}
      <sphereGeometry args={[2, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <primitive object={shockMaterial} attach="material" />
    </mesh>
  )
}

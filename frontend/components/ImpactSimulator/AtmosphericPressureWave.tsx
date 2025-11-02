'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface AtmosphericPressureWaveProps {
  impactPosition: THREE.Vector3
  progress: number
  pressure_psi: number
  radius_km: number
  delay: number
  earthRadius?: number
}

export function AtmosphericPressureWave({
  impactPosition,
  progress,
  pressure_psi,
  radius_km,
  delay,
  earthRadius = 1.8
}: AtmosphericPressureWaveProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  // Basınç değerine göre renk ve yoğunluk
  const waveConfig = useMemo(() => {
    if (pressure_psi >= 20) {
      return { color: new THREE.Color(1.0, 0.1, 0.0), intensity: 2.5, name: '20+ PSI - Yapısal yıkım' }
    } else if (pressure_psi >= 10) {
      return { color: new THREE.Color(1.0, 0.3, 0.0), intensity: 2.0, name: '10 PSI - Ağır hasar' }
    } else if (pressure_psi >= 5) {
      return { color: new THREE.Color(1.0, 0.5, 0.0), intensity: 1.5, name: '5 PSI - Orta hasar' }
    } else if (pressure_psi >= 1) {
      return { color: new THREE.Color(1.0, 0.7, 0.2), intensity: 1.0, name: '1 PSI - Cam kırılması' }
    } else {
      return { color: new THREE.Color(1.0, 0.9, 0.5), intensity: 0.5, name: '< 1 PSI - Hafif etki' }
    }
  }, [pressure_psi])
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        waveRadius: { value: 0 },
        intensity: { value: waveConfig.intensity },
        color: { value: waveConfig.color },
        impactCenter: { value: impactPosition }
      },
      vertexShader: `
        uniform float progress;
        uniform float waveRadius;
        uniform vec3 impactCenter;
        
        varying float vDistanceFromImpact;
        varying vec3 vNormal;
        
        float sphericalDistance(vec3 p1, vec3 p2) {
          vec3 n1 = normalize(p1);
          vec3 n2 = normalize(p2);
          return acos(clamp(dot(n1, n2), -1.0, 1.0));
        }
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          
          vec3 spherePos = normalize(position);
          vec3 impactPos = normalize(impactCenter);
          
          vDistanceFromImpact = sphericalDistance(spherePos, impactPos);
          
          // Basınç dalgası deformasyonu
          float distFromWave = abs(vDistanceFromImpact - waveRadius);
          float compression = exp(-distFromWave * 25.0) * 0.05 * progress;
          
          vec3 displaced = position * (1.0 + compression);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform float waveRadius;
        uniform float intensity;
        uniform vec3 color;
        
        varying float vDistanceFromImpact;
        varying vec3 vNormal;
        
        void main() {
          // Dalga cephesi
          float distFromWave = abs(vDistanceFromImpact - waveRadius);
          
          // Basınç dalgası profili
          float pressureWave = exp(-distFromWave * 18.0);
          
          // Kompresyon ve rarefaction
          float oscillation = sin((vDistanceFromImpact - waveRadius) * 40.0 + time * 4.0) * 0.3 + 0.7;
          
          // Toplam yoğunluk
          float totalIntensity = pressureWave * oscillation * intensity;
          
          // Renk
          vec3 finalColor = color;
          
          // Alpha
          float alpha = totalIntensity * 0.6;
          alpha *= smoothstep(0.0, 0.1, vDistanceFromImpact);
          alpha *= smoothstep(3.14159, 2.0, vDistanceFromImpact);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    })
  }, [waveConfig, impactPosition])
  
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return
    
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    
    if (adjustedProgress <= 0 || progress >= 0.98) {
      meshRef.current.visible = false
      return
    }
    
    meshRef.current.visible = true
    
    const earthRadius_km = 6371
    const maxAngle = radius_km / earthRadius_km
    const currentAngle = maxAngle * Math.pow(adjustedProgress, 0.6)
    
    materialRef.current.uniforms.time.value = state.clock.elapsedTime
    materialRef.current.uniforms.progress.value = adjustedProgress
    materialRef.current.uniforms.waveRadius.value = currentAngle
  })
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[earthRadius * 1.006, 128, 128]} />
      <primitive ref={materialRef} object={shaderMaterial} attach="material" />
    </mesh>
  )
}


'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SphericalShockWaveProps {
  center: THREE.Vector3
  progress: number
  maxRadius_km: number
  color: string
  opacity: number
  delay: number
  intensity: number
  earthRadius?: number
}

export function SphericalShockWave({
  center,
  progress,
  maxRadius_km,
  color,
  opacity,
  delay,
  intensity,
  earthRadius = 1.8
}: SphericalShockWaveProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        shockRadius: { value: 0 },
        intensity: { value: intensity },
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity },
        impactCenter: { value: center }
      },
      vertexShader: `
        uniform float progress;
        uniform float shockRadius;
        uniform vec3 impactCenter;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromImpact;
        
        // Dünya yüzeyinde açısal mesafe hesaplama
        float sphericalDistance(vec3 p1, vec3 p2) {
          vec3 n1 = normalize(p1);
          vec3 n2 = normalize(p2);
          float dotProduct = dot(n1, n2);
          dotProduct = clamp(dotProduct, -1.0, 1.0);
          return acos(dotProduct);
        }
        
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          
          // Dünya merkezinden normalize edilmiş pozisyon
          vec3 spherePos = normalize(position);
          vec3 impactPos = normalize(impactCenter);
          
          // Açısal mesafe (radyan)
          vDistanceFromImpact = sphericalDistance(spherePos, impactPos);
          
          // Şok dalgası deformasyonu
          float shockAngle = shockRadius;
          float distFromShock = abs(vDistanceFromImpact - shockAngle);
          
          // Dalga yüksekliği
          float waveHeight = 0.0;
          if (distFromShock < 0.3) {
            waveHeight = exp(-distFromShock * 15.0) * 0.08 * progress;
          }
          
          // Normal boyunca displacement
          vec3 displaced = position * (1.0 + waveHeight);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform float shockRadius;
        uniform float intensity;
        uniform vec3 color;
        uniform float opacity;
        
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromImpact;
        
        void main() {
          // Şok dalgası cephesi
          float shockAngle = shockRadius;
          float distFromShock = abs(vDistanceFromImpact - shockAngle);
          
          // Ana şok dalgası (Mach stem)
          float mainShock = exp(-distFromShock * 20.0);
          
          // İkincil dalgalar (rarefaction waves)
          float secondaryWaves = 0.0;
          for (int i = 1; i <= 3; i++) {
            float offset = float(i) * 0.1;
            float wave = exp(-abs(vDistanceFromImpact - shockAngle + offset) * 15.0) * 0.5;
            secondaryWaves += wave / float(i);
          }
          
          // Türbülans efekti
          float turbulence = sin(vDistanceFromImpact * 50.0 + time * 5.0) * 
                            cos(vDistanceFromImpact * 30.0 - time * 3.0);
          turbulence = turbulence * 0.5 + 0.5;
          turbulence *= exp(-distFromShock * 10.0);
          
          // Toplam intensity
          float totalIntensity = mainShock * 2.5 + secondaryWaves * 1.2 + turbulence * 0.8;
          
          // Sıcaklık tabanlı renk gradyanı
          vec3 coolColor = color;
          vec3 hotColor = vec3(1.0, 0.95, 0.8);
          vec3 finalColor = mix(coolColor, hotColor, mainShock * 0.8);
          
          // Opacity - görünürlük artırıldı
          float alpha = totalIntensity * opacity * intensity;
          
          // Kenar yumuşatma
          float edgeFade = smoothstep(0.0, 0.05, vDistanceFromImpact);
          alpha *= edgeFade;
          
          // Fade out uzaklaştıkça
          alpha *= smoothstep(3.14159, 2.5, vDistanceFromImpact);
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    })
  }, [color, opacity, intensity, center])
  
  const normal = useMemo(() => {
    return center.clone().normalize()
  }, [center])
  
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return
    
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    
    if (adjustedProgress <= 0 || progress >= 0.98) {
      meshRef.current.visible = false
      return
    }
    
    meshRef.current.visible = true
    
    // Açısal yayılım (radyan cinsinden)
    const earthRadius_km = 6371
    const maxAngle = (maxRadius_km / earthRadius_km) // Açısal mesafe
    const currentAngle = maxAngle * Math.pow(adjustedProgress, 0.5) // Sqrt için daha hızlı yayılım
    
    materialRef.current.uniforms.time.value = state.clock.elapsedTime
    materialRef.current.uniforms.progress.value = adjustedProgress
    materialRef.current.uniforms.shockRadius.value = currentAngle
    materialRef.current.uniforms.opacity.value = opacity * Math.sin(adjustedProgress * Math.PI)
  })
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* Tam sphere - dünya yüzeyini tamamen kaplar */}
      <sphereGeometry args={[earthRadius * 1.005, 128, 128]} />
      <primitive ref={materialRef} object={shaderMaterial} attach="material" />
    </mesh>
  )
}


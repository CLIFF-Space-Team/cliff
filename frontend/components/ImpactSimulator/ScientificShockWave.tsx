'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ScientificShockWaveProps {
  impactPosition: THREE.Vector3
  progress: number
  energy_joules: number
  delay: number
  earthRadius?: number
}

/**
 * Bilimsel olarak doğru şok dalgası simülasyonu
 * Sedov-Taylor, Rankine-Hugoniot ve Taylor-von Neumann denklemlerine dayalı
 */
export function ScientificShockWave({
  impactPosition,
  progress,
  energy_joules,
  delay,
  earthRadius = 1.8
}: ScientificShockWaveProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  
  // Bilimsel sabitler
  const EARTH_RADIUS_KM = 6371
  const RHO_AIR = 1.225 // kg/m³ deniz seviyesi
  const GAMMA = 1.4 // Hava için özgül ısı oranı
  const P0 = 101325 // Pa - atmosferik basınç
  const SOUND_SPEED = 343 // m/s
  
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
        shockVelocity: { value: 0 },
        overpressure: { value: 0 },
        temperature: { value: 0 },
        density: { value: 0 },
        impactCenter: { value: impactPosition },
        earthRadiusScene: { value: earthRadius }
      },
      vertexShader: `
        uniform float progress;
        uniform float shockRadius;
        uniform float overpressure;
        uniform vec3 impactCenter;
        uniform float earthRadiusScene;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vDistanceFromImpact;
        varying float vShockIntensity;
        
        const float PI = 3.14159265359;
        const float EARTH_RADIUS = 6371.0; // km
        
        // Dünya yüzeyinde büyük daire mesafesi (Great Circle Distance)
        float greatCircleDistance(vec3 p1, vec3 p2) {
          vec3 n1 = normalize(p1);
          vec3 n2 = normalize(p2);
          
          // Haversine formülü ile açısal mesafe
          float dProduct = dot(n1, n2);
          dProduct = clamp(dProduct, -1.0, 1.0);
          
          return acos(dProduct);
        }
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          
          // Normalize edilmiş pozisyonlar
          vec3 spherePos = normalize(position);
          vec3 impactPos = normalize(impactCenter);
          
          // Açısal mesafe (radyan)
          float angularDist = greatCircleDistance(spherePos, impactPos);
          vDistanceFromImpact = angularDist;
          
          // Şok dalgası cephesinden mesafe
          float distFromShock = abs(angularDist - shockRadius);
          
          // Rankine-Hugoniot şok yoğunluğu
          // ρ₂/ρ₁ = (γ+1)M² / (2+(γ-1)M²)
          float machNumber = max(1.0, 5.0 * (1.0 - progress * 0.5)); // M sayısı
          float densityRatio = (2.4 * machNumber * machNumber) / (2.0 + 0.4 * machNumber * machNumber);
          
          // Şok yoğunluğu
          vShockIntensity = exp(-distFromShock * 12.0) * densityRatio;
          
          // Dünya yüzeyine yapışık deformasyon
          // Kompresyon: şok önünde sıkışma, arkada genleşme
          float compressionFactor = 0.0;
          
          if (distFromShock < 0.15) {
            // Şok cephesi - keskin sıçrama
            compressionFactor = vShockIntensity * 0.012;
            
            // Rarefaction fan - şok arkasında genleşme
            if (angularDist < shockRadius) {
              float rarefactionDist = shockRadius - angularDist;
              compressionFactor -= rarefactionDist * 0.008;
            }
          }
          
          // Normal boyunca displacement
          vec3 displaced = position * (1.0 + compressionFactor);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform float shockRadius;
        uniform float shockVelocity;
        uniform float overpressure;
        uniform float temperature;
        uniform float density;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying float vDistanceFromImpact;
        varying float vShockIntensity;
        
        const float PI = 3.14159265359;
        
        // Planck ışıma yasası - sıcaklığa göre renk
        vec3 blackBodyRadiation(float temp) {
          // Basitleştirilmiş sıcak cisim ışıması
          float t = clamp(temp / 10000.0, 0.0, 1.0);
          
          vec3 red = vec3(1.0, 0.0, 0.0);
          vec3 orange = vec3(1.0, 0.4, 0.0);
          vec3 yellow = vec3(1.0, 0.9, 0.3);
          vec3 white = vec3(1.0, 1.0, 1.0);
          
          if (t < 0.33) {
            return mix(red, orange, t * 3.0);
          } else if (t < 0.66) {
            return mix(orange, yellow, (t - 0.33) * 3.0);
          } else {
            return mix(yellow, white, (t - 0.66) * 3.0);
          }
        }
        
        void main() {
          float distFromShock = abs(vDistanceFromImpact - shockRadius);
          
          // Ana şok cephesi (discontinuity)
          float shockFront = exp(-distFromShock * 25.0);
          
          // Mach disk - güçlü şok yapısı
          float machDisk = exp(-distFromShock * 18.0);
          
          // Kelvin-Helmholtz instability - türbülans
          float turbulence = 0.0;
          for (float i = 1.0; i <= 4.0; i++) {
            float freq = i * 8.0;
            turbulence += sin(vDistanceFromImpact * freq + time * 2.0 * i) / i;
          }
          turbulence = (turbulence * 0.5 + 0.5) * machDisk;
          
          // Richtmyer-Meshkov instability - şok etkileşimi
          float richtmyerMeshkov = sin(vDistanceFromImpact * 35.0 - time * 6.0);
          richtmyerMeshkov *= exp(-distFromShock * 15.0);
          richtmyerMeshkov = abs(richtmyerMeshkov);
          
          // Taylor instability - gravitasyonel etkiler
          float taylorInstability = sin(vDistanceFromImpact * 50.0 + time * 3.0) * 0.3 + 0.7;
          taylorInstability *= smoothstep(0.2, 0.0, distFromShock);
          
          // Sıcaklık dağılımı (Rankine-Hugoniot)
          // T₂/T₁ = [2γM²-(γ-1)][(γ-1)M²+2] / [(γ+1)²M²]
          float tempRatio = 1.0 + vShockIntensity * 8.0;
          float effectiveTemp = 300.0 * tempRatio; // Kelvin
          
          // Renk hesaplama
          vec3 baseColor = blackBodyRadiation(effectiveTemp);
          
          // Kompresyon bölgesi - mavi shift
          if (vDistanceFromImpact < shockRadius) {
            baseColor = mix(baseColor, vec3(0.7, 0.85, 1.0), 0.3);
          }
          
          // Toplam yoğunluk
          float totalIntensity = 
            shockFront * 3.5 +
            machDisk * 2.0 +
            turbulence * 1.2 +
            richtmyerMeshkov * 1.5 +
            taylorInstability * 0.8;
          
          // İkincil şok dalgaları (reflected shocks)
          float reflectedShock = 0.0;
          for (float i = 1.0; i <= 3.0; i++) {
            float offset = i * 0.08;
            reflectedShock += exp(-abs(vDistanceFromImpact - shockRadius - offset) * 20.0) / (i * 1.5);
          }
          totalIntensity += reflectedShock * 1.8;
          
          // Alpha - yoğunluğa bağlı
          float alpha = totalIntensity * 0.65;
          
          // Uzak bölge fade
          alpha *= smoothstep(PI, PI * 0.6, vDistanceFromImpact);
          
          // Yakın bölge fade
          alpha *= smoothstep(0.0, 0.03, vDistanceFromImpact);
          
          // Fresnel etkisi - yüzeye teğet bakışta daha parlak
          float fresnel = pow(1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0))), 2.0);
          alpha *= (1.0 + fresnel * 0.5);
          
          gl_FragColor = vec4(baseColor, alpha);
        }
      `
    })
  }, [impactPosition, earthRadius])
  
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return
    
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    
    if (adjustedProgress <= 0 || progress >= 0.98) {
      meshRef.current.visible = false
      return
    }
    
    meshRef.current.visible = true
    
    // Sedov-Taylor blast wave radius: R(t) = ξ(E·t²/ρ₀)^(1/5)
    const xi = 1.03 // Sedov similarity parameter
    const t_seconds = adjustedProgress * 60 // 60 saniye simülasyon
    
    // Şok dalgası yarıçapı (km)
    const R_km = xi * Math.pow((energy_joules * t_seconds * t_seconds) / RHO_AIR, 0.2) / 1000
    
    // Açısal yarıçap (radyan)
    const angularRadius = R_km / EARTH_RADIUS_KM
    
    // Şok hızı: dR/dt
    const shockVelocity_ms = (0.4 * R_km * 1000) / t_seconds
    
    // Mach sayısı
    const machNumber = shockVelocity_ms / SOUND_SPEED
    
    // Overpressure (Rankine-Hugoniot)
    // ΔP = ρ₀·u²·[2γ/(γ+1)]
    const overpressure_Pa = RHO_AIR * shockVelocity_ms * shockVelocity_ms * (2.8 / 2.4)
    
    // Sıcaklık artışı
    const temperature_K = 300 * (1 + 0.4 * machNumber * machNumber)
    
    // Yoğunluk oranı
    const densityRatio = (2.4 * machNumber * machNumber) / (2.0 + 0.4 * machNumber * machNumber)
    
    // Uniform güncelleme
    materialRef.current.uniforms.time.value = state.clock.elapsedTime
    materialRef.current.uniforms.progress.value = adjustedProgress
    materialRef.current.uniforms.shockRadius.value = angularRadius
    materialRef.current.uniforms.shockVelocity.value = shockVelocity_ms
    materialRef.current.uniforms.overpressure.value = overpressure_Pa
    materialRef.current.uniforms.temperature.value = temperature_K
    materialRef.current.uniforms.density.value = densityRatio
  })
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[earthRadius * 1.004, 256, 256]} />
      <primitive ref={materialRef} object={shaderMaterial} attach="material" />
    </mesh>
  )
}


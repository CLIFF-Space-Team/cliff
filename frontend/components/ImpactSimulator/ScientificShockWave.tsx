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
export function ScientificShockWave({
  impactPosition,
  progress,
  energy_joules,
  delay,
  earthRadius = 1.8
}: ScientificShockWaveProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const EARTH_RADIUS_KM = 6371
  const RHO_AIR = 1.225 
  const GAMMA = 1.4 
  const P0 = 101325 
  const SOUND_SPEED = 343 
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
        const float EARTH_RADIUS = 6371.0; 
        float greatCircleDistance(vec3 p1, vec3 p2) {
          vec3 n1 = normalize(p1);
          vec3 n2 = normalize(p2);
          float dProduct = dot(n1, n2);
          dProduct = clamp(dProduct, -1.0, 1.0);
          return acos(dProduct);
        }
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 spherePos = normalize(position);
          vec3 impactPos = normalize(impactCenter);
          float angularDist = greatCircleDistance(spherePos, impactPos);
          vDistanceFromImpact = angularDist;
          float distFromShock = abs(angularDist - shockRadius);
          float machNumber = max(1.0, 5.0 * (1.0 - progress * 0.5)); 
          float densityRatio = (2.4 * machNumber * machNumber) / (2.0 + 0.4 * machNumber * machNumber);
          vShockIntensity = exp(-distFromShock * 12.0) * densityRatio;
          float compressionFactor = 0.0;
          if (distFromShock < 0.15) {
            compressionFactor = vShockIntensity * 0.012;
            if (angularDist < shockRadius) {
              float rarefactionDist = shockRadius - angularDist;
              compressionFactor -= rarefactionDist * 0.008;
            }
          }
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
        vec3 blackBodyRadiation(float temp) {
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
          float shockFront = exp(-distFromShock * 25.0);
          float machDisk = exp(-distFromShock * 18.0);
          float turbulence = 0.0;
          for (float i = 1.0; i <= 4.0; i++) {
            float freq = i * 8.0;
            turbulence += sin(vDistanceFromImpact * freq + time * 2.0 * i) / i;
          }
          turbulence = (turbulence * 0.5 + 0.5) * machDisk;
          float richtmyerMeshkov = sin(vDistanceFromImpact * 35.0 - time * 6.0);
          richtmyerMeshkov *= exp(-distFromShock * 15.0);
          richtmyerMeshkov = abs(richtmyerMeshkov);
          float taylorInstability = sin(vDistanceFromImpact * 50.0 + time * 3.0) * 0.3 + 0.7;
          taylorInstability *= smoothstep(0.2, 0.0, distFromShock);
          float tempRatio = 1.0 + vShockIntensity * 8.0;
          float effectiveTemp = 300.0 * tempRatio; 
          vec3 baseColor = blackBodyRadiation(effectiveTemp);
          if (vDistanceFromImpact < shockRadius) {
            baseColor = mix(baseColor, vec3(0.7, 0.85, 1.0), 0.3);
          }
          float totalIntensity = 
            shockFront * 3.5 +
            machDisk * 2.0 +
            turbulence * 1.2 +
            richtmyerMeshkov * 1.5 +
            taylorInstability * 0.8;
          float reflectedShock = 0.0;
          for (float i = 1.0; i <= 3.0; i++) {
            float offset = i * 0.08;
            reflectedShock += exp(-abs(vDistanceFromImpact - shockRadius - offset) * 20.0) / (i * 1.5);
          }
          totalIntensity += reflectedShock * 1.8;
          float alpha = totalIntensity * 0.65;
          alpha *= smoothstep(PI, PI * 0.6, vDistanceFromImpact);
          alpha *= smoothstep(0.0, 0.03, vDistanceFromImpact);
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
    const xi = 1.03 
    const t_seconds = adjustedProgress * 60 
    const R_km = xi * Math.pow((energy_joules * t_seconds * t_seconds) / RHO_AIR, 0.2) / 1000
    const angularRadius = R_km / EARTH_RADIUS_KM
    const shockVelocity_ms = (0.4 * R_km * 1000) / t_seconds
    const machNumber = shockVelocity_ms / SOUND_SPEED
    const overpressure_Pa = RHO_AIR * shockVelocity_ms * shockVelocity_ms * (2.8 / 2.4)
    const temperature_K = 300 * (1 + 0.4 * machNumber * machNumber)
    const densityRatio = (2.4 * machNumber * machNumber) / (2.0 + 0.4 * machNumber * machNumber)
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

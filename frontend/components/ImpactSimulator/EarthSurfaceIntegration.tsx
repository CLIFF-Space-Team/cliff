'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface EarthSurfaceIntegrationProps {
  impactPosition: THREE.Vector3
  progress: number
  craterRadius_km: number
  delay: number
  earthRadius?: number
}
export function EarthSurfaceIntegration({
  impactPosition,
  progress,
  craterRadius_km,
  delay,
  earthRadius = 1.8
}: EarthSurfaceIntegrationProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        craterDepth: { value: 0 },
        craterRadius: { value: 0 },
        rimHeight: { value: 0 },
        impactCenter: { value: impactPosition },
        earthRadiusScene: { value: earthRadius }
      },
      vertexShader: `
        uniform float progress;
        uniform float craterDepth;
        uniform float craterRadius;
        uniform float rimHeight;
        uniform vec3 impactCenter;
        uniform float earthRadiusScene;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromImpact;
        varying float vDisplacement;
        const float PI = 3.14159265359;
        const float EARTH_RADIUS = 6371.0;
        float greatCircleDistance(vec3 p1, vec3 p2) {
          vec3 n1 = normalize(p1);
          vec3 n2 = normalize(p2);
          return acos(clamp(dot(n1, n2), -1.0, 1.0));
        }
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vec3 spherePos = normalize(position);
          vec3 impactPos = normalize(impactCenter);
          float angularDist = greatCircleDistance(spherePos, impactPos);
          vDistanceFromImpact = angularDist;
          float craterAngle = craterRadius / EARTH_RADIUS;
          float normalizedDist = angularDist / craterAngle;
          float displacement = 0.0;
          if (normalizedDist < 1.0) {
            displacement = -craterDepth * (1.0 - normalizedDist * normalizedDist) * progress;
            if (normalizedDist < 0.15 && craterRadius > 0.01) {
              float peakFactor = exp(-normalizedDist * 20.0);
              displacement += craterDepth * 0.3 * peakFactor * smoothstep(0.5, 1.0, progress);
            }
          }
          if (normalizedDist >= 0.85 && normalizedDist <= 1.15) {
            float rimDist = abs(normalizedDist - 1.0);
            float rimProfile = exp(-rimDist * 15.0);
            displacement += rimHeight * rimProfile * smoothstep(0.3, 0.8, progress);
          }
          if (normalizedDist > 1.0 && normalizedDist < 2.5) {
            float ejectaDist = normalizedDist - 1.0;
            float ejectaProfile = exp(-ejectaDist * 3.0) * (1.0 / (1.0 + ejectaDist));
            displacement += rimHeight * 0.4 * ejectaProfile * smoothstep(0.4, 0.9, progress);
          }
          if (normalizedDist > 0.5 && normalizedDist < 4.0) {
            float seismicWave = sin(normalizedDist * 15.0 - progress * 10.0);
            seismicWave *= exp(-(normalizedDist - 1.0) * 2.0);
            displacement += seismicWave * craterDepth * 0.05 * progress;
          }
          vDisplacement = displacement;
          vec3 displacedPos = position * (1.0 + displacement / earthRadiusScene);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float progress;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vDistanceFromImpact;
        varying float vDisplacement;
        void main() {
          vec3 baseColor = vec3(0.45, 0.40, 0.35); 
          if (vDisplacement < -0.001) {
            baseColor = mix(baseColor, vec3(0.2, 0.18, 0.15), -vDisplacement * 100.0);
          }
          if (vDisplacement > 0.001) {
            baseColor = mix(baseColor, vec3(0.6, 0.55, 0.48), vDisplacement * 50.0);
          }
          float lighting = max(dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))), 0.3);
          baseColor *= lighting;
          float alpha = smoothstep(0.0, 0.02, abs(vDisplacement)) * 0.85;
          gl_FragColor = vec4(baseColor, alpha);
        }
      `
    })
  }, [impactPosition, earthRadius])
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    if (adjustedProgress <= 0) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true
    const depth_km = craterRadius_km * 0.2
    const rim_km = craterRadius_km * 0.04
    const depthScale = depth_km / 6371 * earthRadius
    const rimScale = rim_km / 6371 * earthRadius
    materialRef.current.uniforms.time.value = state.clock.elapsedTime
    materialRef.current.uniforms.progress.value = adjustedProgress
    materialRef.current.uniforms.craterDepth.value = depthScale
    materialRef.current.uniforms.craterRadius.value = craterRadius_km
    materialRef.current.uniforms.rimHeight.value = rimScale
  })
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[earthRadius * 1.001, 256, 256]} />
      <primitive ref={materialRef} object={shaderMaterial} attach="material" />
    </mesh>
  )
}

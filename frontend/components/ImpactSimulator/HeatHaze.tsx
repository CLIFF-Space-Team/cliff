'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
interface HeatHazeProps {
  position: THREE.Vector3
  radius: number
  progress: number
  intensity: number
  delay?: number
}
export function HeatHaze({ position, radius, progress, intensity, delay = 0 }: HeatHazeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const hazeMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        heatIntensity: { value: intensity },
        progress: { value: progress },
        delay: { value: delay }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float heatIntensity;
        uniform float progress;
        uniform float delay;
        varying vec2 vUv;
        varying vec3 vNormal;
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        void main() {
          vec2 uv = vUv;
          float dist = length(uv - 0.5);
          float localProgress = (progress - delay) / (1.0 - delay);
          localProgress = clamp(localProgress, 0.0, 1.0);
          float wave1 = sin(uv.y * 20.0 + time * 3.0) * 0.02;
          float wave2 = sin(uv.y * 40.0 - time * 2.0) * 0.01;
          float shimmer = (wave1 + wave2) * heatIntensity;
          float heatPulse = sin(localProgress * 3.14159) * 2.0;
          float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = shimmer * falloff * heatPulse * (1.0 - localProgress * 0.3);
          vec3 heatColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.8, 0.2), localProgress);
          gl_FragColor = vec4(heatColor, abs(alpha) * 0.8);
        }
      `
    })
  }, [intensity, delay])
  useFrame((state) => {
    if (!meshRef.current) return
    const adjustedProgress = (progress - delay) / (1 - delay)
    if (progress < delay || adjustedProgress < 0 || adjustedProgress > 1) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true
    if (hazeMaterial.uniforms) {
      hazeMaterial.uniforms.time.value = state.clock.elapsedTime
      hazeMaterial.uniforms.heatIntensity.value = intensity
      hazeMaterial.uniforms.progress.value = progress
      hazeMaterial.uniforms.delay.value = delay
    }
  })
  const normal = useMemo(() => position.clone().normalize(), [position])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
    >
      <planeGeometry args={[radius * 2, radius * 2, 32, 32]} />
      <primitive object={hazeMaterial} attach="material" />
    </mesh>
  )
}

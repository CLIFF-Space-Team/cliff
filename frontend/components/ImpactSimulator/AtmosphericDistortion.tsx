'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
interface AtmosphericDistortionProps {
  impactPosition: THREE.Vector3
  progress: number
  maxRadius: number
}
export function AtmosphericDistortion({
  impactPosition,
  progress,
  maxRadius
}: AtmosphericDistortionProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { gl, scene, camera } = useThree()
  const distortionMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        shockRadius: { value: 0 },
        impactCenter: { value: impactPosition }
      },
      vertexShader: `
        uniform float progress;
        uniform float shockRadius;
        uniform vec3 impactCenter;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          float dist = length(position.xy - impactCenter.xy);
          float wave = sin((dist - shockRadius) * 30.0) * 0.05;
          wave *= smoothstep(shockRadius + 0.2, shockRadius, dist);
          wave *= (1.0 - progress) * 0.5;
          vWave = wave;
          vec3 displaced = position + normal * wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
      fragmentShader: `
        uniform float progress;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float distortion = abs(vWave) * 5.0;
          vec3 color = vec3(0.8, 0.9, 1.0);
          float alpha = distortion * (1.0 - progress);
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  }, [impactPosition])
  useFrame((state) => {
    if (!meshRef.current || !distortionMaterial.uniforms) return
    if (progress < 0.35 || progress > 0.9) {
      meshRef.current.visible = false
      return
    }
    meshRef.current.visible = true
    const localProgress = (progress - 0.35) / 0.55
    const currentRadius = maxRadius * localProgress
    distortionMaterial.uniforms.time.value = state.clock.elapsedTime
    distortionMaterial.uniforms.progress.value = localProgress
    distortionMaterial.uniforms.shockRadius.value = currentRadius
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
      <planeGeometry args={[maxRadius * 2, maxRadius * 2, 64, 64]} />
      <primitive object={distortionMaterial} attach="material" />
    </mesh>
  )
}

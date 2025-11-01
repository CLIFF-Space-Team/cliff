'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShockWaveProps {
  center: THREE.Vector3
  progress: number
  maxRadius: number
  color: string
  opacity: number
  delay: number
}

export function ShockWave({
  center,
  progress,
  maxRadius,
  color,
  opacity,
  delay
}: ShockWaveProps) {
  const waveRef = useRef<THREE.Mesh>(null)
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
        color: { value: new THREE.Color(color) },
        opacity: { value: opacity }
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
        uniform float progress;
        uniform vec3 color;
        uniform float opacity;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
          float dist = length(vUv - 0.5) * 2.0;
          
          float wave1 = sin((dist - progress * 2.0) * 15.0) * 0.5 + 0.5;
          float wave2 = sin((dist - progress * 2.0) * 30.0 + time * 2.0) * 0.3 + 0.7;
          float wave = wave1 * wave2;
          
          float shockRing = smoothstep(progress - 0.05, progress, dist) * 
                           smoothstep(progress + 0.15, progress + 0.05, dist);
          
          float trailingWaves = sin((dist - progress * 2.0) * 8.0) * 0.5 + 0.5;
          trailingWaves *= smoothstep(0.0, progress, dist) * smoothstep(progress + 0.3, progress, dist);
          
          float edgeFade = smoothstep(0.0, 0.05, dist) * smoothstep(1.0, 0.95, dist);
          
          float alpha = (shockRing * 2.0 + trailingWaves * 0.5) * edgeFade * opacity * sin(progress * 3.14159);
          
          vec3 hotCore = vec3(1.0, 1.0, 0.8);
          vec3 finalColor = mix(color, hotCore, shockRing * (1.0 - progress));
          
          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    })
  }, [color, opacity])
  
  const normal = useMemo(() => {
    return center.clone().normalize()
  }, [center])
  
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  
  useFrame((state, delta) => {
    if (!waveRef.current || !materialRef.current) return
    
    const adjustedProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)))
    
    if (adjustedProgress <= 0 || progress >= 0.95) {
      waveRef.current.visible = false
      return
    }
    
    waveRef.current.visible = true
    
    const scale = maxRadius * Math.pow(adjustedProgress, 0.6)
    waveRef.current.scale.set(scale, scale, 1)
    
    const pulseIntensity = Math.sin(adjustedProgress * Math.PI) * 1.5
    waveRef.current.position.copy(center)
    waveRef.current.position.addScaledVector(normal, 0.01 * pulseIntensity)
    
    materialRef.current.uniforms.time.value += delta
    materialRef.current.uniforms.progress.value = adjustedProgress
    materialRef.current.uniforms.opacity.value = opacity * Math.sin(adjustedProgress * Math.PI)
  })
  
  return (
    <mesh
      ref={waveRef}
      position={center}
      quaternion={quaternion}
    >
      <planeGeometry args={[2, 2, 32, 32]} />
      <primitive ref={materialRef} object={shaderMaterial} attach="material" />
    </mesh>
  )
}


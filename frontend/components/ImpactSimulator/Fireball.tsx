'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FireballProps {
  position: THREE.Vector3
  progress: number
  maxSize: number
}

export function Fireball({ position, progress, maxSize }: FireballProps) {
  const fireballRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  
  const fireballMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
        intensity: { value: 1.0 },
        temperature: { value: 7000 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform float temperature;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float noise(vec3 p) {
          return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
        }
        
        float fbm(vec3 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for(int i = 0; i < 4; i++) {
            value += amplitude * noise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
          }
          
          return value;
        }
        
        vec3 getBlackbodyColor(float temp) {
          if (temp > 6000.0) return vec3(1.0, 1.0, 1.0);
          if (temp > 4000.0) return vec3(1.0, 0.9, 0.7);
          if (temp > 2500.0) return vec3(1.0, 0.6, 0.2);
          if (temp > 1500.0) return vec3(1.0, 0.3, 0.1);
          return vec3(0.5, 0.1, 0.0);
        }
        
        void main() {
          vec3 animatedPos = vPosition + vec3(time * 0.5);
          float n = fbm(animatedPos * 3.0);
          
          float dist = length(vUv - 0.5);
          float core = 1.0 - smoothstep(0.0, 0.2, dist);
          float mid = smoothstep(0.2, 0.4, dist) * (1.0 - smoothstep(0.4, 0.6, dist));
          float edge = smoothstep(0.6, 0.8, dist) * (1.0 - smoothstep(0.8, 1.0, dist));
          
          float coreTemp = temperature;
          float midTemp = temperature * 0.7;
          float edgeTemp = temperature * 0.4;
          
          vec3 coreColor = getBlackbodyColor(coreTemp);
          vec3 midColor = getBlackbodyColor(midTemp);
          vec3 edgeColor = getBlackbodyColor(edgeTemp);
          
          vec3 color = edgeColor * edge + midColor * mid + coreColor * core;
          
          color += n * 0.15;
          
          float alpha = (core + mid * 0.8 + edge * 0.5) * intensity;
          
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  }, [])
  
  useFrame((state, delta) => {
    if (!fireballRef.current || !glowRef.current) return
    
    if (progress < 0 || progress > 0.8) {
      fireballRef.current.visible = false
      glowRef.current.visible = false
      return
    }
    
    fireballRef.current.visible = true
    glowRef.current.visible = true
    
    const localProgress = progress / 0.8
    const scale = maxSize * (0.1 + Math.pow(localProgress, 0.5) * 2.5)
    const intensity = Math.sin(localProgress * Math.PI * 0.8)
    
    const temperature = 7000 - localProgress * 5000
    
    fireballRef.current.scale.setScalar(scale)
    glowRef.current.scale.setScalar(scale * 1.8)
    
    if (fireballMaterial.uniforms) {
      fireballMaterial.uniforms.time.value += delta * 1.5
      fireballMaterial.uniforms.intensity.value = intensity
      fireballMaterial.uniforms.temperature.value = temperature
    }
  })
  
  return (
    <>
      <mesh ref={fireballRef} position={position}>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={fireballMaterial} attach="material" />
      </mesh>
      
      <mesh ref={glowRef} position={position}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.3}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  )
}


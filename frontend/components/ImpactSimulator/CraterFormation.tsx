'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CraterFormationProps {
  impactPosition: THREE.Vector3
  diameter_km: number
  depth_km: number
  progress: number
}

export function CraterFormation({
  impactPosition,
  diameter_km,
  depth_km,
  progress
}: CraterFormationProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const craterGeometry = useMemo(() => {
    const earthRadius = 1.8
    const segments = 128
    const size = (diameter_km / 6371) * earthRadius * 3
    
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    
    return geo
  }, [diameter_km])
  
  const craterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        craterRadius: { value: diameter_km / 2 },
        craterDepth: { value: depth_km },
        rimHeight: { value: depth_km * 0.14 / depth_km }
      },
      vertexShader: `
        uniform float progress;
        uniform float craterRadius;
        uniform float craterDepth;
        uniform float rimHeight;
        
        varying vec3 vNormal;
        varying float vDepth;
        
        void main() {
          vec3 pos = position;
          
          float dist = length(pos.xy);
          float normalizedDist = dist / craterRadius;
          
          float depth = 0.0;
          
          if (normalizedDist < 1.0) {
            float parabolaDepth = -craterDepth * (1.0 - normalizedDist * normalizedDist);
            
            float rimFactor = exp(-pow((normalizedDist - 0.92) / 0.08, 2.0));
            float rim = rimHeight * craterDepth * rimFactor;
            
            depth = (parabolaDepth + rim) * progress;
          }
          
          pos.z = depth;
          vDepth = depth;
          
          vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * viewMatrix * modelPosition;
          
          vNormal = normalize(normalMatrix * normal);
        }
      `,
      fragmentShader: `
        uniform float progress;
        
        varying vec3 vNormal;
        varying float vDepth;
        
        void main() {
          vec3 baseColor = vec3(0.55, 0.45, 0.35);
          
          float depthShade = smoothstep(-1.0, 0.0, vDepth);
          vec3 color = mix(
            vec3(0.3, 0.2, 0.15),
            baseColor,
            depthShade
          );
          
          float lightIntensity = max(0.3, dot(vNormal, vec3(0, 0, 1)));
          color *= lightIntensity;
          
          gl_FragColor = vec4(color, progress * 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })
  }, [diameter_km, depth_km])
  
  useFrame(() => {
    if (!meshRef.current) return
    
    if (progress < 0.32 || progress > 0.95) {
      meshRef.current.visible = false
      return
    }
    
    meshRef.current.visible = true
    
    const localProgress = (progress - 0.32) / 0.63
    const smoothProgress = Math.pow(localProgress, 0.5)
    
    if (craterMaterial.uniforms) {
      craterMaterial.uniforms.progress.value = smoothProgress
    }
  })
  
  const normal = useMemo(() => impactPosition.clone().normalize(), [impactPosition])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 0, 1)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  
  return (
    <mesh
      ref={meshRef}
      position={impactPosition}
      quaternion={quaternion}
      visible={false}
    >
      <primitive object={craterGeometry} attach="geometry" />
      <primitive object={craterMaterial} attach="material" />
    </mesh>
  )
}





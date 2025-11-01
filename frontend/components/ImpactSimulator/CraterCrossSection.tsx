'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'

interface CraterCrossSectionProps {
  craterDiameter_m: number
  craterDepth_m: number
  rimHeight_m: number
  centralPeakHeight_m?: number
  hasCentralPeak: boolean
  position: THREE.Vector3
  visible: boolean
}

/**
 * 3D Crater Cross-Section View
 * Shows geological layers and crater structure
 */
export function CraterCrossSection({
  craterDiameter_m,
  craterDepth_m,
  rimHeight_m,
  centralPeakHeight_m,
  hasCentralPeak,
  position,
  visible
}: CraterCrossSectionProps) {
  const groupRef = useRef<THREE.Group>(null)
  
  const scale = 0.001 // Scale factor for visualization
  const diameter = craterDiameter_m * scale
  const depth = craterDepth_m * scale
  const rim = rimHeight_m * scale
  
  // Crater profile geometry
  const profileGeometry = useMemo(() => {
    const points: THREE.Vector2[] = []
    const segments = 128
    
    // Left side (rim to center)
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = -diameter / 2 + (diameter / 2) * t
      const normalizedDist = Math.abs(x) / (diameter / 2)
      
      let y = 0
      
      if (normalizedDist > 0.92) {
        // Rim
        const rimFactor = Math.exp(-Math.pow((normalizedDist - 0.92) / 0.08, 2))
        y = rim * rimFactor
      } else {
        // Crater bowl (parabolic)
        y = -depth * (1 - normalizedDist * normalizedDist)
        
        // Central peak
        if (hasCentralPeak && normalizedDist < 0.25 && centralPeakHeight_m) {
          const peakHeight = (centralPeakHeight_m * scale)
          const peakFactor = Math.exp(-Math.pow(normalizedDist / 0.15, 2))
          y += peakHeight * peakFactor
        }
      }
      
      points.push(new THREE.Vector2(x, y))
    }
    
    // Right side (mirror)
    for (let i = segments - 1; i >= 0; i--) {
      const t = i / segments
      const x = (diameter / 2) * t
      const normalizedDist = Math.abs(x) / (diameter / 2)
      
      let y = 0
      
      if (normalizedDist > 0.92) {
        const rimFactor = Math.exp(-Math.pow((normalizedDist - 0.92) / 0.08, 2))
        y = rim * rimFactor
      } else {
        y = -depth * (1 - normalizedDist * normalizedDist)
        
        if (hasCentralPeak && normalizedDist < 0.25 && centralPeakHeight_m) {
          const peakHeight = (centralPeakHeight_m * scale)
          const peakFactor = Math.exp(-Math.pow(normalizedDist / 0.15, 2))
          y += peakHeight * peakFactor
        }
      }
      
      points.push(new THREE.Vector2(x, y))
    }
    
    const shape = new THREE.Shape(points)
    const extrudeSettings = {
      depth: 0.01,
      bevelEnabled: false
    }
    
    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }, [diameter, depth, rim, hasCentralPeak, centralPeakHeight_m])
  
  // Geological layers material
  const layersMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          vPosition = position;
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vPosition;
        varying vec2 vUv;
        
        void main() {
          float depth = -vPosition.y;
          
          vec3 color;
          
          // Surface layer (ejecta/regolith) - brown
          if (depth < 0.05) {
            color = vec3(0.55, 0.45, 0.35);
          }
          // Upper crust - tan
          else if (depth < 0.15) {
            color = vec3(0.50, 0.42, 0.35);
          }
          // Middle crust - gray
          else if (depth < 0.3) {
            color = vec3(0.45, 0.40, 0.35);
          }
          // Lower crust - dark gray
          else if (depth < 0.5) {
            color = vec3(0.35, 0.32, 0.28);
          }
          // Impact melt (if very deep)
          else {
            color = vec3(0.25, 0.20, 0.18);
          }
          
          // Layer boundaries
          float layerLine = 0.0;
          layerLine += smoothstep(0.048, 0.052, depth) * smoothstep(0.052, 0.048, depth);
          layerLine += smoothstep(0.148, 0.152, depth) * smoothstep(0.152, 0.148, depth);
          layerLine += smoothstep(0.298, 0.302, depth) * smoothstep(0.302, 0.298, depth);
          
          color = mix(color, vec3(0.2), layerLine * 0.5);
          
          // Noise for texture
          float noise = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
          color += vec3(noise * 0.05 - 0.025);
          
          gl_FragColor = vec4(color, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    })
  }, [])
  
  // Annotation labels
  const labels = useMemo(() => [
    { text: `Çap: ${(craterDiameter_m / 1000).toFixed(2)} km`, position: new THREE.Vector3(diameter / 2 + 0.05, rim + 0.02, 0.01) },
    { text: `Derinlik: ${(craterDepth_m / 1000).toFixed(3)} km`, position: new THREE.Vector3(0.02, -depth - 0.02, 0.01) },
    { text: `Kenar: ${rimHeight_m.toFixed(0)} m`, position: new THREE.Vector3(diameter / 2 * 0.92, rim + 0.02, 0.01) },
  ], [diameter, depth, rim, craterDiameter_m, craterDepth_m, rimHeight_m])
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.visible = visible
    }
    
    if (layersMaterial.uniforms) {
      layersMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })
  
  if (!visible) return null
  
  return (
    <group ref={groupRef} position={position}>
      {/* Main cross-section */}
      <mesh geometry={profileGeometry}>
        <primitive object={layersMaterial} attach="material" />
      </mesh>
      
      {/* Outline */}
      <lineSegments>
        <edgesGeometry args={[profileGeometry]} />
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </lineSegments>
      
      {/* Labels */}
      {labels.map((label, i) => (
        <Text
          key={i}
          position={label.position}
          fontSize={0.02}
          color="#ffffff"
          anchorX="left"
          anchorY="middle"
        >
          {label.text}
        </Text>
      ))}
      
      {/* Legend - Geological Layers */}
      <group position={[-diameter / 2 - 0.15, 0, 0]}>
        <Text position={[0, 0.05, 0]} fontSize={0.015} color="#ffaa00" anchorX="right">
          Jeolojik Katmanlar:
        </Text>
        <Text position={[0, 0.02, 0]} fontSize={0.01} color="#ffffff" anchorX="right">
          Ejecta/Regolith
        </Text>
        <Text position={[0, -0.01, 0]} fontSize={0.01} color="#dddddd" anchorX="right">
          Üst Kabuk
        </Text>
        <Text position={[0, -0.04, 0]} fontSize={0.01} color="#cccccc" anchorX="right">
          Orta Kabuk
        </Text>
        <Text position={[0, -0.07, 0]} fontSize={0.01} color="#aaaaaa" anchorX="right">
          Alt Kabuk
        </Text>
      </group>
    </group>
  )
}


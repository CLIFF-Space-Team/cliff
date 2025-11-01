'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ShaderUtils } from './shaders/AdvancedShaders'

interface RealisticCraterFormationProps {
  impactPosition: THREE.Vector3
  crater: {
    finalDiameter_m: number
    finalDepth_m: number
    rimHeight_m: number
    rimDiameter_m: number
    hasCentralPeak: boolean
    centralPeakHeight_m?: number
    ejectaBlanketRange_m: number
    craterType: 'simple' | 'complex' | 'basin'
  }
  progress: number
}

export function RealisticCraterFormation({
  impactPosition,
  crater,
  progress
}: RealisticCraterFormationProps) {
  const groupRef = useRef<THREE.Group>(null)
  const craterRef = useRef<THREE.Mesh>(null)
  const rimRef = useRef<THREE.Mesh>(null)
  const ejectaRef = useRef<THREE.Mesh>(null)
  const centralPeakRef = useRef<THREE.Mesh>(null)
  
  const earthRadius = 1.8
  const craterRadius_km = crater.finalDiameter_m / 2000
  const craterDepth_km = crater.finalDepth_m / 1000
  const rimHeight_km = crater.rimHeight_m / 1000
  
  // Krater geometrisi - Gerçekçi parabolik şekil
  const craterGeometry = useMemo(() => {
    const segments = 128
    const size = (crater.finalDiameter_m / 6371000) * earthRadius * 4
    
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    const positions = geo.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y)
      const normalizedDist = dist / (size / 2)
      
      let depth = 0
      
      if (normalizedDist < 1.0) {
        // Parabolik krater profili
        const parabolaDepth = -craterDepth_km * (1.0 - normalizedDist * normalizedDist)
        
        // Krater kenarı (rim) yükseltisi
        const rimPosition = 0.92
        const rimWidth = 0.08
        const rimFactor = Math.exp(-Math.pow((normalizedDist - rimPosition) / rimWidth, 2))
        const rim = rimHeight_km * rimFactor
        
        depth = parabolaDepth + rim
        
        // Merkez tepe (central peak) - complex kraterler için
        if (crater.hasCentralPeak && crater.centralPeakHeight_m && normalizedDist < 0.3) {
          const peakHeight_km = crater.centralPeakHeight_m / 1000
          const peakFactor = Math.exp(-Math.pow(normalizedDist / 0.15, 2))
          depth += peakHeight_km * peakFactor
        }
        
        // Duvar basamakları (terracing) - complex kraterler
        if (crater.craterType === 'complex' || crater.craterType === 'basin') {
          if (normalizedDist > 0.6 && normalizedDist < 0.9) {
            const terraceCount = 3
            const terraceDepth = craterDepth_km * 0.1
            const terracePos = (normalizedDist - 0.6) / 0.3
            const terrace = Math.floor(terracePos * terraceCount) * terraceDepth
            depth -= terrace * 0.3
          }
        }
      }
      
      positions.setZ(i, depth * (size / craterRadius_km))
    }
    
    geo.computeVertexNormals()
    return geo
  }, [crater, craterRadius_km, craterDepth_km, rimHeight_km])
  
  // Ultra-realistic multi-layer crater material
  const craterMaterial = useMemo(() => {
    const shaderIncludes = ShaderUtils.getFullShader(['noise', 'worley', 'crater', 'pbr'])
    
    return new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        time: { value: 0 },
        // Layer colors (PBR-based)
        bedrockColor: { value: new THREE.Color(0.35, 0.30, 0.25) },
        meltColor: { value: new THREE.Color(0.25, 0.20, 0.18) },
        brecciaColor: { value: new THREE.Color(0.50, 0.42, 0.35) },
        ejectaColor: { value: new THREE.Color(0.60, 0.52, 0.42) },
        rimColor: { value: new THREE.Color(0.65, 0.55, 0.45) },
        peakColor: { value: new THREE.Color(0.55, 0.45, 0.38) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDepth;
        varying vec2 vUv;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vDepth = position.z;
          vUv = uv;
          
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
      `,
      fragmentShader: `
        ${shaderIncludes}
        
        uniform float progress;
        uniform float time;
        uniform vec3 bedrockColor;
        uniform vec3 meltColor;
        uniform vec3 brecciaColor;
        uniform vec3 ejectaColor;
        uniform vec3 rimColor;
        uniform vec3 peakColor;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vDepth;
        varying vec2 vUv;
        
        void main() {
          float dist = length(vPosition.xy);
          float normalizedDist = dist / 2.0;
          float normalizedDepth = (vDepth + 1.0) / 2.0;
          
          // Procedural detail noise
          float detailNoise = snoise(vWorldPosition * 100.0) * 0.5 + 0.5;
          float craterPattern = worley(vUv * 20.0);
          
          // Temperature gradient (cooler at edges, hotter at center)
          float temperature = (1.0 - normalizedDist) * progress;
          
          // Multi-layer blending
          vec3 baseColor = blendTerrainLayers(
            bedrockColor,
            meltColor,
            brecciaColor,
            ejectaColor,
            normalizedDepth,
            temperature
          );
          
          // Rim enhancement
          if (normalizedDist > 0.85 && normalizedDist < 1.0) {
            float rimFactor = craterRimProfile(normalizedDist, 0.92, 0.08);
            baseColor = mix(baseColor, rimColor, rimFactor);
            
            // Rim texture variation
            baseColor += vec3(detailNoise * 0.1);
          }
          
          // Central peak (if exists)
          if (vDepth > 0.0 && normalizedDist < 0.3) {
            float peakMix = smoothstep(0.3, 0.0, normalizedDist) * smoothstep(0.0, 0.5, vDepth);
            baseColor = mix(baseColor, peakColor, peakMix);
            
            // Peak crystalline structure
            baseColor += vec3(craterPattern * 0.08);
          }
          
          // Impact melt pool (glass-like at crater floor)
          if (normalizedDepth > 0.8 && normalizedDist < 0.5) {
            vec3 glassMelt = vec3(0.2, 0.18, 0.16);
            float meltMix = smoothstep(0.7, 0.9, normalizedDepth) * (1.0 - normalizedDist * 2.0);
            baseColor = mix(baseColor, glassMelt, meltMix);
          }
          
          // Depth-based ambient occlusion
          float ao = mix(0.3, 1.0, smoothstep(-1.0, 0.3, vDepth));
          baseColor *= ao;
          
          // PBR Lighting
          vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 halfDir = normalize(lightDir + viewDir);
          
          // Diffuse
          float NdotL = max(0.0, dot(vNormal, lightDir));
          vec3 diffuse = baseColor * NdotL;
          
          // Specular (for wet/molten areas)
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 16.0);
          vec3 specular = vec3(spec * 0.3 * normalizedDepth);
          
          // Ambient
          vec3 ambient = baseColor * 0.3;
          
          // Combine lighting
          vec3 finalColor = ambient + diffuse + specular;
          
          // Micro detail
          finalColor += vec3(detailNoise * 0.03 - 0.015);
          
          // Fog/atmosphere at edges
          float edgeFog = smoothstep(0.95, 1.0, normalizedDist);
          finalColor = mix(finalColor, vec3(0.5, 0.45, 0.4), edgeFog * 0.3);
          
          gl_FragColor = vec4(finalColor, progress * 0.98);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true
    })
  }, [])
  
  // Ejecta blanket geometrisi
  const ejectaGeometry = useMemo(() => {
    const segments = 64
    const ejectaRange_km = crater.ejectaBlanketRange_m / 1000
    const size = (ejectaRange_km / 6371) * earthRadius * 3
    
    const geo = new THREE.PlaneGeometry(size, size, segments, segments)
    const positions = geo.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y)
      const normalizedDist = dist / (size / 2)
      
      let thickness = 0
      
      if (normalizedDist > 0.5 && normalizedDist < 1.0) {
        // Ejecta kalınlığı - üstel azalma
        const ejectaFactor = Math.exp(-3 * (normalizedDist - 0.5))
        thickness = 0.05 * ejectaFactor * (crater.finalDepth_m / 1000)
        
        // Radyal dalgalanmalar (rays)
        const rayCount = 12
        const rayAngle = Math.atan2(vertex.y, vertex.x)
        const rayPattern = Math.sin(rayAngle * rayCount) * 0.3 + 0.7
        thickness *= rayPattern
        
        // Gürültü
        const noise = Math.sin(dist * 50) * Math.cos(dist * 30)
        thickness += noise * 0.01
      }
      
      positions.setZ(i, thickness * (size / ejectaRange_km))
    }
    
    geo.computeVertexNormals()
    return geo
  }, [crater])
  
  const ejectaMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.5, 0.4, 0.3),
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7
    })
  }, [])
  
  useFrame((state) => {
    if (!groupRef.current) return
    
    if (progress < 0.30 || progress > 0.98) {
      groupRef.current.visible = false
      return
    }
    
    groupRef.current.visible = true
    
    const localProgress = (progress - 0.30) / 0.68
    const smoothProgress = Math.pow(localProgress, 0.6)
    
    if (craterMaterial.uniforms) {
      craterMaterial.uniforms.progress.value = smoothProgress
      craterMaterial.uniforms.time.value = state.clock.elapsedTime
    }
    
    // Animasyonlu krater oluşumu
    if (craterRef.current) {
      const excavationProgress = Math.min(1, smoothProgress * 1.5)
      craterRef.current.scale.set(excavationProgress, excavationProgress, excavationProgress)
    }
    
    // Ejecta yavaşça görünür
    if (ejectaRef.current) {
      const ejectaProgress = Math.max(0, smoothProgress - 0.2) / 0.8
      ejectaRef.current.scale.set(ejectaProgress, ejectaProgress, 1)
      ejectaMaterial.opacity = ejectaProgress * 0.6
    }
    
    // Central peak son aşamada yükselir
    if (centralPeakRef.current && crater.hasCentralPeak) {
      const peakProgress = Math.max(0, smoothProgress - 0.6) / 0.4
      centralPeakRef.current.visible = peakProgress > 0
    }
  })
  
  const normal = useMemo(() => impactPosition.clone().normalize(), [impactPosition])
  const quaternion = useMemo(() => {
    const up = new THREE.Vector3(0, 0, 1)
    return new THREE.Quaternion().setFromUnitVectors(up, normal)
  }, [normal])
  
  return (
    <group
      ref={groupRef}
      position={impactPosition}
      quaternion={quaternion}
      visible={false}
    >
      {/* Ejecta Blanket */}
      <mesh ref={ejectaRef}>
        <primitive object={ejectaGeometry} attach="geometry" />
        <primitive object={ejectaMaterial} attach="material" />
      </mesh>
      
      {/* Main Crater */}
      <mesh ref={craterRef}>
        <primitive object={craterGeometry} attach="geometry" />
        <primitive object={craterMaterial} attach="material" />
      </mesh>
      
      {/* Işıklandırma - Krater içi gölge */}
      <pointLight
        position={[0, 0, -0.1]}
        color="#ff6600"
        intensity={0.3}
        distance={0.5}
        decay={2}
      />
    </group>
  )
}


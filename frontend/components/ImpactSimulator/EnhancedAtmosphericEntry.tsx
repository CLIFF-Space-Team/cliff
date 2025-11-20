'use client'
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PremiumAsteroidModel } from './PremiumAsteroidModel'
interface EnhancedAtmosphericEntryProps {
  asteroidPosition: THREE.Vector3
  targetPosition: THREE.Vector3
  progress: number
  diameter: number
  velocity: number
  isAnimating?: boolean
  useLocalCoordinates?: boolean
  scale?: number
}
export function EnhancedAtmosphericEntry({
  asteroidPosition,
  targetPosition,
  progress,
  diameter,
  velocity,
  isAnimating = true,
  useLocalCoordinates = false,
  scale = 1.0
}: EnhancedAtmosphericEntryProps) {
  const groupRef = useRef<THREE.Group>(null)
  const asteroidRef = useRef<THREE.Group>(null)
  const plasmaRef = useRef<THREE.Mesh>(null)
  const trailRef = useRef<THREE.Points>(null)
  const bowShockRef = useRef<THREE.Mesh>(null)
  const ablationRef = useRef<THREE.Points>(null)
  const direction = useMemo(() => {
    if (useLocalCoordinates) return new THREE.Vector3(0, 0, -1)
    return new THREE.Vector3()
      .subVectors(targetPosition, asteroidPosition)
      .normalize()
  }, [asteroidPosition, targetPosition, useLocalCoordinates])
  const particleCount = 500
  const { trailPositions, trailColors, trailSizes, trailInitialOffsets } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const initialOffsets = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const t = i / particleCount
      const trailLength = 3.5
      const offset = direction.clone().multiplyScalar(-t * trailLength)
      const spread = 0.05 + 0.15 * t
      const spreadX = (Math.random() - 0.5) * spread
      const spreadY = (Math.random() - 0.5) * spread  
      const spreadZ = (Math.random() - 0.5) * spread
      initialOffsets[i * 3] = offset.x + spreadX
      initialOffsets[i * 3 + 1] = offset.y + spreadY
      initialOffsets[i * 3 + 2] = offset.z + spreadZ
      positions[i * 3] = asteroidPosition.x + initialOffsets[i * 3]
      positions[i * 3 + 1] = asteroidPosition.y + initialOffsets[i * 3 + 1]
      positions[i * 3 + 2] = asteroidPosition.z + initialOffsets[i * 3 + 2]
      const heat = 1 - t * t
      const temperature = heat * (velocity / 30)
      if (temperature > 0.8) {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 1.0
        colors[i * 3 + 2] = 1.0
      } else if (temperature > 0.6) {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.9
        colors[i * 3 + 2] = 0.7
      } else if (temperature > 0.4) {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.7
        colors[i * 3 + 2] = 0.3
      } else if (temperature > 0.2) {
        colors[i * 3] = 1.0
        colors[i * 3 + 1] = 0.5
        colors[i * 3 + 2] = 0.1
      } else {
        colors[i * 3] = 0.9
        colors[i * 3 + 1] = 0.3
        colors[i * 3 + 2] = 0.0
      }
      sizes[i] = (0.03 + Math.random() * 0.06) * (1 - t * 0.5) * Math.pow(heat, 0.5)
    }
    return { 
      trailPositions: positions, 
      trailColors: colors, 
      trailSizes: sizes,
      trailInitialOffsets: initialOffsets
    }
  }, [asteroidPosition, direction, velocity])
  const { ablationPositions, ablationVelocities } = useMemo(() => {
    const count = 200
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 0.05 + Math.random() * 0.05
      positions[i * 3] = asteroidPosition.x + Math.sin(phi) * Math.cos(theta) * r
      positions[i * 3 + 1] = asteroidPosition.y + Math.cos(phi) * r
      positions[i * 3 + 2] = asteroidPosition.z + Math.sin(phi) * Math.sin(theta) * r
      const lateralDir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      )
      lateralDir.multiplyScalar(0.3 + Math.random() * 0.5)
      lateralDir.sub(direction.clone().multiplyScalar(0.2))
      velocities[i * 3] = lateralDir.x
      velocities[i * 3 + 1] = lateralDir.y
      velocities[i * 3 + 2] = lateralDir.z
    }
    return { ablationPositions: positions, ablationVelocities: velocities }
  }, [asteroidPosition, direction])
  const plasmaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        heatIntensity: { value: velocity / 30 },
        temperature: { value: 3000 + velocity * 100 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vIntensity;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          float frontFacing = dot(vNormal, vec3(0.0, 0.0, 1.0));
          vIntensity = max(frontFacing, 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float progress;
        uniform float heatIntensity;
        uniform float temperature;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying float vIntensity;
        vec3 blackbody(float temp) {
          if (temp > 6000.0) return vec3(1.0, 1.0, 1.0);
          if (temp > 4000.0) return mix(vec3(1.0, 0.9, 0.7), vec3(1.0, 1.0, 1.0), (temp - 4000.0) / 2000.0);
          if (temp > 2500.0) return mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.9, 0.7), (temp - 2500.0) / 1500.0);
          if (temp > 1500.0) return mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.6, 0.2), (temp - 1500.0) / 1000.0);
          return vec3(0.8, 0.1, 0.0);
        }
        float volumeNoise(vec3 p) {
          return sin(p.x * 3.0) * cos(p.y * 2.5) * sin(p.z * 4.0) * 0.5 + 0.5;
        }
        void main() {
          float turbulence1 = sin(vPosition.x * 10.0 + time * 5.0) * 
                              cos(vPosition.y * 8.0 + time * 3.0) * 0.5 + 0.5;
          float turbulence2 = sin(vPosition.x * 20.0 - time * 4.0) * 
                              cos(vPosition.z * 15.0 + time * 2.0) * 0.5 + 0.5;
          float combinedTurbulence = (turbulence1 + turbulence2) * 0.5;
          float volume = volumeNoise(vPosition * 5.0 + vec3(0.0, time * 2.0, 0.0));
          float localTemp = temperature * (0.5 + vIntensity * 0.5) * (0.8 + combinedTurbulence * 0.2);
          vec3 thermalColor = blackbody(localTemp);
          if (localTemp > 5000.0) {
            vec3 ionizationGlow = vec3(0.3, 0.5, 1.0) * ((localTemp - 5000.0) / 2000.0);
            thermalColor += ionizationGlow;
          }
          float scatter = pow(vIntensity, 2.0) * volume;
          vec3 scatterColor = thermalColor * scatter;
          float coreBrightness = pow(vIntensity, 4.0) * 2.0;
          vec3 finalColor = thermalColor * (0.6 + combinedTurbulence * 0.4) + scatterColor * 0.5;
          float alpha = (vIntensity * 0.6 + combinedTurbulence * 0.2 + scatter * 0.2) * progress * heatIntensity;
          alpha = clamp(alpha, 0.0, 1.0);
          gl_FragColor = vec4(finalColor, alpha * 0.95);
        }
      `
    })
  }, [velocity])
  const bowShockMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        shockIntensity: { value: velocity / 20 }
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
        uniform float shockIntensity;
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          float dist = length(vUv - 0.5);
          float shockRing = sin((dist * 10.0 - time * 3.0)) * 0.5 + 0.5;
          shockRing *= smoothstep(1.0, 0.3, dist);
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0, 0, 1))), 2.0);
          vec3 shockColor = mix(
            vec3(0.6, 0.8, 1.0),
            vec3(1.0, 0.8, 0.5),
            shockRing
          );
          float alpha = (shockRing * 0.6 + fresnel * 0.4) * progress * shockIntensity * 0.7;
          gl_FragColor = vec4(shockColor, alpha);
        }
      `
    })
  }, [velocity])
  useFrame((state, delta) => {
    if (!groupRef.current || !isAnimating) return
    if (!useLocalCoordinates) {
      groupRef.current.position.copy(asteroidPosition)
      groupRef.current.lookAt(targetPosition)
    }
    if (asteroidRef.current) {
      asteroidRef.current.rotation.z += delta * (1 + progress * 2)
    }
    if (plasmaMaterial.uniforms) {
      plasmaMaterial.uniforms.time.value = state.clock.elapsedTime
      plasmaMaterial.uniforms.progress.value = progress
      plasmaMaterial.uniforms.temperature.value = 3000 + velocity * 100 + progress * 2000
    }
    if (bowShockMaterial.uniforms) {
      bowShockMaterial.uniforms.time.value = state.clock.elapsedTime
      bowShockMaterial.uniforms.progress.value = progress
    }
    if (plasmaRef.current) {
      const scale = 1 + progress * 0.5
      plasmaRef.current.scale.set(scale, scale, scale * 1.3)
    }
    if (bowShockRef.current) {
      const bowScale = 1.3 + Math.sin(state.clock.elapsedTime * 4) * 0.1
      bowShockRef.current.scale.set(bowScale, bowScale, 1)
    }
    if (ablationRef.current && progress > 0.3) {
      const positions = ablationRef.current.geometry.attributes.position
      const velocities = ablationVelocities
      for (let i = 0; i < 200; i++) {
        const x = positions.getX(i) + velocities[i * 3] * delta * 2
        const y = positions.getY(i) + velocities[i * 3 + 1] * delta * 2
        const z = positions.getZ(i) + velocities[i * 3 + 2] * delta * 2
        positions.setXYZ(i, x, y, z)
      }
      positions.needsUpdate = true
    }
    if (trailRef.current) {
      const material = trailRef.current.material as THREE.PointsMaterial
      material.opacity = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      const positions = trailRef.current.geometry.attributes.position
      for (let i = 0; i < particleCount; i++) {
        const x = asteroidPosition.x + trailInitialOffsets[i * 3]
        const y = asteroidPosition.y + trailInitialOffsets[i * 3 + 1]
        const z = asteroidPosition.z + trailInitialOffsets[i * 3 + 2]
        const turbulence = Math.sin(state.clock.elapsedTime * 2 + i * 0.1) * 0.02
        positions.setXYZ(i, x + turbulence, y + turbulence * 0.5, z)
      }
      positions.needsUpdate = true
    }
  })
  const rotation = useMemo(() => {
    const up = new THREE.Vector3(0, 0, 1)
    const quaternion = new THREE.Quaternion()
    quaternion.setFromUnitVectors(up, direction)
    return quaternion
  }, [direction])
  const asteroidScale = useMemo(() => {
    return scale * 2
  }, [scale])

  return (
    <group ref={groupRef}>
      {}
      <group ref={asteroidRef} scale={asteroidScale}>
        <PremiumAsteroidModel
          diameter={diameter}
          atmosphereProgress={progress}
          velocity={velocity}
        />
      </group>
      {}
      <mesh ref={bowShockRef} position={[0, 0, 0.15]}>
        <sphereGeometry args={[0.12, 32, 32]} />
        <primitive object={bowShockMaterial} attach="material" />
      </mesh>
      {}
      <mesh ref={plasmaRef}>
        <sphereGeometry args={[0.08 + asteroidScale * 0.5, 24, 24]} />
        <primitive object={plasmaMaterial} attach="material" />
      </mesh>
      {}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={trailPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particleCount}
            array={trailColors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={particleCount}
            array={trailSizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          vertexColors
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      {}
      {progress > 0.3 && (
        <points ref={ablationRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={200}
              array={ablationPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.015}
            color="#ffaa44"
            transparent
            opacity={0.6 * (1 - progress)}
            blending={THREE.AdditiveBlending}
            sizeAttenuation
          />
        </points>
      )}
      {}
      <pointLight
        position={[0, 0, 0]}
        color={progress > 0.7 ? "#ffffff" : progress > 0.4 ? "#ffaa44" : "#ff6622"}
        intensity={15 * progress}
        distance={0.5}
      />
    </group>
  )
}
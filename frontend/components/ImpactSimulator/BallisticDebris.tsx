'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DebrisTemperature {
  current: number
  color: THREE.Color
  emissiveIntensity: number
}

interface BallisticDebrisProps {
  impactPosition: THREE.Vector3
  progress: number
  intensity: number
}

class DebrisParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  size: number
  mass: number
  type: 'large' | 'small' | 'dust'
  temperature: number
  composition: 'rock' | 'iron' | 'molten' | 'glass'
  
  constructor(origin: THREE.Vector3, type: 'large' | 'small' | 'dust') {
    this.type = type
    this.position = origin.clone()
    
    // Initial temperature (very hot from impact)
    this.temperature = 2000 + Math.random() * 3000
    
    // Determine composition
    const rand = Math.random()
    if (rand > 0.9) this.composition = 'iron'
    else if (rand > 0.7) this.composition = 'molten'
    else if (rand > 0.5) this.composition = 'glass'
    else this.composition = 'rock'
    
    const speeds = {
      large: { min: 100, max: 500 },
      small: { min: 300, max: 1000 },
      dust: { min: 500, max: 2000 }
    }
    
    const sizes = {
      large: { min: 0.05, max: 0.15 },
      small: { min: 0.02, max: 0.05 },
      dust: { min: 0.005, max: 0.015 }
    }
    
    const speed = speeds[type].min + Math.random() * (speeds[type].max - speeds[type].min)
    this.size = sizes[type].min + Math.random() * (sizes[type].max - sizes[type].min)
    
    const theta = Math.random() * Math.PI * 2
    const phi = (30 + Math.random() * 30) * (Math.PI / 180)
    
    const normal = origin.clone().normalize()
    const tangent = new THREE.Vector3(-normal.y, normal.x, 0).normalize()
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent)
    
    const localVel = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    ).multiplyScalar(speed / 1000)
    
    this.velocity = new THREE.Vector3()
      .addScaledVector(tangent, localVel.x)
      .addScaledVector(normal, localVel.y)
      .addScaledVector(bitangent, localVel.z)
    
    const density = 2600
    const volume = (4/3) * Math.PI * Math.pow(this.size, 3)
    this.mass = density * volume
  }
  
  update(dt: number) {
    const GRAVITY = 9.8 / 6371
    const AIR_DENSITY = 1.225
    const DRAG_COEFF = 0.47
    const STEFAN_BOLTZMANN = 5.67e-8
    
    // Gravitational acceleration
    const g = this.position.clone().normalize().multiplyScalar(-GRAVITY)
    this.velocity.add(g.multiplyScalar(dt))
    
    // Air drag
    const v_mag = this.velocity.length()
    const area = Math.PI * this.size * this.size
    const drag_force = 0.5 * DRAG_COEFF * AIR_DENSITY * area * v_mag * v_mag / 6371
    const drag_accel = drag_force / this.mass
    
    if (v_mag > 0) {
      const drag = this.velocity.clone().normalize().multiplyScalar(-drag_accel * dt)
      this.velocity.add(drag)
    }
    
    // Radiative cooling (Stefan-Boltzmann law)
    const coolingRate = STEFAN_BOLTZMANN * Math.pow(this.temperature / 1000, 4) * area * dt * 100
    this.temperature = Math.max(300, this.temperature - coolingRate)
    
    // Atmospheric heating from friction
    if (v_mag > 0.01) {
      const frictionHeating = v_mag * v_mag * AIR_DENSITY * area * 0.5
      this.temperature += frictionHeating * dt * 10
    }
    
    // Update position
    this.position.add(this.velocity.clone().multiplyScalar(dt))
    
    // Ground collision
    const dist = this.position.length()
    if (dist <= 1.8) {
      this.position.normalize().multiplyScalar(1.8)
      this.velocity.multiplyScalar(0)
      this.temperature = Math.max(300, this.temperature * 0.7)
    }
  }
  
  getMaterialProps(): {
    roughness: number
    metalness: number
    clearcoat: number
    emissive: THREE.Color
    emissiveIntensity: number
  } {
    const temp = this.temperature
    
    if (temp > 1800) {
      return {
        roughness: 0.15,
        metalness: this.composition === 'iron' ? 0.9 : 0.0,
        clearcoat: 0.8,
        emissive: new THREE.Color(1.0, 0.8, 0.6),
        emissiveIntensity: 3.0
      }
    } else if (temp > 1200) {
      return {
        roughness: 0.35,
        metalness: this.composition === 'iron' ? 0.7 : 0.1,
        clearcoat: 0.5,
        emissive: new THREE.Color(1.0, 0.5, 0.2),
        emissiveIntensity: 1.5
      }
    } else if (temp > 800) {
      return {
        roughness: 0.60,
        metalness: this.composition === 'iron' ? 0.5 : 0.05,
        clearcoat: 0.2,
        emissive: new THREE.Color(0.8, 0.2, 0.0),
        emissiveIntensity: 0.5
      }
    } else {
      return {
        roughness: 0.90,
        metalness: this.composition === 'iron' ? 0.4 : 0.02,
        clearcoat: 0.0,
        emissive: new THREE.Color(0, 0, 0),
        emissiveIntensity: 0
      }
    }
  }
}

export function BallisticDebris({
  impactPosition,
  progress,
  intensity
}: BallisticDebrisProps) {
  const largeDebrisRef = useRef<THREE.InstancedMesh>(null)
  const smallDebrisRef = useRef<THREE.InstancedMesh>(null)
  const dustRef = useRef<THREE.Points>(null)
  
  const { particles, geometries } = useMemo(() => {
    const largeCount = Math.min(30, Math.floor(intensity * 15))
    const smallCount = Math.min(100, Math.floor(intensity * 50))
    const dustCount = Math.min(500, Math.floor(intensity * 250))
    
    const large: DebrisParticle[] = []
    const small: DebrisParticle[] = []
    const dust: DebrisParticle[] = []
    
    for (let i = 0; i < largeCount; i++) {
      large.push(new DebrisParticle(impactPosition, 'large'))
    }
    for (let i = 0; i < smallCount; i++) {
      small.push(new DebrisParticle(impactPosition, 'small'))
    }
    for (let i = 0; i < dustCount; i++) {
      dust.push(new DebrisParticle(impactPosition, 'dust'))
    }
    
    // Create irregular geometries for realistic asteroid fragments
    const largeGeometries: THREE.BufferGeometry[] = []
    const smallGeometries: THREE.BufferGeometry[] = []
    
    // Large irregular rocks
    for (let i = 0; i < Math.min(10, largeCount); i++) {
      const geo = new THREE.IcosahedronGeometry(1, 1)
      const positions = geo.getAttribute('position')
      const vertex = new THREE.Vector3()
      
      // Randomize vertices for irregular shape
      for (let j = 0; j < positions.count; j++) {
        vertex.fromBufferAttribute(positions, j)
        const noise = Math.random() * 0.5 + 0.75
        vertex.multiplyScalar(noise)
        positions.setXYZ(j, vertex.x, vertex.y, vertex.z)
      }
      
      geo.computeVertexNormals()
      largeGeometries.push(geo)
    }
    
    // Small irregular rocks
    for (let i = 0; i < Math.min(5, Math.floor(smallCount / 20)); i++) {
      const geo = new THREE.DodecahedronGeometry(1, 0)
      const positions = geo.getAttribute('position')
      const vertex = new THREE.Vector3()
      
      for (let j = 0; j < positions.count; j++) {
        vertex.fromBufferAttribute(positions, j)
        const noise = Math.random() * 0.4 + 0.8
        vertex.multiplyScalar(noise)
        positions.setXYZ(j, vertex.x, vertex.y, vertex.z)
      }
      
      geo.computeVertexNormals()
      smallGeometries.push(geo)
    }
    
    return { 
      particles: { large, small, dust },
      geometries: { large: largeGeometries, small: smallGeometries }
    }
  }, [impactPosition, intensity])
  
  useFrame((state, delta) => {
    if (progress < 0.75 || progress > 0.98) {
      if (largeDebrisRef.current) largeDebrisRef.current.visible = false
      if (smallDebrisRef.current) smallDebrisRef.current.visible = false
      if (dustRef.current) dustRef.current.visible = false
      return
    }
    
    if (largeDebrisRef.current) largeDebrisRef.current.visible = true
    if (smallDebrisRef.current) smallDebrisRef.current.visible = true
    if (dustRef.current) dustRef.current.visible = true
    
    const localProgress = (progress - 0.75) / 0.23
    const time_s = localProgress * 15
    
    const isSettling = progress >= 0.88
    const settleProgress = isSettling ? (progress - 0.88) / 0.10 : 0
    
    particles.large.forEach((p, i) => {
      if (!isSettling) {
        p.update(delta)
      } else {
        const targetDist = 1.8
        const currentDist = p.position.length()
        if (currentDist > targetDist) {
          p.position.lerp(p.position.clone().normalize().multiplyScalar(targetDist), settleProgress * 0.5)
          p.velocity.multiplyScalar(1 - settleProgress)
        }
      }
      
      const matrix = new THREE.Matrix4()
      
      // Irregular rotation for realism
      const rotationX = time_s * (0.5 + i * 0.1)
      const rotationY = time_s * (0.3 + i * 0.07)
      const rotationZ = time_s * (0.4 + i * 0.09)
      
      matrix.makeRotationFromEuler(new THREE.Euler(rotationX, rotationY, rotationZ))
      matrix.setPosition(p.position)
      
      const fadeScale = isSettling ? (1 - settleProgress * 0.3) : 1
      const scaleMatrix = new THREE.Matrix4().makeScale(p.size * fadeScale, p.size * fadeScale, p.size * fadeScale)
      matrix.multiply(scaleMatrix)
      
      if (largeDebrisRef.current) {
        largeDebrisRef.current.setMatrixAt(i, matrix)
        
        // Update material properties based on temperature (for first particle as sample)
        if (i === 0) {
          const matProps = p.getMaterialProps()
          const material = largeDebrisRef.current.material as THREE.MeshPhysicalMaterial
          material.roughness = matProps.roughness
          material.metalness = matProps.metalness
          material.clearcoat = matProps.clearcoat
          material.emissive = matProps.emissive
          material.emissiveIntensity = matProps.emissiveIntensity
          
          // Color variation based on composition
          if (p.composition === 'iron') {
            material.color = new THREE.Color(0.52, 0.48, 0.45)
          } else if (p.composition === 'molten') {
            material.color = new THREE.Color(0.35, 0.28, 0.22)
          } else if (p.composition === 'glass') {
            material.color = new THREE.Color(0.30, 0.28, 0.26)
          } else {
            material.color = new THREE.Color(0.45, 0.38, 0.30)
          }
        }
      }
    })
    
    particles.small.forEach((p, i) => {
      if (!isSettling) {
        p.update(delta)
      } else {
        const targetDist = 1.8
        const currentDist = p.position.length()
        if (currentDist > targetDist) {
          p.position.lerp(p.position.clone().normalize().multiplyScalar(targetDist), settleProgress * 0.7)
          p.velocity.multiplyScalar(1 - settleProgress)
        }
      }
      
      const matrix = new THREE.Matrix4()
      
      // Tumbling motion
      const rotX = time_s * (1.0 + i * 0.2)
      const rotY = time_s * (0.8 + i * 0.15)
      const rotZ = time_s * (0.6 + i * 0.12)
      
      matrix.makeRotationFromEuler(new THREE.Euler(rotX, rotY, rotZ))
      matrix.setPosition(p.position)
      
      const fadeScale = isSettling ? (1 - settleProgress * 0.5) : 1
      const scaleMatrix = new THREE.Matrix4().makeScale(p.size * fadeScale, p.size * fadeScale, p.size * fadeScale)
      matrix.multiply(scaleMatrix)
      
      if (smallDebrisRef.current) {
        smallDebrisRef.current.setMatrixAt(i, matrix)
      }
    })
    
    particles.dust.forEach((p, i) => {
      if (!isSettling) {
        p.update(delta)
      } else {
        const targetDist = 1.8
        const currentDist = p.position.length()
        if (currentDist > targetDist) {
          p.position.lerp(p.position.clone().normalize().multiplyScalar(targetDist), settleProgress * 0.9)
          p.velocity.multiplyScalar(1 - settleProgress * 1.5)
        }
      }
      
      if (dustRef.current) {
        const positions = dustRef.current.geometry.attributes.position
        positions.setXYZ(i, p.position.x, p.position.y, p.position.z)
        positions.needsUpdate = true
      }
    })
    
    if (largeDebrisRef.current) {
      largeDebrisRef.current.instanceMatrix.needsUpdate = true
      const material = largeDebrisRef.current.material as THREE.MeshStandardMaterial
      material.opacity = isSettling ? (1 - settleProgress * 0.7) : 1
      material.transparent = isSettling
    }
    if (smallDebrisRef.current) {
      smallDebrisRef.current.instanceMatrix.needsUpdate = true
      const material = smallDebrisRef.current.material as THREE.MeshStandardMaterial
      material.opacity = isSettling ? (1 - settleProgress * 0.8) : 1
      material.transparent = isSettling
    }
    if (dustRef.current) {
      const material = dustRef.current.material as THREE.PointsMaterial
      material.opacity = isSettling ? 0.6 * (1 - settleProgress) : 0.6
    }
  })
  
  const { dustPositions, dustColors } = useMemo(() => {
    const positions = new Float32Array(particles.dust.length * 3)
    const colors = new Float32Array(particles.dust.length * 3)
    
    particles.dust.forEach((p, i) => {
      positions[i * 3] = p.position.x
      positions[i * 3 + 1] = p.position.y
      positions[i * 3 + 2] = p.position.z
      
      // Color variation based on composition
      const baseColor = p.composition === 'iron' 
        ? { r: 0.5, g: 0.45, b: 0.42 }
        : { r: 0.4, g: 0.35, b: 0.28 }
      
      colors[i * 3] = baseColor.r + (Math.random() - 0.5) * 0.1
      colors[i * 3 + 1] = baseColor.g + (Math.random() - 0.5) * 0.1
      colors[i * 3 + 2] = baseColor.b + (Math.random() - 0.5) * 0.1
    })
    
    return { dustPositions: positions, dustColors: colors }
  }, [particles.dust])
  
  // Create procedural textures for debris
  const debrisTextures = useMemo(() => {
    // Roughness texture
    const roughCanvas = document.createElement('canvas')
    roughCanvas.width = 256
    roughCanvas.height = 256
    const roughCtx = roughCanvas.getContext('2d')!
    const roughData = roughCtx.createImageData(256, 256)
    
    for (let i = 0; i < roughData.data.length; i += 4) {
      const noise = Math.random()
      const value = 200 + noise * 55
      roughData.data[i] = value
      roughData.data[i + 1] = value
      roughData.data[i + 2] = value
      roughData.data[i + 3] = 255
    }
    roughCtx.putImageData(roughData, 0, 0)
    
    const roughnessTexture = new THREE.CanvasTexture(roughCanvas)
    roughnessTexture.wrapS = THREE.RepeatWrapping
    roughnessTexture.wrapT = THREE.RepeatWrapping
    
    return { roughness: roughnessTexture }
  }, [])
  
  return (
    <group>
      {/* Large debris - Irregular asteroid fragments */}
      <instancedMesh
        ref={largeDebrisRef}
        args={[undefined, undefined, particles.large.length]}
        castShadow
        receiveShadow
      >
        <dodecahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial
          color="#5a4a3a"
          roughness={0.92}
          roughnessMap={debrisTextures.roughness}
          metalness={0.12}
          clearcoat={0.15}
          clearcoatRoughness={0.7}
          reflectivity={0.2}
          emissive="#000000"
          emissiveIntensity={0}
          transparent
          opacity={1}
        />
      </instancedMesh>
      
      {/* Small debris - More angular fragments */}
      <instancedMesh
        ref={smallDebrisRef}
        args={[undefined, undefined, particles.small.length]}
        castShadow
      >
        <tetrahedronGeometry args={[1, 1]} />
        <meshPhysicalMaterial
          color="#6b5a48"
          roughness={0.88}
          metalness={0.08}
          clearcoat={0.08}
          clearcoatRoughness={0.75}
          transparent
          opacity={1}
        />
      </instancedMesh>
      
      {/* Dust cloud - Colored particles */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.dust.length}
            array={dustPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={particles.dust.length}
            array={dustColors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.012}
          vertexColors
          transparent
          opacity={0.65}
          sizeAttenuation
          blending={THREE.NormalBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}


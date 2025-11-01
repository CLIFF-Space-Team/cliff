'use client'

import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { AsteroidParams } from './types'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

interface EnhancedAsteroidPreviewProps {
  asteroid: AsteroidParams
}

const COMPARISONS = [
  { id: 'human', name: 'İnsan', size: 1.7, icon: '👤' },
  { id: 'building', name: 'Bina', size: 50, icon: '🏢' },
  { id: 'eiffel', name: 'Eyfel', size: 330, icon: '🗼' },
  { id: 'burj', name: 'Burj', size: 830, icon: '🏙️' },
  { id: 'field', name: 'Futbol', size: 100, icon: '⚽' }
]

function PremiumAsteroid({ diameter }: { diameter: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const rimLightRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  
  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 4) // Daha yüksek detay
    const positions = geo.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      
      // Daha belirgin kraterler ve yüzey detayları
      const noise1 = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 10) * Math.sin(vertex.z * 15)
      const noise2 = Math.sin(vertex.x * 24) * Math.cos(vertex.y * 20) * Math.sin(vertex.z * 30)
      const noise3 = Math.sin(vertex.x * 6) * Math.cos(vertex.y * 5) * Math.sin(vertex.z * 8)
      
      // Krater detayları
      const craterNoise = Math.sin(vertex.x * 5) * Math.cos(vertex.y * 4) * Math.sin(vertex.z * 6)
      const deepCraters = Math.pow(Math.max(0, craterNoise), 2) * -0.3
      
      // Ridge (sırt) detayları
      const ridgeNoise = Math.abs(Math.sin(vertex.x * 10)) * Math.abs(Math.cos(vertex.z * 10)) * 0.2
      
      const combinedNoise = (noise1 * 0.35 + noise2 * 0.15 + noise3 * 0.25 + deepCraters + ridgeNoise) * 0.5
      
      vertex.normalize()
      vertex.multiplyScalar(1.0 + combinedNoise)
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    geo.computeVertexNormals()
    return geo
  }, [])
  
  const normalMap = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(size, size)
    const data = imageData.data
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      
      const nx = Math.sin(x * 0.1) * Math.cos(y * 0.1) + Math.sin(x * 0.2) * Math.cos(y * 0.2) * 0.5
      
      data[i] = 128 + nx * 127
      data[i + 1] = 128 - nx * 64
      data[i + 2] = 180 + nx * 75
      data[i + 3] = 255
    }
    
    ctx.putImageData(imageData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])
  
  const fresnelShader = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        fresnelColor: { value: new THREE.Color('#88ccff') },
        fresnelPower: { value: 3.0 },
        fresnelIntensity: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 fresnelColor;
        uniform float fresnelPower;
        uniform float fresnelIntensity;
        
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), fresnelPower);
          vec3 color = fresnelColor * fresnel * fresnelIntensity;
          gl_FragColor = vec4(color, fresnel * fresnelIntensity);
        }
      `
    })
  }, [])
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x += delta * 0.1
    }
    if (rimLightRef.current) {
      rimLightRef.current.rotation.y += delta * 0.3
      rimLightRef.current.rotation.x += delta * 0.1
    }
  })
  
  return (
    <group>
      {/* Main asteroid with enhanced PBR */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#3a3530"
          metalness={0.15}
          roughness={0.92}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(2.0, 2.0)}
          emissive="#1a1510"
          emissiveIntensity={0.05}
          envMapIntensity={0.3}
          clearcoat={0.05}
          clearcoatRoughness={0.8}
          reflectivity={0.2}
        />
      </mesh>
      
      {/* Fresnel rim lighting */}
      <mesh ref={rimLightRef} geometry={geometry} scale={1.05}>
        <primitive object={fresnelShader} attach="material" />
      </mesh>
      
      {/* Subtle glow light */}
      <pointLight
        ref={glowRef}
        color="#6688aa"
        intensity={0.5}
        distance={3}
        decay={2}
      />
      
      {/* Dust particles around asteroid */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={new Float32Array(Array(300).fill(0).map(() => (Math.random() - 0.5) * 4))}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.015}
          color="#666666"
          transparent
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

function LandmarkModel({ type, size, asteroidSize }: { type: string, size: number, asteroidSize: number }) {
  const models = {
    human: (
      <group>
        {/* Baş */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshPhysicalMaterial 
            color="#ffdbac"
            roughness={0.6}
            metalness={0.0}
          />
        </mesh>
        
        {/* Gövde */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.10, 0.40, 16]} />
          <meshPhysicalMaterial 
            color="#4a90e2"
            roughness={0.7}
            metalness={0.0}
          />
        </mesh>
        
        {/* Bacaklar */}
        <mesh position={[-0.04, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.35, 12]} />
          <meshPhysicalMaterial color="#2d5a8c" roughness={0.8} />
        </mesh>
        <mesh position={[0.04, -0.15, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.35, 12]} />
          <meshPhysicalMaterial color="#2d5a8c" roughness={0.8} />
        </mesh>
        
        {/* Kollar */}
        <mesh position={[-0.14, 0.15, 0]} rotation={[0, 0, 0.3]} castShadow>
          <cylinderGeometry args={[0.03, 0.025, 0.30, 12]} />
          <meshPhysicalMaterial color="#4a90e2" roughness={0.7} />
        </mesh>
        <mesh position={[0.14, 0.15, 0]} rotation={[0, 0, -0.3]} castShadow>
          <cylinderGeometry args={[0.03, 0.025, 0.30, 12]} />
          <meshPhysicalMaterial color="#4a90e2" roughness={0.7} />
        </mesh>
      </group>
    ),
    building: (
      <group>
        {/* Ana bina gövdesi */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.30, 1.0, 0.30]} />
          <meshPhysicalMaterial 
            color="#b8c5d6"
            roughness={0.3}
            metalness={0.6}
            clearcoat={0.3}
            clearcoatRoughness={0.2}
          />
        </mesh>
        
        {/* Pencere detayları - grid pattern */}
        {Array.from({ length: 10 }).map((_, floor) => (
          <group key={floor}>
            {Array.from({ length: 4 }).map((_, col) => (
              <mesh 
                key={col}
                position={[
                  -0.12 + col * 0.08,
                  -0.45 + floor * 0.10,
                  0.151
                ]}
              >
                <boxGeometry args={[0.05, 0.07, 0.002]} />
                <meshPhysicalMaterial 
                  color="#1a3d5c"
                  roughness={0.1}
                  metalness={0.9}
                  emissive="#4a90e2"
                  emissiveIntensity={0.3}
                />
              </mesh>
            ))}
          </group>
        ))}
        
        {/* Çatı */}
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[0.32, 0.04, 0.32]} />
          <meshPhysicalMaterial color="#888888" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    ),
    eiffel: (
      <group>
        {/* Ana yapı - 4 ayak */}
        {[0, 90, 180, 270].map((angle, i) => (
          <mesh 
            key={i}
            position={[
              Math.cos(angle * Math.PI / 180) * 0.25,
              -0.20,
              Math.sin(angle * Math.PI / 180) * 0.25
            ]}
            rotation={[0.15, angle * Math.PI / 180, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.05, 0.50, 8]} />
            <meshPhysicalMaterial 
              color="#8b7355"
              roughness={0.6}
              metalness={0.7}
            />
          </mesh>
        ))}
        
        {/* Birinci platform */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.20, 0.25, 0.03, 8]} />
          <meshPhysicalMaterial color="#7a6245" roughness={0.5} metalness={0.7} />
        </mesh>
        
        {/* İkinci platform */}
        <mesh position={[0, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.15, 0.02, 8]} />
          <meshPhysicalMaterial color="#7a6245" roughness={0.5} metalness={0.7} />
        </mesh>
        
        {/* Tepe */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <coneGeometry args={[0.08, 0.20, 8]} />
          <meshPhysicalMaterial color="#8b7355" roughness={0.6} metalness={0.7} />
        </mesh>
        
        {/* Anten */}
        <mesh position={[0, 0.56, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.08, 8]} />
          <meshPhysicalMaterial color="#666666" roughness={0.3} metalness={0.9} />
        </mesh>
        
        {/* Kafes yapı detayları */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh 
            key={i}
            position={[0, -0.15 + i * 0.10, 0]}
            rotation={[Math.PI / 2, i * Math.PI / 4, 0]}
          >
            <torusGeometry args={[0.22 - i * 0.02, 0.008, 8, 8]} />
            <meshPhysicalMaterial color="#7a6245" roughness={0.6} metalness={0.7} />
          </mesh>
        ))}
      </group>
    ),
    burj: (
      <group>
        {/* Ana gövde - Y-şekilli taban */}
        {[0, 120, 240].map((angle, i) => (
          <mesh 
            key={i}
            position={[
              Math.cos(angle * Math.PI / 180) * 0.08,
              -0.10,
              Math.sin(angle * Math.PI / 180) * 0.08
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.12, 0.60, 0.12]} />
            <meshPhysicalMaterial 
              color="#c5d5e4"
              roughness={0.2}
              metalness={0.8}
              clearcoat={0.5}
              clearcoatRoughness={0.1}
            />
          </mesh>
        ))}
        
        {/* Orta gövde */}
        <mesh position={[0, 0.30, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.10, 0.12, 0.40, 16]} />
          <meshPhysicalMaterial 
            color="#d0dfe8"
            roughness={0.15}
            metalness={0.85}
            clearcoat={0.6}
          />
        </mesh>
        
        {/* Pencere katları */}
        {Array.from({ length: 20 }).map((_, floor) => (
          <mesh 
            key={floor}
            position={[0, -0.35 + floor * 0.05, 0.08]}
            castShadow
          >
            <boxGeometry args={[0.18, 0.04, 0.001]} />
            <meshPhysicalMaterial 
              color="#1a4d7a"
              roughness={0.1}
              metalness={0.9}
              emissive="#2d5a8c"
              emissiveIntensity={0.2}
            />
          </mesh>
        ))}
        
        {/* Tepe - spire */}
        <mesh position={[0, 0.58, 0]} castShadow>
          <coneGeometry args={[0.05, 0.20, 16]} />
          <meshPhysicalMaterial 
            color="#888888"
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
        
        {/* Anten */}
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
          <meshPhysicalMaterial color="#444444" roughness={0.3} metalness={1.0} />
        </mesh>
      </group>
    ),
    field: (
      <group>
        {/* Çim saha */}
        <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1.0, 0.68, 20, 20]} />
          <meshPhysicalMaterial 
            color="#2d7a3e"
            roughness={0.85}
            metalness={0.0}
          />
        </mesh>
        
        {/* Çizgiler - beyaz çizgi detayları */}
        {/* Kenar çizgileri */}
        <mesh position={[0, 0, 0.34]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.0, 0.002, 0.02]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, -0.34]} rotation={[0, 0, 0]}>
          <boxGeometry args={[1.0, 0.002, 0.02]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        <mesh position={[0.50, 0, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.002, 0.68]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        <mesh position={[-0.50, 0, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.002, 0.68]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        
        {/* Orta çizgi */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.02, 0.002, 0.68]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        
        {/* Orta daire */}
        <mesh position={[0, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.10, 0.008, 16, 32]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} />
        </mesh>
        
        {/* Ceza sahaları */}
        <mesh position={[0.38, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.165, 32]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.38, 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, 0.165, 32]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        
        {/* Kaleler */}
        <mesh position={[0.50, 0, 0]} castShadow>
          <boxGeometry args={[0.03, 0.10, 0.10]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[-0.50, 0, 0]} castShadow>
          <boxGeometry args={[0.03, 0.10, 0.10]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.6} metalness={0.3} />
        </mesh>
        
        {/* Ağlar */}
        <mesh position={[0.51, 0.05, 0]}>
          <boxGeometry args={[0.01, 0.10, 0.12]} />
          <meshPhysicalMaterial 
            color="#888888" 
            transparent 
            opacity={0.4}
            roughness={0.9}
            wireframe
          />
        </mesh>
        <mesh position={[-0.51, 0.05, 0]}>
          <boxGeometry args={[0.01, 0.10, 0.12]} />
          <meshPhysicalMaterial 
            color="#888888" 
            transparent 
            opacity={0.4}
            roughness={0.9}
            wireframe
          />
        </mesh>
      </group>
    )
  }
  
  return models[type as keyof typeof models] || models.eiffel
}

function calculateMass(diameter: number): number {
  const radius = diameter / 2
  const volume = (4/3) * Math.PI * Math.pow(radius, 3)
  const density = 2600
  return volume * density
}

function calculateEnergy(diameter: number, velocity: number): number {
  const mass = calculateMass(diameter)
  return 0.5 * mass * Math.pow(velocity * 1000, 2) / 4.184e15
}

export function EnhancedAsteroidPreview({ asteroid }: EnhancedAsteroidPreviewProps) {
  const [selectedComparison, setSelectedComparison] = useState('eiffel')
  
  const bestMatch = useMemo(() => {
    return COMPARISONS.reduce((prev, curr) => 
      Math.abs(curr.size - asteroid.diameter_m) < Math.abs(prev.size - asteroid.diameter_m) 
        ? curr 
        : prev
    )
  }, [asteroid.diameter_m])
  
  const mass = calculateMass(asteroid.diameter_m)
  const energy = calculateEnergy(asteroid.diameter_m, asteroid.velocity_kms)
  
  const comparison = COMPARISONS.find(c => c.id === selectedComparison) || bestMatch
  const ratio = (asteroid.diameter_m / comparison.size).toFixed(2)
  const humanRatio = Math.round(asteroid.diameter_m / 1.7)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-pure-black/80 backdrop-blur-md border border-cliff-white/10 rounded-xl p-4 space-y-4"
    >
      <h4 className="text-sm font-semibold text-cliff-white flex items-center gap-2">
        <span>🪨</span>
        Asteroid Boyut Karşılaştırması
      </h4>
      
      {/* Split View 3D Canvas - Gerçek Boyut Oranları */}
      <div className="grid grid-cols-2 gap-2 h-64 bg-gradient-to-b from-pure-black to-cliff-dark-gray rounded-lg border border-cliff-white/10 overflow-hidden shadow-xl">
        {/* Asteroid (Sol) */}
        <div className="relative border-r border-cliff-white/20">
          <Canvas 
            camera={{ position: [0, 0, 3.5], fov: 50 }}
            shadows
            gl={{ 
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0
            }}
          >
            <OrbitControls 
              enableZoom={true}
              enablePan={false}
              autoRotate
              autoRotateSpeed={1.2}
              enableDamping
              dampingFactor={0.05}
              minDistance={1.5}
              maxDistance={6}
            />
            
            {/* Profesyonel Stüdyo Işıklandırması */}
            <ambientLight intensity={0.4} />
            
            {/* Ana ışık (key light) */}
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={2.0} 
              color="#ffffff"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.1}
              shadow-camera-far={50}
              shadow-camera-left={-5}
              shadow-camera-right={5}
              shadow-camera-top={5}
              shadow-camera-bottom={-5}
            />
            
            {/* Dolgu ışığı (fill light) */}
            <pointLight position={[-4, 2, -3]} intensity={0.8} color="#88aaff" />
            
            {/* Arka ışık (rim light) */}
            <pointLight position={[0, 3, -5]} intensity={0.6} color="#ffaa88" />
            
            {/* Alt ışık (ambient ground) */}
            <pointLight position={[0, -3, 0]} intensity={0.3} color="#6699aa" />
            
            {/* Hemisphere lighting (doğal gökyüzü/zemin) */}
            <hemisphereLight args={['#87ceeb', '#4a3428', 0.6]} />
            
            {/* Asteroid - Gerçek ölçekli */}
            <group scale={asteroid.diameter_m >= comparison.size ? 1.0 : (asteroid.diameter_m / comparison.size)}>
              <PremiumAsteroid diameter={asteroid.diameter_m} />
            </group>
            
            {/* Yıldız arka planı */}
            <Stars 
              radius={80}
              depth={50}
              count={5000}
              factor={4}
              saturation={0.3}
              fade
              speed={0.3}
            />
            
            {/* Koyu uzay arka planı */}
            <mesh>
              <sphereGeometry args={[100, 32, 32]} />
              <meshBasicMaterial color="#000510" side={THREE.BackSide} />
            </mesh>
          </Canvas>
          
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <p className="text-xs font-semibold text-cliff-white bg-pure-black/90 backdrop-blur-sm inline-block px-3 py-1.5 rounded-lg border border-cliff-white/20">
              🪨 {asteroid.diameter_m}m
            </p>
          </div>
        </div>
        
        {/* Landmark (Sağ) */}
        <div className="relative">
          <Canvas 
            camera={{ position: [0, 0, 3.5], fov: 50 }}
            shadows
            gl={{ 
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.0
            }}
          >
            <ambientLight intensity={0.5} />
            
            {/* Ana ışık */}
            <directionalLight 
              position={[5, 5, 5]} 
              intensity={1.8} 
              color="#ffffff"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            
            {/* Dolgu ışık */}
            <pointLight position={[-4, 2, -3]} intensity={0.7} color="#88aaff" />
            
            {/* Arka rim light */}
            <pointLight position={[0, 3, -5]} intensity={0.5} color="#ffaa88" />
            
            <hemisphereLight args={['#87ceeb', '#4a3428', 0.5]} />
            
            {/* Landmark - Gerçek ölçekli */}
            <group scale={comparison.size >= asteroid.diameter_m ? 1.0 : (comparison.size / asteroid.diameter_m)}>
              <AnimatePresence mode="wait">
                <group key={selectedComparison}>
                  <LandmarkModel 
                    type={selectedComparison} 
                    size={comparison.size}
                    asteroidSize={asteroid.diameter_m}
                  />
                </group>
              </AnimatePresence>
            </group>
            
            {/* Profesyonel zemin */}
            <mesh position={[0, -0.81, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[15, 15]} />
              <meshPhysicalMaterial 
                color="#1a1a1a"
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>
            
            {/* Grid çizgileri */}
            <gridHelper args={[15, 30, '#333333', '#222222']} position={[0, -0.80, 0]} />
            
            {/* Yıldız arka planı */}
            <Stars radius={80} depth={50} count={3000} factor={3} saturation={0.3} fade speed={0.5} />
          </Canvas>
          
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <p className="text-xs font-semibold text-cliff-light-gray bg-pure-black/90 backdrop-blur-sm inline-block px-3 py-1.5 rounded-lg border border-cliff-white/20">
              {comparison.icon} {comparison.size}m
            </p>
          </div>
        </div>
      </div>
      
      {/* Karşılaştırma Butonları */}
      <div className="flex gap-1 justify-between">
        {COMPARISONS.map((comp) => (
          <button
            key={comp.id}
            onClick={() => setSelectedComparison(comp.id)}
            className={`flex-1 px-2 py-2 rounded-lg text-xs transition-all ${
              selectedComparison === comp.id
                ? 'bg-cliff-white/10 border border-cliff-white/30 text-cliff-white'
                : 'bg-pure-black/50 border border-cliff-white/10 text-cliff-light-gray hover:bg-cliff-white/5'
            }`}
          >
            <div className="text-base">{comp.icon}</div>
            <div className="text-[10px] mt-1">{comp.name}</div>
          </button>
        ))}
      </div>
      
      {/* Karşılaştırma Bilgisi */}
      <div className="bg-pure-black/60 border border-cliff-white/20 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-cliff-light-gray">⚖️ Oran:</span>
          <span className="text-sm font-bold text-cliff-white">
            {ratio}x {comparison.name}
          </span>
        </div>
        <div className="text-xs text-cliff-light-gray">
          💡 {humanRatio} insan boyutu ({asteroid.diameter_m}m ÷ 1.7m)
        </div>
      </div>
      
      {/* Bilimsel Veriler */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-cliff-white">📊 Bilimsel Veriler</h5>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-pure-black/60 rounded-lg p-2 border border-cliff-white/10">
            <p className="text-[10px] text-cliff-light-gray">Kütle</p>
            <p className="text-xs font-mono text-cliff-white">{mass.toExponential(2)} kg</p>
          </div>
          
          <div className="bg-pure-black/60 rounded-lg p-2 border border-cliff-white/10">
            <p className="text-[10px] text-cliff-light-gray">Enerji</p>
            <p className="text-xs font-mono text-cliff-white">{energy.toFixed(0)} MT</p>
          </div>
        </div>
        
        <div className="bg-pure-black/60 border border-cliff-white/20 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cliff-light-gray">Tehdit Seviyesi:</span>
            <span className={`text-sm font-bold ${
              asteroid.diameter_m < 100 ? 'text-yellow-400' : 
              asteroid.diameter_m < 300 ? 'text-orange-400' : 
              'text-red-400'
            }`}>
              {asteroid.diameter_m < 100 ? '🟡 Orta' : asteroid.diameter_m < 300 ? '🟠 Yüksek' : '🔴 Kritik'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="text-xs text-center text-cliff-light-gray/70 pt-2 border-t border-cliff-white/10">
        🖱️ Fareyle asteroid'i döndürebilirsiniz
      </div>
    </motion.div>
  )
}


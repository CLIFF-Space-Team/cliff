import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { SimpleCelestialBody } from '@/types/astronomical-data'
import { useSolarSystemStore, solarSystemSelectors } from '@/stores/solarSystemStore'
import { createAsteroidPBRMaterial } from './AsteroidPBRMaterial'

interface AsteroidProps {
  data: SimpleCelestialBody
  position?: [number, number, number]
  onCameraFocus?: (position: [number, number, number], target: [number, number, number]) => void
  onAsteroidSelect?: (asteroid: SimpleCelestialBody) => void
}

// 🚀 COMPLETELY REDESIGNED: Modern Asteroid Component - VISIBLE & INTERACTIVE
export const Asteroid: React.FC<AsteroidProps> = ({ data, position = [0, 0, 0], onCameraFocus, onAsteroidSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const timeScale = useSolarSystemStore(solarSystemSelectors.timeScale)

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 🚀 FIXED: Much larger, visible asteroid geometry with modern stone shape
  const { geometry, surfaceGeometry, baseRadius } = useMemo(() => {
    // 🔧 FIX: Çok daha büyük boyut aralığı - her zaman görünür
    const baseRadius = Math.min(Math.max(data.info.radius_km * 0.1, 0.8), 2.5) // Minimum 0.8, maksimum 2.5
    
    // Modern irregular stone shape using IcosahedronGeometry
    const baseGeometry = new THREE.IcosahedronGeometry(baseRadius, isMobile ? 2 : 3)
    
    // Apply advanced noise for realistic asteroid surface
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Multi-layer realistic stone surface noise
      const noise1 = Math.sin(vertex.x * 8) * Math.cos(vertex.y * 6) * Math.sin(vertex.z * 10)
      const noise2 = Math.sin(vertex.x * 20) * Math.cos(vertex.y * 15) * Math.sin(vertex.z * 25)
      const noise3 = Math.sin(vertex.x * 40) * Math.cos(vertex.y * 35) * Math.sin(vertex.z * 50)
      const noise4 = Math.sin(vertex.x * 80) * Math.cos(vertex.y * 70) * Math.sin(vertex.z * 90)
      
      // Combine noise layers for realistic stone surface
      const combinedNoise = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.15 + noise4 * 0.05) * 0.4
      
      // Apply surface irregularities
      vertex.normalize()
      vertex.multiplyScalar(baseRadius * (1.0 + combinedNoise))
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    baseGeometry.computeVertexNormals()
    baseGeometry.normalizeNormals()
    
    // Surface detail geometry for enhanced stone texture
    const surfaceDetail = new THREE.IcosahedronGeometry(baseRadius * 1.02, isMobile ? 1 : 2)
    const surfacePosition = surfaceDetail.getAttribute('position')
    
    for (let i = 0; i < surfacePosition.count; i++) {
      vertex.fromBufferAttribute(surfacePosition, i)
      
      // Create crater-like stone indentations
      const craterNoise = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 10) * Math.sin(vertex.z * 15)
      const weatheringNoise = Math.sin(vertex.x * 30) * Math.cos(vertex.y * 25) * Math.sin(vertex.z * 35)
      
      vertex.normalize()
      vertex.multiplyScalar(baseRadius * (1.01 + (craterNoise * 0.04) + (weatheringNoise * 0.02)))
      
      surfacePosition.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    surfaceDetail.computeVertexNormals()
    
    return {
      geometry: baseGeometry,
      surfaceGeometry: surfaceDetail,
      baseRadius
    }
  }, [data.info.radius_km, isMobile])

  // 🚀 ENHANCED: PBR taş malzeme (tek yerde yönetilen)
  const asteroidMaterial = useMemo(() => {
    return createAsteroidPBRMaterial({ hazardous: !!data.is_hazardous, quality: isMobile ? 'medium' : 'high' })
  }, [data.is_hazardous, isMobile])

  // Enhanced glow material with threat level coloring
  const glowMaterial = useMemo(() => {
    if (isMobile) return null
    
    // Tehlike seviyesine göre renk belirleme
    const distance_km = data.orbital_data?.miss_distance?.kilometers
      ? parseFloat(data.orbital_data.miss_distance.kilometers)
      : 5000000
    const distance_au = distance_km / 149597870.7
    
    let glowColor = '#4A90E2' // Düşük risk - mavi
    let intensity = 0.8
    
    if (data.is_hazardous) {
      glowColor = '#FF4444' // Yüksek risk - kırmızı
      intensity = 1.5
    } else if (distance_au < 0.05) {
      glowColor = '#FF8800' // Orta risk - turuncu
      intensity = 1.2
    }
    
    return new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: {
        time: { value: 0 },
        intensity: { value: (hovered || showTooltip) ? intensity * 1.5 : intensity },
        glowColor: { value: new THREE.Color(glowColor) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 glowColor;
        
        varying vec3 vNormal;
        varying vec3 vPositionNormal;
        
        void main() {
          float rim = 1.0 - max(dot(vNormal, vPositionNormal), 0.0);
          rim = smoothstep(0.4, 1.0, rim);
          
          // Tehlike seviyesine göre pulse hızı
          float pulseSpeed = intensity > 1.4 ? 3.0 : (intensity > 1.0 ? 2.0 : 1.5);
          float pulse = sin(time * pulseSpeed) * 0.3 + 0.7;
          
          vec3 color = glowColor * rim * pulse * intensity;
          gl_FragColor = vec4(color, rim * 0.8);
        }
      `
    })
  }, [data.is_hazardous, data.orbital_data, hovered, showTooltip, isMobile])

  // Gerçekçi yavaş asteroid rotasyonu: dönme ekseni + açısal hız (rad/sn)
  const spinAxisRef = useRef<THREE.Vector3>(new THREE.Vector3())
  useEffect(() => {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
    if (v.lengthSq() < 1e-6) v.set(1, 0, 0)
    v.normalize()
    spinAxisRef.current.copy(v)
  }, [])

  const spinAngularVelocity = useMemo(() => {
    // Tipik dönem: 4-16 saat, küçükler daha hızlı
    const radiusKm = Math.max(0.05, Number(data?.info?.radius_km) || 0.5)
    const sizeFactor = Math.max(0.6, Math.min(1.6, 1.0 / Math.sqrt(radiusKm)))
    const baseHours = 4 + Math.random() * 12
    const periodHours = Math.max(2, baseHours / sizeFactor)
    const w = (2 * Math.PI) / (periodHours * 3600)
    return w
  }, [data?.info?.radius_km])

  // Görsel ölçek: gerçekçi ama gözle seçilebilir kılmak için hafif hızlandırma
  const SPIN_VISUAL_SCALE = isMobile ? 10 : 12

  useFrame((state, delta) => {
    if (meshRef.current) {
      const axis = spinAxisRef.current
      const angle = delta * spinAngularVelocity * (timeScale || 1) * SPIN_VISUAL_SCALE
      if (angle > 0) {
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle)
        meshRef.current.applyQuaternion(q)
      }

      const targetScale = (hovered || showTooltip) ? 1.2 : 1.0
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 10)
      meshRef.current.scale.setScalar(newScale)
    }

    if (glowRef.current && glowMaterial) {
      glowMaterial.uniforms.time.value = state.clock.elapsedTime
      glowMaterial.uniforms.intensity.value = (hovered || showTooltip) ? 2.0 : 1.2
    }
  })

  // Event handlers with enhanced mobile support
  const handlePointerEnter = useCallback(() => {
    if (!isMobile) {
      setHovered(true)
      setShowTooltip(true)
      document.body.style.cursor = 'pointer'
    }
  }, [isMobile])
  
  const handlePointerLeave = useCallback(() => {
    if (!isMobile) {
      setHovered(false)
      setShowTooltip(false)
      document.body.style.cursor = 'default'
    }
  }, [isMobile])
  
  // Enhanced click handler for panel opening - WITH DEBUGGING
  const handleClick = useCallback((event: any) => {
    event.stopPropagation()
    setClicked(!clicked)
    
    // Open detail panel instead of tooltip
    if (onAsteroidSelect) {
      onAsteroidSelect(data)
    }
    
    // Still handle camera focus if provided
    if (onCameraFocus && groupRef.current) {
      const worldPosition = new THREE.Vector3()
      groupRef.current.getWorldPosition(worldPosition)
      
      const distance = isMobile ? 2.5 : 3.0
      const offset = new THREE.Vector3(distance, 0.8, distance)
      const cameraPosition = worldPosition.clone().add(offset)
      
      onCameraFocus(
        [cameraPosition.x, cameraPosition.y, cameraPosition.z],
        [worldPosition.x, worldPosition.y, worldPosition.z]
      )
    }
  }, [clicked, onAsteroidSelect, onCameraFocus, isMobile, data])

  // Güvenli veri hesaplama - orbital_data yoksa default değerler kullan
  const distance_km = data.orbital_data?.miss_distance?.kilometers
    ? parseFloat(data.orbital_data.miss_distance.kilometers)
    : 5000000 // Default 5M km

  const distance_au = distance_km / 149597870.7
  
  const velocity_kms = data.orbital_data?.relative_velocity?.kilometers_per_second
    ? parseFloat(data.orbital_data.relative_velocity.kilometers_per_second)
    : 15 // Default 15 km/s
  
  
  // Turkish labels
  const threat_level_turkish = data.is_hazardous ? 'YÜKSEK RİSK ⚠️' : 
                              distance_au < 0.05 ? 'ORTA RİSK' : 'DÜŞÜK RİSK'

  return (
    <group ref={groupRef} position={position}>
      {/* BIGGER CLICK AREA - Invisible sphere for easier clicking */}
      <mesh
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onPointerDown={handleClick}
        onDoubleClick={handleClick}
      >
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      
      {/* Main asteroid mesh with enhanced stone appearance */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={asteroidMaterial}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onPointerDown={handleClick}
        onDoubleClick={handleClick}
        castShadow={!isMobile}
        receiveShadow={!isMobile}
      />
      
      {/* Surface detail layer for enhanced realism */}
      {!isMobile && (
        <mesh
          geometry={surfaceGeometry}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
          onPointerDown={handleClick}
          onDoubleClick={handleClick}
        >
          <meshStandardMaterial 
            color={data.is_hazardous ? '#B87333' : '#778899'}
            transparent
            opacity={0.4}
            roughness={0.98}
            metalness={0.02}
          />
        </mesh>
      )}
      
      {/* Glow effect based on threat level */}
      {glowMaterial && !isMobile && (
        <mesh
          ref={glowRef}
          geometry={geometry}
          material={glowMaterial}
          scale={1.12}
        />
      )}
      
      {/* Simple hover indicator - panel will open separately */}
      {(hovered || clicked) && (
        <Html
          distanceFactor={15}
          position={[0, 1.5, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-black/80 text-white px-3 py-1 rounded-lg text-xs whitespace-nowrap border border-cyan-400/40">
            🪨 {data.name || data.turkish_name}
            {data.is_hazardous && <span className="text-red-400 ml-2">⚠️</span>}
            <div className="text-xs text-gray-400 mt-1">
              {clicked ? '📋 Panel açıldı' : '👆 Detaylar için tıklayın'}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

export default Asteroid;
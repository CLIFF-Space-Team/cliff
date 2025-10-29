import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { SimpleCelestialBody } from '@/types/astronomical-data'

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

  // 🚀 ENHANCED: Modern stone material with realistic textures
  const asteroidMaterial = useMemo(() => {
    const baseColor = data.is_hazardous ? '#8B4513' : '#696969' // Brown for hazardous, dark gray for normal
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.95, // Very rough stone surface
      metalness: 0.05, // Very low metallic content
      bumpScale: 0.5,
    })
    
    // Create realistic stone texture using advanced canvas techniques
    const canvas = document.createElement('canvas')
    const size = isMobile ? 256 : 512 // Higher quality texture
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Create realistic stone texture pattern
    const imageData = ctx.createImageData(size, size)
    const pixelData = imageData.data
    
    for (let i = 0; i < pixelData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      
      // Advanced stone pattern with multiple noise layers
      const noise1 = Math.sin(x * 0.05) * Math.cos(y * 0.04) 
      const noise2 = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 0.6
      const noise3 = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.4
      const noise4 = Math.sin(x * 0.4) * Math.cos(y * 0.3) * 0.2
      
      // Create mineral vein-like patterns
      const veinPattern = Math.sin(x * 0.02 + y * 0.03) * Math.cos(x * 0.025 + y * 0.02)
      
      const combinedNoise = (noise1 + noise2 + noise3 + noise4) + (veinPattern * 0.3)
      const intensity = Math.max(40, Math.min(200, 110 + combinedNoise * 45))
      
      // Stone color variations
      if (data.is_hazardous) {
        // Hazardous asteroids: brownish-red stone
        pixelData[i] = intensity * 0.8       // Red
        pixelData[i + 1] = intensity * 0.5   // Green  
        pixelData[i + 2] = intensity * 0.3   // Blue
      } else {
        // Normal asteroids: grayish stone
        pixelData[i] = intensity * 0.7       // Red
        pixelData[i + 1] = intensity * 0.7   // Green  
        pixelData[i + 2] = intensity * 0.8   // Blue
      }
      pixelData[i + 3] = 255               // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    // Create normal map for enhanced surface detail
    const normalCanvas = document.createElement('canvas')
    normalCanvas.width = size
    normalCanvas.height = size
    const normalCtx = normalCanvas.getContext('2d')!
    const normalImageData = normalCtx.createImageData(size, size)
    const normalData = normalImageData.data
    
    for (let i = 0; i < normalData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      
      // Create normal map for surface bumps
      const bumpIntensity = Math.sin(x * 0.3) * Math.cos(y * 0.25) * 128 + 128
      
      normalData[i] = bumpIntensity     // Red (X)
      normalData[i + 1] = 128           // Green (Y)  
      normalData[i + 2] = bumpIntensity // Blue (Z)
      normalData[i + 3] = 255           // Alpha
    }
    
    normalCtx.putImageData(normalImageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    
    const normalTexture = new THREE.CanvasTexture(normalCanvas)
    normalTexture.wrapS = THREE.RepeatWrapping
    normalTexture.wrapT = THREE.RepeatWrapping
    normalTexture.repeat.set(1, 1)
    
    material.map = texture
    material.bumpMap = texture
    material.normalMap = normalTexture
    
    return material
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

  // Gerçekçi yavaş asteroid rotasyonu (asteroidler gerçekte çok yavaş döner)
  const rotationSpeed = useMemo(() => ({
    x: (Math.random() - 0.5) * (isMobile ? 0.01 : 0.02),
    y: (Math.random() - 0.5) * (isMobile ? 0.01 : 0.02),
    z: (Math.random() - 0.5) * (isMobile ? 0.005 : 0.01)
  }), [isMobile])

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * rotationSpeed.x
      meshRef.current.rotation.y += delta * rotationSpeed.y
      meshRef.current.rotation.z += delta * rotationSpeed.z
      
      // Smooth hover animation - larger scale change
      const targetScale = (hovered || showTooltip) ? 1.2 : 1.0
      const currentScale = meshRef.current.scale.x
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 10)
      meshRef.current.scale.setScalar(newScale)
    }
    
    // Update glow material time
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
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
export const Asteroid: React.FC<AsteroidProps> = ({ data, position = [0, 0, 0], onCameraFocus, onAsteroidSelect }) => {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const { geometry, surfaceGeometry, baseRadius } = useMemo(() => {
    const baseRadius = Math.min(Math.max(data.info.radius_km * 0.15, 1.0), 3.0) // Daha büyük ve görünür
    const baseGeometry = new THREE.IcosahedronGeometry(baseRadius, isMobile ? 3 : 4)
    const positionAttribute = baseGeometry.getAttribute('position')
    const vertex = new THREE.Vector3()
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      const noise1 = Math.sin(vertex.x * 12) * Math.cos(vertex.y * 8) * Math.sin(vertex.z * 15)
      const noise2 = Math.sin(vertex.x * 25) * Math.cos(vertex.y * 20) * Math.sin(vertex.z * 30)
      const noise3 = Math.sin(vertex.x * 50) * Math.cos(vertex.y * 45) * Math.sin(vertex.z * 60)
      const noise4 = Math.sin(vertex.x * 100) * Math.cos(vertex.y * 90) * Math.sin(vertex.z * 110)
      const noise5 = Math.sin(vertex.x * 200) * Math.cos(vertex.y * 180) * Math.sin(vertex.z * 220)
      const craterNoise = Math.sin(vertex.x * 6) * Math.cos(vertex.y * 5) * Math.sin(vertex.z * 8)
      const impactNoise = Math.sin(vertex.x * 15) * Math.cos(vertex.y * 12) * Math.sin(vertex.z * 18)
      const combinedNoise = (
        noise1 * 0.4 + 
        noise2 * 0.25 + 
        noise3 * 0.15 + 
        noise4 * 0.1 + 
        noise5 * 0.05 +
        craterNoise * 0.3 +
        impactNoise * 0.2
      ) * 0.6
      vertex.normalize()
      vertex.multiplyScalar(baseRadius * (1.0 + combinedNoise))
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    baseGeometry.computeVertexNormals()
    baseGeometry.normalizeNormals()
    const surfaceDetail = new THREE.IcosahedronGeometry(baseRadius * 1.05, isMobile ? 2 : 3)
    const surfacePosition = surfaceDetail.getAttribute('position')
    for (let i = 0; i < surfacePosition.count; i++) {
      vertex.fromBufferAttribute(surfacePosition, i)
      const craterNoise = Math.sin(vertex.x * 15) * Math.cos(vertex.y * 12) * Math.sin(vertex.z * 18)
      const weatheringNoise = Math.sin(vertex.x * 35) * Math.cos(vertex.y * 30) * Math.sin(vertex.z * 40)
      const erosionNoise = Math.sin(vertex.x * 60) * Math.cos(vertex.y * 55) * Math.sin(vertex.z * 70)
      vertex.normalize()
      vertex.multiplyScalar(baseRadius * (1.02 + (craterNoise * 0.06) + (weatheringNoise * 0.03) + (erosionNoise * 0.02)))
      surfacePosition.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    surfaceDetail.computeVertexNormals()
    return {
      geometry: baseGeometry,
      surfaceGeometry: surfaceDetail,
      baseRadius
    }
  }, [data.info.radius_km, isMobile])
  const asteroidMaterial = useMemo(() => {
    const baseColor = data.is_hazardous ? '#A0522D' : '#708090' // Daha gerçekçi renkler
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.98, // Çok pürüzlü asteroid yüzeyi
      metalness: 0.02, // Çok düşük metalik içerik
      bumpScale: 0.8,
      normalScale: new THREE.Vector2(0.5, 0.5),
    })
    const canvas = document.createElement('canvas')
    const size = isMobile ? 512 : 1024 // Yüksek kalite tekstür
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const imageData = ctx.createImageData(size, size)
    const pixelData = imageData.data
    for (let i = 0; i < pixelData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      const noise1 = Math.sin(x * 0.03) * Math.cos(y * 0.025) 
      const noise2 = Math.sin(x * 0.06) * Math.cos(y * 0.05) * 0.7
      const noise3 = Math.sin(x * 0.12) * Math.cos(y * 0.1) * 0.5
      const noise4 = Math.sin(x * 0.24) * Math.cos(y * 0.2) * 0.3
      const noise5 = Math.sin(x * 0.48) * Math.cos(y * 0.4) * 0.2
      const veinPattern = Math.sin(x * 0.015 + y * 0.02) * Math.cos(x * 0.018 + y * 0.015)
      const crackPattern = Math.sin(x * 0.08 + y * 0.06) * Math.cos(x * 0.09 + y * 0.07)
      const craterPattern = Math.sin(x * 0.04 + y * 0.03) * Math.cos(x * 0.045 + y * 0.035)
      const combinedNoise = (
        noise1 + noise2 + noise3 + noise4 + noise5 + 
        veinPattern * 0.4 + 
        crackPattern * 0.3 + 
        craterPattern * 0.2
      )
      const intensity = Math.max(30, Math.min(220, 120 + combinedNoise * 50))
      if (data.is_hazardous) {
        pixelData[i] = intensity * 0.85      // Red
        pixelData[i + 1] = intensity * 0.45  // Green  
        pixelData[i + 2] = intensity * 0.25  // Blue
      } else {
        pixelData[i] = intensity * 0.75      // Red
        pixelData[i + 1] = intensity * 0.7   // Green  
        pixelData[i + 2] = intensity * 0.65  // Blue
      }
      pixelData[i + 3] = 255               // Alpha
    }
    ctx.putImageData(imageData, 0, 0)
    const normalCanvas = document.createElement('canvas')
    normalCanvas.width = size
    normalCanvas.height = size
    const normalCtx = normalCanvas.getContext('2d')!
    const normalImageData = normalCtx.createImageData(size, size)
    const normalData = normalImageData.data
    for (let i = 0; i < normalData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      const bump1 = Math.sin(x * 0.2) * Math.cos(y * 0.15) * 64 + 128
      const bump2 = Math.sin(x * 0.4) * Math.cos(y * 0.3) * 32 + 128
      const bump3 = Math.sin(x * 0.8) * Math.cos(y * 0.6) * 16 + 128
      const bumpIntensity = (bump1 + bump2 + bump3) / 3
      normalData[i] = bumpIntensity     // Red (X)
      normalData[i + 1] = 128           // Green (Y)  
      normalData[i + 2] = bumpIntensity // Blue (Z)
      normalData[i + 3] = 255           // Alpha
    }
    normalCtx.putImageData(normalImageData, 0, 0)
    const roughnessCanvas = document.createElement('canvas')
    roughnessCanvas.width = size
    roughnessCanvas.height = size
    const roughnessCtx = roughnessCanvas.getContext('2d')!
    const roughnessImageData = roughnessCtx.createImageData(size, size)
    const roughnessData = roughnessImageData.data
    for (let i = 0; i < roughnessData.length; i += 4) {
      const x = (i / 4) % size
      const y = Math.floor((i / 4) / size)
      const roughness = Math.sin(x * 0.1) * Math.cos(y * 0.08) * 50 + 200
      roughnessData[i] = roughness      // Red
      roughnessData[i + 1] = roughness  // Green  
      roughnessData[i + 2] = roughness  // Blue
      roughnessData[i + 3] = 255        // Alpha
    }
    roughnessCtx.putImageData(roughnessImageData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1, 1)
    texture.anisotropy = 16
    const normalTexture = new THREE.CanvasTexture(normalCanvas)
    normalTexture.wrapS = THREE.RepeatWrapping
    normalTexture.wrapT = THREE.RepeatWrapping
    normalTexture.repeat.set(1, 1)
    const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas)
    roughnessTexture.wrapS = THREE.RepeatWrapping
    roughnessTexture.wrapT = THREE.RepeatWrapping
    roughnessTexture.repeat.set(1, 1)
    material.map = texture
    material.bumpMap = texture
    material.normalMap = normalTexture
    material.roughnessMap = roughnessTexture
    return material
  }, [data.is_hazardous, isMobile])
  const glowMaterial = useMemo(() => {
    if (isMobile) return null
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
          float pulseSpeed = intensity > 1.4 ? 3.0 : (intensity > 1.0 ? 2.0 : 1.5);
          float pulse = sin(time * pulseSpeed) * 0.3 + 0.7;
          vec3 color = glowColor * rim * pulse * intensity;
          gl_FragColor = vec4(color, rim * 0.8);
        }
      `
    })
  }, [data.is_hazardous, data.orbital_data, hovered, showTooltip, isMobile])
  useFrame((state, delta) => {
    if (meshRef.current) {
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
  const handleClick = useCallback((event: any) => {
    event.stopPropagation()
    setClicked(!clicked)
    if (onAsteroidSelect) {
      onAsteroidSelect(data)
    }
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
  const distance_km = data.orbital_data?.miss_distance?.kilometers
    ? parseFloat(data.orbital_data.miss_distance.kilometers)
    : 5000000 // Default 5M km
  const distance_au = distance_km / 149597870.7
  const velocity_kms = data.orbital_data?.relative_velocity?.kilometers_per_second
    ? parseFloat(data.orbital_data.relative_velocity.kilometers_per_second)
    : 15 // Default 15 km/s
  const threat_level_turkish = data.is_hazardous ? 'YÜKSEK RİSK ⚠️' : 
                              distance_au < 0.05 ? 'ORTA RİSK' : 'DÜŞÜK RİSK'
  return (
    <group ref={groupRef} position={position}>
      {}
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
      {}
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
      {}
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
      {}
      {glowMaterial && !isMobile && (
        <mesh
          ref={glowRef}
          geometry={geometry}
          material={glowMaterial}
          scale={1.12}
        />
      )}
      {}
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
'use client'

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, QuadraticBezierLine } from '@react-three/drei'
import {
  createAtmosphericScatteringMaterial,
  updateAtmosphericScattering
} from '../shaders/AtmosphericScatteringShader'
import { createAuroraMaterial, updateAurora } from '../shaders/AuroraShader'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
import { useGIBSEarthTexture } from '@/hooks/use-gibs-texture'

const TR_CATEGORIES: Record<string, string> = {
  'wildfires': 'Orman Yangını',
  'volcanoes': 'Volkanik Patlama',
  'severe storms': 'Şiddetli Fırtına',
  'floods': 'Sel',
  'drought': 'Kuraklık',
  'earthquakes': 'Deprem',
  'dust and haze': 'Toz ve Pus',
  'water color': 'Su Rengi',
  'sea lake ice': 'Deniz/Göl Buzu',
  'default': 'Doğa Olayı'
}

const formatDateTR = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Tarih Bilinmiyor'
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  } catch {
    return '...'
  }
}

function getPositionFromLatLon(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const x = -(radius) * Math.sin(phi) * Math.cos(theta)
  const z = (radius) * Math.sin(phi) * Math.sin(theta)
  const y = (radius) * Math.cos(phi)
  return new THREE.Vector3(x, y, z)
}

interface EnhancedEarthProps {
  position?: [number, number, number]
  scale?: number
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  showClouds?: boolean
  showAtmosphere?: boolean
  showAurora?: boolean
  showCityLights?: boolean
  enableRotation?: boolean
  sunPosition?: THREE.Vector3
  nasaTexture?: string
  showEarthEvents?: boolean
  useGIBS?: boolean
}

function TurkeyConnections({ events, earthRadius }: { events: any[], earthRadius: number }) {
  const turkeyPos = useMemo(() => getPositionFromLatLon(39, 35, earthRadius), [earthRadius])

  return (
    <group>
      <mesh position={turkeyPos}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.8} />
        <Html distanceFactor={12} style={{ pointerEvents: 'none' }}>
          <div className="flex items-center gap-1 -translate-x-1/2 -translate-y-full mb-2">
            <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full animate-pulse shadow-[0_0_8px_#00ff88]" />
            <span className="text-[8px] font-bold text-[#00ff88] tracking-widest drop-shadow-lg">MERKEZ</span>
          </div>
        </Html>
      </mesh>

      {events.slice(0, 10).map((event, i) => {
         if (!event.geometry?.[0]?.coordinates) return null
         const [lon, lat] = event.geometry[0].coordinates
         const eventPos = getPositionFromLatLon(lat, lon, earthRadius)
         const midPoint = turkeyPos.clone().add(eventPos).multiplyScalar(0.5).normalize().multiplyScalar(earthRadius * 1.4)
         
         const color = event.categories?.[0]?.title === 'Wildfires' ? '#ff5500' : '#00aaff'

         return (
           <QuadraticBezierLine
             key={i}
             start={turkeyPos}
             end={eventPos}
             mid={midPoint}
             color={color}
             lineWidth={0.8}
             transparent
             opacity={0.2}
           />
         )
      })}
    </group>
  )
}

function EarthEventMarker({
  event,
  earthScale
}: {
  event: any,
  earthScale: number
}) {
  const markerRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  
  const position = useMemo(() => {
    if (!event.geometry?.[0]?.coordinates) return new THREE.Vector3(0, 0, 0)
    const [lng, lat] = event.geometry[0].coordinates
    return getPositionFromLatLon(lat, lng, earthScale * 1.002)
  }, [event.geometry, earthScale])

  const eventColor = useMemo(() => {
    const category = event.categories?.[0]?.title || 'Unknown'
    switch (category.toLowerCase()) {
      case 'wildfires': return '#ff4400'
      case 'volcanoes': return '#ff0000'
      case 'earthquakes': return '#ffaa00'
      case 'severe storms': return '#aa00ff'
      case 'floods': return '#0088ff'
      default: return '#00ffaa'
    }
  }, [event.categories])

  const trCategory = TR_CATEGORIES[event.categories?.[0]?.title?.toLowerCase()] || 'Olay'

  useFrame((state) => {
    if (markerRef.current) {
      markerRef.current.lookAt(state.camera.position)
      const scale = hovered ? 1.2 : 1.0
      markerRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })

  return (
    <group
      ref={markerRef}
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false) }}
    >
      <mesh>
        <circleGeometry args={[0.012, 16]} />
        <meshBasicMaterial color={eventColor} toneMapped={false} />
      </mesh>
      
      <mesh>
        <ringGeometry args={[0.02, 0.025, 32]} />
        <meshBasicMaterial color={eventColor} transparent opacity={0.6} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <mesh position={[0, -0.02, 0]} rotation={[Math.PI/2, 0, 0]}>
         <cylinderGeometry args={[0.002, 0.002, 0.04, 8]} />
         <meshBasicMaterial color={eventColor} transparent opacity={0.5} />
      </mesh>

      {hovered && (
        <Html
          position={[0, 0.02, 0]}
          center
          distanceFactor={6} 
          style={{ pointerEvents: 'none' }}
          zIndexRange={[100, 0]}
        >
          <div className="flex flex-col items-center">
            <div className="h-2 w-px bg-white/30 mb-0.5" />
            
            <div className="
              bg-[#0a0a0a]/95 backdrop-blur-md 
              border border-white/10 rounded-md 
              p-1.5 shadow-lg shadow-black/60
              min-w-[100px] max-w-[140px]
            ">
              <div className="flex items-center gap-1 mb-1 border-b border-white/5 pb-1">
                <div className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: eventColor }} />
                <span className="text-[6px] font-bold text-gray-300 uppercase tracking-wider truncate">
                  {trCategory}
                </span>
              </div>
              
              <h4 className="text-white font-medium text-[8px] leading-tight mb-1 line-clamp-2">
                {event.title}
              </h4>
              
              <div className="flex justify-between items-center">
                 <span className="text-[6px] text-gray-500 font-mono">
                   {formatDateTR(event.created_date || event.date)}
                 </span>
                 <span className="text-[6px] text-blue-400 bg-blue-500/10 px-0.5 rounded-[1px]">
                   AKTİF
                 </span>
              </div>
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

export function EnhancedEarth({
  position = [0, 0, 0],
  scale = 1.8,
  quality = 'high',
  showClouds = true,
  showAtmosphere = true,
  showAurora = true,
  showCityLights = true,
  enableRotation = true,
  sunPosition = new THREE.Vector3(-20, 0, 0),
  nasaTexture = '/textures/earth-night.jpg',
  showEarthEvents = true,
  useGIBS = false
}: EnhancedEarthProps & { useGIBS?: boolean }) {
  const earthGroupRef = useRef<THREE.Group>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const auroraRef = useRef<THREE.Mesh>(null)
  const { events, fetchEvents } = useEarthEventsStore()

  useEffect(() => {
    if (showEarthEvents) fetchEvents()
  }, [showEarthEvents, fetchEvents])

  const { texture: gibsTexture } = useGIBSEarthTexture()
  const earthTextureLocal = useLoader(THREE.TextureLoader, nasaTexture)
  const normalMap = useLoader(THREE.TextureLoader, '/textures/earth-normal.jpg')
  const specularMap = useLoader(THREE.TextureLoader, '/textures/earth-specular.jpg')
  const cloudsTexture = useLoader(THREE.TextureLoader, '/textures/earth-clouds.jpg')
  const nightTexture = useLoader(THREE.TextureLoader, '/textures/earth-night.jpg')
  
  const earthTexture = useGIBS && gibsTexture ? gibsTexture : earthTextureLocal

  useEffect(() => {
    [earthTexture, normalMap, specularMap, cloudsTexture, nightTexture].forEach(tex => {
      if (tex) {
        tex.anisotropy = 16
        tex.colorSpace = THREE.SRGBColorSpace
      }
    })
  }, [earthTexture])

  const atmosphereMaterial = useMemo(() => {
    if (!showAtmosphere) return null
    return createAtmosphericScatteringMaterial({
      sunPosition,
      planetRadius: scale,
      atmosphereRadius: scale * 1.05,
      intensity: 1.0,
      scatterStrength: 0.028,
    })
  }, [showAtmosphere, sunPosition, scale])

  const auroraMaterial = useMemo(() => {
    if (!showAurora || quality === 'low') return null
    return createAuroraMaterial({
      intensity: 0.8,
      primaryColor: new THREE.Color(0x00ff88),
      secondaryColor: new THREE.Color(0x0088ff),
      tertiaryColor: new THREE.Color(0x8800ff),
      polarLatitude: 65.0,
      polarWidth: 25.0,
    })
  }, [showAurora, quality])

  const earthMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: earthTexture,
      normalMap: normalMap,
      roughness: 0.6,
      metalness: 0.1,
    })
  }, [earthTexture, normalMap])

  useFrame((state, delta) => {
    if (enableRotation && earthGroupRef.current) {
      earthGroupRef.current.rotation.y += delta * 0.02
    }
    if (enableRotation && cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.024
    }
    if (atmosphereMaterial && atmosphereRef.current) {
      updateAtmosphericScattering(atmosphereMaterial, delta, sunPosition)
    }
    if (auroraMaterial && auroraRef.current) {
      updateAurora(auroraMaterial, delta)
    }
  })

  return (
    <group position={position}>
      <group ref={earthGroupRef}>
        <mesh>
          <sphereGeometry args={[scale, 64, 64]} />
          <primitive object={earthMaterial} attach="material" />
        </mesh>

        {showEarthEvents && events.length > 0 && (
          <>
            <TurkeyConnections events={events} earthRadius={scale} />
            {events.slice(0, 40).map((event, index) => (
              <EarthEventMarker
                key={`${event.id}-${index}`}
                event={event}
                earthScale={scale}
              />
            ))}
          </>
        )}
      </group>

      {showClouds && (
        <mesh ref={cloudsRef} scale={1.01}>
          <sphereGeometry args={[scale, 64, 64]} />
          <meshStandardMaterial
            map={cloudsTexture}
            transparent
            opacity={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {showAtmosphere && atmosphereMaterial && (
        <mesh ref={atmosphereRef} scale={1.08}>
          <sphereGeometry args={[scale, 64, 64]} />
          <primitive object={atmosphereMaterial} attach="material" />
        </mesh>
      )}
      
      {showAurora && auroraMaterial && (
        <mesh ref={auroraRef} scale={1.12}>
          <sphereGeometry args={[scale, 64, 64]} />
          <primitive object={auroraMaterial} attach="material" />
        </mesh>
      )}
    </group>
  )
}

export default EnhancedEarth
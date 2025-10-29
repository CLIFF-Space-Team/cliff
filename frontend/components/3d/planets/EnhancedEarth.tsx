'use client'

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import {
  createAtmosphericScatteringMaterial,
  updateAtmosphericScattering
} from '../shaders/AtmosphericScatteringShader'
import { createAuroraMaterial, updateAurora } from '../shaders/AuroraShader'
import { useEarthEventsStore } from '@/stores/earthEventsStore'

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
}

// Earth Event Marker Component
function EarthEventMarker({
  event,
  earthRef,
  earthScale
}: {
  event: any,
  earthRef: React.RefObject<THREE.Mesh>,
  earthScale: number
}) {
  const markerRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)

  // Convert lat/lng to 3D position on sphere
  const position = useMemo(() => {
    if (!event.geometry?.[0]?.coordinates) return [0, 0, 0] as [number, number, number]
    
    const [lng, lat] = event.geometry[0].coordinates
    const phi = (90 - lat) * (Math.PI / 180)
    const theta = (lng + 180) * (Math.PI / 180)
    
    const radius = earthScale * 1.02 // Slightly above Earth surface
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.cos(phi)
    const z = radius * Math.sin(phi) * Math.sin(theta)
    
    return [x, y, z] as [number, number, number]
  }, [event.geometry, earthScale])

  const eventColor = useMemo(() => {
    const category = event.categories?.[0]?.title || 'Unknown'
    switch (category.toLowerCase()) {
      case 'wildfires': return '#FF6B35'
      case 'volcanoes': return '#D32F2F'
      case 'severe storms': return '#7B68EE'
      case 'floods': return '#1E88E5'
      case 'drought': return '#FFB74D'
      case 'earthquakes': return '#8D6E63'
      default: return '#FFA726'
    }
  }, [event.categories])

  useFrame((state) => {
    if (markerRef.current) {
      // Gentle pulsing animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      markerRef.current.scale.setScalar(hovered ? scale * 1.5 : scale)
    }
  })

  return (
    <group
      ref={markerRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => setClicked(!clicked)}
    >
      {/* Main Event Marker */}
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial
          color={eventColor}
          transparent
          opacity={hovered ? 1.0 : 0.8}
        />
      </mesh>
      
      {/* Outer Glow Ring */}
      <mesh>
        <ringGeometry args={[0.06, 0.12, 16]} />
        <meshBasicMaterial
          color={eventColor}
          transparent
          opacity={hovered ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Event Info HTML Overlay */}
      {(hovered || clicked) && (
        <Html
          position={[0, 0.15, 0]}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 border border-white/20 max-w-xs">
            <h4 className="text-white font-semibold text-sm mb-1">
              {event.title || 'Unknown Event'}
            </h4>
            <p className="text-orange-400 text-xs mb-2">
              🏷️ {event.categories?.[0]?.title || 'Unknown'}
            </p>
            <p className="text-white/80 text-xs mb-2 line-clamp-3">
              {event.description || 'No description available'}
            </p>
            <div className="text-white/60 text-xs">
              📅 {new Date(event.created_date).toLocaleDateString('tr-TR')}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

/**
 * Enhanced Earth Component
 * NASA-grade Earth rendering with atmospheric scattering and aurora
 */
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
  showEarthEvents = true
}: EnhancedEarthProps) {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const auroraRef = useRef<THREE.Mesh>(null)

  // Earth events integration
  const { events, fetchEvents } = useEarthEventsStore()
  
  useEffect(() => {
    if (showEarthEvents) {
      fetchEvents()
    }
  }, [showEarthEvents, fetchEvents])
  
  // Load textures
  const earthTexture = useLoader(THREE.TextureLoader, nasaTexture)
  const normalMap = useLoader(THREE.TextureLoader, '/textures/earth-normal.jpg')
  const specularMap = useLoader(THREE.TextureLoader, '/textures/earth-specular.jpg')
  const cloudsTexture = useLoader(THREE.TextureLoader, '/textures/earth-clouds.jpg')
  const nightTexture = useLoader(THREE.TextureLoader, '/textures/earth-night.jpg')
  
  // Create atmospheric scattering material
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
  
  // Create aurora material
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
  
  // Create Earth material with city lights
  const earthMaterial = useMemo(() => {
    if (!showCityLights) {
      return new THREE.MeshStandardMaterial({
        map: earthTexture,
        normalMap: normalMap,
        roughness: 0.8,
        metalness: 0.1,
      })
    }
    
    // Custom shader for day/night transition with city lights
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: nightTexture },
        nightTexture: { value: nightTexture },
        normalMap: { value: normalMap },
        specularMap: { value: specularMap },
        sunPosition: { value: sunPosition },
        cloudTexture: { value: cloudsTexture },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D normalMap;
        uniform sampler2D specularMap;
        uniform vec3 sunPosition;
        
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          // Calculate sun direction
          vec3 sunDir = normalize(sunPosition - vPosition);
          
          // Calculate day/night factor
          float sunDot = dot(vNormal, sunDir);
          float dayNightFactor = smoothstep(-0.1, 0.3, sunDot);
          
          // Sample textures
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          
          // Enhance night lights with glow
          nightColor.rgb *= 2.5;
          nightColor.rgb += vec3(0.1, 0.1, 0.05); // Slight glow
          
          // Mix day and night
          vec4 finalColor = mix(nightColor, dayColor, dayNightFactor);
          
          // Apply normal mapping for surface detail
          vec3 normal = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          float normalDot = dot(normal, sunDir);
          finalColor.rgb *= 0.8 + 0.2 * normalDot;
          
          // Apply specular for water reflection
          vec4 specular = texture2D(specularMap, vUv);
          vec3 reflectDir = reflect(-sunDir, vNormal);
          vec3 viewDir = normalize(cameraPosition - vPosition);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
          finalColor.rgb += specular.rgb * spec * dayNightFactor * 0.5;
          
          gl_FragColor = finalColor;
        }
      `,
    })
  }, [showCityLights, earthTexture, nightTexture, normalMap, specularMap, sunPosition, cloudsTexture])
  
  // Animation
  useFrame((state, delta) => {
    if (enableRotation) {
      if (earthRef.current) {
        // Dünya dönüş hızı yavaşlatıldı
        earthRef.current.rotation.y += delta * 0.02
      }
      if (cloudsRef.current) {
        cloudsRef.current.rotation.y += delta * 0.024
      }
    }
    
    // Update atmospheric scattering
    if (atmosphereMaterial && atmosphereRef.current) {
      updateAtmosphericScattering(atmosphereMaterial, delta, sunPosition)
    }
    
    // Update aurora
    if (auroraMaterial && auroraRef.current) {
      updateAurora(auroraMaterial, delta)
    }
  })
  
  return (
    <group position={position}>
      {/* Earth Core with NASA Blue Marble + City Lights */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[scale, 64, 64]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>
      
      {/* Cloud Layer */}
      {showClouds && (
        <mesh ref={cloudsRef} scale={1.01}>
          <sphereGeometry args={[scale, 64, 64]} />
          <meshStandardMaterial
            map={cloudsTexture}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      )}
      
      {/* Atmospheric Scattering Layer */}
      {showAtmosphere && atmosphereMaterial && quality !== 'low' && (
        <mesh ref={atmosphereRef} scale={1.08}>
          <sphereGeometry args={[scale, 64, 64]} />
          <primitive object={atmosphereMaterial} attach="material" />
        </mesh>
      )}
      
      {/* Simple atmosphere for low quality */}
      {showAtmosphere && quality === 'low' && (
        <mesh scale={1.05}>
          <sphereGeometry args={[scale, 32, 32]} />
          <meshBasicMaterial
            color="#87CEEB"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      
      {/* Aurora Borealis */}
      {showAurora && auroraMaterial && (quality === 'high' || quality === 'ultra') && (
        <mesh ref={auroraRef} scale={1.12}>
          <sphereGeometry args={[scale, 64, 64]} />
          <primitive object={auroraMaterial} attach="material" />
        </mesh>
      )}

      {/* Earth Events Markers */}
      {showEarthEvents && events.length > 0 && (
        <group>
          {events.slice(0, 20).map((event, index) => ( // Limit to 20 events for performance
            <EarthEventMarker
              key={`${event.id || event.title}-${index}`}
              event={event}
              earthRef={earthRef}
              earthScale={scale}
            />
          ))}
        </group>
      )}
    </group>
  )
}

export default EnhancedEarth
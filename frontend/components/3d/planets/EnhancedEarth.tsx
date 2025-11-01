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
import { useGIBSEarthTexture } from '@/hooks/use-gibs-texture'

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
  showEarthEvents = true,
  useGIBS = false
}: EnhancedEarthProps & { useGIBS?: boolean }) {
  const earthRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const auroraRef = useRef<THREE.Mesh>(null)

  const { events, fetchEvents } = useEarthEventsStore()
  
  useEffect(() => {
    if (showEarthEvents) {
      fetchEvents()
    }
  }, [showEarthEvents, fetchEvents])
  
  const { texture: gibsTexture } = useGIBSEarthTexture()
  
  const earthTextureLocal = useLoader(THREE.TextureLoader, nasaTexture)
  const normalMap = useLoader(THREE.TextureLoader, '/textures/earth-normal.jpg')
  const specularMap = useLoader(THREE.TextureLoader, '/textures/earth-specular.jpg')
  const cloudsTexture = useLoader(THREE.TextureLoader, '/textures/earth-clouds.jpg')
  const nightTexture = useLoader(THREE.TextureLoader, '/textures/earth-night.jpg')
  
  const earthTexture = useGIBS && gibsTexture ? gibsTexture : earthTextureLocal
  
  // Ultra-high quality texture optimization
  useEffect(() => {
    const textures = [earthTexture, normalMap, specularMap, cloudsTexture, nightTexture]
    textures.forEach(texture => {
      if (texture) {
        texture.anisotropy = 16 // Maximum anisotropic filtering
        texture.colorSpace = THREE.SRGBColorSpace
        texture.generateMipmaps = true
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        
        // Enhanced texture quality settings
        if (texture === normalMap) {
          texture.encoding = THREE.LinearEncoding
        }
      }
    })
  }, [earthTexture, normalMap, specularMap, cloudsTexture, nightTexture])
  
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
        dayTexture: { value: earthTexture },
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
        varying vec3 vViewPosition;
        varying vec3 vWorldNormal;
        
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
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
        varying vec3 vViewPosition;
        varying vec3 vWorldNormal;
        
        // Fresnel equation for realistic reflections
        float fresnel(vec3 viewDir, vec3 normal, float power) {
          return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
        }
        
        void main() {
          // Calculate sun direction
          vec3 sunDir = normalize(sunPosition - vPosition);
          vec3 viewDir = normalize(vViewPosition);
          
          // Enhanced normal mapping with proper TBN space
          vec3 normalSample = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          normalSample.xy *= 2.5; // Enhanced normal strength
          vec3 perturbedNormal = normalize(vWorldNormal + normalSample);
          
          // Calculate day/night factor with smoother transition
          float sunDot = dot(perturbedNormal, sunDir);
          float dayNightFactor = smoothstep(-0.15, 0.35, sunDot);
          float twilightBand = smoothstep(-0.15, 0.0, sunDot) * smoothstep(0.35, 0.1, sunDot);
          
          // Sample textures with enhanced filtering
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);
          
          // Enhanced night lights (more realistic city glow)
          nightColor.rgb *= 3.0;
          nightColor.rgb += vec3(0.15, 0.12, 0.08); // Warm urban glow
          
          // Twilight zone (warm orange/red at terminator)
          vec3 twilightColor = vec3(1.0, 0.6, 0.3) * twilightBand * 0.5;
          
          // Mix day and night
          vec4 finalColor = mix(nightColor, dayColor, dayNightFactor);
          finalColor.rgb += twilightColor;
          
          // Enhanced ocean specular (Fresnel-based)
          vec4 specular = texture2D(specularMap, vUv);
          float isOcean = specular.r;
          
          if (isOcean > 0.5) {
            // Fresnel effect for water
            float fresnelFactor = fresnel(viewDir, perturbedNormal, 3.0);
            
            // Specular highlight
            vec3 halfDir = normalize(sunDir + viewDir);
            float specPower = 128.0; // Very sharp water reflections
            float spec = pow(max(dot(perturbedNormal, halfDir), 0.0), specPower);
            
            // Combine ocean effects
            vec3 oceanSpecular = vec3(1.0) * spec * dayNightFactor * 0.8;
            vec3 oceanFresnel = vec3(0.2, 0.3, 0.4) * fresnelFactor * dayNightFactor * 0.3;
            
            finalColor.rgb += oceanSpecular + oceanFresnel;
          }
          
          // Atmospheric scattering (blue tint at edges)
          float atmosphereFactor = fresnel(viewDir, vNormal, 4.0);
          vec3 atmosphereColor = vec3(0.5, 0.7, 1.0) * atmosphereFactor * 0.15;
          finalColor.rgb += atmosphereColor * dayNightFactor;
          
          // Slight ambient boost for realism
          finalColor.rgb = max(finalColor.rgb, dayColor.rgb * 0.05);
          
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
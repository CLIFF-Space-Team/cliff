// CLIFF 3D Solar System - Jupiter Component
// Specialized Jupiter component with gas giant dynamics and moon system

'use client'

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { 
  BasePlanetComponent, 
  PlanetComponentProps 
} from './BasePlanetComponent'
import {
  SIMPLE_PLANETS
} from '../../../types/astronomical-data'
import { MaterialManager } from '../materials/MaterialManager'
import { PlanetaryEffectsManager } from '../effects/PlanetaryEffectsManager'

interface JupiterComponentProps extends PlanetComponentProps {
  showGalileo?: boolean
  showGreatRedSpot?: boolean
  showStormSystems?: boolean
  bandAnimationSpeed?: number
  stormIntensity?: number
  atmosphericGlow?: boolean
  showMagneticField?: boolean
}

export const JupiterComponent: React.FC<JupiterComponentProps> = ({
  showGalileo = true,
  showGreatRedSpot = true,
  showStormSystems = true,
  bandAnimationSpeed = 0.02,
  stormIntensity = 0.5,
  atmosphericGlow = true,
  showMagneticField = false,
  qualityLevel = 'high',
  ...props
}) => {
  // Get Jupiter data
  const jupiterData = SIMPLE_PLANETS.jupiter
  const galileanMoons = [
    { id: 'io', name: 'Io', physical: { radius: 1821.6 }, info: { radius_km: 1821.6 } },
    { id: 'europa', name: 'Europa', physical: { radius: 1560.8 }, info: { radius_km: 1560.8 } },
    { id: 'ganymede', name: 'Ganymede', physical: { radius: 2634.1 }, info: { radius_km: 2634.1 } },
    { id: 'callisto', name: 'Callisto', physical: { radius: 2410.3 }, info: { radius_km: 2410.3 } }
  ]
  
  // Refs
  const jupiterGroupRef = useRef<THREE.Group>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const moonGroupsRef = useRef<THREE.Group[]>([])
  const stormSystemsRef = useRef<THREE.Group>(null)
  const magneticFieldRef = useRef<THREE.Mesh>(null)
  
  // Material and effects managers
  const materialManager = useMemo(() => MaterialManager.getInstance(), [])
  const effectsManager = useRef<PlanetaryEffectsManager | null>(null)
  
  // Jupiter material state
  const [jupiterMaterial, setJupiterMaterial] = useState<THREE.ShaderMaterial | null>(null)
  const [atmosphereMaterial, setAtmosphereMaterial] = useState<THREE.ShaderMaterial | null>(null)
  
  // Load materials async
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const gasGiantMaterial = await materialManager.createGasGiantMaterial('jupiter', {
          bandCount: 8,
          bandColors: [
            new THREE.Color(0xD2B48C), // Tan
            new THREE.Color(0xF4A460), // Sandy brown
            new THREE.Color(0xCD853F), // Peru
            new THREE.Color(0xDEB887), // Burlywood
            new THREE.Color(0xF5DEB3), // Wheat
            new THREE.Color(0xFFE4B5), // Moccasin
            new THREE.Color(0xFFF8DC), // Cornsilk
            new THREE.Color(0xFAEBD7)  // Antique white
          ],
          stormIntensity,
          windSpeed: bandAnimationSpeed,
          turbulence: 0.3,
          animationSpeed: 0.1
        })
        
        setJupiterMaterial(gasGiantMaterial)
        
        if (atmosphericGlow) {
          const atmMaterial = materialManager.createAtmosphereMaterial('jupiter_atmosphere', {
            scatteringStrength: 0.4,
            scatteringColor: new THREE.Color(0xFFAA44),
            absorptionColor: new THREE.Color(0xFF6600),
            density: 0.6,
            falloff: 0.1,
            enableRayleighScattering: true,
            enableMieScattering: true
          })
          setAtmosphereMaterial(atmMaterial)
        }
      } catch (error) {
        console.error('Failed to load Jupiter materials:', error)
      }
    }
    
    loadMaterials()
  }, [materialManager, stormIntensity, bandAnimationSpeed, atmosphericGlow])
  
  // Great Red Spot geometry and material
  const greatRedSpotGeometry = useMemo(() => {
    if (!showGreatRedSpot) return null
    
    // Create elliptical geometry for the Great Red Spot
    const spotGeometry = new THREE.EllipseCurve(
      0, 0,     // center
      0.15, 0.1, // x radius, y radius
      0, 2 * Math.PI, // start angle, end angle
      false,     // clockwise
      0         // rotation
    )
    
    const points = spotGeometry.getPoints(50)
    const spotShape = new THREE.Shape(points)
    return new THREE.ShapeGeometry(spotShape)
  }, [showGreatRedSpot])
  
  const greatRedSpotMaterial = useMemo(() => {
    if (!showGreatRedSpot) return null
    
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        spotColor: { value: new THREE.Color(0xCC4444) },
        swirlSpeed: { value: 0.5 },
        intensity: { value: stormIntensity }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 spotColor;
        uniform float swirlSpeed;
        uniform float intensity;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vec2(0.5, 0.5);
          vec2 pos = vUv - center;
          float dist = length(pos);
          
          // Create swirling pattern
          float angle = atan(pos.y, pos.x) + time * swirlSpeed;
          float spiral = sin(angle * 8.0 - dist * 10.0 + time) * 0.5 + 0.5;
          
          // Fade out towards edges
          float alpha = (1.0 - dist * 2.0) * intensity * spiral;
          alpha = clamp(alpha, 0.0, 1.0);
          
          gl_FragColor = vec4(spotColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending
    })
  }, [showGreatRedSpot, stormIntensity])
  
  // Galilean moon materials
  const moonMaterials = useMemo(() => {
    return galileanMoons.map((moon, index) => {
      const colors = [
        new THREE.Color(0xFFFF99), // Io - sulfur yellow
        new THREE.Color(0xBBBBBB), // Europa - icy white
        new THREE.Color(0x8B4513), // Ganymede - brownish
        new THREE.Color(0x696969)  // Callisto - dark gray
      ]
      
      return new THREE.MeshStandardMaterial({
        color: colors[index] || colors[0],
        roughness: 0.8,
        metalness: 0.1
      })
    })
  }, [galileanMoons])
  
  // Magnetic field visualization
  const magneticFieldGeometry = useMemo(() => {
    if (!showMagneticField || qualityLevel === 'low') return null
    
    return new THREE.TorusGeometry(
      jupiterData.info.radius_km * 0.00001 * 3,  // Major radius
      jupiterData.info.radius_km * 0.00001 * 0.1, // Minor radius
      8, 32
    )
  }, [showMagneticField, qualityLevel, jupiterData])
  
  const magneticFieldMaterial = useMemo(() => {
    if (!showMagneticField) return null
    
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x00FFAA),
      transparent: true,
      opacity: 0.1,
      wireframe: true
    })
  }, [showMagneticField])
  
  // Initialize effects manager
  useEffect(() => {
    if (jupiterGroupRef.current) {
      effectsManager.current = new PlanetaryEffectsManager(jupiterGroupRef.current.parent as THREE.Scene)
    }
    
    return () => {
      if (effectsManager.current) {
        effectsManager.current.dispose()
      }
    }
  }, [])
  
  // Animation updates
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime
    
    // Update gas giant material time
    if (jupiterMaterial && jupiterMaterial.uniforms) {
      jupiterMaterial.uniforms.time.value = time
    }
    
    // Update Great Red Spot animation
    if (greatRedSpotMaterial && 'uniforms' in greatRedSpotMaterial) {
      (greatRedSpotMaterial as THREE.ShaderMaterial).uniforms.time.value = time
    }
    
    // Update atmospheric material
    if (atmosphereMaterial && atmosphereMaterial.uniforms) {
      atmosphereMaterial.uniforms.time.value = time
    }
    
    // Animate Galilean moons
    if (showGalileo && moonGroupsRef.current) {
      galileanMoons.forEach((moon, index) => {
        const moonGroup = moonGroupsRef.current[index]
        if (moonGroup) {
          // Simple orbital animation
          const orbitSpeed = 0.1 / (index + 1) // Farther moons orbit slower
          const orbitRadius = 0.02 * (index + 2) // Increasing orbital distances
          
          const angle = time * orbitSpeed
          moonGroup.position.x = Math.cos(angle) * orbitRadius
          moonGroup.position.z = Math.sin(angle) * orbitRadius
          
          // Tidal locking rotation
          moonGroup.rotation.y = angle
        }
      })
    }
    
    // Update magnetic field rotation
    if (magneticFieldRef.current) {
      magneticFieldRef.current.rotation.y += delta * 0.1
      magneticFieldRef.current.rotation.x = Math.sin(time * 0.2) * 0.2
    }
    
    // Update effects manager
    if (effectsManager.current) {
      effectsManager.current.update(delta, time * 1000)
    }
  })
  
  // Create Jupiter-specific effects when component mounts
  useEffect(() => {
    if (effectsManager.current && jupiterGroupRef.current) {
      const jupiterMesh = jupiterGroupRef.current.children.find(child => child.name.includes('mesh')) as THREE.Mesh
      if (jupiterMesh) {
        effectsManager.current.createJupiterEffects(jupiterMesh, {
          greatRedSpotIntensity: showGreatRedSpot ? stormIntensity : 0,
          stormSystemCount: showStormSystems ? 5 : 0,
          bandAnimationSpeed,
          turbulenceStrength: 0.3,
          atmosphericGlow
        })
      }
    }
  }, [showGreatRedSpot, showStormSystems, stormIntensity, bandAnimationSpeed, atmosphericGlow])
  
  return (
    <BasePlanetComponent 
      celestialBody={jupiterData} 
      qualityLevel={qualityLevel}
      {...props}
    >
      <group ref={jupiterGroupRef}>
        {/* Atmospheric glow */}
        {atmosphericGlow && atmosphereMaterial && (
          <mesh 
            ref={atmosphereRef}
            scale={1.1}
          >
            <sphereGeometry args={[
              jupiterData.info.radius_km * 0.00001,
              qualityLevel === 'ultra' ? 64 : 32,
              qualityLevel === 'ultra' ? 64 : 32
            ]} />
            <primitive object={atmosphereMaterial} />
          </mesh>
        )}
        
        {/* Great Red Spot overlay */}
        {showGreatRedSpot && greatRedSpotGeometry && greatRedSpotMaterial && (
          <mesh 
            geometry={greatRedSpotGeometry}
            material={greatRedSpotMaterial}
            position={[0, 0, jupiterData.info.radius_km * 0.00001 + 0.001]}
            rotation={[0, Math.PI * 0.3, 0]}
          />
        )}
        
        {/* Galilean moons */}
        {showGalileo && galileanMoons.map((moon, index) => (
          <group 
            key={moon.id} 
            ref={el => {
              if (el) moonGroupsRef.current[index] = el
            }}
          >
            <mesh material={moonMaterials[index]}>
              <sphereGeometry args={[
                moon.info.radius_km * 0.00001,
                qualityLevel === 'ultra' ? 16 : 8,
                qualityLevel === 'ultra' ? 16 : 8
              ]} />
            </mesh>
            
            {/* Moon orbital trail */}
            {props.showTrails && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[
                  0.02 * (index + 2) - 0.001,
                  0.02 * (index + 2) + 0.001,
                  32
                ]} />
                <meshBasicMaterial 
                  color={moonMaterials[index].color}
                  transparent 
                  opacity={0.3} 
                  side={THREE.DoubleSide} 
                />
              </mesh>
            )}
          </group>
        ))}
        
        {/* Magnetic field visualization */}
        {showMagneticField && magneticFieldGeometry && magneticFieldMaterial && (
          <mesh 
            ref={magneticFieldRef}
            geometry={magneticFieldGeometry}
            material={magneticFieldMaterial}
          />
        )}
        
        {/* Storm systems group */}
        <group ref={stormSystemsRef} />
      </group>
    </BasePlanetComponent>
  )
}

// Jupiter-specific utility functions

export function calculateJupiterStormIntensity(time: number): number {
  // Simulate variable storm activity
  return 0.3 + 0.4 * Math.sin(time * 0.001) + 0.3 * Math.sin(time * 0.0031)
}

export function getGalileanMoonPosition(moonIndex: number, time: number): THREE.Vector3 {
  // Real orbital periods (in days) scaled down
  const orbitalPeriods = [1.77, 3.55, 7.15, 16.69] // Io, Europa, Ganymede, Callisto
  const orbitalDistances = [0.018, 0.025, 0.035, 0.055] // Scaled distances
  
  const period = orbitalPeriods[moonIndex]
  const distance = orbitalDistances[moonIndex]
  const angle = (time * 0.01) * (2 * Math.PI / period)
  
  return new THREE.Vector3(
    Math.cos(angle) * distance,
    0,
    Math.sin(angle) * distance
  )
}

export function getJupiterBandColor(latitude: number): THREE.Color {
  // Simulate Jupiter's band coloration based on latitude
  const normalizedLat = (latitude + 1) * 0.5 // Convert from [-1,1] to [0,1]
  
  const bands = [
    { lat: 0.0, color: new THREE.Color(0xF5DEB3) },  // Equatorial zone
    { lat: 0.2, color: new THREE.Color(0xDEB887) },  // North belt
    { lat: 0.4, color: new THREE.Color(0xCD853F) },  // North zone
    { lat: 0.6, color: new THREE.Color(0xD2B48C) },  // North polar
    { lat: 0.8, color: new THREE.Color(0xF4A460) },  // Polar regions
    { lat: 1.0, color: new THREE.Color(0xFFE4B5) }   // Pole
  ]
  
  // Find the two nearest bands and interpolate
  for (let i = 0; i < bands.length - 1; i++) {
    if (normalizedLat >= bands[i].lat && normalizedLat <= bands[i + 1].lat) {
      const t = (normalizedLat - bands[i].lat) / (bands[i + 1].lat - bands[i].lat)
      return bands[i].color.clone().lerp(bands[i + 1].color, t)
    }
  }
  
  return bands[0].color
}

export default JupiterComponent
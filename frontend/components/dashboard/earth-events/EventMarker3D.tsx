'use client'
import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { motion } from 'framer-motion'
import { EarthEvent, useEarthEventsStore } from '@/stores/earthEventsStore'
import { GeographicRegion, REGION_COLORS, REGION_INFO } from '@/lib/geographic-regions'
import { regionDetector } from '@/lib/geographic-region-detector'
interface EventMarker3DProps {
  event: EarthEvent
  earthRadius?: number
  selected?: boolean
  onSelect?: () => void
  visible?: boolean
}
const CATEGORY_COLORS = {
  wildfires: '#ef4444',
  earthquakes: '#f59e0b',
  severeStorms: '#8b5cf6',
  floods: '#3b82f6',
  volcanoes: '#dc2626',
  drought: '#d97706',
  default: '#10b981'
} as const
const CATEGORY_ICONS = {
  wildfires: '🔥',
  earthquakes: '⚡',
  severeStorms: '🌪️',
  floods: '🌊',
  volcanoes: '🌋',
  drought: '☀️',
  default: '⚠️'
} as const
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}
export function EventMarker3D({
  event,
  earthRadius = 1.8,
  selected = false,
  onSelect,
  visible = true
}: EventMarker3DProps) {
  const markerRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.PointLight>(null)
  const htmlRef = useRef<HTMLDivElement>(null)
  const { regionColorMode } = useEarthEventsStore()
  const position = useMemo(
    () => latLonToVector3(event.location.lat, event.location.lon, earthRadius + 0.02),
    [event.location.lat, event.location.lon, earthRadius]
  )
  const eventRegion = useMemo(
    () => regionDetector.detectRegion(event.location.lat, event.location.lon),
    [event.location.lat, event.location.lon]
  )
  const color = useMemo(() => {
    if (regionColorMode) {
      return REGION_COLORS[eventRegion]?.primary || CATEGORY_COLORS.default
    }
    return CATEGORY_COLORS[event.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.default
  }, [regionColorMode, eventRegion, event.category])
  const icon = CATEGORY_ICONS[event.category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.default
  const markerScale = useMemo(() => {
    switch (event.severity) {
      case 'high': return 0.025
      case 'medium': return 0.02
      case 'low': return 0.015
      default: return 0.02
    }
  }, [event.severity])
  useFrame((state, delta) => {
    if (!markerRef.current || !visible) return
    const time = state.clock.getElapsedTime()
    if (markerRef.current) {
      markerRef.current.rotation.y += delta * 0.5
      const pulseScale = 1 + Math.sin(time * 3) * 0.1
      markerRef.current.scale.setScalar(markerScale * (selected ? 1.5 : 1) * pulseScale)
    }
    if (pulseRef.current) {
      const pulseOpacity = 0.3 + Math.sin(time * 2) * 0.2
      const pulseMaterial = pulseRef.current.material as THREE.MeshBasicMaterial
      pulseMaterial.opacity = pulseOpacity
      const pulseScale = 1.5 + Math.sin(time * 2) * 0.5
      pulseRef.current.scale.setScalar(markerScale * pulseScale * 2)
    }
    if (glowRef.current && event.severity === 'high') {
      glowRef.current.intensity = 0.5 + Math.sin(time * 4) * 0.3
    }
  })
  useEffect(() => {
    if (selected && htmlRef.current) {
      htmlRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selected])
  if (!visible) return null
  return (
    <group position={position}>
      {}
      <mesh 
        ref={markerRef}
        onClick={(e) => {
          e.stopPropagation()
          onSelect?.()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'auto'
        }}
      >
        <coneGeometry args={[markerScale, markerScale * 2, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      {}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[markerScale * 1.5, markerScale * 2.5, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {}
      {event.severity === 'high' && (
        <pointLight
          ref={glowRef}
          color={color}
          intensity={0.5}
          distance={0.5}
          decay={2}
        />
      )}
      {}
      {selected && (
        <Html
          center
          distanceFactor={5}
          style={{
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        >
          <motion.div
            ref={htmlRef}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="bg-black/90 backdrop-blur-md rounded-lg p-3 min-w-[200px] border border-white/20"
            style={{ borderColor: color }}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">{icon}</span>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm mb-1">
                  {event.title}
                </h3>
                <p className="text-gray-300 text-xs mb-2">
                  {event.description}
                </p>
                <div className="space-y-1">
                  {regionColorMode && (
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: REGION_COLORS[eventRegion]?.primary }}
                      />
                      <span className="text-gray-300 font-medium">
                        {REGION_INFO[eventRegion]?.name}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">
                      📍 {event.location.lat.toFixed(2)}°, {event.location.lon.toFixed(2)}°
                    </span>
                    {event.affectedArea && (
                      <span className="text-gray-400">
                        📏 {event.affectedArea} km²
                      </span>
                    )}
                  </div>
                  {event.populationImpact && (
                    <div className="text-xs text-gray-400">
                      👥 {event.populationImpact.toLocaleString()} kişi etkilendi
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </Html>
      )}
    </group>
  )
}
interface EventMarkersContainerProps {
  events: EarthEvent[]
  selectedEventId?: string | null
  onSelectEvent?: (event: EarthEvent) => void
  earthRadius?: number
}
export function EventMarkersContainer({
  events,
  selectedEventId,
  onSelectEvent,
  earthRadius = 1.8
}: EventMarkersContainerProps) {
  return (
    <group name="event-markers">
      {events.map((event) => (
        <EventMarker3D
          key={event.id}
          event={event}
          earthRadius={earthRadius}
          selected={selectedEventId === event.id}
          onSelect={() => onSelectEvent?.(event)}
          visible={true}
        />
      ))}
    </group>
  )
}
export default EventMarker3D
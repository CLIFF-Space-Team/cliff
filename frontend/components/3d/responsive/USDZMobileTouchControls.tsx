'use client'
import React, { useRef, useState, useCallback, useEffect } from 'react'
import { motion, PanInfo } from 'framer-motion'
interface TouchGesture {
  type: 'pan' | 'pinch' | 'rotate' | 'tap' | 'double-tap'
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  deltaPosition: { x: number; y: number }
  scale?: number
  rotation?: number
  timestamp: number
}
interface CameraControls {
  position: THREE.Vector3
  rotation: THREE.Euler
  zoom: number
  target: THREE.Vector3
}
interface USDZMobileTouchControlsProps {
  onCameraChange?: (controls: CameraControls) => void
  sensitivity?: {
    pan: number
    pinch: number
    rotate: number
  }
  bounds?: {
    minZoom: number
    maxZoom: number
    minPolar: number
    maxPolar: number
  }
  className?: string
  children?: React.ReactNode
}
export const USDZMobileTouchControls: React.FC<USDZMobileTouchControlsProps> = ({
  onCameraChange,
  sensitivity = { pan: 1, pinch: 1, rotate: 1 },
  bounds = { minZoom: 0.5, maxZoom: 5, minPolar: 0, maxPolar: Math.PI },
  className = '',
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [gesture, setGesture] = useState<TouchGesture | null>(null)
  const [initialPinchDistance, setInitialPinchDistance] = useState(0)
  const [cameraControls, setCameraControls] = useState<CameraControls>({
    position: new THREE.Vector3(10, 5, 10),
    rotation: new THREE.Euler(0, 0, 0),
    zoom: 1,
    target: new THREE.Vector3(0, 0, 0)
  })
  const calculateDistance = useCallback((touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touches = Array.from(e.touches)
    const now = Date.now()
    if (touches.length === 1) {
      const touch = touches[0]
      const newGesture: TouchGesture = {
        type: 'pan',
        startPosition: { x: touch.clientX, y: touch.clientY },
        currentPosition: { x: touch.clientX, y: touch.clientY },
        deltaPosition: { x: 0, y: 0 },
        timestamp: now
      }
      setIsActive(true)
      setGesture(newGesture)
    } else if (touches.length === 2) {
      const [touch1, touch2] = touches
      const distance = calculateDistance(touch1, touch2)
      setInitialPinchDistance(distance)
      const newGesture: TouchGesture = {
        type: 'pinch',
        startPosition: { 
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        },
        currentPosition: { 
          x: (touch1.clientX + touch2.clientX) / 2,
          y: (touch1.clientY + touch2.clientY) / 2
        },
        deltaPosition: { x: 0, y: 0 },
        scale: 1,
        timestamp: now
      }
      setIsActive(true)
      setGesture(newGesture)
    }
  }, [calculateDistance])
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!isActive || !gesture) return
    const touches = Array.from(e.touches)
    if (touches.length === 1 && gesture.type === 'pan') {
      const touch = touches[0]
      const deltaX = touch.clientX - gesture.startPosition.x
      const deltaY = touch.clientY - gesture.startPosition.y
      const sensitivity_factor = sensitivity.pan * 0.01
      const newRotationY = cameraControls.rotation.y - deltaX * sensitivity_factor
      const newRotationX = Math.max(
        bounds.minPolar,
        Math.min(bounds.maxPolar, cameraControls.rotation.x - deltaY * sensitivity_factor)
      )
      setCameraControls(prev => ({
        ...prev,
        rotation: new THREE.Euler(newRotationX, newRotationY, prev.rotation.z)
      }))
    } else if (touches.length === 2 && gesture.type === 'pinch') {
      const [touch1, touch2] = touches
      const distance = calculateDistance(touch1, touch2)
      if (initialPinchDistance > 0) {
        const scale = distance / initialPinchDistance
        const zoomDelta = (scale - 1) * sensitivity.pinch * 0.5
        const newZoom = Math.max(
          bounds.minZoom,
          Math.min(bounds.maxZoom, cameraControls.zoom + zoomDelta)
        )
        setCameraControls(prev => ({
          ...prev,
          zoom: newZoom
        }))
      }
    }
  }, [
    isActive, 
    gesture, 
    sensitivity, 
    bounds, 
    cameraControls, 
    calculateDistance,
    initialPinchDistance
  ])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsActive(false)
    setGesture(null)
    setInitialPinchDistance(0)
  }, [])
  useEffect(() => {
    onCameraChange?.(cameraControls)
  }, [cameraControls, onCameraChange])
  const resetCamera = useCallback(() => {
    setCameraControls({
      position: new THREE.Vector3(10, 5, 10),
      rotation: new THREE.Euler(0, 0, 0),
      zoom: 1,
      target: new THREE.Vector3(0, 0, 0)
    })
  }, [])
  return (
    <motion.div
      ref={containerRef}
      className={`touch-none select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ 
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
      {}
      {isActive && gesture && (
        <motion.div
          className="absolute pointer-events-none z-50"
          style={{
            left: gesture.currentPosition.x - 25,
            top: gesture.currentPosition.y - 25,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.7 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <div className="w-12 h-12 rounded-full bg-cliff-blue/20 border-2 border-cliff-blue flex items-center justify-center">
            {gesture.type === 'pan' && <span className="text-xs">🔄</span>}
            {gesture.type === 'pinch' && <span className="text-xs">🔍</span>}
          </div>
        </motion.div>
      )}
      {}
      <motion.button
        className="absolute top-4 right-4 z-40 p-2 bg-pure-black/80 backdrop-blur-md rounded-full border border-cliff-light-gray/20"
        onClick={resetCamera}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-sm">🎯</span>
      </motion.button>
      {}
      <motion.div
        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 2, delay: 3 }}
      >
        <div className="bg-pure-black/70 backdrop-blur-md rounded-lg px-4 py-2 border border-cliff-light-gray/20">
          <div className="text-xs text-cliff-light-gray text-center">
            Touch and drag to explore • Pinch to zoom
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
export default USDZMobileTouchControls

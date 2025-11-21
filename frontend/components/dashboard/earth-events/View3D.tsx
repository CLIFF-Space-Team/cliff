'use client'
import React, { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import dynamic from 'next/dynamic'
import * as THREE from 'three'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
import RegionalControlPanel from './RegionalControlPanel'
const EnhancedEarth = dynamic(() => import('../../3d/planets/EnhancedEarth'), {
  ssr: false
})
const LoadingFallback = () => (
  <div className="h-full bg-black flex items-center justify-center">
    <div className="text-center">
      <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto mb-4 animate-spin" />
      <p className="text-white/70">Loading 3D Earth Model...</p>
    </div>
  </div>
)
export default function View3D() {
  const { events, selectedEvent, selectEvent } = useEarthEventsStore()
  const [isRegionalPanelOpen, setIsRegionalPanelOpen] = useState(false)
  return (
    <div className="relative w-full h-full bg-gradient-radial from-blue-900/10 via-black to-black">
      {}
      <Canvas
        className="w-full h-full"
        camera={{
          position: [0, 0, 8],
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        dpr={[1, 2]} 
        performance={{ min: 0.5 }} 
      >
        <Suspense fallback={null}>
          {}
          <ambientLight intensity={0.2} />
          <directionalLight 
            position={[-20, 0, 0]} 
            intensity={2} 
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[20, 20, 20]} intensity={1} />
          {}
          <EnhancedEarth
            position={[0, 0, 0]}
            scale={2}
            quality="high"
            showClouds={true}
            showAtmosphere={true}
            showAurora={true}
            showCityLights={true}
            enableRotation={true}
            showEarthEvents={true}
            sunPosition={new THREE.Vector3(-20, 0, 0)}
          />
          {}
          <Stars 
            radius={300} 
            depth={60} 
            count={3000} 
            factor={7} 
            saturation={0} 
            fade 
            speed={0.5}
          />
          {}
          <Environment preset="night" />
          {}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            autoRotateSpeed={0.5}
            minDistance={3}
            maxDistance={15}
            maxPolarAngle={Math.PI}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>
      {}
      <div className="absolute inset-0 pointer-events-none">
        {}
        <div className="absolute top-4 left-4 max-w-sm pointer-events-auto">
          <RegionalControlPanel
            isOpen={isRegionalPanelOpen}
            onToggle={() => setIsRegionalPanelOpen(!isRegionalPanelOpen)}
          />
        </div>
        {}
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-4 right-4 max-w-sm pointer-events-auto"
          >
            <div className="bg-black/80 backdrop-blur-md rounded-lg p-4 border border-emerald-500/30">
              <h3 className="text-white font-semibold text-lg mb-2">
                {selectedEvent.title || 'Selected Event'}
              </h3>
              <p className="text-emerald-400 text-sm mb-3">
                🏷️ {selectedEvent.categories?.[0]?.title || 'Unknown Category'}
              </p>
              <p className="text-white/80 text-sm mb-3 line-clamp-4">
                {selectedEvent.description || 'No description available.'}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">
                  📅 {new Date(selectedEvent.created_date).toLocaleDateString('tr-TR')}
                </span>
                <button
                  onClick={() => selectEvent(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 pointer-events-auto"
        >
          <div className="bg-black/80 backdrop-blur-md rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-blue-400 font-bold">{events.length}</div>
                <div className="text-gray-400 text-xs">Toplam Olay</div>
              </div>
              <div className="w-px h-8 bg-gray-600" />
              <div className="text-center">
                <div className="text-emerald-400 font-bold">
                  {events.filter(e => e.categories?.[0]?.title === 'Wildfires').length}
                </div>
                <div className="text-gray-400 text-xs">Yangın</div>
              </div>
              <div className="text-center">
                <div className="text-red-400 font-bold">
                  {events.filter(e => e.categories?.[0]?.title === 'Earthquakes').length}
                </div>
                <div className="text-gray-400 text-xs">Deprem</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {}
      {typeof window !== 'undefined' && !window.WebGLRenderingContext && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
          <div className="text-center text-white p-8">
            <h3 className="text-xl font-bold mb-4">WebGL Not Supported</h3>
            <p className="text-white/70 mb-4">
              Your browser doesn't support 3D graphics. Please switch to 2D map view.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
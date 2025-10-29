'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EarthPreviewProps {
  className?: string
}

const EarthPreview: React.FC<EarthPreviewProps> = ({ className }) => {
  const [isClient, setIsClient] = useState(false)
  const [threejsError, setThreejsError] = useState(false)
  const mountRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !mountRef.current) return

    // Try to load Three.js dynamically
    const loadThreeJS = async () => {
      try {
        const THREE = await import('three')
        
        // Get container size
        const container = mountRef.current!
        const rect = container.getBoundingClientRect()
        const size = Math.min(rect.width, rect.height) || 400

        // Scene setup
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        })

        // Responsive sizing
        renderer.setSize(size, size)
        renderer.setClearColor(0x000000, 0)
        renderer.shadowMap.enabled = true
        renderer.shadowMap.type = THREE.PCFSoftShadowMap
        container.appendChild(renderer.domElement)

        // Earth geometry
        const geometry = new THREE.SphereGeometry(1, 64, 64)
        
        // Texture loader
        const textureLoader = new THREE.TextureLoader()
        
        // Load Earth textures
        const earthTexture = textureLoader.load('/textures/earth-day.jpg')
        const earthNightTexture = textureLoader.load('/textures/earth-night.jpg')
        const earthNormalTexture = textureLoader.load('/textures/earth-normal.jpg')
        const earthSpecularTexture = textureLoader.load('/textures/earth-specular.jpg')
        const earthCloudsTexture = textureLoader.load('/textures/earth-clouds.jpg')

        // Configure textures
        earthTexture.wrapS = earthTexture.wrapT = THREE.RepeatWrapping
        earthNightTexture.wrapS = earthNightTexture.wrapT = THREE.RepeatWrapping
        earthNormalTexture.wrapS = earthNormalTexture.wrapT = THREE.RepeatWrapping
        earthSpecularTexture.wrapS = earthSpecularTexture.wrapT = THREE.RepeatWrapping
        earthCloudsTexture.wrapS = earthCloudsTexture.wrapT = THREE.RepeatWrapping

        // Earth material with realistic shading
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: earthTexture,
          normalMap: earthNormalTexture,
          specularMap: earthSpecularTexture,
          shininess: 100,
          transparent: false
        })

        const earth = new THREE.Mesh(geometry, earthMaterial)
        earth.castShadow = true
        earth.receiveShadow = true
        scene.add(earth)

        // Cloud layer
        const cloudGeometry = new THREE.SphereGeometry(1.01, 64, 64)
        const cloudMaterial = new THREE.MeshPhongMaterial({
          map: earthCloudsTexture,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide
        })
        const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial)
        scene.add(clouds)

        // Atmospheric glow
        const atmosphereGeometry = new THREE.SphereGeometry(1.05, 32, 32)
        const atmosphereMaterial = new THREE.MeshPhongMaterial({
          color: 0x87CEEB,
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide
        })
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)
        scene.add(atmosphere)

        // Lighting setup
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
        scene.add(ambientLight)

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.set(5, 3, 5)
        directionalLight.castShadow = true
        directionalLight.shadow.mapSize.width = 2048
        directionalLight.shadow.mapSize.height = 2048
        scene.add(directionalLight)

        // Position camera
        camera.position.set(0, 0, 2.5)

        // Animation variables
        let time = 0

        // Animation loop with slower rotation
        let animationId: number
        const animate = () => {
          animationId = requestAnimationFrame(animate)
          
          time += 0.003 // Slower time progression
          
          // Earth rotation - slower and more realistic
          earth.rotation.y += 0.002 // Much slower Y rotation (day/night cycle)
          earth.rotation.x = Math.sin(time) * 0.1 // Gentle X axis wobble
          
          // Clouds rotate slightly faster
          clouds.rotation.y += 0.0025
          
          // Atmosphere gentle pulse
          atmosphere.scale.setScalar(1.05 + Math.sin(time * 2) * 0.01)
          
          renderer.render(scene, camera)
        }

        animate()

        // Handle window resize
        const handleResize = () => {
          if (!mountRef.current) return
          const rect = mountRef.current.getBoundingClientRect()
          const newSize = Math.min(rect.width, rect.height) || 400
          renderer.setSize(newSize, newSize)
        }

        window.addEventListener('resize', handleResize)

        // Cleanup
        return () => {
          if (animationId) {
            cancelAnimationFrame(animationId)
          }
          window.removeEventListener('resize', handleResize)
          if (container && renderer.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement)
          }
          geometry.dispose()
          cloudGeometry.dispose()
          atmosphereGeometry.dispose()
          earthMaterial.dispose()
          cloudMaterial.dispose()
          atmosphereMaterial.dispose()
          earthTexture.dispose()
          earthNightTexture.dispose()
          earthNormalTexture.dispose()
          earthSpecularTexture.dispose()
          earthCloudsTexture.dispose()
          renderer.dispose()
        }
      } catch (error) {
        console.warn('Three.js failed to load:', error)
        setThreejsError(true)
      }
    }

    let cleanup: (() => void) | undefined
    
    loadThreeJS().then(cleanupFn => {
      if (cleanupFn) cleanup = cleanupFn
    })

    return () => {
      if (cleanup) cleanup()
    }
  }, [isClient])

  // Fallback for SSR or Three.js errors
  if (!isClient || threejsError) {
    return (
      <div className={cn(
        "flex items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-green-500/20 border border-blue-500/30",
        className
      )}>
        <Globe className="w-1/4 h-1/4 text-blue-400 animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn("relative group", className)}>
      {/* 3D Canvas Container */}
      <div 
        ref={mountRef}
        className="w-full h-full rounded-2xl overflow-hidden border-2 border-blue-500/30 group-hover:border-blue-400/50 transition-all duration-300"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, rgba(0, 0, 0, 0.2) 100%)'
        }}
      />
      
      {/* Glow Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-sm group-hover:blur-none transition-all duration-300 -z-10" />
    </div>
  )
}

export default EarthPreview
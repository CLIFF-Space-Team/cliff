'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Globe, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EarthPreviewProps {
  className?: string
}

const EarthPreview: React.FC<EarthPreviewProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let scene: any, camera: any, renderer: any
    let earth: any, clouds: any, atmosphere: any
    let animationId: number
    let cleanup: () => void

    const init = async () => {
      try {
        if (!mountRef.current) return

        const THREE = await import('three')
        
        scene = new THREE.Scene()
        
        const width = mountRef.current.clientWidth
        const height = mountRef.current.clientHeight
        camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
        camera.position.z = 3.5

        renderer = new THREE.WebGLRenderer({ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        })
        renderer.setSize(width, height)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        mountRef.current.appendChild(renderer.domElement)

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
        scene.add(ambientLight)

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5)
        sunLight.position.set(5, 3, 5)
        scene.add(sunLight)

        const textureLoader = new THREE.TextureLoader()
        const loadTexture = (path: string) => {
          return new Promise((resolve, reject) => {
            textureLoader.load(
              path, 
              resolve, 
              undefined, 
              (err) => {
                console.warn(`Failed to load texture: ${path}`, err)
                resolve(null) 
              }
            )
          })
        }

        const [
          dayMap, 
          normalMap, 
          specularMap, 
          cloudsMap
        ] = await Promise.all([
          loadTexture('/textures/earth-day.jpg'),
          loadTexture('/textures/earth-normal.jpg'),
          loadTexture('/textures/earth-specular.jpg'),
          loadTexture('/textures/earth-clouds.jpg')
        ])

        const geometry = new THREE.SphereGeometry(1, 64, 64)
        let material

        if (dayMap) {
          material = new THREE.MeshPhongMaterial({
            map: dayMap,
            normalMap: normalMap || null,
            specularMap: specularMap || null,
            shininess: 15
          })
        } else {
          material = new THREE.MeshPhongMaterial({
            color: 0x1e40af, // Blue-800
            emissive: 0x1e3a8a, // Blue-900
            specular: 0xffffff,
            shininess: 50,
            wireframe: false
          })
        }

        earth = new THREE.Mesh(geometry, material)
        scene.add(earth)

        if (cloudsMap) {
          const cloudGeo = new THREE.SphereGeometry(1.02, 64, 64)
          const cloudMat = new THREE.MeshPhongMaterial({
            map: cloudsMap,
            transparent: true,
            opacity: 0.4,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
          })
          clouds = new THREE.Mesh(cloudGeo, cloudMat)
          scene.add(clouds)
        }

        const atmoGeo = new THREE.SphereGeometry(1.1, 64, 64)
        const atmoMat = new THREE.MeshPhongMaterial({
          color: 0x3b82f6, // Blue-500
          transparent: true,
          opacity: 0.1,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending
        })
        atmosphere = new THREE.Mesh(atmoGeo, atmoMat)
        scene.add(atmosphere)

        const animate = () => {
          animationId = requestAnimationFrame(animate)
          
          if (earth) {
            earth.rotation.y += 0.001
          }
          if (clouds) {
            clouds.rotation.y += 0.0013
          }
          if (atmosphere) {
            atmosphere.rotation.y += 0.001
          }

          renderer.render(scene, camera)
        }
        
        animate()
        setIsLoading(false)

        const handleResize = () => {
          if (!mountRef.current) return
          const w = mountRef.current.clientWidth
          const h = mountRef.current.clientHeight
          camera.aspect = w / h
          camera.updateProjectionMatrix()
          renderer.setSize(w, h)
        }
        window.addEventListener('resize', handleResize)

        cleanup = () => {
          window.removeEventListener('resize', handleResize)
          cancelAnimationFrame(animationId)
          if (mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement)
          }
          geometry.dispose()
          material.dispose()
          if (clouds) {
            clouds.geometry.dispose()
            clouds.material.dispose()
          }
          if (atmosphere) {
            atmosphere.geometry.dispose()
            atmosphere.material.dispose()
          }
          renderer.dispose()
        }

      } catch (err) {
        console.error("Three.js init error:", err)
        setHasError(true)
        setIsLoading(false)
      }
    }

    init()

    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  return (
    <div className={cn("relative w-full h-full flex items-center justify-center", className)}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-xs text-blue-400 font-medium">Dünya Yükleniyor...</span>
          </div>
        </div>
      )}

      {hasError && (
        <div className="flex flex-col items-center justify-center p-6 text-center z-10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-900 shadow-lg shadow-blue-500/20 mb-4 flex items-center justify-center">
            <Globe className="w-12 h-12 text-white/80" />
          </div>
          <p className="text-sm text-gray-400">3D Görüntüleyici Başlatılamadı</p>
        </div>
      )}
      
      <div className="absolute inset-0 pointer-events-none rounded-3xl border border-white/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]" />
    </div>
  )
}

export default EarthPreview
import { useState, useEffect } from 'react'
import * as THREE from 'three'
import { gibsService } from '@/services/GIBSService'
export function useGIBSEarthTexture(date: Date = new Date()) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    let mounted = true
    const loadTexture = async () => {
      try {
        setLoading(true)
        const imageURL = await gibsService.getEarthTexture(date)
        const loader = new THREE.TextureLoader()
        loader.crossOrigin = 'anonymous'
        loader.load(
          imageURL,
          (loadedTexture) => {
            if (mounted) {
              loadedTexture.colorSpace = THREE.SRGBColorSpace
              loadedTexture.anisotropy = 16
              loadedTexture.generateMipmaps = true
              loadedTexture.wrapS = THREE.RepeatWrapping
              loadedTexture.wrapT = THREE.ClampToEdgeWrapping
              loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
              loadedTexture.magFilter = THREE.LinearFilter
              setTexture(loadedTexture)
              setLoading(false)
              console.log('✅ GIBS texture loaded successfully:', imageURL)
            }
          },
          (progress) => {
            if (mounted && progress.total > 0) {
              console.log(`Loading GIBS: ${Math.round((progress.loaded / progress.total) * 100)}%`)
            }
          },
          (err) => {
            if (mounted) {
              console.warn('⚠️ GIBS texture fallback to local:', err)
              const fallbackLoader = new THREE.TextureLoader()
              fallbackLoader.load('/textures/earth-day.jpg', (fallback) => {
                if (mounted) {
                  fallback.colorSpace = THREE.SRGBColorSpace
                  fallback.anisotropy = 16
                  setTexture(fallback)
                  setLoading(false)
                }
              })
            }
          }
        )
      } catch (err) {
        if (mounted) {
          setError(err as Error)
          setLoading(false)
        }
      }
    }
    loadTexture()
    return () => {
      mounted = false
    }
  }, [date])
  return { texture, loading, error }
}

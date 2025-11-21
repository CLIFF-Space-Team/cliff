'use client'
import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
export function useAsteroidGLTF(neoId?: string) {
  const candidateUrls = useMemo(() => {
    const safe = (neoId || '').replace(/[^a-zA-Z0-9_-]/g, '')
    return [
      safe ? `/models/asteroids/${safe}.glb` : '',
      '/models/asteroids/generic-asteroid.glb',
      '/models/asteroids/generic-asteroid.gltf'
    ].filter(Boolean)
  }, [neoId])
  for (const url of candidateUrls) {
    try {
      const gltf: any = useGLTF(url)
      if (gltf && gltf.scene) {
        return gltf
      }
    } catch (_e) {
    }
  }
  return null
}
export function preloadAsteroidGLTF(ids: string[] = []) {
  const unique = Array.from(new Set(ids.map((id) => id.replace(/[^a-zA-Z0-9_-]/g, ''))))
  unique.forEach((id) => {
    try { useGLTF.preload(`/models/asteroids/${id}.glb`) } catch {}
  })
  try { useGLTF.preload('/models/asteroids/generic-asteroid.glb') } catch {}
}
export function normalizeGLTFNode(scene: THREE.Object3D, targetScale = 1) {
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)
  scene.position.sub(center) 
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = targetScale / maxDim
  scene.scale.setScalar(scale)
}
export default {}

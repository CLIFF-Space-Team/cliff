'use client'

import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * AsteroidAssetLoader
 * - GLTF shape modeli varsa yükler, yoksa null döner
 * - Basit bir önbellekleme için drei/useGLTF zaten cache kullanır
 */
export function useAsteroidGLTF(neoId?: string) {
  // Olası dosya adlarını sırayla dene
  const candidateUrls = useMemo(() => {
    const safe = (neoId || '').replace(/[^a-zA-Z0-9_-]/g, '')
    return [
      safe ? `/models/asteroids/${safe}.glb` : '',
      '/models/asteroids/generic-asteroid.glb',
      '/models/asteroids/generic-asteroid.gltf'
    ].filter(Boolean)
  }, [neoId])

  // İlk başarılı yükleme ile döner; aksi halde null
  for (const url of candidateUrls) {
    try {
      // drei/useGLTF hata fırlatırsa try/catch ile bir sonraki adaya geçeriz
      const gltf: any = useGLTF(url)
      if (gltf && gltf.scene) {
        return gltf
      }
    } catch (_e) {
      // sessiz geç
    }
  }

  return null
}

// Opsiyonel:  önceden yükleme
export function preloadAsteroidGLTF(ids: string[] = []) {
  const unique = Array.from(new Set(ids.map((id) => id.replace(/[^a-zA-Z0-9_-]/g, ''))))
  unique.forEach((id) => {
    try { useGLTF.preload(`/models/asteroids/${id}.glb`) } catch {}
  })
  try { useGLTF.preload('/models/asteroids/generic-asteroid.glb') } catch {}
}

// Basit yardımcı: GLTF sahnesini uygun ölçek/merkez ile döndür
export function normalizeGLTFNode(scene: THREE.Object3D, targetScale = 1) {
  const box = new THREE.Box3().setFromObject(scene)
  const size = new THREE.Vector3()
  box.getSize(size)
  const center = new THREE.Vector3()
  box.getCenter(center)
  scene.position.sub(center) // merkezi orijine getir
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const scale = targetScale / maxDim
  scene.scale.setScalar(scale)
}

export default {}



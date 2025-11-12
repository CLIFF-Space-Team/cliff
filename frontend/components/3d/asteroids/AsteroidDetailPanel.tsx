'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react'
import { SimpleCelestialBody } from '@/types/astronomical-data'
interface AsteroidDetailPanelProps {
  asteroid: SimpleCelestialBody | null
  isOpen: boolean
  onClose: () => void
  onGenerateImage?: (asteroidId: string) => Promise<void>
}
interface AsteroidImageState {
  loading: boolean
  imageUrl: string | null
  error: string | null
  generationTime?: number
  cached: boolean
}
export const AsteroidDetailPanel: React.FC<AsteroidDetailPanelProps> = ({
  asteroid,
  isOpen,
  onClose,
  onGenerateImage
}) => {
  const [imageState, setImageState] = useState<AsteroidImageState>({
    loading: false,
    imageUrl: null,
    error: null,
    cached: false
  })
  const [selectedStyle, setSelectedStyle] = useState<string>('mystical')
  const [availableStyles] = useState<string[]>([
    'mystical',
    'ancient', 
    'ethereal',
    'crystalline',
    'cosmic',
    'fantasy',
    'enchanted',
    'celestial'
  ])
  const styleDescriptions: Record<string, string> = {
    'mystical': '✨ Magical crystals with ethereal aurora',
    'ancient': '🗿 Mysterious runic symbols and ancient power',
    'ethereal': '🌌 Shimmering aurora-like energy fields',
    'crystalline': '💎 Prismatic crystal formations',
    'cosmic': '🌠 Nebula-like textures with starlight',
    'fantasy': '🎭 Magical energy emanations',
    'enchanted': '🧚 Fairy-like sparkles and glow',
    'celestial': '⭐ Divine light and heavenly radiance'
  }
  const generateAsteroidImage = useCallback(async () => {
    if (!asteroid) return
    setImageState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const startTime = Date.now()
      const distance_km = asteroid.orbital_data?.miss_distance?.kilometers 
        ? parseFloat(asteroid.orbital_data.miss_distance.kilometers) 
        : 5000000
      const distance_au = distance_km / 149597870.7
      const velocity_kms = asteroid.orbital_data?.relative_velocity?.kilometers_per_second
        ? parseFloat(asteroid.orbital_data.relative_velocity.kilometers_per_second)
        : 15
      const response = await fetch(`http://localhost:8000/api/v1/asteroids/${asteroid.id}/generate-with-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          asteroid_name: asteroid.name || asteroid.turkish_name || 'Unknown Asteroid',
          is_hazardous: asteroid.is_hazardous.toString(),
          diameter_km: (asteroid.info.radius_km * 2).toString(),
          velocity_kms: velocity_kms.toString(),
          distance_au: distance_au.toString(),
          style_preference: selectedStyle
        })
      })
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      const result = await response.json()
      if (result.success && result.image_url) {
        const generationTime = Date.now() - startTime
        setImageState({
          loading: false,
          imageUrl: result.image_url,
          error: null,
          generationTime: result.cached ? 0 : generationTime,
          cached: result.cached || false
        })
      } else {
        throw new Error(result.error_message || 'Image generation failed')
      }
    } catch (error) {
      console.error('Image generation error:', error)
      setImageState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }))
    }
  }, [asteroid, selectedStyle])
  const checkCachedImage = useCallback(async () => {
    if (!asteroid) return
    try {
      const response = await fetch(`http://localhost:8000/api/v1/asteroids/${asteroid.id}/image?style=${selectedStyle}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.image_url) {
          setImageState({
            loading: false,
            imageUrl: result.image_url,
            error: null,
            cached: true
          })
          return
        }
      }
    } catch (error) {
      console.warn('Cache check failed:', error)
    }
    setImageState({
      loading: false,
      imageUrl: null,
      error: null,
      cached: false
    })
  }, [asteroid, selectedStyle])
  useEffect(() => {
    if (asteroid && isOpen) {
      checkCachedImage()
    } else {
      setImageState({
        loading: false,
        imageUrl: null,
        error: null,
        cached: false
      })
    }
  }, [asteroid, isOpen, selectedStyle, checkCachedImage])
  if (!asteroid) return null
  const distance_km = asteroid.orbital_data?.miss_distance?.kilometers 
    ? parseFloat(asteroid.orbital_data.miss_distance.kilometers) 
    : 5000000
  const distance_au = distance_km / 149597870.7
  const velocity_kms = asteroid.orbital_data?.relative_velocity?.kilometers_per_second
    ? parseFloat(asteroid.orbital_data.relative_velocity.kilometers_per_second)
    : 15
  const threat_level_turkish = asteroid.is_hazardous ? 'YÜKSEK RİSK ⚠️' : 
                              distance_au < 0.05 ? 'ORTA RİSK' : 'DÜŞÜK RİSK'
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-96 md:w-[450px] bg-gradient-to-br from-slate-900/98 to-black/98 backdrop-blur-xl border-l border-cyan-400/30 z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">🪨</span>
                    <div>
                      <h2 className="text-xl font-bold text-cyan-300">
                        {asteroid.name || asteroid.turkish_name}
                      </h2>
                      {asteroid.is_hazardous && (
                        <div className="text-red-400 text-sm font-medium animate-pulse">
                          ⚠️ TEHLİKELİ ASTEROİT
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4 bg-gray-800/30 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-white mb-3">📊 Temel Bilgiler</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                    <span className="text-gray-400 flex items-center gap-2">
                      📍 <span>Dünya'ya Mesafe:</span>
                    </span>
                    <span className="text-cyan-300 font-medium">
                      {(distance_km / 1000000).toFixed(2)} milyon km
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                    <span className="text-gray-400 flex items-center gap-2">
                      🚀 <span>Hız:</span>
                    </span>
                    <span className="text-cyan-300 font-medium">
                      {velocity_kms.toFixed(1)} km/s
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                    <span className="text-gray-400 flex items-center gap-2">
                      📏 <span>Tahmini Çap:</span>
                    </span>
                    <span className="text-cyan-300 font-medium">
                      {(asteroid.info.radius_km * 2).toFixed(1)} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-gray-400 flex items-center gap-2">
                      ⚡ <span>Tehlike Seviyesi:</span>
                    </span>
                    <span className={`font-bold px-3 py-1.5 rounded-lg text-xs ${
                      asteroid.is_hazardous ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 
                      threat_level_turkish.includes('ORTA') ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' : 
                      'bg-green-500/20 text-green-300 border border-green-500/30'
                    }`}>
                      {threat_level_turkish}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-4 bg-gray-800/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={20} className="text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">🎨 AI Görsel Oluşturma</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sanat Stili Seçin:
                    </label>
                    <select
                      value={selectedStyle}
                      onChange={(e) => setSelectedStyle(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                      disabled={imageState.loading}
                    >
                      {availableStyles.map(style => (
                        <option key={style} value={style}>
                          {styleDescriptions[style]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={generateAsteroidImage}
                    disabled={imageState.loading}
                    className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {imageState.loading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Görsel Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        <ImageIcon size={20} />
                        {imageState.imageUrl ? 'Yeni Görsel Oluştur' : 'Görsel Oluştur'}
                      </>
                    )}
                  </button>
                </div>
                {imageState.imageUrl && (
                  <div className="space-y-3">
                    <div className="relative rounded-lg overflow-hidden border border-cyan-400/30">
                      <img
                        src={imageState.imageUrl}
                        alt={`AI generated visualization of ${asteroid.name}`}
                        className="w-full h-48 object-cover"
                        onError={() => setImageState(prev => ({ ...prev, error: 'Image failed to load' }))}
                      />
                      {imageState.cached && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded border border-green-500/30">
                          📦 Cache'den Yüklendi
                        </div>
                      )}
                    </div>
                    {imageState.generationTime && imageState.generationTime > 0 && (
                      <div className="text-xs text-gray-400 text-center">
                        ⚡ {(imageState.generationTime / 1000).toFixed(1)}s içinde oluşturuldu
                      </div>
                    )}
                  </div>
                )}
                {imageState.error && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-red-400">⚠️</span>
                      <span className="font-medium">Görsel Oluşturulamadı</span>
                    </div>
                    <div className="text-xs opacity-75">{imageState.error}</div>
                  </div>
                )}
                {!imageState.imageUrl && !imageState.loading && !imageState.error && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-sm text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Sparkles size={16} />
                      <span className="font-medium">Artistic AI Visualization</span>
                    </div>
                    <div className="text-xs opacity-75">
                      Bu asteroidin fantastik bir temsilini oluşturmak için yukarıdaki butona tıklayın
                    </div>
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-700/30">
                <div className="flex items-center justify-center gap-2">
                  <span>🌌 SPACE AND NATURE ile güçlendirilmiştir</span>
                </div>
                <div className="mt-1 opacity-75">
                  Seedream-4-high-res-fal model kullanılarak oluşturulmuştur
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
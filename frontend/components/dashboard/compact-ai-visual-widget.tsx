'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, Button, Badge } from '@/components/ui'
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Maximize2,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  Gauge,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AsteroidProfileCardProps {
  asteroidData?: any
  className?: string
}

interface GeneratedImage {
  id: string
  url: string
  prompt: string
  timestamp: Date
  isLoading: boolean
}

const AsteroidProfileCard: React.FC<AsteroidProfileCardProps> = ({
  asteroidData,
  className
}) => {
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previousAsteroidId = useRef<string | null>(null)

  const generateVisual = useCallback(async () => {
    if (isGenerating || !asteroidData) return

    setIsGenerating(true)
    setError(null)
    
    try {
      let asteroidId = asteroidData?.neo_reference_id || asteroidData?.id
      
      if (!asteroidId) {
        throw new Error('Asteroid verisi bulunamadı')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/api/v1/asteroids/${asteroidId}/generate-with-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`API hatası: ${response.statusText}`)
      }

      const result = await response.json()

      const newImage: GeneratedImage = {
        id: result.asteroid_id || `ai-gen-${Date.now()}`,
        url: result.generated_image_url,
        prompt: result.prompt_used,
        timestamp: new Date(),
        isLoading: false
      }

      setCurrentImage(newImage)
      setHasGenerated(true)
      
    } catch (error) {
      console.error('AI görsel oluşturma hatası:', error)
      setError(error instanceof Error ? error.message : 'Bilinmeyen hata')
      
      const fallbackImage: GeneratedImage = {
        id: `ai-gen-fallback-${Date.now()}`,
        url: `https://picsum.photos/400/300?random=${Date.now()}&grayscale`,
        prompt: `${asteroidData?.name || 'Asteroid'} - Artistik görünüm`,
        timestamp: new Date(),
        isLoading: false
      }
      setCurrentImage(fallbackImage)
      setHasGenerated(true)
    } finally {
      setIsGenerating(false)
    }
  }, [asteroidData, isGenerating])

  useEffect(() => {
    const currentAsteroidId = asteroidData?.neo_reference_id || asteroidData?.id
    
    if (currentAsteroidId && currentAsteroidId !== previousAsteroidId.current) {
      previousAsteroidId.current = currentAsteroidId
      setHasGenerated(false)
      setCurrentImage(null)
      setError(null)
      
      const timer = setTimeout(() => {
        generateVisual()
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [asteroidData, generateVisual])

  const downloadImage = useCallback(() => {
    if (currentImage?.url) {
      const link = document.createElement('a')
      link.href = currentImage.url
      link.download = `asteroid-profile-${currentImage.id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }, [currentImage])

  const openFullscreen = useCallback(() => {
    if (currentImage?.url) {
      window.open(currentImage.url, '_blank')
    }
  }, [currentImage])

  if (!asteroidData) {
    return (
      <Card variant="cosmic" className={cn("overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="text-center py-8">
            <User className="h-12 w-12 text-cliff-light-gray/40 mx-auto mb-3" />
            <p className="text-cliff-light-gray text-sm">Asteroid Seçin</p>
            <p className="text-xs text-cliff-light-gray/70 mt-1">
              Profil görünümü için bir asteroid seçin
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getRiskLevel = () => {
    if (asteroidData?.is_potentially_hazardous_asteroid) return 'YÜKSEK'
    if (asteroidData?.close_approach_data?.[0]?.miss_distance?.kilometers &&
        parseFloat(asteroidData.close_approach_data[0].miss_distance.kilometers) < 7500000) return 'ORTA'
    return 'DÜŞÜK'
  }

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'YÜKSEK': return 'text-red-400 border-red-500/30 bg-red-500/10'
      case 'ORTA': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
      default: return 'text-green-400 border-green-500/30 bg-green-500/10'
    }
  }

  return (
    <Card variant="cosmic" className={cn("overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="relative h-40 bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-b border-cliff-light-gray/20">
          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500/30 to-blue-500/30 flex items-center justify-center mb-3 mx-auto">
                    <Sparkles className="h-6 w-6 text-purple-400 animate-pulse" />
                  </div>
                  <p className="text-white text-sm font-medium mb-1">AI Tasarımı Oluşturuluyor</p>
                  <div className="flex justify-center mt-2">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : currentImage ? (
              <motion.div
                key={currentImage.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="relative w-full h-full group"
              >
                <img
                  src={currentImage.url}
                  alt={`${asteroidData.name} AI Profil Görseli`}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
                
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadImage}
                      className="bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 h-7 w-7 p-0"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openFullscreen}
                      className="bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 h-7 w-7 p-0"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div className="absolute bottom-3 left-3">
                  <Badge variant="default" className="bg-black/50 backdrop-blur-sm text-white border-white/20 text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Tasarım
                  </Badge>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-700/30"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex items-center justify-center mb-3 mx-auto">
                    <ImageIcon className="h-8 w-8 text-cliff-light-gray/40" />
                  </div>
                  <p className="text-cliff-light-gray text-sm">Profil Görseli Hazırlanıyor...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1 truncate">
                {asteroidData.name}
              </h3>
              <p className="text-cliff-light-gray text-sm">
                #{asteroidData.neo_reference_id || asteroidData.id}
              </p>
            </div>
            <Badge className={cn("text-xs font-semibold", getRiskColor(getRiskLevel()))}>
              <Shield className="h-3 w-3 mr-1" />
              {getRiskLevel()} RİSK
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-cliff-dark-gray/30 rounded-lg p-3 border border-cliff-light-gray/10">
              <div className="flex items-center gap-2 mb-1">
                <Gauge className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-cliff-light-gray">Çap</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {asteroidData.estimated_diameter?.meters?.estimated_diameter_max
                  ? `${Math.round(asteroidData.estimated_diameter.meters.estimated_diameter_max)}m`
                  : 'Bilinmiyor'
                }
              </p>
            </div>

            <div className="bg-cliff-dark-gray/30 rounded-lg p-3 border border-cliff-light-gray/10">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-green-400" />
                <span className="text-xs text-cliff-light-gray">Yaklaşma</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {asteroidData.close_approach_data?.[0]?.close_approach_date
                  ? new Date(asteroidData.close_approach_data[0].close_approach_date).toLocaleDateString('tr-TR')
                  : 'Bilinmiyor'
                }
              </p>
            </div>
          </div>

          {currentImage && (
            <div className="bg-cliff-dark-gray/20 rounded-lg p-3 border border-cliff-light-gray/10">
              <p className="text-xs text-cliff-light-gray/80 leading-relaxed line-clamp-3">
                <Sparkles className="h-3 w-3 inline mr-1 text-purple-400" />
                {currentImage.prompt}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default AsteroidProfileCard
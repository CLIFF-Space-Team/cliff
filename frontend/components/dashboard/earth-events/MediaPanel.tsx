'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Image, 
  Video, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Globe, 
  Info, 
  ChevronLeft, 
  ChevronRight,
  Play,
  Pause,
  Download,
  Share2
} from 'lucide-react'
import { useEarthEventsStore } from '@/stores/earthEventsStore'

interface MediaItem {
  id: string
  type: 'image' | 'video'
  url: string
  title: string
  description?: string
  credit?: string
  date?: string
}

interface MediaPanelProps {
  event?: any
}

export default function MediaPanel({ event }: MediaPanelProps) {
  const { selectedEvent } = useEarthEventsStore()
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Use selectedEvent from store if no event prop provided
  const activeEvent = event || selectedEvent

  // Generate mock media items for the event
  const mediaItems: MediaItem[] = activeEvent ? generateMediaForEvent(activeEvent) : []

  useEffect(() => {
    setCurrentMediaIndex(0)
    setMediaLoaded(false)
    setIsPlaying(false)
  }, [activeEvent?.id])

  function generateMediaForEvent(event: any): MediaItem[] {
    const eventCategory = event.categories?.[0]?.title || 'Unknown'
    
    // Generate realistic media items based on event type
    const items: MediaItem[] = []
    
    switch (eventCategory) {
      case 'Wildfires':
        items.push(
          {
            id: `${event.id}_1`,
            type: 'image',
            url: 'https://picsum.photos/640/480?random=1&blur=1',
            title: 'Satellite View - Fire Perimeter',
            description: 'NASA Terra/MODIS satellite imagery showing active fire hotspots',
            credit: 'NASA Earth Observatory',
            date: event.created_date
          },
          {
            id: `${event.id}_2`,
            type: 'image',
            url: 'https://picsum.photos/640/480?random=2&blur=1',
            title: 'Smoke Plume Analysis',
            description: 'VIIRS active fire detection and smoke dispersion model',
            credit: 'NOAA/NESDIS',
            date: event.created_date
          }
        )
        break
        
      case 'Volcanoes':
        items.push(
          {
            id: `${event.id}_1`,
            type: 'image',
            url: 'https://picsum.photos/640/480?random=3&blur=1',
            title: 'Thermal Anomaly Detection',
            description: 'MODIS thermal infrared imagery showing volcanic activity',
            credit: 'NASA Global Volcanism Program',
            date: event.created_date
          },
          {
            id: `${event.id}_2`,
            type: 'video',
            url: 'https://picsum.photos/640/480?random=4&blur=1',
            title: 'Eruption Time-lapse',
            description: 'Landsat 8 time-series showing eruption progression',
            credit: 'USGS Volcano Hazards Program',
            date: event.created_date
          }
        )
        break
        
      case 'Severe Storms':
        items.push(
          {
            id: `${event.id}_1`,
            type: 'image',
            url: 'https://picsum.photos/640/480?random=5&blur=1',
            title: 'Storm System Overview',
            description: 'GOES-16 visible and infrared composite imagery',
            credit: 'NOAA GOES-R Series',
            date: event.created_date
          },
          {
            id: `${event.id}_2`,
            type: 'image',
            url: 'https://picsum.photos/640/480?random=6&blur=1',
            title: 'Lightning Activity',
            description: 'Geostationary Lightning Mapper (GLM) detection data',
            credit: 'NOAA National Weather Service',
            date: event.created_date
          }
        )
        break
        
      default:
        items.push(
          {
            id: `${event.id}_1`,
            type: 'image',
            url: 'https://picsum.photos/640/480?random=7&blur=1',
            title: `${eventCategory} - Satellite View`,
            description: 'Multi-spectral satellite imagery analysis',
            credit: 'NASA Earth Science Division',
            date: event.created_date
          }
        )
        break
    }
    
    return items
  }

  function getCategoryColor(category: string): string {
    const colors: { [key: string]: string } = {
      'Wildfires': '#FF6B35',
      'Volcanoes': '#D32F2F', 
      'Severe Storms': '#7B68EE',
      'Floods': '#1E88E5',
      'Drought': '#FFB74D',
      'Earthquakes': '#8D6E63'
    }
    return colors[category] || '#FFA726'
  }

  function nextMedia() {
    if (mediaItems.length > 1) {
      setCurrentMediaIndex((prev) => (prev + 1) % mediaItems.length)
      setMediaLoaded(false)
    }
  }

  function prevMedia() {
    if (mediaItems.length > 1) {
      setCurrentMediaIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length)
      setMediaLoaded(false)
    }
  }

  if (!activeEvent) {
    return (
      <div className="w-full h-full bg-black/80 backdrop-blur-md rounded-lg border border-white/20 flex items-center justify-center">
        <div className="text-center">
          <Globe className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <p className="text-white/70">Select an event to view media</p>
          <p className="text-white/50 text-sm">Satellite imagery and AI-generated visuals</p>
        </div>
      </div>
    )
  }

  const currentMedia = mediaItems[currentMediaIndex]
  const eventCategory = activeEvent.categories?.[0]?.title || 'Unknown'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full h-full bg-black/80 backdrop-blur-md rounded-lg border border-blue-500/30 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
            <Image className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold truncate">{activeEvent.title}</h3>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0" 
                style={{ backgroundColor: getCategoryColor(eventCategory) }}
              />
              <span>{eventCategory}</span>
              <span>•</span>
              <span>{new Date(activeEvent.created_date).toLocaleDateString('tr-TR')}</span>
            </div>
          </div>
        </div>
        
        {/* AI sekmesi kaldırıldı; yalnızca Satellite Data gösterilir */}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key="traditional-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col"
          >
            {mediaItems.length > 0 ? (
              <>
                {/* Media Display */}
                <div className="flex-1 bg-black/40 rounded-lg border border-white/10 relative overflow-hidden mb-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentMediaIndex}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      {currentMedia?.type === 'image' ? (
                        <div className="relative w-full h-full">
                          <img
                            src={currentMedia.url}
                            alt={currentMedia.title}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              mediaLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                            onLoad={() => setMediaLoaded(true)}
                            onError={() => setMediaLoaded(true)}
                          />
                          {!mediaLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                          <div className="text-center">
                            <Video className="w-12 h-12 text-white/50 mx-auto mb-2" />
                            <p className="text-white/70 text-sm">Video content</p>
                            <p className="text-white/50 text-xs">{currentMedia?.title}</p>
                          </div>
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors"
                          >
                            {isPlaying ? (
                              <Pause className="w-16 h-16 text-white/80" />
                            ) : (
                              <Play className="w-16 h-16 text-white/80" />
                            )}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Controls */}
                  {mediaItems.length > 1 && (
                    <>
                      <button
                        onClick={prevMedia}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-white" />
                      </button>
                      <button
                        onClick={nextMedia}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-white" />
                      </button>
                    </>
                  )}

                  {/* Media Counter */}
                  {mediaItems.length > 1 && (
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 text-xs text-white/80">
                      {currentMediaIndex + 1} / {mediaItems.length}
                    </div>
                  )}
                </div>

                {/* Media Info */}
                {currentMedia && (
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-white font-medium text-sm flex-1">{currentMedia.title}</h4>
                      <div className="flex gap-1">
                        <button className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center transition-colors">
                          <Download className="w-3 h-3 text-white/70" />
                        </button>
                        <button className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center transition-colors">
                          <Share2 className="w-3 h-3 text-white/70" />
                        </button>
                        <button className="w-6 h-6 bg-white/10 hover:bg-white/20 rounded flex items-center justify-center transition-colors">
                          <ExternalLink className="w-3 h-3 text-white/70" />
                        </button>
                      </div>
                    </div>
                    
                    {currentMedia.description && (
                      <p className="text-white/60 text-xs mb-2">{currentMedia.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{currentMedia.credit}</span>
                      {currentMedia.date && (
                        <span>{new Date(currentMedia.date).toLocaleDateString('tr-TR')}</span>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Image className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70">No satellite data available</p>
                  <p className="text-white/50 text-sm">Traditional media content is being processed</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Event Details Footer */}
      <div className="p-3 border-t border-white/10 bg-white/5 flex-shrink-0">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
            <span className="text-white/70 truncate">
              {activeEvent.geometry?.coordinates 
                ? `${activeEvent.geometry.coordinates[1].toFixed(2)}°, ${activeEvent.geometry.coordinates[0].toFixed(2)}°`
                : 'Location data unavailable'
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-green-400 flex-shrink-0" />
            <span className="text-white/70">
              {new Date(activeEvent.created_date).toLocaleDateString('tr-TR', {
                month: 'short',
                day: 'numeric', 
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
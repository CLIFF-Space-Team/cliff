'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, 
  Loader2, 
  RefreshCw, 
  AlertTriangle, 
  Download,
  Eye,
  Sparkles,
  MapPin,
  Calendar,
  Gauge
} from 'lucide-react'
import { useEarthEventsStore, EONETAIImage } from '@/stores/earthEventsStore'

interface EONETAIImagesProps {
  eventId: string
  eventTitle: string
  eventCategory: string
  className?: string
}

export default function EONETAIImages({ 
  eventId, 
  eventTitle, 
  eventCategory, 
  className = "" 
}: EONETAIImagesProps) {
  const { 
    events,
    generateEventImages,
    getEventImages,
    clearEventImages
  } = useEarthEventsStore()
  
  const [selectedImage, setSelectedImage] = useState<EONETAIImage | null>(null)
  const [showFullscreen, setShowFullscreen] = useState(false)
  
  // Find current event
  const event = events.find(e => e.id === eventId)
  
  useEffect(() => {
    // Auto-generate images when event is selected
    if (eventId && !event?.aiImages && !event?.aiImagesLoading) {
      // Slight delay to allow UI to settle
      const timer = setTimeout(() => {
        generateEventImages(eventId)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [eventId, generateEventImages])
  
  const handleGenerateImages = async () => {
    await generateEventImages(eventId)
  }
  
  const handleImageClick = (image: EONETAIImage) => {
    setSelectedImage(image)
    setShowFullscreen(true)
  }
  
  const getPurposeIcon = (purpose: string) => {
    switch (purpose) {
      case 'disaster_overview':
        return '🌍'
      case 'environmental_impact':
        return '🌿'
      case 'scientific_analysis':
        return '🔬'
      case 'news_coverage':
        return '📺'
      default:
        return '📸'
    }
  }
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'high':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'moderate':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    }
  }
  
  const formatPurpose = (purpose: string) => {
    return purpose.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className={`bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Generated Visuals</h3>
            <p className="text-white/60 text-sm">Professional disaster visualization</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {event?.aiImages && (
            <button
              onClick={() => clearEventImages(eventId)}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all"
              title="Clear Images"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Auto-Generation State */}
      {!event?.aiImages && !event?.aiImagesLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <div className="relative">
            <Camera className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full animate-pulse">
              <Sparkles className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
            </div>
          </div>
          <h4 className="text-white font-medium mb-2">AI Visuals Ready</h4>
          <p className="text-white/60 text-sm">
            Preparing professional disaster visualization for {eventCategory.toLowerCase()} event
          </p>
        </motion.div>
      )}
      
      {/* Loading State */}
      {event?.aiImagesLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative"
        >
          {/* Background Animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-transparent rounded-xl animate-pulse" />
          
          <div className="relative text-center py-12">
            {/* Spinning Animation */}
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              <div className="absolute inset-2 border-2 border-blue-500/20 border-r-blue-500 rounded-full animate-spin animate-reverse" style={{animationDuration: '3s'}} />
              <div className="absolute inset-6 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
              </div>
            </div>
            
            <h4 className="text-white font-semibold mb-2">AI Creating Professional Visuals</h4>
            <p className="text-white/70 text-sm mb-4">
              Analyzing {eventCategory.toLowerCase()} patterns and generating emergency response imagery
            </p>
            
            {/* Progress Indicators */}
            <div className="space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-xs text-white/50">
                <span>Disaster Analysis</span>
                <span>100%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-1.5 rounded-full w-full" />
              </div>
              
              <div className="flex justify-between text-xs text-white/50">
                <span>AI Image Generation</span>
                <span>75%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-1.5 rounded-full w-3/4 animate-pulse" />
              </div>
              
              <div className="flex justify-between text-xs text-white/50">
                <span>Quality Enhancement</span>
                <span>25%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5">
                <div className="bg-gradient-to-r from-orange-500 to-purple-500 h-1.5 rounded-full w-1/4 animate-pulse" />
              </div>
            </div>
            
            <p className="text-xs text-white/40 mt-4">
              🎯 Generating 4 specialized visualization types for emergency response teams
            </p>
          </div>
        </motion.div>
      )}
      
      {/* Error State */}
      {event?.aiImagesError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-8"
        >
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h4 className="text-red-400 font-medium mb-2">Generation Failed</h4>
          <p className="text-white/60 text-sm mb-4">{event.aiImagesError}</p>
          <button
            onClick={handleGenerateImages}
            className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      )}
      
      {/* Generated Images Grid */}
      {event?.aiImages && event.aiImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-white/70">
              {event.aiImages.length} images generated
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.aiImages[0]?.severity_indicator || 'low')}`}>
              {event.aiImages[0]?.severity_indicator || 'Low'} Priority
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {event.aiImages.map((image, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/30 transition-all duration-200"
                onClick={() => handleImageClick(image)}
              >
                {/* Image */}
                <div className="aspect-video relative overflow-hidden">
                  <img
                    src={image.image_url}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Purpose badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs text-white">
                    <span>{getPurposeIcon(image.purpose)}</span>
                    <span>{formatPurpose(image.purpose)}</span>
                  </div>
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h5 className="font-medium text-white mb-1 line-clamp-1">{image.title}</h5>
                  <p className="text-white/60 text-sm line-clamp-2 mb-3">{image.description}</p>
                  
                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    {image.geographical_context && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{image.geographical_context}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" />
                      <span>{image.generation_time_ms}ms</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Fullscreen Modal */}
      <AnimatePresence>
        {showFullscreen && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFullscreen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-4xl w-full bg-black/50 border border-white/20 rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{selectedImage.title}</h3>
                    <p className="text-white/60">{formatPurpose(selectedImage.purpose)}</p>
                  </div>
                  <button
                    onClick={() => setShowFullscreen(false)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Image */}
              <div className="p-6">
                <div className="aspect-video relative rounded-xl overflow-hidden mb-4">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Description */}
                <div className="space-y-4">
                  <p className="text-white/80">{selectedImage.description}</p>
                  
                  {/* Metadata grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/60">
                        <MapPin className="w-4 h-4" />
                        <span>Location: {selectedImage.geographical_context}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <Gauge className="w-4 h-4" />
                        <span>Generated in {selectedImage.generation_time_ms}ms</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-white/60">
                        <Calendar className="w-4 h-4" />
                        <span>Priority: {selectedImage.severity_indicator}</span>
                      </div>
                      {selectedImage.metadata.category && (
                        <div className="flex items-center gap-2 text-white/60">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Category: {selectedImage.metadata.category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-4">
                    <a
                      href={selectedImage.image_url}
                      download={`${eventTitle}-${selectedImage.purpose}.jpg`}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
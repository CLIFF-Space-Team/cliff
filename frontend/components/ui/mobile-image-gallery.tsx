'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  Share2, 
  X, 
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
interface GeneratedImage {
  image_url: string
  title: string
  description: string
  purpose: string
  style_applied: string
  composition_elements: string[]
  generation_time_ms: number
  enhanced_prompt: string
}
interface MobileImageGalleryProps {
  images: GeneratedImage[]
  onDownload: (imageUrl: string, title: string) => void
}
export function MobileImageGallery({ images, onDownload }: MobileImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const openFullscreen = (index: number) => {
    setSelectedIndex(index)
    setIsFullscreen(true)
  }
  const closeFullscreen = () => {
    setIsFullscreen(false)
    setSelectedIndex(null)
  }
  const nextImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % images.length)
    }
  }
  const prevImage = () => {
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + images.length) % images.length)
    }
  }
  return (
    <>
      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {images.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative"
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10">
              <img
                src={image.image_url}
                alt={image.title}
                className="w-full h-full object-cover"
              />
              {}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-active:opacity-100 transition-opacity duration-200" />
              {}
              <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-active:opacity-100 transition-opacity duration-200">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    openFullscreen(index)
                  }}
                  className="w-8 h-8 p-0 bg-black/70 backdrop-blur-sm border-white/20 text-white hover:bg-black/80"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownload(image.image_url, image.title)
                  }}
                  className="w-8 h-8 p-0 bg-black/70 backdrop-blur-sm border-white/20 text-white hover:bg-black/80"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
              {}
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-black/70 backdrop-blur-sm border-white/20 text-white text-xs">
                  {image.purpose.charAt(0).toUpperCase() + image.purpose.slice(1)}
                </Badge>
              </div>
              {}
              <div className="absolute bottom-2 right-2">
                <div className="flex items-center space-x-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-400">AI</span>
                </div>
              </div>
            </div>
            {}
            <div className="mt-2 space-y-1">
              <h4 className="font-semibold text-white text-sm truncate">{image.title}</h4>
              <p className="text-xs text-slate-400 line-clamp-2">{image.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{image.generation_time_ms}ms</span>
                <span className="text-slate-500">{image.composition_elements.length} elements</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
        {images.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className="bg-white/5 border-white/10 overflow-hidden hover:border-white/20 transition-all duration-300 rounded-lg border">
              <div className="relative aspect-square">
                <img
                  src={image.image_url}
                  alt={image.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => openFullscreen(index)}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 flex space-x-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownload(image.image_url, image.title)
                    }}
                    className="bg-black/80 backdrop-blur-sm border-white/20 text-white hover:bg-black/90"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-black/80 backdrop-blur-sm border-white/20 text-white hover:bg-black/90"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-3 left-3">
                  <Badge className="bg-black/80 backdrop-blur-sm border-white/20 text-white">
                    {image.purpose.charAt(0).toUpperCase() + image.purpose.slice(1)}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-white mb-2">{image.title}</h4>
                <p className="text-sm text-slate-400 mb-3">{image.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {image.generation_time_ms}ms generation
                  </span>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                    <span className="text-green-400">Enhanced</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {}
      <AnimatePresence>
        {isFullscreen && selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeFullscreen}
          >
            {}
            <Button
              variant="ghost"
              size="sm"
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </Button>
            {}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    prevImage()
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    nextImage()
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}
            {}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[selectedIndex].image_url}
                alt={images[selectedIndex].title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
              {}
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-white font-semibold mb-1">
                  {images[selectedIndex].title}
                </h3>
                <p className="text-slate-300 text-sm mb-2">
                  {images[selectedIndex].description}
                </p>
                <div className="flex items-center justify-between">
                  <Badge className="bg-white/20 text-white border-white/30">
                    {images[selectedIndex].purpose}
                  </Badge>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => onDownload(images[selectedIndex].image_url, images[selectedIndex].title)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
            {}
            {images.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-sm">
                  {selectedIndex + 1} / {images.length}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
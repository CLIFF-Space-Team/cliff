'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, RefreshCw, AlertTriangle, Expand, Minimize2, Map } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const FullScreenLayout = dynamic(() => import('./earth-events/FullScreenLayout'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-[#020204] flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-500">3D Dünya Modeli yükleniyor...</p>
      </div>
    </div>
  )
})

export default function EarthEventsView() {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const { events, loading, error, fetchEvents, setViewMode, viewMode } = useEarthEventsStore()

  useEffect(() => {
    if (events.length === 0) {
      fetchEvents()
    }
    
    const interval = setInterval(() => {
      fetchEvents()
    }, 300000)
    
    return () => clearInterval(interval)
  }, [])

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
    if (!isFullScreen) {
      setViewMode('3D')
    }
  }

  const toggleView = () => {
    if (viewMode === '3D') {
      setViewMode('2D')
    } else {
      setViewMode('3D')
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="h-full w-full bg-[#020204] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-500">Veriler yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div className="h-full w-full bg-[#020204] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Veri Hatası</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={() => fetchEvents()}>
            Tekrar Dene
          </Button>
        </div>
      </div>
    )
  }

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullScreen}
          className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/70 text-white rounded-full"
        >
          <Minimize2 className="w-5 h-5" />
        </Button>
        <FullScreenLayout />
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-[#020204] flex flex-col rounded-2xl overflow-hidden border border-white/5">
      <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Dünya Olayları</h2>
            <div className="flex items-center gap-2 text-[10px] text-gray-500">
              <span>NASA EONET</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span>Canlı Veri</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 mr-4">
             <Badge variant="outline" className="border-white/10 bg-white/5 text-gray-400 font-mono text-[10px]">
                {events.length} OLAY
             </Badge>
             <Badge variant="outline" className="border-green-500/20 bg-green-500/5 text-green-500 font-mono text-[10px] flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                CANLI
             </Badge>
          </div>

          <div className="h-6 w-px bg-white/10 mx-2" />

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleView}
            disabled={viewMode === 'transitioning'}
            className="text-xs text-gray-400 hover:text-white hover:bg-white/5 gap-2"
          >
            {viewMode === "3D" ? <Map className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
            {viewMode === "3D" ? "2D Harita" : "3D Küre"}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchEvents()}
            className="w-8 h-8 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullScreen}
            className="w-8 h-8 text-gray-400 hover:text-white hover:bg-white/5"
          >
            <Expand className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 relative bg-black/40">
        <FullScreenLayout />
      </div>
    </div>
  )
}
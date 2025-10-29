'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, RefreshCw, AlertTriangle, Expand, Minimize2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEarthEventsStore } from '@/stores/earthEventsStore'

const FullScreenLayout = dynamic(() => import('./earth-events/FullScreenLayout'), {
  ssr: false,
  loading: () => (
    <div className="h-full bg-pure-black flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto mb-4 animate-spin" />
        <p className="text-white/70">3D Dünya Modeli yükleniyor...</p>
      </div>
    </div>
  )
})

export default function EarthEventsView() {
  const [isFullScreen, setIsFullScreen] = useState(false)
  const { events, loading, error, fetchEvents, setViewMode, viewMode } = useEarthEventsStore()

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 300000) // 5 dakikada bir güncelle
    return () => clearInterval(interval)
  }, [fetchEvents])

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen)
    if (!isFullScreen) {
      setViewMode('3D')
    }
  }

  const toggleView = () => {
    if (viewMode === '3D') {
      setViewMode('transitioning')
    } else if (viewMode === '2D') {
      setViewMode('3D')
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="h-full w-full bg-pure-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto mb-4 animate-spin" />
          <p className="text-white/70">Dünya olayları yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div className="h-full w-full bg-pure-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Veri Yüklenemedi</h3>
          <p className="text-white/70 mb-4">{error}</p>
          <button
            onClick={() => fetchEvents()}
            className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    )
  }

  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <button
          onClick={toggleFullScreen}
          className="absolute top-4 right-4 z-[60] p-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-black/70 transition-all"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
        <FullScreenLayout />
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-pure-black text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Globe className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Dünya Olayları - 3D Görünüm</h2>
              <p className="text-white/70 text-sm">NASA EONET - İnteraktif 3D dünya modeli</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleView}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all text-sm"
              disabled={viewMode === 'transitioning'}
            >
              {viewMode === "3D" ? "📍 2D Harita" : "🌍 3D Dünya"}
            </button>
            
            <button
              onClick={toggleFullScreen}
              className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
              title="Tam Ekran"
            >
              <Expand className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => fetchEvents()}
              className="p-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all"
              title="Yenile"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2">
              <motion.div
                className="w-3 h-3 bg-emerald-400 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <span className="text-emerald-400 text-sm font-medium">NASA EONET</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/50">
          📊 Toplam: {events.length} olay • 🔄 Otomatik güncelleme: Aktif • 🎯 3D/2D geçiş sistemi
        </div>
      </div>

      <div className="flex-1 relative">
        <FullScreenLayout />
        
      </div>

      {events.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="text-center">
            <Globe className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">Henüz Olay Bulunamadı</h3>
            <p className="text-white/70">NASA EONET'ten aktif olay verisi bekleniyor.</p>
          </div>
        </div>
      )}
    </div>
  )
}
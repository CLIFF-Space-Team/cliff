'use client'
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Globe, Map, Play, Pause, RotateCcw, Settings } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { gsap } from 'gsap'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
export default function TransitionController() {
  const {
    viewMode,
    events,
    selectedEvent,
    setViewMode,
    selectEvent,
    startTransition,
    transitionProgress,
    updateFilters
  } = useEarthEventsStore()
  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [autoPlayIndex, setAutoPlayIndex] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [scrubValue, setScrubValue] = useState<number | null>(null)
  const dateRange = React.useMemo(() => {
    if (!events || events.length === 0) return null
    const times = events.map((e: any) => new Date(e.created_date || e.date).getTime())
    const min = Math.min(...times)
    const max = Math.max(...times)
    return { min, max }
  }, [events])
  const onScrubChange = (val: number[]) => {
    if (!dateRange) return
    const t = val[0]
    setScrubValue(t)
    const windowMs = 1000 * 60 * 60 * 24 * 3 // 3 günlük pencere
    updateFilters({ dateRange: { start: new Date(t - windowMs), end: new Date(t + windowMs) } })
  }
  useEffect(() => {
    if (!isAutoPlay || events.length === 0) return
    const interval = setInterval(() => {
      const nextEvent = events[autoPlayIndex]
      if (nextEvent) {
        selectEvent(nextEvent)
        if (viewMode === '3D') {
          startTransition(nextEvent)
        }
        setAutoPlayIndex((prev) => (prev + 1) % Math.min(events.length, 5))
      }
    }, 4000) // 4 saniye aralık
    return () => clearInterval(interval)
  }, [isAutoPlay, autoPlayIndex, events, viewMode, selectEvent, startTransition])
  const handleViewToggle = () => {
    if (viewMode === '3D') {
      if (selectedEvent) {
        startTransition(selectedEvent)
      } else {
        const firstEvent = events[0]
        if (firstEvent) {
          selectEvent(firstEvent)
          startTransition(firstEvent)
        }
      }
    } else {
      setViewMode('3D')
    }
  }
  const handleAutoPlayToggle = () => {
    setIsAutoPlay(!isAutoPlay)
    if (!isAutoPlay) {
      setAutoPlayIndex(0)
    }
  }
  const handleReset = () => {
    setIsAutoPlay(false)
    setViewMode('3D')
    selectEvent(null)
    setAutoPlayIndex(0)
  }
  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-3 bg-black/80 backdrop-blur-md rounded-lg px-4 py-3 border border-white/20"
    >
      {}
      <button
        onClick={handleViewToggle}
        disabled={viewMode === 'transitioning'}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${viewMode === '3D' 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          }
          ${viewMode === 'transitioning' 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:brightness-110 hover:scale-105'
          }
        `}
      >
        {viewMode === '3D' ? (
          <>
            <Map className="w-4 h-4" />
            Go to 2D Map
          </>
        ) : viewMode === '2D' ? (
          <>
            <Globe className="w-4 h-4" />
            Go to 3D View
          </>
        ) : (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Transitioning...
          </>
        )}
      </button>
      <div className="w-px h-6 bg-white/20" />
      {}
      {dateRange && (
        <div className="flex items-center gap-2 min-w-[180px]">
          <Slider
            value={[scrubValue ?? dateRange.max]}
            onValueChange={onScrubChange}
            min={dateRange.min}
            max={dateRange.max}
            step={24*60*60*1000}
            className="w-44"
          />
          <span className="text-[11px] text-white/70 w-28 text-right">
            {new Date((scrubValue ?? dateRange.max)).toLocaleDateString('tr-TR')}
          </span>
        </div>
      )}
      <div className="w-px h-6 bg-white/20" />
      {}
      <button
        onClick={handleAutoPlayToggle}
        disabled={viewMode === 'transitioning'}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
          ${isAutoPlay 
            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
            : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/20'
          }
        `}
      >
        {isAutoPlay ? (
          <>
            <Pause className="w-4 h-4" />
            Pause Demo
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Auto Demo
          </>
        )}
      </button>
      {}
      <button
        onClick={handleReset}
        disabled={viewMode === 'transitioning'}
        className="p-2 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/20 transition-all hover:scale-105"
        title="Reset to 3D View"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-white/20" />
      {}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-white/70">{events.length} Events</span>
        </div>
        {selectedEvent && (
          <>
            <span className="text-white/40">•</span>
            <span className="text-emerald-400 text-xs max-w-32 truncate">
              {selectedEvent.title || 'Selected Event'}
            </span>
          </>
        )}
      </div>
      {}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="p-2 bg-white/10 border border-white/20 rounded-lg text-white/70 hover:bg-white/20 transition-all hover:scale-105"
        title="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
      {}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-md rounded-lg p-4 border border-white/20"
        >
          <h4 className="text-white font-medium mb-3">Transition Settings</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-sm">Animation Speed</label>
              <select className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm">
                <option value="slow">Slow (5s)</option>
                <option value="normal" defaultValue="normal">Normal (3s)</option>
                <option value="fast">Fast (1.5s)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-sm">Auto Demo Speed</label>
              <select className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm">
                <option value="2000">Fast (2s)</option>
                <option value="4000" defaultValue="4000">Normal (4s)</option>
                <option value="6000">Slow (6s)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-white/70 text-sm">Show Event Limit</label>
              <select className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm">
                <option value="5">5 Events</option>
                <option value="10" defaultValue="10">10 Events</option>
                <option value="20">20 Events</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
      {}
      {viewMode === 'transitioning' && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${transitionProgress * 100}%` }}
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
        />
      )}
    </motion.div>
  )
}
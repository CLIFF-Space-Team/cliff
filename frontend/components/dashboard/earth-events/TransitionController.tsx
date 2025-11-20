'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Settings, Calendar } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useEarthEventsStore } from '@/stores/earthEventsStore'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function TransitionController() {
  const {
    viewMode,
    events,
    selectedEvent,
    selectEvent,
    startTransition,
    transitionProgress,
    updateFilters
  } = useEarthEventsStore()

  const [isAutoPlay, setIsAutoPlay] = useState(false)
  const [autoPlayIndex, setAutoPlayIndex] = useState(0)
  const [scrubValue, setScrubValue] = useState<number | null>(null)

  const dateRange = React.useMemo(() => {
    if (!events || events.length === 0) {
      const now = Date.now()
      return { min: now - 7 * 24 * 60 * 60 * 1000, max: now }
    }
    
    const times = events.map((e: any) => {
        const dateStr = e.created_date || e.date;
        const time = new Date(dateStr).getTime();
        return isNaN(time) ? Date.now() : time;
    })
    
    const min = Math.min(...times)
    const max = Math.max(...times)
    
    if (min === max) {
        return { min: max - 7 * 24 * 60 * 60 * 1000, max }
    }
    
    return { min, max }
  }, [events])

  const onScrubChange = (val: number[]) => {
    if (!dateRange) return
    const t = val[0]
    setScrubValue(t)
    const windowMs = 1000 * 60 * 60 * 24 * 3
    updateFilters({ dateRange: { start: new Date(t - windowMs), end: new Date(t + windowMs) } })
  }

  useEffect(() => {
    if (!isAutoPlay || events.length === 0) return
    const interval = setInterval(() => {
      const nextEvent = events[autoPlayIndex]
      if (nextEvent) {
        selectEvent(nextEvent)
        if (viewMode === '3D') startTransition(nextEvent)
        setAutoPlayIndex((prev) => (prev + 1) % Math.min(events.length, 5))
      }
    }, 4000)
    return () => clearInterval(interval)
  }, [isAutoPlay, autoPlayIndex, events, viewMode, selectEvent, startTransition])

  const handleReset = () => {
    setIsAutoPlay(false)
    selectEvent(null)
    setAutoPlayIndex(0)
  }
  
  const getCurrentDateDisplay = () => {
      if (scrubValue) return new Date(scrubValue).toLocaleDateString('tr-TR');
      if (dateRange) return new Date(dateRange.max).toLocaleDateString('tr-TR');
      return new Date().toLocaleDateString('tr-TR');
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="flex items-center gap-2 bg-[#020204]/80 backdrop-blur-md rounded-full px-2 py-2 border border-white/10 shadow-2xl"
    >
      <Button
        size="icon"
        variant={isAutoPlay ? "default" : "ghost"}
        onClick={() => setIsAutoPlay(!isAutoPlay)}
        className={`rounded-full w-10 h-10 ${isAutoPlay ? 'bg-blue-600 hover:bg-blue-700' : 'text-white hover:bg-white/10'}`}
        title={isAutoPlay ? "Otomatik Oynatmayı Durdur" : "Otomatik Oynat"}
        disabled={events.length === 0}
      >
        {isAutoPlay ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </Button>

      <div className="w-px h-6 bg-white/10 mx-1" />

      <div className="flex items-center gap-3 px-2">
          <div className="flex flex-col w-32">
             <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" /> ZAMAN
             </span>
             <span className="text-xs text-white font-mono">
               {getCurrentDateDisplay()}
             </span>
          </div>
          {dateRange && (
            <Slider
                value={[scrubValue ?? dateRange.max]}
                onValueChange={onScrubChange}
                min={dateRange.min}
                max={dateRange.max}
                step={24*60*60*1000}
                className="w-48"
                disabled={events.length === 0}
            />
          )}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      <div className="flex items-center px-2 min-w-[140px] max-w-[200px]">
        {selectedEvent ? (
          <div className="flex flex-col truncate">
             <span className="text-[10px] text-gray-400 font-medium">SEÇİLİ OLAY</span>
             <span className="text-xs text-white truncate">{selectedEvent.title}</span>
          </div>
        ) : (
           <span className="text-xs text-gray-500 italic">
             {events.length > 0 ? "Bir olay seçin" : "Veri bekleniyor..."}
           </span>
        )}
      </div>

      <div className="w-px h-6 bg-white/10 mx-1" />

      <div className="flex items-center gap-1">
        <Button
            size="icon"
            variant="ghost"
            onClick={handleReset}
            className="rounded-full w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
            title="Görünümü Sıfırla"
        >
            <RotateCcw className="w-4 h-4" />
        </Button>
        
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
                >
                    <Settings className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[#0a0a0a] border-white/10 text-white p-4" sideOffset={10}>
                 <h4 className="text-sm font-medium mb-3 text-gray-300">Görünüm Ayarları</h4>
                 <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Animasyon Hızı</span>
                        <span className="text-white bg-white/10 px-2 py-1 rounded">Normal</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500">Olay Limiti</span>
                        <span className="text-white bg-white/10 px-2 py-1 rounded">10</span>
                    </div>
                 </div>
            </PopoverContent>
        </Popover>
      </div>

      {viewMode === 'transitioning' && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${transitionProgress * 100}%` }}
          className="absolute bottom-0 left-0 h-0.5 bg-blue-500 rounded-full"
        />
      )}
    </motion.div>
  )
}
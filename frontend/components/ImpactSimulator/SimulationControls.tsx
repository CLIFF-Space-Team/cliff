'use client'

import React from 'react'
import { Play, Pause, RotateCcw, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

interface SimulationControlsProps {
  isPlaying: boolean
  onPlayPause: () => void
  onRestart: () => void
  speed: number
  onSpeedChange: (speed: number) => void
  progress: number
}

export function SimulationControls({
  isPlaying,
  onPlayPause,
  onRestart,
  speed,
  onSpeedChange,
  progress
}: SimulationControlsProps) {
  return (
    <div className="absolute top-20 right-4 z-20 w-80">
      <div className="bg-pure-black/95 backdrop-blur-xl rounded-xl border border-cliff-white/20 p-3 shadow-2xl">
        {/* Kontrol Butonları */}
        <div className="flex items-center gap-2 mb-3">
          <Button
            onClick={onPlayPause}
            size="sm"
            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-300 text-xs"
          >
            {isPlaying ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Duraklat
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Devam
              </>
            )}
          </Button>
          
          <Button
            onClick={onRestart}
            size="sm"
            variant="outline"
            className="flex-1 border-cliff-white/20 text-cliff-white hover:bg-cliff-white/10 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Baştan
          </Button>
        </div>
        
        {/* Hız Kontrolü */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-cliff-light-gray" />
              <span className="text-xs text-cliff-light-gray">Hız</span>
            </div>
            <span className="text-xs font-mono text-cliff-white">{speed.toFixed(1)}x</span>
          </div>
          
          <Slider
            value={[speed]}
            onValueChange={([value]) => onSpeedChange(value)}
            min={0.25}
            max={2}
            step={0.25}
            className="cursor-pointer"
          />
          
          <div className="flex justify-between text-[10px] text-cliff-light-gray">
            <span>0.25x</span>
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>
      </div>
    </div>
  )
}


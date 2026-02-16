'use client'
import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Settings, Rocket } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getMessage } from '@/lib/messages'
import { usePerformanceMetrics } from '@/stores'
import { useDashboardStore } from '@/stores/useDashboardStore'
const NASARealisticSolarSystem = dynamic(
  () => import('@/components/3d/NASARealisticSolarSystem'),
  {
    ssr: false,
    loading: () => <SpaceVisualizationLoading />
  }
)
function SpaceVisualizationLoading() {
  return (
    <div className="h-full rounded-xl bg-pure-black flex items-center justify-center relative overflow-hidden">
      {}
      <div className="absolute inset-0 bg-pure-black">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.6), transparent),
            radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.9), transparent),
            radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 160px 30px, rgba(255,255,255,0.7), transparent),
            radial-gradient(2px 2px at 200px 50px, rgba(255,255,255,0.5), transparent),
            radial-gradient(1px 1px at 230px 90px, rgba(255,255,255,0.8), transparent),
            radial-gradient(1px 1px at 270px 20px, rgba(255,255,255,0.6), transparent)
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '300px 120px',
          animation: 'gentle-twinkle 8s ease-in-out infinite'
        }}></div>
      </div>
      <div className="text-center text-cliff-white relative z-10">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 md:h-20 md:w-20 border-4 border-cliff-light-gray/20 border-t-cliff-white/80 mx-auto"></div>
          <Rocket className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 md:h-8 md:w-8 text-cliff-white/80 animate-pulse" />
        </div>
        <div className="text-lg md:text-xl font-semibold mb-3 text-cliff-white">
          3D Güneş Sistemi Başlatılıyor
        </div>
        <div className="text-xs md:text-sm text-cliff-light-gray mb-4 px-4">
          Astronomik veriler ve yörünge mekaniği yükleniyor...
        </div>
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-cliff-white/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-cliff-white/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-cliff-white/60 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
}
function PerformanceIndicator() {
  const performanceMetrics = usePerformanceMetrics()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  if (!mounted || !performanceMetrics) {
    return (
      <div className="flex items-center gap-1 md:gap-2">
        <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-500 animate-pulse" />
        <span className="text-xs text-cliff-white/90">-- FPS</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1 md:gap-2">
      <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
        performanceMetrics.fps > 50 ? 'bg-green-400' : 'bg-yellow-400'
      } animate-pulse`}></div>
      <span className="text-xs text-cliff-white/90">{Math.round(performanceMetrics.fps)} FPS</span>
    </div>
  )
}
export function CentralVisualization() {
  const { quality, showOrbits, enableRotation } = useDashboardStore()
  const [isReady, setIsReady] = React.useState(false)
  const [displayMode, setDisplayMode] = React.useState<'earth_focus' | 'full'>('earth_focus')
  const [presetLabels, setPresetLabels] = React.useState({ earth: '3D Dünya', system: 'Güneş Sistemi' })
  React.useEffect(() => {
    ;(async () => {
      const earth = await getMessage('visualization.presets.earth_focus', presetLabels.earth)
      const system = await getMessage('visualization.presets.full_system', presetLabels.system)
      setPresetLabels({ earth, system })
    })()
  }, [])
  React.useEffect(() => {
    const idle = (cb: () => void) => {
      if (typeof (window as any).requestIdleCallback === 'function') {
        ;(window as any).requestIdleCallback(cb)
      } else {
        setTimeout(cb, 200)
      }
    }
    idle(() => setIsReady(true))
  }, [])
  return (
    <div className="lg:col-span-6 order-1 lg:order-none h-full">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="h-full rounded-xl overflow-hidden relative bg-pure-black-gradient"
        style={{
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
        }}
      >
        {}
        <div className="absolute inset-0 z-0" style={{
          backgroundImage: `
            radial-gradient(1px 1px at 25px 35px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 55px 75px, rgba(255,255,255,0.2), transparent),
            radial-gradient(1px 1px at 95px 45px, rgba(255,255,255,0.4), transparent),
            radial-gradient(1px 1px at 135px 85px, rgba(255,255,255,0.1), transparent),
            radial-gradient(2px 2px at 165px 35px, rgba(255,255,255,0.3), transparent),
            radial-gradient(1px 1px at 195px 65px, rgba(255,255,255,0.2), transparent)
          `,
          backgroundRepeat: 'repeat',
          backgroundSize: '220px 110px',
          animation: 'gentle-twinkle 12s ease-in-out infinite'
        }}></div>
        {}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-20 bg-pure-black/60 backdrop-blur-md rounded-lg px-2 py-1 md:px-4 md:py-2 border border-cliff-light-gray/10">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-cliff-white text-xs md:text-sm font-semibold">3D Güneş Sistemi</span>
          </div>
        </div>
        {}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-20 bg-pure-black/60 backdrop-blur-md rounded-lg px-2 py-1 md:px-3 md:py-2 border border-cliff-light-gray/10">
          <PerformanceIndicator />
        </div>
        {}
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 z-20 bg-pure-black/60 backdrop-blur-md rounded-lg px-2 py-1 md:px-3 md:py-2 border border-cliff-light-gray/10">
          <div className="flex items-center gap-2">
            {}
            <div className="inline-flex rounded-md overflow-hidden border border-cliff-light-gray/20">
              <button
                className={`px-2 py-1 text-[11px] ${displayMode === 'earth_focus' ? 'bg-cliff-white/10 text-white' : 'text-cliff-light-gray'}`}
                onClick={() => setDisplayMode('earth_focus')}
              >
                {presetLabels.earth}
              </button>
              <button
                className={`px-2 py-1 text-[11px] ${displayMode === 'full' ? 'bg-cliff-white/10 text-white' : 'text-cliff-light-gray'}`}
                onClick={() => setDisplayMode('full')}
              >
                {presetLabels.system}
              </button>
            </div>
            <Settings className="h-3 w-3 text-cliff-light-gray" />
            <Select value={quality} onValueChange={(v) => useDashboardStore.getState().setQuality(v as any)}>
              <SelectTrigger className="h-7 w-28 bg-transparent border-cliff-light-gray/20 text-xs text-cliff-white">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ultra">ULTRA</SelectItem>
                <SelectItem value="high">YÜKSEK</SelectItem>
                <SelectItem value="medium">ORTA</SelectItem>
                <SelectItem value="low">DÜŞÜK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {
        }
        <div className="absolute inset-0 z-10">
          <Suspense fallback={<SpaceVisualizationLoading />}>
            {isReady && (
              <NASARealisticSolarSystem 
                quality={quality}
                showOrbits={showOrbits}
                enableRotation={enableRotation}
                displayMode={displayMode}
              />
            )}
          </Suspense>
        </div>
      </motion.div>
    </div>
  )
}
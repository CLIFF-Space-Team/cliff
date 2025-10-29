'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  Monitor, 
  Zap, 
  Eye, 
  BarChart3, 
  Satellite,
  Sun,
  Globe,
  Rocket,
  Info,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Minimize
} from 'lucide-react'
// Hook kullanımını kaldırıyoruz - Canvas dışında güvenli değil
// import { useUSDZPerformanceManager } from '../performance/USDZPerformanceManager'
import { useAsteroidData } from '@/hooks/use-asteroid-data'

// Performance metrics type (USDZPerformanceManager'dan bağımsız)
interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  drawCalls: number
  performanceScore: number
  lodLevel: string
}

// Control Panel Props
interface USDZControlPanelProps {
  onQualityChange: (quality: 'low' | 'medium' | 'high' | 'ultra') => void
  onEffectsToggle: (enabled: boolean) => void
  onAnimationToggle: (enabled: boolean) => void
  onCameraReset: () => void
  onFullscreen: () => void
  currentQuality: 'low' | 'medium' | 'high' | 'ultra'
  effectsEnabled: boolean
  animationEnabled: boolean
  className?: string
  // Performance metrics'leri props olarak alacağız
  performanceMetrics?: PerformanceMetrics | null
}

// Quality Settings Panel
const QualityControlPanel = ({ 
  currentQuality, 
  onQualityChange,
  effectsEnabled,
  onEffectsToggle 
}: {
  currentQuality: 'low' | 'medium' | 'high' | 'ultra'
  onQualityChange: (quality: 'low' | 'medium' | 'high' | 'ultra') => void
  effectsEnabled: boolean
  onEffectsToggle: (enabled: boolean) => void
}) => {
  const qualityOptions = [
    { value: 'low', label: 'Low', color: 'text-orange-400', icon: '●' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-400', icon: '●●' },
    { value: 'high', label: 'High', color: 'text-green-400', icon: '●●●' },
    { value: 'ultra', label: 'Ultra', color: 'text-purple-400', icon: '●●●●' }
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-semibold text-cliff-white">USDZ Quality</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {qualityOptions.map((option) => (
          <motion.button
            key={option.value}
            onClick={() => onQualityChange(option.value)}
            className={`p-2 rounded-lg border transition-all duration-200 ${
              currentQuality === option.value 
                ? `bg-blue-500/20 border-blue-400 ${option.color}` 
                : 'bg-pure-black/50 border-cliff-light-gray/20 text-cliff-light-gray hover:border-blue-400/50'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="text-xs font-semibold">{option.label}</div>
            <div className="text-xs opacity-70">{option.icon}</div>
          </motion.button>
        ))}
      </div>

      <div className="pt-3 border-t border-cliff-light-gray/20">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={effectsEnabled}
            onChange={(e) => onEffectsToggle(e.target.checked)}
            className="w-4 h-4 rounded border-cliff-light-gray/20 text-blue-500 focus:ring-blue-500/50"
          />
          <span className="text-sm text-cliff-light-gray">Advanced Effects</span>
        </label>
      </div>
    </div>
  )
}

// Performance Metrics Panel - Hook kullanımı kaldırıldı
const PerformanceMetricsPanel = ({ 
  metrics 
}: { 
  metrics?: PerformanceMetrics | null 
}) => {
  // Canvas dışında kullanım için static/mock data
  const mockMetrics: PerformanceMetrics = {
    fps: 60,
    memoryUsage: 128,
    drawCalls: 45,
    performanceScore: 95,
    lodLevel: 'high'
  }

  const displayMetrics = metrics || mockMetrics

  // FPS değerlendirme fonksiyonu
  const getFPSColor = (fps: number) => {
    if (fps >= 60) return 'text-green-400'
    if (fps >= 45) return 'text-yellow-400'
    if (fps >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-cliff-white">Performance</span>
      </div>
      
      {!metrics && (
        <div className="text-xs text-cliff-light-gray/70 mb-3 p-2 bg-amber-500/10 rounded border border-amber-500/20">
          ⚠️ Live metrics available only during Canvas rendering
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
          <div className="text-xs text-cliff-light-gray mb-1">FPS</div>
          <div className={`text-lg font-bold ${getFPSColor(displayMetrics.fps)}`}>
            {displayMetrics.fps}
          </div>
        </div>
        
        <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
          <div className="text-xs text-cliff-light-gray mb-1">Memory</div>
          <div className="text-lg font-bold text-blue-400">
            {displayMetrics.memoryUsage}MB
          </div>
        </div>
        
        <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
          <div className="text-xs text-cliff-light-gray mb-1">Draw Calls</div>
          <div className="text-lg font-bold text-purple-400">
            {displayMetrics.drawCalls}
          </div>
        </div>
        
        <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
          <div className="text-xs text-cliff-light-gray mb-1">Score</div>
          <div className="text-lg font-bold text-yellow-400">
            {displayMetrics.performanceScore}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-cliff-light-gray">
        LOD Level: <span className="text-blue-400 font-semibold">{displayMetrics.lodLevel.toUpperCase()}</span>
      </div>
    </div>
  )
}

// NASA Data Panel
const NASADataPanel = () => {
  const { asteroids, isLoading, error } = useAsteroidData()
  const [showDetails, setShowDetails] = useState(false)

  const hazardousCount = asteroids.filter(asteroid => asteroid.is_hazardous).length
  const todayCount = asteroids.filter(asteroid => {
    const today = new Date().toISOString().split('T')[0]
    // Check if approach date is mentioned in interesting facts
    return asteroid.interesting_facts.some(fact => fact.includes(today) || fact.includes('Yaklaşma'))
  }).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Satellite className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-semibold text-cliff-white">NASA Data</span>
      </div>
      
      {isLoading ? (
        <div className="text-sm text-cliff-light-gray">Loading NASA data...</div>
      ) : error ? (
        <div className="text-sm text-red-400">Data unavailable</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
              <div className="text-xs text-cliff-light-gray mb-1">Total Asteroids</div>
              <div className="text-lg font-bold text-green-400">{asteroids.length}</div>
            </div>
            
            <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
              <div className="text-xs text-cliff-light-gray mb-1">Hazardous</div>
              <div className="text-lg font-bold text-red-400">{hazardousCount}</div>
            </div>
            
            <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
              <div className="text-xs text-cliff-light-gray mb-1">Close Approach</div>
              <div className="text-lg font-bold text-blue-400">{todayCount}</div>
            </div>
            
            <div className="bg-pure-black/50 rounded-lg p-3 border border-cliff-light-gray/20">
              <div className="text-xs text-cliff-light-gray mb-1">Status</div>
              <div className="text-xs font-bold text-green-400">LIVE</div>
            </div>
          </div>
          
          <motion.button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-2 bg-pure-black/30 rounded-lg border border-cliff-light-gray/20 hover:border-blue-400/50 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-sm text-cliff-light-gray">Show Details</span>
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </motion.button>
          
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {asteroids.slice(0, 5).map((asteroid) => (
                  <div key={asteroid.id} className="bg-pure-black/30 rounded p-2 border border-cliff-light-gray/10">
                    <div className="text-xs text-cliff-white font-semibold truncate">
                      {asteroid.name}
                    </div>
                    <div className="text-xs text-cliff-light-gray">
                      Size: {(asteroid.info.radius_km * 2).toFixed(1)}km
                      {asteroid.is_hazardous && (
                        <span className="text-red-400 ml-2">⚠ Hazardous</span>
                      )}
                    </div>
                    <div className="text-xs text-cliff-light-gray opacity-75">
                      Threat: {asteroid.threat_level}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

// Camera Controls Panel
const CameraControlsPanel = ({ 
  onCameraReset,
  onFullscreen,
  animationEnabled,
  onAnimationToggle
}: {
  onCameraReset: () => void
  onFullscreen: () => void
  animationEnabled: boolean
  onAnimationToggle: (enabled: boolean) => void
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-semibold text-cliff-white">Camera</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <motion.button
          onClick={onCameraReset}
          className="flex items-center justify-center gap-2 p-2 bg-pure-black/50 rounded-lg border border-cliff-light-gray/20 hover:border-blue-400/50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <RotateCcw className="w-3 h-3" />
          <span className="text-xs text-cliff-light-gray">Reset</span>
        </motion.button>
        
        <motion.button
          onClick={onFullscreen}
          className="flex items-center justify-center gap-2 p-2 bg-pure-black/50 rounded-lg border border-cliff-light-gray/20 hover:border-blue-400/50 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Maximize className="w-3 h-3" />
          <span className="text-xs text-cliff-light-gray">Full</span>
        </motion.button>
      </div>
      
      <div className="pt-3 border-t border-cliff-light-gray/20">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={animationEnabled}
            onChange={(e) => onAnimationToggle(e.target.checked)}
            className="w-4 h-4 rounded border-cliff-light-gray/20 text-blue-500 focus:ring-blue-500/50"
          />
          <span className="text-sm text-cliff-light-gray">Animation</span>
        </label>
      </div>
    </div>
  )
}

// Main USDZ Control Panel
export const USDZControlPanel: React.FC<USDZControlPanelProps> = ({
  onQualityChange,
  onEffectsToggle,
  onAnimationToggle,
  onCameraReset,
  onFullscreen,
  currentQuality,
  effectsEnabled,
  animationEnabled,
  performanceMetrics,
  className = ''
}) => {
  const [activePanel, setActivePanel] = useState<'quality' | 'performance' | 'data' | 'camera'>('quality')
  const [isCollapsed, setIsCollapsed] = useState(false)

  const panels = [
    { id: 'quality', label: 'Quality', icon: Settings, color: 'text-blue-400' },
    { id: 'performance', label: 'Performance', icon: BarChart3, color: 'text-green-400' },
    { id: 'data', label: 'NASA Data', icon: Satellite, color: 'text-yellow-400' },
    { id: 'camera', label: 'Camera', icon: Eye, color: 'text-purple-400' }
  ] as const

  return (
    <div className={`bg-pure-black/90 backdrop-blur-md rounded-xl border border-cliff-light-gray/20 shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-cliff-light-gray/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <h3 className="text-sm font-bold text-cliff-white">USDZ Controls</h3>
        </div>
        <motion.button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-cliff-light-gray/10 rounded"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isCollapsed ? <Maximize className="w-4 h-4 text-cliff-light-gray" /> : <Minimize className="w-4 h-4 text-cliff-light-gray" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Panel Tabs */}
            <div className="flex border-b border-cliff-light-gray/20">
              {panels.map((panel) => (
                <motion.button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  className={`flex-1 flex items-center justify-center gap-1 p-3 transition-colors ${
                    activePanel === panel.id
                      ? 'bg-blue-500/20 border-b-2 border-blue-400'
                      : 'hover:bg-cliff-light-gray/10'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <panel.icon className={`w-4 h-4 ${activePanel === panel.id ? panel.color : 'text-cliff-light-gray'}`} />
                  <span className={`text-xs font-semibold ${activePanel === panel.id ? 'text-cliff-white' : 'text-cliff-light-gray'}`}>
                    {panel.label}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Panel Content */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePanel}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activePanel === 'quality' && (
                    <QualityControlPanel
                      currentQuality={currentQuality}
                      onQualityChange={onQualityChange}
                      effectsEnabled={effectsEnabled}
                      onEffectsToggle={onEffectsToggle}
                    />
                  )}
                  
                  {activePanel === 'performance' && (
                    <PerformanceMetricsPanel metrics={performanceMetrics} />
                  )}
                  
                  {activePanel === 'data' && <NASADataPanel />}
                  
                  {activePanel === 'camera' && (
                    <CameraControlsPanel
                      onCameraReset={onCameraReset}
                      onFullscreen={onFullscreen}
                      animationEnabled={animationEnabled}
                      onAnimationToggle={onAnimationToggle}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Floating Quick Controls for Mobile
export const USDZQuickControls = ({
  onQualityChange,
  currentQuality,
  className = ''
}: {
  onQualityChange: (quality: 'low' | 'medium' | 'high' | 'ultra') => void
  currentQuality: 'low' | 'medium' | 'high' | 'ultra'
  className?: string
}) => {
  return (
    <motion.div
      className={`flex gap-2 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {(['low', 'medium', 'high', 'ultra'] as const).map((quality) => (
        <motion.button
          key={quality}
          onClick={() => onQualityChange(quality)}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
            currentQuality === quality
              ? 'bg-blue-500 text-white'
              : 'bg-pure-black/70 text-cliff-light-gray border border-cliff-light-gray/20 hover:border-blue-400/50'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {quality.charAt(0).toUpperCase() + quality.slice(1)}
        </motion.button>
      ))}
    </motion.div>
  )
}

export default USDZControlPanel
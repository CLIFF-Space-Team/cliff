'use client'
import React, { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Shield, Database, Monitor } from 'lucide-react'
import { ThreatOverview, RealTimeAlerts, AsteroidTracker, SpaceWeatherStation } from '@/components/dashboard'
import UnifiedAIInterface from '@/components/ai/UnifiedAIInterface'
import FPSMonitor from '@/components/3d/performance/FPSMonitor'
import { useEngineState, usePerformanceMetrics, useTimeState } from '@/stores'
import { Badge } from '@/components/ui/badge'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { ViewType } from '@/types/dashboard-layout'
import ErrorBoundary from '@/components/ui/error-boundary'
import { DashboardSkeleton } from '@/components/ui/loading-states'
import { cn } from '@/lib/utils'
const EarthEventsView = React.lazy(() =>
  import("@/components/dashboard/earth-events-view").then(mod => ({ default: mod.default }))
)
const AsteroidInfoView = React.lazy(() =>
  import("@/components/dashboard/asteroid-info-panel").then(mod => ({ default: mod.default }))
)
const ThreatAnalysisView = React.lazy(() =>
  import("@/components/dashboard/modern-threat-panel").then(mod => ({ default: mod.ModernThreatPanel }))
)
const SystemMonitorView = React.lazy(() =>
  import("@/components/dashboard/interactive-visualizations").then(mod => ({ default: mod.InteractiveVisualizations }))
)
const ChatInterfaceView = React.lazy(() =>
  import("@/components/chat/ModernChatInterface").then(mod => ({ default: mod.default }))
)

const ChatInterfaceWrapper: React.FC = () => {
  const setView = useDashboardStore((state) => state.setView) // FIXED: setView (not setActiveView)
  return (
    <ErrorBoundary fallback={<p className="text-cliff-light-gray p-8">Chat yüklenirken bir hata oluştu.</p>}>
      <Suspense fallback={<DashboardSkeleton />}>
        <ChatInterfaceView 
          isOpen={true} 
          onClose={() => setView('earth-events')} // Ana sayfaya dön
        />
      </Suspense>
    </ErrorBoundary>
  )
}
const ThreatVisualization3DView = React.lazy(() =>
  import("@/components/dashboard/modern-threat-panel").then(mod => ({ default: mod.ModernThreatPanel }))
)
const viewComponents: Record<ViewType, React.ComponentType<any>> = {
  'earth-events': EarthEventsView,
  'asteroid-info': AsteroidInfoView,
  'threat-analysis': ThreatAnalysisView,
  '3d-threat-visualization': ThreatVisualization3DView,
  'system-monitor': SystemMonitorView,
  'chat-interface': ChatInterfaceWrapper as any, // Use wrapper instead of direct component
}
interface DynamicContentPanelProps {
  className?: string
}
export const DynamicContentPanel: React.FC<DynamicContentPanelProps> = ({ className }) => {
  const activeView = useDashboardStore((state) => state.activeView)
  const CurrentView = viewComponents[activeView]
  if (!CurrentView) {
    return (
      <div className={cn("h-full w-full bg-pure-black flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-cliff-light-gray">Görünüm yüklenemedi: {activeView}</p>
          <p className="text-sm text-cliff-light-gray/70 mt-2">Lütfen başka bir görünüm seçin.</p>
        </div>
      </div>
    )
  }
  return (
    <div className={cn("h-full w-full bg-pure-black", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          <ErrorBoundary fallback={<p className="text-cliff-light-gray p-8">İçerik yüklenirken bir hata oluştu.</p>}>
            <Suspense fallback={<DashboardSkeleton />}>
              <CurrentView />
            </Suspense>
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
function EngineStatusIndicator() {
  if (typeof window === "undefined") {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-cliff-light-gray text-sm">Motor Durumu</span>
          <Badge variant="default" className="bg-cliff-light-gray/10 text-cliff-light-gray border-cliff-light-gray/20 text-xs">
            Başlatılıyor
          </Badge>
        </div>
        <div className="text-xs text-cliff-light-gray pt-2 border-t border-cliff-light-gray/10">
          3D motor yükleniyor...
        </div>
      </div>
    )
  }
  const engineState = useEngineState()
  const performanceMetrics = usePerformanceMetrics()
  const timeState = useTimeState()
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-cliff-light-gray text-sm">Motor Durumu</span>
        <Badge variant="default" className={`text-xs ${
          engineState.isInitialized 
            ? 'bg-accent-success/20 text-accent-success border-accent-success/30' 
            : 'bg-cliff-light-gray/10 text-cliff-light-gray border-cliff-light-gray/20'
        }`}>
          {engineState.isInitialized ? 'Aktif' : 'Başlatılıyor'}
        </Badge>
      </div>
      {performanceMetrics && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-cliff-light-gray text-sm">Render Nesneleri</span>
            <span className="text-accent-info text-sm font-mono">
              {performanceMetrics.visibleObjects}/{performanceMetrics.totalObjects}
            </span>
          </div>
        </>
      )}
      {timeState && (
        <div className="flex justify-between items-center">
          <span className="text-cliff-light-gray text-sm">Zaman Ölçeği</span>
          <Badge variant="default" className="bg-accent-info/20 text-accent-info border-accent-info/30 text-xs">
            {timeState.timeScale === 1 ? 'Gerçek Zaman' : `${timeState.timeScale}x`}
          </Badge>
        </div>
      )}
      <div className="text-xs text-cliff-light-gray pt-2 border-t border-cliff-light-gray/10">
        Gelişmiş yörünge mekaniği ile NASA doğrulamalı astronomik veri
      </div>
    </div>
  )
}
function SystemStatsDisplay() {
  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-cliff-light-gray text-sm">Aktif Bağlantılar</span>
        <span className="text-accent-success font-mono text-sm">1</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-cliff-light-gray text-sm">Veri Akışı</span>
        <span className="text-accent-info font-mono text-sm">2.1 MB/s</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-cliff-light-gray text-sm">Bellek Kullanımı</span>
        <span className="text-accent-warning font-mono text-sm">156 MB</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-cliff-light-gray text-sm">WebGL Memory</span>
        <span className="text-accent-info font-mono text-sm">89 MB</span>
      </div>
    </div>
  )
}
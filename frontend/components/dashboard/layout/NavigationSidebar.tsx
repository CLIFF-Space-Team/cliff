'use client'
import React, { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Globe, Shield, Monitor, MessageSquare, Zap } from 'lucide-react'
import { useEngineState, usePerformanceMetrics, useTimeState } from '@/stores'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { cn } from '@/lib/utils'
const buttonVariants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.15, ease: 'easeOut' }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1, ease: 'easeOut' }
  }
}
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return isMobile
}
export const NavigationSidebar = React.memo(function NavigationSidebar() {
  const isMobile = useIsMobile()
  const { activeView, setView } = useDashboardStore()
  const navigationItems = useMemo(() => [
    { id: 'earth-events', label: 'Dünya Olayları', icon: Globe, color: 'accent-success', shortLabel: 'Dünya' },
    { id: 'threat-analysis', label: 'Tehdit Analizi', icon: Shield, color: 'accent-danger', shortLabel: 'Tehdit' },
    { id: 'system-monitor', label: 'Sistem İzleme', icon: Monitor, color: 'accent-info', shortLabel: 'Sistem' },
    { id: 'chat-interface', label: 'AI Live', icon: MessageSquare, color: 'accent-ai', shortLabel: 'AI' },
  ], [])
  const handleViewChange = useCallback((viewId: string) => {
    setView(viewId as any)
  }, [setView])
  return (
    <div className="hidden lg:block lg:col-span-3 space-y-6">
      {}
      <div className="bg-pure-black rounded-xl border border-cliff-light-gray/30 p-4">
        <h3 className="text-sm font-semibold text-cliff-light-gray mb-4 uppercase tracking-wider">
          Navigasyon
        </h3>
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeView === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 group gpu-accelerated",
                  isActive 
                    ? 'bg-cliff-light-gray/10 text-cliff-white border border-cliff-light-gray/20' 
                    : 'text-cliff-light-gray hover:bg-cliff-light-gray/5 hover:text-cliff-white'
                )}
                variants={isMobile ? {} : buttonVariants}
                whileHover={isMobile ? {} : "hover"}
                whileTap={isMobile ? {} : "tap"}
                layout={false}
              >
                <IconComponent className={cn(
                  "h-4 w-4 transition-colors gpu-accelerated",
                  isActive ? "text-accent-success" : "group-hover:text-cliff-white"
                )} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-2 h-2 bg-accent-success rounded-full gpu-accelerated"
                    transition={{ 
                      type: "spring", 
                      stiffness: 500, 
                      damping: 30,
                      mass: 0.8
                    }}
                  />
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
      {}
      <div className="bg-pure-black rounded-xl border border-cliff-light-gray/30 p-4">
        <h3 className="text-sm font-semibold text-cliff-light-gray mb-4 uppercase tracking-wider">
          Anlık Durum
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-cliff-light-gray text-sm">Aktif Tehditler</span>
            <Badge variant="default" className="bg-accent-success/20 text-accent-success border-accent-success/30">
              0
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-cliff-light-gray text-sm">Risk Seviyesi</span>
            <Badge variant="default" className="bg-accent-success/20 text-accent-success border-accent-success/30">
              DÜŞÜK
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-cliff-light-gray text-sm">3D Motor FPS</span>
            <Badge variant="default" className="bg-accent-info/20 text-accent-info border-accent-info/30">
              <PerformanceBadge />
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-cliff-light-gray text-sm">AI Durumu</span>
            <Badge variant="default" className="bg-accent-ai/20 text-accent-ai border-accent-ai/30">
              <Zap className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
})
const PerformanceBadge = React.memo(function PerformanceBadge() {
  if (typeof window === 'undefined') return '-- FPS'
  const performanceMetrics = usePerformanceMetrics()
  if (!performanceMetrics) return '-- FPS'
  return `${Math.round(performanceMetrics.fps)} FPS`
})
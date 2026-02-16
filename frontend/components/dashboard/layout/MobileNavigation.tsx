'use client'
import React, { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Globe, Monitor, MessageSquare, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { ViewType } from '@/types/dashboard-layout'
const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: 'easeOut' }
}
const sidebarVariants = {
  initial: { x: '-100%' },
  animate: { x: 0 },
  exit: { x: '-100%' },
  transition: { type: 'tween', duration: 0.3, ease: 'easeOut' }
}
const buttonTapVariants = {
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1, ease: 'easeOut' }
  }
}
const bottomNavButtonVariants = {
  tap: { 
    scale: 0.9,
    transition: { duration: 0.1, ease: 'easeOut' }
  }
}
export const MobileNavigation = React.memo(function MobileNavigation() {
  const { activeView, setView, isMobileSidebarOpen, toggleMobileSidebar } = useDashboardStore()
  const navigationItems = useMemo(() => [
    { id: 'earth-events', label: 'Dünya Olayları', icon: Globe, color: 'accent-success', shortLabel: 'Dünya' },
    { id: 'threat-analysis', label: 'Tehdit Analizi', icon: Shield, color: 'accent-danger', shortLabel: 'Tehdit' },
    { id: 'system-monitor', label: 'Sistem İzleme', icon: Monitor, color: 'accent-info', shortLabel: 'Sistem' },
    { id: 'chat-interface', label: 'AI Live', icon: MessageSquare, color: 'accent-ai', shortLabel: 'AI' },
  ], [])
  const handleViewChange = useCallback((viewId: string) => {
    setView(viewId as ViewType)
  }, [setView])
  const handleSidebarViewChange = useCallback((viewId: string) => {
    setView(viewId as ViewType)
    toggleMobileSidebar()
  }, [setView, toggleMobileSidebar])
  const handleBackdropClick = useCallback(() => {
    toggleMobileSidebar()
  }, [toggleMobileSidebar])
  const handleCloseClick = useCallback(() => {
    toggleMobileSidebar()
  }, [toggleMobileSidebar])
  return (
    <>
      {}
      <AnimatePresence mode="wait">
        {isMobileSidebarOpen && (
          <>
            {}
            <motion.div
              {...backdropVariants}
              className="fixed inset-0 bg-pure-black/50 backdrop-blur-sm z-40 lg:hidden gpu-accelerated"
              onClick={handleBackdropClick}
            />
            {}
            <motion.div
              {...sidebarVariants}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[80vw] bg-pure-black border-r border-cliff-light-gray/30 z-50 lg:hidden overflow-y-auto safe-area-top gpu-accelerated"
            >
              <div className="p-4 space-y-6">
                {}
                <div className="flex items-center justify-between pb-4 border-b border-cliff-light-gray/30">
                  <div className="flex items-center gap-2">
                    <Shield className="h-6 w-6 text-cliff-white" />
                    <span className="font-bold text-cliff-white">CLIFF 3D</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseClick}
                    className="tap-target text-cliff-white hover:bg-cliff-light-gray/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                {}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-cliff-light-gray mb-4 uppercase tracking-wider">
                    Navigasyon
                  </h3>
                  {navigationItems.map((item) => {
                    const IconComponent = item.icon
                    const isActive = activeView === item.id
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => handleSidebarViewChange(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-4 rounded-lg text-left transition-all duration-200 group tap-target gpu-accelerated",
                          isActive 
                            ? 'bg-cliff-light-gray/10 text-cliff-white border border-cliff-light-gray/20' 
                            : 'text-cliff-light-gray hover:bg-cliff-light-gray/5 hover:text-cliff-white'
                        )}
                        variants={buttonTapVariants}
                        whileTap="tap"
                        layout={false}
                      >
                        <IconComponent className={cn(
                          "h-5 w-5 transition-colors gpu-accelerated",
                          isActive ? "text-accent-success" : "group-hover:text-cliff-white"
                        )} />
                        <span className="font-medium">{item.label}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeMobileIndicator"
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
                {}
                <div className="space-y-3 pt-4 border-t border-cliff-light-gray/30">
                  <h3 className="text-sm font-semibold text-cliff-light-gray uppercase tracking-wider">
                    Anlık Durum
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-cliff-light-gray text-sm">Aktif Tehditler</span>
                      <Badge variant="default" className="bg-accent-danger/20 text-accent-danger border-accent-danger/30 text-xs">
                        12
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cliff-light-gray text-sm">Risk Seviyesi</span>
                      <Badge variant="default" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        ORTA
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cliff-light-gray text-sm">AI Durumu</span>
                      <Badge variant="default" className="bg-accent-ai/20 text-accent-ai border-accent-ai/30 text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cliff-light-gray text-sm">Sistem</span>
                      <Badge variant="default" className="bg-accent-success/20 text-accent-success border-accent-success/30 text-xs">
                        Online
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {}
      <div className="fixed bottom-0 left-0 right-0 bg-pure-black backdrop-blur-20 border-t border-cliff-light-gray/30 lg:hidden z-30 safe-area-bottom mobile-nav gpu-accelerated">
        <div className="flex justify-around items-center py-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeView === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => handleViewChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 tap-target gpu-accelerated relative",
                  isActive 
                    ? 'text-accent-success' 
                    : 'text-cliff-light-gray active:text-cliff-white'
                )}
                variants={bottomNavButtonVariants}
                whileTap="tap"
              >
                <IconComponent className="h-5 w-5 mb-1 gpu-accelerated" />
                <span className="text-xs font-medium">{item.shortLabel}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeMobileBottomIndicator"
                    className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-accent-success rounded-full gpu-accelerated"
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
    </>
  )
})
'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Activity, Database, Menu, X } from 'lucide-react'
import FPSMonitor from '@/components/3d/performance/FPSMonitor'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  className?: string
  isMobileSidebarOpen?: boolean
  setIsMobileSidebarOpen?: (open: boolean) => void
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  className,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen 
}) => {
  const { toggleMobileSidebar } = useDashboardStore()

  return (
    <header
      className={cn(
        'border-b border-cliff-light-gray/10 bg-pure-black backdrop-blur-xl sticky top-0 z-50 h-20 flex-shrink-0',
        className
      )}
    >
      <div className="container mx-auto h-full flex items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-cliff-light-gray/10 transition-colors duration-200"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-6 w-6 text-cliff-white" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-pure-black to-almost-black border border-cliff-light-gray/30 flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 md:h-6 md:w-6 text-cliff-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-md"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold text-cliff-white">
                CLIFF Navigation Center
              </h1>
              <p className="text-cliff-light-gray text-xs md:text-sm hidden md:block">
                Cosmic Level Intelligent Forecast Framework
              </p>
            </div>
            {/* Mobile title */}
            <div className="sm:hidden">
              <h1 className="text-base font-bold text-cliff-white">
                CLIFF
              </h1>
            </div>
          </div>
        </div>

        {/* Desktop Status badges - Enhanced */}
        <div className="hidden md:flex items-center gap-3">
          <Badge 
            variant="default" 
            className="bg-green-500/10 text-green-400 border-green-400/30 text-xs hover:bg-green-500/20 transition-colors duration-200 cursor-pointer"
          >
            <Activity className="w-3 h-3 mr-1" />
            Sistem Aktif
          </Badge>
          <Badge 
            variant="default" 
            className="bg-cliff-light-gray/10 text-cliff-white border-cliff-light-gray/30 text-xs hover:bg-cliff-light-gray/20 transition-colors duration-200 cursor-pointer"
          >
            <Database className="w-3 h-3 mr-1" />
            Canlı Veri
          </Badge>
          <FPSMonitor 
            compact={true}
            targetFPS={60}
            showGraph={false}
            showDetails={false}
          />
        </div>

        {/* Mobile Status - Simplified */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <FPSMonitor 
            compact={true}
            targetFPS={60}
            showGraph={false}
            showDetails={false}
          />
        </div>
      </div>
    </header>
  )
}
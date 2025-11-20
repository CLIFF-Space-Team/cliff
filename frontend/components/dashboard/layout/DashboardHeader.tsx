'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Activity, Menu, Bell, Search } from 'lucide-react'
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
}) => {
  const { toggleMobileSidebar } = useDashboardStore()

  return (
    <header
      className={cn(
        'h-20 flex-shrink-0 border-b border-white/5 bg-[#020204] sticky top-0 z-40',
        className
      )}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="hidden md:flex items-center text-sm text-gray-500">
            <span className="text-gray-300 font-medium">Dashboard</span>
            <span className="mx-2 text-gray-700">/</span>
            <span>Overview</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/5 border border-green-500/10">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-500">Sistem Online</span>
            </div>
            
            <FPSMonitor compact={true} targetFPS={60} showGraph={false} showDetails={false} />
          </div>

          <div className="hidden md:block w-px h-8 bg-white/5" />

          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full">
              <Search className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#020204]" />
            </Button>
            
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-white/10 ml-2" />
          </div>

        </div>
      </div>
    </header>
  )
}
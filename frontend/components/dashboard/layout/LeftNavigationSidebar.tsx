'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Globe, 
  Shield, 
  Monitor, 
  MessageSquare, 
  Zap, 
  ChevronLeft, 
  ChevronRight, 
  Activity,
  AlertTriangle,
  Satellite,
  Bot,
  Rocket
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ViewType } from '@/types/dashboard-layout'
import { useDashboardStore } from '@/stores/useDashboardStore'

// Sidebar width configurations
const SIDEBAR_WIDTHS = {
  collapsed: 80,
  expanded: 280
} as const

// Navigation items with enhanced styling
const NAVIGATION_ITEMS = [
  {
    id: 'earth-events' as ViewType,
    label: 'Dünya Olayları',
    icon: Globe,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    hoverColor: 'hover:bg-emerald-500/20',
    shortLabel: 'Dünya',
    description: 'Doğal afetler ve jeolojik olaylar'
  },
  {
    id: 'threat-analysis' as ViewType,
    label: 'Tehdit Analizi',
    icon: Shield,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    hoverColor: 'hover:bg-red-500/20',
    shortLabel: 'Tehdit',
    description: 'AI destekli tehdit analizi ve uzay tehlikeleri'
  },
  {
    id: 'system-monitor' as ViewType,
    label: 'Sistem İzleme',
    icon: Monitor,
    color: 'text-cliff-white',
    bgColor: 'bg-cliff-light-gray/10',
    borderColor: 'border-cliff-light-gray/20',
    hoverColor: 'hover:bg-cliff-light-gray/20',
    shortLabel: 'Sistem',
    description: 'Performans ve sistem durumu'
  },
  {
    id: 'chat-interface' as ViewType,
    label: 'AI Asistan',
    icon: MessageSquare,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    hoverColor: 'hover:bg-purple-500/20',
    shortLabel: 'AI',
    description: 'Yapay zeka sohbet arayüzü'
  }
] as const

// Status indicators data
const STATUS_INDICATORS = [
  {
    label: 'Aktif Tehditler',
    value: '2',
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10'
  },
  {
    label: 'Risk Seviyesi',
    value: 'ORTA',
    icon: Shield,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10'
  },
  {
    label: 'Aktif Satellites',
    value: '156',
    icon: Satellite,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10'
  },
  {
    label: 'AI Durumu',
    value: 'Online',
    icon: Bot,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10'
  }
] as const

// Animation variants
const sidebarVariants = {
  collapsed: {
    width: SIDEBAR_WIDTHS.collapsed,
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
  },
  expanded: {
    width: SIDEBAR_WIDTHS.expanded,
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
  }
}

const itemVariants = {
  collapsed: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.2 }
  },
  expanded: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, delay: 0.1 }
  }
}

export const LeftNavigationSidebar: React.FC<{}> = () => {
  const { activeView, setView } = useDashboardStore()
  const [isExpanded, setIsExpanded] = useState(true) // Sidebar genişletilmiş başlar

  return (
    <div
      className={cn(
        'relative h-screen bg-pure-black shrink-0',
        'border-r border-cliff-light-gray/10 backdrop-blur-xl',
        'flex flex-col shadow-2xl hidden lg:flex',
        isExpanded ? 'w-80' : 'w-20'
      )}
      style={{ transition: 'width 0.3s ease' }}
    >
      {/* Header with toggle */}
      <div className="p-4 border-b border-cliff-light-gray/10">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-pure-black to-almost-black rounded-lg flex items-center justify-center border border-cliff-light-gray/20">
                <Activity className="w-4 h-4 text-cliff-white" />
              </div>
              <div>
                <h2 className="text-cliff-white font-semibold text-sm">CLIFF Monitor</h2>
                <p className="text-cliff-light-gray text-xs">Space Defense</p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "p-2 hover:bg-cliff-light-gray/10 rounded-lg transition-colors",
              !isExpanded && "mx-auto"
            )}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-cliff-light-gray" />
            ) : (
              <ChevronRight className="w-4 h-4 text-cliff-light-gray" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {isExpanded && (
          <h3 className="text-cliff-light-gray text-xs font-semibold uppercase tracking-wider mb-3">
            Navigasyon
          </h3>
        )}

        <div className="space-y-1">
          {NAVIGATION_ITEMS.map((item) => {
            const IconComponent = item.icon
            const isActive = activeView === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewType)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl text-left transition-all duration-200',
                  'hover:transform hover:scale-[1.02] group relative overflow-hidden',
                  isExpanded ? 'p-3' : 'p-3 justify-center',
                  isActive 
                    ? `${item.bgColor} ${item.borderColor} border text-cliff-white shadow-lg ${item.color}` 
                    : `text-cliff-light-gray hover:text-cliff-white ${item.hoverColor} hover:border-transparent hover:bg-cliff-light-gray/10`
                )}
              >
                {/* Background glow */}
                {isActive && (
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl opacity-20',
                      item.bgColor.replace('/10', '/30')
                    )}
                  />
                )}
                
                <IconComponent className={cn(
                  'w-5 h-5 transition-colors relative z-10 shrink-0',
                  isActive ? item.color : 'group-hover:text-cliff-white'
                )} />
                
                {isExpanded && (
                  <div className="flex-1 relative z-10">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs opacity-70 mt-0.5">{item.description}</div>
                  </div>
                )}
                
                {/* Active indicator dot */}
                {isActive && isExpanded && (
                  <div className={cn('w-2 h-2 rounded-full relative z-10', item.color)} />
                )}
              </button>
            )
          })}
        </div>
        
        {/* Özel Özellikler */}
        {isExpanded && (
          <div className="mt-6">
            <h3 className="text-cliff-light-gray text-xs font-semibold uppercase tracking-wider mb-3">
              İnteraktif Araçlar
            </h3>
          </div>
        )}
        
        <div className="space-y-1">
          <Link href="/impact-simulator">
            <button
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-left transition-all duration-200',
                'hover:transform hover:scale-[1.02] group relative overflow-hidden',
                isExpanded ? 'p-3' : 'p-3 justify-center',
                'text-cliff-light-gray hover:text-cliff-white hover:bg-orange-500/20 hover:border-transparent'
              )}
            >
              <Rocket className="w-5 h-5 transition-colors relative z-10 shrink-0 group-hover:text-orange-400" />
              
              {isExpanded && (
                <div className="flex-1 relative z-10">
                  <div className="font-medium text-sm">Çarpma Simülatörü</div>
                  <div className="text-xs opacity-70 mt-0.5">Asteroid etki analizi</div>
                </div>
              )}
              
              {isExpanded && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  YENİ
                </Badge>
              )}
            </button>
          </Link>
        </div>
      </div>

      {/* Status Section */}
      <div className="p-4 border-t border-cliff-light-gray/10">
        {isExpanded ? (
          <div className="space-y-3">
            <h3 className="text-cliff-light-gray text-xs font-semibold uppercase tracking-wider">
              Sistem Durumu
            </h3>
            <div className="space-y-2">
              {STATUS_INDICATORS.map((status) => {
                const StatusIcon = status.icon
                return (
                  <div
                    key={status.label}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg',
                      'bg-cliff-light-gray/5 border border-cliff-light-gray/10'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn('w-3 h-3', status.color)} />
                      <span className="text-cliff-light-gray text-xs">{status.label}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs px-2 py-0.5 border-0',
                        status.bgColor,
                        status.color
                      )}
                    >
                      {status.value}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {STATUS_INDICATORS.slice(0, 2).map((status) => {
              const StatusIcon = status.icon
              return (
                <div
                  key={status.label}
                  className={cn(
                    'flex items-center justify-center p-2 rounded-lg mx-auto',
                    status.bgColor,
                    'border border-cliff-light-gray/10'
                  )}
                  title={`${status.label}: ${status.value}`}
                >
                  <StatusIcon className={cn('w-4 h-4', status.color)} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Performance indicator */}
      <div className="p-4 border-t border-cliff-light-gray/10">
        <div className={cn("flex items-center gap-2", !isExpanded && "justify-center")}>
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          {isExpanded && (
            <span className="text-green-400 text-xs font-medium">
              Sistem Aktif
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
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
const SIDEBAR_WIDTHS = {
  collapsed: 80,
  expanded: 280  // Optimal genişlik - sağa daha fazla yer bırakır
} as const
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
    description: 'Doğal afetler ve jeolojik olaylar',
    badge: '20+',
    badgeColor: 'bg-emerald-500'
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
    description: 'AI destekli tehdit analizi ve uzay tehlikeleri',
    badge: '90',
    badgeColor: 'bg-red-500'
  },
  {
    id: 'system-monitor' as ViewType,
    label: 'Sistem İzleme',
    icon: Monitor,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    hoverColor: 'hover:bg-cyan-500/20',
    shortLabel: 'Sistem',
    description: 'Performans ve sistem durumu',
    badge: 'LIVE',
    badgeColor: 'bg-cyan-500'
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
    description: 'Yapay zeka sohbet arayüzü',
    badge: 'NEW',
    badgeColor: 'bg-purple-500'
  }
] as const
// Sistem Durumu kaldırıldı - gereksiz
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
        'relative h-screen shrink-0',
        'bg-gradient-to-b from-gray-950 via-black to-gray-950',
        'border-r border-cyan-500/10 backdrop-blur-xl',
        'flex flex-col shadow-2xl hidden lg:flex',
        isExpanded ? 'w-72' : 'w-20'
      )}
      style={{ 
        transition: 'width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5), inset -1px 0 2px rgba(6, 182, 212, 0.1)'
      }}
    >
      {}
      <div className="p-4 border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent">
        <div className="flex items-center justify-between">
          {isExpanded && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  CLIFF Monitor
                </h2>
                <p className="text-cyan-400 text-xs font-medium">Space Defense System</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "p-2.5 hover:bg-cyan-500/20 rounded-xl transition-all duration-200",
              "border border-gray-700/30 hover:border-cyan-500/40",
              "hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-110",
              !isExpanded && "mx-auto"
            )}
            title={isExpanded ? "Menüyü Küçült" : "Menüyü Genişlet"}
          >
            {isExpanded ? (
              <ChevronLeft className="w-4 h-4 text-cyan-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-cyan-400" />
            )}
          </button>
        </div>
      </div>
      {}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
        {isExpanded && (
          <div className="mb-4">
            <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="w-1 h-3 bg-cyan-500 rounded-full" />
              Navigasyon
            </h3>
            <p className="text-gray-500 text-[10px] ml-3">Ana sistem modülleri</p>
          </div>
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
                {}
                {isActive && (
                  <div
                    className={cn(
                      'absolute inset-0 rounded-xl opacity-20',
                      item.bgColor.replace('/10', '/30')
                    )}
                  />
                )}
                {}
                <div className={cn(
                  'p-2 rounded-lg relative z-10 shrink-0 transition-all duration-200',
                  isActive ? `${item.bgColor} ${item.borderColor} border shadow-inner` : 'bg-gray-900/30'
                )}>
                  <IconComponent className={cn(
                    'w-5 h-5 transition-all duration-200',
                    isActive ? item.color : 'text-gray-400 group-hover:text-cliff-white group-hover:scale-110'
                  )} />
                </div>
                
                {isExpanded && (
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm">{item.label}</div>
                      {item.badge && (
                        <Badge className={cn(
                          'text-[10px] px-1.5 py-0.5 font-bold',
                          item.badgeColor,
                          'text-white'
                        )}>
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs opacity-70">{item.description}</div>
                    {}
                    {isActive && (
                      <div className="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className={cn('h-full', item.color.replace('text', 'bg'))}
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                    )}
                  </div>
                )}
                
                {}
                {isActive && !isExpanded && (
                  <div className={cn(
                    'absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full',
                    item.color.replace('text', 'bg')
                  )} />
                )}
              </button>
            )
          })}
        </div>
        {}
        {isExpanded && (
          <div className="mt-8 mb-4">
            <h3 className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <div className="w-1 h-3 bg-orange-500 rounded-full" />
              İnteraktif Araçlar
            </h3>
            <p className="text-gray-500 text-[10px] ml-3">Gelişmiş analiz araçları</p>
          </div>
        )}
        <div className="space-y-2">
          <Link href="/impact-simulator">
            <button
              className={cn(
                'w-full flex items-center gap-3 rounded-xl text-left transition-all duration-200 group relative overflow-hidden',
                'hover:transform hover:scale-[1.02] hover:shadow-lg',
                isExpanded ? 'p-4' : 'p-3 justify-center',
                'bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20',
                'hover:from-orange-500/20 hover:to-red-500/20 hover:border-orange-500/40'
              )}
            >
              {}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className={cn(
                'p-2 rounded-lg relative z-10 shrink-0 bg-orange-500/20 border border-orange-500/30',
                'group-hover:bg-orange-500/30 group-hover:scale-110 transition-all duration-200'
              )}>
                <Rocket className="w-5 h-5 text-orange-400" />
              </div>
              
              {isExpanded && (
                <div className="flex-1 relative z-10">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-sm text-white">Çarpma Simülatörü</div>
                    <Badge className="bg-orange-500 text-white text-[10px] px-2 py-0.5 font-bold animate-pulse">
                      YENİ
                    </Badge>
                  </div>
                  <div className="text-xs text-orange-300 opacity-90">
                    Gerçekçi asteroid çarpışma simülasyonu
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-orange-500 to-red-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </button>
          </Link>
        </div>
      </div>
      {}
      <div className="p-4 border-t border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent">
        <div className={cn("flex items-center gap-3", !isExpanded && "justify-center")}>
          {isExpanded && (
            <div className="flex-1 p-3 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                  <span className="text-green-400 text-xs font-bold">SYSTEM ACTIVE</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 border border-green-500/30">
                  v2.0
                </Badge>
              </div>
              <div className="text-[10px] text-gray-400">
                All systems operational
              </div>
            </div>
          )}
          {!isExpanded && (
            <span className="text-green-400 text-xs font-medium">
              Sistem Aktif
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Globe, 
  Shield, 
  Monitor, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Rocket,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ViewType } from '@/types/dashboard-layout'
import { useDashboardStore } from '@/stores/useDashboardStore'

const NAVIGATION_ITEMS = [
  {
    id: 'earth-events' as ViewType,
    label: 'Dünya Olayları',
    icon: Globe,
    activeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    badge: '20+'
  },
  {
    id: 'threat-analysis' as ViewType,
    label: 'Tehdit Analizi',
    icon: Shield,
    activeClass: 'text-red-400 bg-red-500/10 border-red-500/20',
    badge: '90'
  },
  {
    id: 'system-monitor' as ViewType,
    label: 'Sistem İzleme',
    icon: Monitor,
    activeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    badge: 'CANLI'
  },
  {
    id: 'chat-interface' as ViewType,
    label: 'AI Asistan',
    icon: MessageSquare,
    activeClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    badge: 'YENİ'
  }
] as const

export const LeftNavigationSidebar: React.FC<{}> = () => {
  const { activeView, setView } = useDashboardStore()
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div
      className={cn(
        'relative h-screen shrink-0 flex flex-col transition-all duration-300 border-r border-white/5 bg-[#020204] hidden lg:flex',
        isExpanded ? 'w-64' : 'w-20'
      )}
    >
      <div className="h-20 flex items-center px-4 border-b border-white/5">
        <div className={cn("flex items-center gap-3 overflow-hidden", !isExpanded && "justify-center w-full")}>
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold text-white tracking-wide">CLIFF</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Uzay İzleme Sistemi</span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewType)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative',
                isActive 
                  ? item.activeClass + ' border' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
                !isExpanded && 'justify-center'
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", isActive && "opacity-100")} />
              
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  className="text-sm font-medium whitespace-nowrap flex-1 text-left"
                >
                  {item.label}
                </motion.span>
              )}

              {isExpanded && item.badge && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5 text-gray-400",
                  isActive && "bg-transparent border-current opacity-80"
                )}>
                  {item.badge}
                </span>
              )}
              
              {!isExpanded && isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-current rounded-r-full" />
              )}

              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50 shadow-xl">
                  {item.label}
                  {item.badge && <span className="ml-2 text-[10px] text-gray-500">{item.badge}</span>}
                </div>
              )}
            </button>
          )
        })}

        <div className="h-px bg-white/5 my-4 mx-2" />

        <Link href="/impact-simulator" className="block">
          <button
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative',
              'text-gray-400 hover:bg-orange-500/10 hover:text-orange-400 hover:border-orange-500/20 border border-transparent',
              !isExpanded && 'justify-center'
            )}
          >
            <div className="w-5 h-5 shrink-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full group-hover:animate-ping" />
            </div>
            
            {isExpanded && (
              <span className="text-sm font-medium whitespace-nowrap flex-1 text-left">
                Simülatör
              </span>
            )}
          </button>
        </Link>
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </div>
  )
}
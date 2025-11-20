import React from 'react'
import { Search, Shield, Monitor, MessageSquare, Sparkles, Globe } from 'lucide-react'

export type ViewType = 'earth-events' | 'asteroid-info' | 'threat-analysis' | 'chat-interface' | 'system-monitor' | '3d-threat-visualization'

export interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  color: string
  shortLabel: string
}

export interface DashboardHeaderProps {
  isMobileSidebarOpen: boolean
  setIsMobileSidebarOpen: (open: boolean) => void
}

export interface NavigationSidebarProps {
  currentView: ViewType
  setCurrentView: (view: ViewType) => void
}

export interface CentralVisualizationProps {
  className?: string
}

export interface DynamicContentPanelProps {
  currentView: ViewType
}

export interface MobileNavigationProps {
  currentView: ViewType
  setCurrentView: (view: ViewType) => void
  isMobileSidebarOpen: boolean
  setIsMobileSidebarOpen: (open: boolean) => void
}

export interface DashboardLayoutState {
  currentView: ViewType
  isMobileSidebarOpen: boolean
}

export interface LayoutResponsiveBreakpoints {
  mobile: number
  tablet: number
  desktop: number
}

export interface ZIndexLayers {
  footer: number
  sidebar: number
  header: number
  mobileNav: number
  dropdown: number
  modal: number
}

export interface GridLayoutAreas {
  header: string
  sidebar: string
  main: string
  content: string
  footer: string
}

export interface PerformanceMetrics {
  fps: number
  visibleObjects?: number
  totalObjects?: number
  memoryUsage?: number
  renderTime?: number
}

export interface EngineState {
  isInitialized: boolean
  isLoading?: boolean
  hasError?: boolean
  errorMessage?: string
}

export interface TimeState {
  timeScale: number
  isPaused?: boolean
  currentTime?: Date
}

export interface ComponentStyleClasses {
  container?: string
  header?: string
  sidebar?: string
  main?: string
  content?: string
  footer?: string
  mobileNav?: string
}

export interface ResponsiveConfig {
  breakpoints: LayoutResponsiveBreakpoints
  zIndex: ZIndexLayers
  gridAreas: GridLayoutAreas
}

export const DASHBOARD_BREAKPOINTS: LayoutResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440
}

export const DASHBOARD_Z_INDEX: ZIndexLayers = {
  footer: 10,
  sidebar: 20,
  header: 30,
  mobileNav: 40,
  dropdown: 50,
  modal: 90
}

export const GRID_LAYOUT_AREAS: GridLayoutAreas = {
  header: 'header',
  sidebar: 'sidebar', 
  main: 'main',
  content: 'content',
  footer: 'footer'
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'earth-events',
    label: 'Dünya Olayları',
    icon: Globe,
    color: 'accent-success',
    shortLabel: 'Dünya'
  },
  {
    id: 'asteroid-info',
    label: 'Asteroid Bilgi Paneli',
    icon: Search,
    color: 'accent-info',
    shortLabel: 'Asteroid'
  },
  {
    id: 'threat-analysis',
    label: 'AI Destekli Tehdit Analizi',
    icon: Shield,
    color: 'accent-danger',
    shortLabel: 'Tehdit'
  },
  {
    id: '3d-threat-visualization',
    label: '3D Tehdit Görselleştirme',
    icon: Sparkles,
    color: 'accent-warning',
    shortLabel: '3D Tehdit'
  },
  {
    id: 'system-monitor',
    label: 'Sistem İzleme',
    icon: Monitor,
    color: 'accent-success',
    shortLabel: 'Sistem'
  },
  {
    id: 'chat-interface',
    label: 'AI Chat',
    icon: MessageSquare,
    color: 'accent-warning',
    shortLabel: 'Chat'
  }
]
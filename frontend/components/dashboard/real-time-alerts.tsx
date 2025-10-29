'use client'

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Badge, ThreatLevelBadge, DataSourceBadge, NotificationBadge } from '@/components/ui'
import { Button } from '@/components/ui'
import { useWebSocket } from '@/hooks/use-websocket'
import { useThreatData } from '@/hooks/use-threat-data'
import { 
  Bell, 
  BellRing, 
  AlertTriangle, 
  Zap, 
  Satellite, 
  Globe,
  Filter,
  Trash2,
  Volume2,
  VolumeX,
  Settings,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'

interface Alert {
  id: string
  type: 'threat' | 'system' | 'cosmic_event' | 'data_update'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  message: string
  source: string
  timestamp: Date
  read: boolean
  acknowledged: boolean
  category: string
  data?: any
}

interface RealTimeAlertsProps {
  className?: string
  maxAlerts?: number
  showFilters?: boolean
  autoScroll?: boolean
  soundEnabled?: boolean
}

// 🚀 PERFORMANCE: Memoized Alert Item Component
const AlertItem = memo(function AlertItem({
  alert,
  onMarkAsRead,
  onAcknowledge,
  onDelete,
}: {
  alert: Alert
  onMarkAsRead: (id: string) => void
  onAcknowledge: (id: string) => void
  onDelete: (id: string) => void
}) {
  // 🚀 PERFORMANCE: Memoized alert icon function
  const getAlertIcon = useCallback((alertType: string) => {
    switch (alertType) {
      case 'threat':
        return <AlertTriangle className="h-4 w-4" />
      case 'cosmic_event':
        return <Zap className="h-4 w-4" />
      case 'system':
        return <Settings className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }, [])

  // 🚀 PERFORMANCE: Memoized event handlers
  const handleItemClick = useCallback(() => {
    if (!alert.read) {
      onMarkAsRead(alert.id)
    }
  }, [alert.id, alert.read, onMarkAsRead])

  const handleAcknowledge = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onAcknowledge(alert.id)
  }, [alert.id, onAcknowledge])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(alert.id)
  }, [alert.id, onDelete])

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border transition-all duration-200",
        !alert.read && "bg-pure-black border-blue-500/30",
        alert.read && "bg-pure-black border-cliff-light-gray/30",
        alert.acknowledged && "opacity-60"
      )}
      onClick={handleItemClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getAlertIcon(alert.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h4 className={cn(
                "font-medium text-sm",
                !alert.read && "text-cliff-white",
                alert.read && "text-cliff-light-gray"
              )}>
                {alert.title}
              </h4>
              <p className="text-xs text-cliff-light-gray mt-1">
                {alert.message}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <ThreatLevelBadge 
                level={
                  alert.severity === 'critical' ? 'kritik' :
                  alert.severity === 'high' ? 'yüksek' :
                  alert.severity === 'medium' ? 'orta' : 'düşük'
                } 
              />
              <DataSourceBadge 
                source={alert.source.toLowerCase().includes('nasa') ? 'nasa' : 'internal'} 
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-cliff-light-gray">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(alert.timestamp)}
              <span>•</span>
              <span>{alert.source}</span>
            </div>

            <div className="flex items-center gap-1">
              {!alert.acknowledged && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAcknowledge}
                  className="h-6 px-2 text-xs"
                >
                  Onayla
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>

              {alert.data && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  title="Detayları görüntüle"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {!alert.read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  )
})

// 🚀 PERFORMANCE: Memoized Filter Controls
const AlertFilterControls = memo(function AlertFilterControls({
  filter,
  selectedCategories,
  categories,
  unreadCount,
  onFilterChange,
  onCategoryToggle,
}: {
  filter: string
  selectedCategories: string[]
  categories: string[]
  unreadCount: number
  onFilterChange: (filter: string) => void
  onCategoryToggle: (category: string) => void
}) {
  // 🚀 PERFORMANCE: Memoized filter options
  const filterOptions = useMemo(() => [
    { key: 'all', label: 'Tümü' },
    { key: 'critical', label: 'Kritik' },
    { key: 'high', label: 'Yüksek' },
    { key: 'medium', label: 'Orta' },
    { key: 'low', label: 'Düşük' },
    { key: 'unread', label: `Okunmamış${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
  ], [unreadCount])

  return (
    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-cliff-light-gray/30">
      <Filter className="h-4 w-4 text-cliff-light-gray" />
      
      <div className="flex gap-2">
        {filterOptions.map((option) => (
          <Button
            key={option.key}
            variant={filter === option.key ? 'cosmic' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(option.key)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 ml-4">
          {categories.slice(0, 5).map((category) => (
            <Button
              key={category}
              variant={selectedCategories.includes(category) ? 'cosmic' : 'outline'}
              size="sm"
              onClick={() => onCategoryToggle(category)}
            >
              {category.replace(/_/g, ' ').toUpperCase()}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
})

// 🚀 PERFORMANCE: Main RealTimeAlerts Component
const RealTimeAlerts: React.FC<RealTimeAlertsProps> = ({
  className,
  maxAlerts = 50,
  showFilters = true,
  autoScroll = true,
  soundEnabled = true
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low' | 'unread'>('all')
  const [soundOn, setSoundOn] = useState(soundEnabled)
  const [expanded, setExpanded] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const { isConnected, lastMessage } = useWebSocket()
  const { activeAlerts, comprehensiveAssessment } = useThreatData()

  // 🚀 PERFORMANCE: Memoized notification sound function
  const playNotificationSound = useCallback((severity: string) => {
    if (!soundOn) return
    
    try {
      // Create audio context for notification sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Different frequencies for different severities
      const frequency = severity === 'critical' ? 800 : severity === 'high' ? 600 : 400
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.warn('Could not play notification sound:', error)
    }
  }, [soundOn])

  // 🚀 PERFORMANCE: Memoized WebSocket message parsing
  const processWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'alert' || data.type === 'threat_update' || data.type === 'system_status') {
      const newAlert: Alert = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: data.alert_type || 'system',
        severity: data.severity || 'medium',
        title: data.title || 'Yeni Uyarı',
        message: data.message || data.description || '',
        source: data.source || 'CLIFF Sistemi',
        timestamp: new Date(data.timestamp || Date.now()),
        read: false,
        acknowledged: false,
        category: data.category || 'general',
        data: data.data
      }

      setAlerts(prev => [newAlert, ...prev.slice(0, maxAlerts - 1)])

      // Play sound notification
      if (data.severity === 'critical' || data.severity === 'high') {
        playNotificationSound(data.severity)
      }
    }
  }, [maxAlerts, playNotificationSound])

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        // lastMessage.data is already parsed by useWebSocket hook
        const data = typeof lastMessage.data === 'string' ? JSON.parse(lastMessage.data) : lastMessage.data
        processWebSocketMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, 'Data:', lastMessage.data)
      }
    }
  }, [lastMessage, processWebSocketMessage])

  // 🚀 PERFORMANCE: Memoized threat alert processing
  const processedThreatAlerts = useMemo(() => {
    const threatAlerts: Alert[] = []

    if (activeAlerts && activeAlerts.length > 0) {
      threatAlerts.push(...activeAlerts.slice(0, 10).map(alert => ({
        id: alert.alert_id || `active-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'threat' as const,
        severity: alert.alert_level.toLowerCase() === 'critical' ? 'critical' :
                 alert.alert_level.toLowerCase() === 'warning' ? 'high' : 'medium' as any,
        title: alert.message,
        message: alert.threat_details.description || alert.message,
        source: alert.threat_details.data_source || 'CLIFF Sistemi',
        timestamp: new Date(alert.created_at),
        read: false,
        acknowledged: false,
        category: alert.threat_details.threat_type || 'general',
        data: alert.threat_details
      })))
    }

    if (comprehensiveAssessment?.active_threats && comprehensiveAssessment.active_threats.length > 0) {
      threatAlerts.push(...comprehensiveAssessment.active_threats.slice(0, 5).map(threat => ({
        id: threat.threat_id || `comprehensive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'threat' as const,
        severity: threat.severity.toLowerCase() as any || 'medium',
        title: threat.title,
        message: threat.description,
        source: threat.data_source || 'CLIFF Sistemi',
        timestamp: new Date(),
        read: false,
        acknowledged: false,
        category: threat.threat_type || 'general',
        data: threat
      })))
    }

    return threatAlerts
  }, [activeAlerts, comprehensiveAssessment])

  // Load initial alerts from threat data
  useEffect(() => {
    if (processedThreatAlerts.length > 0) {
      setAlerts(prev => {
        const existing = prev.filter(alert => 
          !processedThreatAlerts.find(ta => ta.id === alert.id)
        )
        return [...existing, ...processedThreatAlerts].slice(0, maxAlerts)
      })
    }
  }, [processedThreatAlerts, maxAlerts])

  // 🚀 PERFORMANCE: Optimized filtered alerts calculation
  const filteredAlerts = useMemo(() => {
    let filtered = alerts

    // Filter by severity
    if (filter !== 'all') {
      if (filter === 'unread') {
        filtered = filtered.filter(alert => !alert.read)
      } else {
        filtered = filtered.filter(alert => alert.severity === filter)
      }
    }

    // Filter by categories
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(alert => selectedCategories.includes(alert.category))
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [alerts, filter, selectedCategories])

  // 🚀 PERFORMANCE: Memoized statistics
  const alertStats = useMemo(() => {
    const unreadCount = alerts.filter(alert => !alert.read).length
    const criticalCount = alerts.filter(alert => alert.severity === 'critical').length
    const categories = Array.from(new Set(alerts.map(alert => alert.category)))
    return { unreadCount, criticalCount, categories }
  }, [alerts])

  // 🚀 PERFORMANCE: Memoized event handlers
  const markAsRead = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })))
  }, [])

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true, read: true } : alert
      )
    )
  }, [])

  const deleteAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }, [])

  const clearAllAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const handleFilterChange = useCallback((newFilter: string) => {
    setFilter(newFilter as any)
  }, [])

  const handleCategoryToggle = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }, [])

  const toggleSound = useCallback(() => {
    setSoundOn(prev => !prev)
  }, [])

  const toggleExpanded = useCallback(() => {
    setExpanded(prev => !prev)
  }, [])

  return (
    <Card variant="cosmic" className={cn("relative", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              {alertStats.criticalCount > 0 ? (
                <BellRing className="h-5 w-5 text-red-400 animate-pulse" />
              ) : (
                <Bell className="h-5 w-5 text-blue-400" />
              )}
              {alertStats.unreadCount > 0 && (
                <NotificationBadge
                  count={alertStats.unreadCount}
                  variant={alertStats.criticalCount > 0 ? 'danger' : 'default'}
                />
              )}
            </div>
            
            <CardTitle className="flex items-center gap-2">
              Gerçek Zamanlı Uyarılar
              <Badge variant={isConnected ? 'success' : 'error'} size="sm">
                {isConnected ? 'Bağlandı' : 'Bağlantı Kesildi'}
              </Badge>
            </CardTitle>

            <button
              onClick={toggleExpanded}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-cliff-light-gray" />
              ) : (
                <ChevronDown className="h-4 w-4 text-cliff-light-gray" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              title={soundOn ? 'Sesi kapat' : 'Sesi aç'}
            >
              {soundOn ? (
                <Volume2 className="h-4 w-4 text-blue-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-cliff-light-gray" />
              )}
            </button>

            {alertStats.unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Tümünü okundu işaretle
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={clearAllAlerts}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && expanded && (
          <AlertFilterControls
            filter={filter}
            selectedCategories={selectedCategories}
            categories={alertStats.categories}
            unreadCount={alertStats.unreadCount}
            onFilterChange={handleFilterChange}
            onCategoryToggle={handleCategoryToggle}
          />
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="max-h-96 overflow-y-auto custom-scrollbar">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-cliff-light-gray/40 mx-auto mb-4" />
              <p className="text-cliff-light-gray">Gösterilecek uyarı yok</p>
              <p className="text-sm text-cliff-light-gray/70 mt-1">
                {filter !== 'all' ? `Filtreyi değiştirmeyi deneyin` : 'Yeni tehditler izleniyor...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onMarkAsRead={markAsRead}
                  onAcknowledge={acknowledgeAlert}
                  onDelete={deleteAlert}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}

      {/* Connection status indicator */}
      {!isConnected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        </div>
      )}
    </Card>
  )
}

export default RealTimeAlerts
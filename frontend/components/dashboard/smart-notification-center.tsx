"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell, BellOff, Volume2, VolumeX, Settings, Filter,
  AlertTriangle, Info, CheckCircle, XCircle, Clock,
  TrendingUp, Shield, Zap, Globe, X, ChevronRight,
  AlertCircle, ArrowUp, ArrowDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export interface NotificationItem {
  id: string
  type: "threat" | "system" | "analysis" | "alert"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionable: boolean
  source?: string
  metadata?: {
    threat_score?: number
    model_count?: number
    session_id?: string
    location?: { lat: number; lon: number }
  }
}

interface NotificationPreferences {
  enableSound: boolean
  enableDesktop: boolean
  enableVibration: boolean
  autoMarkAsRead: boolean
  groupBySeverity: boolean
  showOnlyUnread: boolean
  severityFilter: {
    critical: boolean
    high: boolean
    medium: boolean
    low: boolean
  }
}

interface SmartNotificationCenterProps {
  className?: string
  position?: "sidebar" | "modal" | "dropdown"
  maxNotifications?: number
}

const SmartNotificationCenter: React.FC<SmartNotificationCenterProps> = ({
  className,
  position = "dropdown",
  maxNotifications = 50
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enableSound: true,
    enableDesktop: true,
    enableVibration: true,
    autoMarkAsRead: false,
    groupBySeverity: true,
    showOnlyUnread: false,
    severityFilter: {
      critical: true,
      high: true,
      medium: true,
      low: true
    }
  })
  const [activeTab, setActiveTab] = useState<"all" | "threats" | "system">("all")
  const [isLoading, setIsLoading] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // 🔔 Bildirim sesi çal
  const playNotificationSound = (severity: string) => {
    if (!preferences.enableSound) return

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const context = audioContextRef.current
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(context.destination)

      // Severity'ye göre ses tonu
      const frequencies: Record<string, number[]> = {
        CRITICAL: [880, 440, 880], // Yüksek alarm
        HIGH: [660, 440],
        MEDIUM: [440, 330],
        LOW: [330]
      }

      const tones = frequencies[severity] || [440]
      let delay = 0

      tones.forEach(freq => {
        oscillator.frequency.setValueAtTime(freq, context.currentTime + delay)
        delay += 0.15
      })

      gainNode.gain.setValueAtTime(0.3, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5)

      oscillator.start()
      oscillator.stop(context.currentTime + 0.5)
    } catch (error) {
      console.warn("Bildirim sesi çalınamadı:", error)
    }
  }

  // 📱 Titreşim efekti
  const triggerVibration = (pattern: number[]) => {
    if (!preferences.enableVibration) return
    
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern)
    }
  }

  // 🖥️ Desktop bildirimi göster
  const showDesktopNotification = async (notification: NotificationItem) => {
    if (!preferences.enableDesktop) return

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        const desktopNotif = new Notification(`CLIFF - ${notification.severity}`, {
          body: notification.message,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: notification.id,
          requireInteraction: notification.severity === "CRITICAL",
          silent: !preferences.enableSound
        })

        desktopNotif.onclick = () => {
          window.focus()
          setIsOpen(true)
          markAsRead(notification.id)
        }
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          showDesktopNotification(notification)
        }
      }
    }
  }

  // 📥 Bildirim geçmişini yükle
  const loadNotificationHistory = async () => {
    setIsLoading(true)
    try {
      // CLIFF 3.0 servisi kaldırıldı - mock data kullanıyoruz
      const history = { notifications: [], count: 0, limit: maxNotifications }
      
      const formattedNotifications: NotificationItem[] = history.notifications.map((notif: any, index: number) => ({
        id: `notif_${Date.now()}_${index}`,
        type: "threat" as const,
        severity: (notif.threat_level || "MEDIUM") as any,
        title: `Tehdit Analizi - ${notif.threat_level}`,
        message: notif.message,
        timestamp: new Date(notif.timestamp),
        read: false,
        actionable: true,
        source: "CLIFF AI System",
        metadata: {
          session_id: notif.session_id
        }
      }))

      setNotifications(formattedNotifications)
      updateUnreadCount(formattedNotifications)
    } catch (error) {
      console.error("Bildirim geçmişi yüklenemedi:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Okundu işaretle
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ))
    updateUnreadCount()
  }

  // 🗑️ Bildirimi sil
  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
    updateUnreadCount()
  }

  // 🔢 Okunmamış sayısını güncelle
  const updateUnreadCount = (notifs?: NotificationItem[]) => {
    const list = notifs || notifications
    const count = list.filter(n => !n.read).length
    setUnreadCount(count)
  }

  // 🌐 WebSocket bağlantısı
  useEffect(() => {
    loadNotificationHistory()

    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NODE_ENV === "production"
          ? `wss://${window.location.host}/ws/notifications`
          : "ws://localhost:8000/ws/notifications"

        wsRef.current = new WebSocket(wsUrl)

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            const newNotification: NotificationItem = {
              id: `notif_${Date.now()}`,
              type: data.type || "alert",
              severity: data.severity || "MEDIUM",
              title: data.title || "Yeni Bildirim",
              message: data.message || "",
              timestamp: new Date(),
              read: false,
              actionable: data.actionable ?? true,
              source: data.source || "CLIFF System",
              metadata: data.metadata
            }

            // Yeni bildirimi ekle
            setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications))
            setUnreadCount(prev => prev + 1)

            // Bildirim efektleri
            playNotificationSound(newNotification.severity)
            showDesktopNotification(newNotification)
            
            if (newNotification.severity === "CRITICAL") {
              triggerVibration([200, 100, 200, 100, 200])
            } else {
              triggerVibration([100])
            }

          } catch (error) {
            console.error("WebSocket mesaj hatası:", error)
          }
        }

        wsRef.current.onerror = (error) => {
          console.error("WebSocket hatası:", error)
        }

        wsRef.current.onclose = () => {
          setTimeout(connectWebSocket, 5000)
        }
      } catch (error) {
        console.error("WebSocket bağlantı hatası:", error)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // 🎨 Severity renkleri
  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: "text-red-400 bg-red-950/50 border-red-500/30",
      HIGH: "text-orange-400 bg-orange-950/50 border-orange-500/30",
      MEDIUM: "text-yellow-400 bg-yellow-950/50 border-yellow-500/30",
      LOW: "text-green-400 bg-green-950/50 border-green-500/30"
    }
    return colors[severity as keyof typeof colors] || colors.MEDIUM
  }

  // 🎨 Type ikonları
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "threat": return <AlertTriangle className="w-4 h-4" />
      case "system": return <Settings className="w-4 h-4" />
      case "analysis": return <TrendingUp className="w-4 h-4" />
      case "alert": return <AlertCircle className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  // 📋 Filtrelenmiş bildirimler
  const filteredNotifications = notifications.filter(notif => {
    // Tab filtresi
    if (activeTab === "threats" && notif.type !== "threat") return false
    if (activeTab === "system" && notif.type !== "system") return false

    // Okunmamış filtresi
    if (preferences.showOnlyUnread && notif.read) return false

    // Severity filtresi
    const severityKey = notif.severity.toLowerCase() as keyof typeof preferences.severityFilter
    if (!preferences.severityFilter[severityKey]) return false

    return true
  })

  // 📊 Severity'ye göre grupla
  const groupedNotifications = preferences.groupBySeverity
    ? {
        CRITICAL: filteredNotifications.filter(n => n.severity === "CRITICAL"),
        HIGH: filteredNotifications.filter(n => n.severity === "HIGH"),
        MEDIUM: filteredNotifications.filter(n => n.severity === "MEDIUM"),
        LOW: filteredNotifications.filter(n => n.severity === "LOW")
      }
    : null

  return (
    <>
      {/* Trigger Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative hover:bg-cliff-light-gray/10 transition-all",
            isOpen && "bg-cliff-light-gray/10"
          )}
        >
          {unreadCount > 0 ? (
            <Bell className="w-5 h-5 text-cliff-white animate-pulse" />
          ) : (
            <BellOff className="w-5 h-5 text-cliff-light-gray" />
          )}
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Notification Center Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              transition={{ type: "spring", damping: 20 }}
              className={cn(
                "fixed right-0 top-0 h-full w-96 bg-pure-black border-l border-cliff-light-gray/20 shadow-2xl z-50",
                className
              )}
            >
              {/* Header */}
              <div className="border-b border-cliff-light-gray/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-lg font-bold text-cliff-white">Bildirim Merkezi</h2>
                    <p className="text-xs text-cliff-light-gray">
                      {unreadCount} okunmamış bildirim
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="hover:bg-cliff-light-gray/10"
                  >
                    <X className="w-5 h-5 text-cliff-light-gray" />
                  </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2">
                  {["all", "threats", "system"].map((tab) => (
                    <Button
                      key={tab}
                      size="sm"
                      variant={activeTab === tab ? "default" : "ghost"}
                      onClick={() => setActiveTab(tab as any)}
                      className="text-xs capitalize flex-1"
                    >
                      {tab === "all" && "Tümü"}
                      {tab === "threats" && (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          Tehditler
                        </>
                      )}
                      {tab === "system" && (
                        <>
                          <Settings className="w-3 h-3 mr-1" />
                          Sistem
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Settings Bar */}
              <div className="border-b border-cliff-light-gray/20 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cliff-light-gray">Ses Bildirimleri</span>
                  <Switch
                    checked={preferences.enableSound}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, enableSound: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cliff-light-gray">Masaüstü Bildirimleri</span>
                  <Switch
                    checked={preferences.enableDesktop}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, enableDesktop: checked }))
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cliff-light-gray">Sadece Okunmamış</span>
                  <Switch
                    checked={preferences.showOnlyUnread}
                    onCheckedChange={(checked) => 
                      setPreferences(prev => ({ ...prev, showOnlyUnread: checked }))
                    }
                  />
                </div>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "calc(100vh - 250px)" }}>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-cliff-white/20 border-t-cliff-white mx-auto mb-4" />
                    <p className="text-cliff-light-gray text-sm">Yükleniyor...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <BellOff className="w-12 h-12 text-cliff-light-gray/30 mx-auto mb-4" />
                    <p className="text-cliff-light-gray text-sm">Bildirim bulunmuyor</p>
                  </div>
                ) : (
                  <>
                    {preferences.groupBySeverity && groupedNotifications ? (
                      Object.entries(groupedNotifications).map(([severity, notifs]) => {
                        if (notifs.length === 0) return null
                        
                        return (
                          <div key={severity} className="space-y-2">
                            <div className="text-xs font-semibold text-cliff-light-gray uppercase">
                              {severity} ({notifs.length})
                            </div>
                            {notifs.map(notification => (
                              <NotificationCard
                                key={notification.id}
                                notification={notification}
                                onRead={markAsRead}
                                onDelete={deleteNotification}
                                getSeverityColor={getSeverityColor}
                                getTypeIcon={getTypeIcon}
                              />
                            ))}
                          </div>
                        )
                      })
                    ) : (
                      filteredNotifications.map(notification => (
                        <NotificationCard
                          key={notification.id}
                          notification={notification}
                          onRead={markAsRead}
                          onDelete={deleteNotification}
                          getSeverityColor={getSeverityColor}
                          getTypeIcon={getTypeIcon}
                        />
                      ))
                    )}
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-cliff-light-gray/20 p-3 flex justify-between">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                    setUnreadCount(0)
                  }}
                  className="text-xs"
                >
                  Tümünü Okundu İşaretle
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNotifications([])
                    setUnreadCount(0)
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Tümünü Temizle
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// Notification Card Component
const NotificationCard: React.FC<{
  notification: NotificationItem
  onRead: (id: string) => void
  onDelete: (id: string) => void
  getSeverityColor: (severity: string) => string
  getTypeIcon: (type: string) => React.ReactNode
}> = ({ notification, onRead, onDelete, getSeverityColor, getTypeIcon }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all",
        getSeverityColor(notification.severity),
        !notification.read && "ring-1 ring-cliff-white/20"
      )}
      onClick={() => !notification.read && onRead(notification.id)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          {getTypeIcon(notification.type)}
          <div className="flex-1">
            <div className="font-medium text-sm text-cliff-white">
              {notification.title}
            </div>
            <Badge className={cn("text-xs mt-1", getSeverityColor(notification.severity))}>
              {notification.severity}
            </Badge>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(notification.id)
          }}
          className="h-6 w-6 hover:bg-red-500/20"
        >
          <X className="w-3 h-3 text-cliff-light-gray" />
        </Button>
      </div>
      
      <p className="text-xs text-cliff-light-gray mb-2 line-clamp-2">
        {notification.message}
      </p>
      
      <div className="flex items-center justify-between text-xs">
        <span className="text-cliff-light-gray/70">
          {notification.source}
        </span>
        <span className="text-cliff-light-gray/70 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {new Date(notification.timestamp).toLocaleTimeString("tr-TR")}
        </span>
      </div>
      
      {notification.actionable && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full mt-2 text-xs justify-between"
        >
          Detayları Görüntüle
          <ChevronRight className="w-3 h-3" />
        </Button>
      )}
    </motion.div>
  )
}

export default SmartNotificationCenter
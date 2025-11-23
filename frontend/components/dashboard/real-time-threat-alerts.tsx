'use client'
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Volume2, VolumeX, Clock, Target, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
interface ThreatAlert {
  id: string
  title: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: string
  source: string
  risk_score: number
  auto_dismiss?: boolean
  dismiss_after?: number 
}
interface RealTimeThreatAlertsProps {
  maxAlerts?: number
  enableSound?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  autoConnect?: boolean
}
export const RealTimeThreatAlerts: React.FC<RealTimeThreatAlertsProps> = ({
  maxAlerts = 5,
  enableSound = true,
  position = 'top-right',
  autoConnect = true
}) => {
  const [alerts, setAlerts] = useState<ThreatAlert[]>([])
  const [isSoundEnabled, setIsSoundEnabled] = useState(enableSound)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const alertCountRef = useRef(0)
  const playAlertSound = (severity: string) => {
    if (!isSoundEnabled) return
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const context = audioContextRef.current
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      const frequencies = {
        'CRITICAL': [800, 600, 800, 600], 
        'HIGH': [600, 400],               
        'MEDIUM': [400],                  
        'LOW': [300]                      
      }
      const freq = frequencies[severity as keyof typeof frequencies] || [400]
      let index = 0
      const playTone = () => {
        if (index < freq.length) {
          oscillator.frequency.setValueAtTime(freq[index], context.currentTime)
          gainNode.gain.setValueAtTime(0.1, context.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2)
          setTimeout(() => {
            index++
            if (index < freq.length) {
              setTimeout(playTone, 100)
            }
          }, 200)
        }
      }
      oscillator.start()
      playTone()
      oscillator.stop(context.currentTime + freq.length * 0.3)
    } catch (error) {
      console.warn('Ses çalınamadı:', error)
    }
  }
  useEffect(() => {
    if (!autoConnect) return
    const connectWebSocket = () => {
      try {
        setConnectionStatus('connecting')
        const wsUrl = process.env.NODE_ENV === 'production'
          ? `wss://your-domain.com/ws/threats`
          : 'ws://localhost:8000/ws/threats'
        wsRef.current = new WebSocket(wsUrl)
        wsRef.current.onopen = () => {
          console.log('🔥 Real-time threat alerts WebSocket bağlandı')
          setIsConnected(true)
          setConnectionStatus('connected')
        }
        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.type === 'threat_alert') {
              const severity = data.severity || 'MEDIUM'
              if (severity !== 'CRITICAL') {
                console.log('🔕 Non-critical threat ignored:', data.severity)
                return
              }
              const newAlert: ThreatAlert = {
                id: `alert_${Date.now()}_${++alertCountRef.current}`,
                title: data.title || 'KRİTİK TEHDİT!',
                severity: 'CRITICAL',
                message: data.message || 'Kritik tehdit tespit edildi!',
                timestamp: new Date().toLocaleString('tr-TR'),
                source: data.source || 'CLIFF AI',
                risk_score: data.risk_score || 100,
                auto_dismiss: false, 
                dismiss_after: undefined
              }
              setAlerts(prevAlerts => {
                const updatedAlerts = [newAlert, ...prevAlerts].slice(0, maxAlerts)
                return updatedAlerts
              })
              playAlertSound('CRITICAL')
              console.log('🚨 KRİTİK TEHDIT UYARISI:', newAlert)
            }
          } catch (err) {
            console.error('WebSocket mesajı parse hatası:', err)
          }
        }
        wsRef.current.onerror = (error) => {
          console.error('WebSocket hatası:', error)
          setIsConnected(false)
          setConnectionStatus('disconnected')
        }
        wsRef.current.onclose = () => {
          console.log('WebSocket bağlantısı kapandı')
          setIsConnected(false)
          setConnectionStatus('disconnected')
          setTimeout(connectWebSocket, 5000)
        }
      } catch (error) {
        console.error('WebSocket bağlantı hatası:', error)
        setConnectionStatus('disconnected')
        setTimeout(connectWebSocket, 5000)
      }
    }
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [autoConnect, maxAlerts])
  const dismissAlert = (alertId: string) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId))
  }
  useEffect(() => {
    alerts.forEach(alert => {
      if (alert.auto_dismiss && alert.dismiss_after) {
        setTimeout(() => {
          dismissAlert(alert.id)
        }, alert.dismiss_after * 1000)
      }
    })
  }, [alerts])
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left': return 'top-4 left-4'
      case 'bottom-right': return 'bottom-4 right-4'
      case 'bottom-left': return 'bottom-4 left-4'
      case 'top-right': 
      default: return 'top-4 right-4'
    }
  }
  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-red-500 bg-red-950/80 text-red-100'
      case 'HIGH': return 'border-orange-500 bg-orange-950/80 text-orange-100'  
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-950/80 text-yellow-100'
      case 'LOW': return 'border-green-500 bg-green-950/80 text-green-100'
      default: return 'border-gray-500 bg-gray-950/80 text-gray-100'
    }
  }
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'HIGH': return <Zap className="w-5 h-5 text-orange-400" />
      case 'MEDIUM': return <Target className="w-5 h-5 text-yellow-400" />
      case 'LOW': return <Clock className="w-5 h-5 text-green-400" />
      default: return <AlertTriangle className="w-5 h-5 text-gray-400" />
    }
  }
  return (
    <div className={`fixed ${getPositionClasses()} z-50 max-w-sm w-full pointer-events-none`}>
      {}
      <div className="pointer-events-auto mb-2">
        <motion.div 
          initial={{ opacity: 0, x: position.includes('right') ? 100 : -100 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-black/90 backdrop-blur-sm border border-gray-600/50 rounded-lg p-2 flex items-center justify-between text-xs"
        >
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-gray-300">
              {connectionStatus === 'connected' ? 'Tehdit İzleme Aktif' :
               connectionStatus === 'connecting' ? 'Bağlanıyor...' : 'Bağlantı Kesildi'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            {isSoundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </Button>
        </motion.div>
      </div>
      {}
      <div className="space-y-2">
        <AnimatePresence>
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ 
                opacity: 0, 
                x: position.includes('right') ? 100 : -100,
                scale: 0.9 
              }}
              animate={{ 
                opacity: 1, 
                x: 0,
                scale: 1 
              }}
              exit={{ 
                opacity: 0, 
                x: position.includes('right') ? 100 : -100,
                scale: 0.9 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 500, 
                damping: 30,
                delay: index * 0.1 
              }}
              className={`pointer-events-auto border-2 rounded-lg p-4 backdrop-blur-sm ${getSeverityColors(alert.severity)}`}
            >
              {}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getSeverityIcon(alert.severity)}
                  <Badge variant="outline" className="text-xs border-current">
                    {alert.severity}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="h-5 w-5 p-0 text-current hover:bg-white/10"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm leading-tight">
                  {alert.title}
                </h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  {alert.message}
                </p>
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span>{alert.source}</span>
                  <span>{alert.timestamp}</span>
                </div>
                {alert.risk_score > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Risk Skoru</span>
                      <span className="font-mono">{Math.round(alert.risk_score * 100)}%</span>
                    </div>
                    <div className="w-full bg-black/30 rounded-full h-1">
                      <div 
                        className="bg-current rounded-full h-1 transition-all duration-1000"
                        style={{ width: `${alert.risk_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              {}
              {alert.auto_dismiss && (
                <div className="mt-3 flex items-center text-xs opacity-60">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>{alert.dismiss_after}s sonra otomatik kapanır</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {}
      {alerts.length >= maxAlerts && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-auto mt-2 bg-black/70 border border-gray-600/50 rounded p-2 text-center text-xs text-gray-400"
        >
          Maksimum {maxAlerts} alert gösteriliyor
        </motion.div>
      )}
    </div>
  )
}
export default RealTimeThreatAlerts
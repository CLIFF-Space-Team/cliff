'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
interface WebSocketMessage {
  type: string
  timestamp: string
  data: any
  client_id?: string
  broadcast?: boolean
}
interface ThreatAlert {
  alert_id: string
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  threat_type: string
  location?: { lat: number; lng: number }
  expires_at?: string
  actions: string[]
}
interface DataUpdate {
  update_id: string
  data_type: string
  source: string
  changes: Record<string, any>
  affects_threat_level: boolean
}
interface SystemStatus {
  api_status: string
  ai_services: string
  data_sources: number
  last_update: string
  space_weather?: string
}
interface UseWebSocketOptions {
  url?: string
  autoConnect?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
}
interface UseWebSocketReturn {
  isConnected: boolean
  isConnecting: boolean
  connectionStatus: string | null
  lastConnected: Date | null
  threatAlerts: ThreatAlert[]
  dataUpdates: DataUpdate[]
  systemStatus: SystemStatus | null
  lastMessage: WebSocketMessage | null
  connect: () => void
  disconnect: () => void
  sendMessage: (message: any) => void
  subscribe: (eventType: string) => void
  unsubscribe: (eventType: string) => void
  messagesReceived: number
  messagesSent: number
  reconnectCount: number
}
export function useWebSocket({
  url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
  autoConnect = false, 
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  heartbeatInterval = 30000,
}: UseWebSocketOptions = {}): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [lastConnected, setLastConnected] = useState<Date | null>(null)
  const [threatAlerts, setThreatAlerts] = useState<ThreatAlert[]>([])
  const [dataUpdates, setDataUpdates] = useState<DataUpdate[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [messagesReceived, setMessagesReceived] = useState(0)
  const [messagesSent, setMessagesSent] = useState(0)
  const [reconnectCount, setReconnectCount] = useState(0)
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null)
  const currentReconnectAttempt = useRef(0)
  const subscriptions = useRef<Set<string>>(new Set())
  const isConnectedRef = useRef(false)
  const isMountedRef = useRef(true)
  const connectionIdRef = useRef<string>(`conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const activeHeartbeatId = useRef<string | null>(null)
  const clearTimers = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
    activeHeartbeatId.current = null
  }, [])
  const startHeartbeat = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
    const heartbeatId = `heartbeat-${Date.now()}`
    activeHeartbeatId.current = heartbeatId
    heartbeatTimer.current = setInterval(() => {
      if (activeHeartbeatId.current !== heartbeatId) {
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current)
          heartbeatTimer.current = null
        }
        return
      }
      if (ws.current?.readyState === WebSocket.OPEN && isMountedRef.current) {
        try {
          ws.current.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString(),
            connection_id: connectionIdRef.current
          }))
        } catch (error) {
        }
      }
    }, heartbeatInterval)
  }, [heartbeatInterval])
  const handleMessage = useCallback((event: MessageEvent) => {
    if (!isMountedRef.current) return
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      setLastMessage(message)
      setMessagesReceived(prev => prev + 1)
      switch (message.type) {
        case 'connection_established':
          setConnectionStatus('Connected')
          setLastConnected(new Date())
          toast.success('Connected to CLIFF monitoring system')
          const defaultSubscriptions = [
            'threat_alerts',
            'data_updates', 
            'system_status'
          ]
          defaultSubscriptions.forEach(sub => {
            subscriptions.current.add(sub)
            if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({
                type: 'subscribe',
                subscription_type: sub,
              }))
            }
          })
          break
        case 'threat_alert':
          const alert = message.data as ThreatAlert
          setThreatAlerts(prev => {
            const newAlerts = [alert, ...prev.slice(0, 49)] 
            if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
              toast.error(`🚨 ${alert.severity} THREAT: ${alert.title}`, {
                description: alert.description,
                duration: 10000,
              })
            }
            return newAlerts
          })
          break
        case 'data_update':
          const update = message.data as DataUpdate
          setDataUpdates(prev => [update, ...prev.slice(0, 99)]) 
          if (update.affects_threat_level) {
            toast.info(`📊 Data Update: ${update.data_type}`, {
              description: `Updated from ${update.source}`,
            })
          }
          break
        case 'system_status':
          setSystemStatus(message.data as SystemStatus)
          break
        case 'voice_response':
          window.dispatchEvent(new CustomEvent('cliff:voice-response', {
            detail: message.data
          }))
          break
        case 'error':
          console.error('WebSocket error:', message.data)
          toast.error(`Connection Error: ${message.data.error}`)
          break
        case 'pong':
          break
        case 'ping':
          if (ws.current?.readyState === WebSocket.OPEN && isMountedRef.current) {
            ws.current.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
              connection_id: connectionIdRef.current
            }))
            setMessagesSent(prev => prev + 1)
          }
          break
        case 'subscription_confirmed':
          console.log('Subscribed to:', message.data.subscription_type)
          break
        default:
          console.log('Unknown message type:', message.type, message.data)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }, [])
  const connect = useCallback(() => {
    if (!isMountedRef.current) {
      console.log(`🔌 [${connectionIdRef.current}] Component unmounted, skipping connect`)
      return
    }
    if (ws.current?.readyState === WebSocket.OPEN || isConnecting || isConnectedRef.current) {
      return
    }
    setIsConnecting(true)
    setConnectionStatus('Connecting...')
    clearTimers()
    try {
      ws.current = new WebSocket(url)
      ws.current.onopen = () => {
        if (!isMountedRef.current) return
        setIsConnected(true)
        setIsConnecting(false)
        isConnectedRef.current = true
        setConnectionStatus('Connected')
        currentReconnectAttempt.current = 0
        startHeartbeat()
      }
      ws.current.onmessage = handleMessage
      ws.current.onclose = (event) => {
        if (!isMountedRef.current) return
        setIsConnected(false)
        setIsConnecting(false)
        isConnectedRef.current = false
        clearTimers()
        if (event.wasClean) {
          setConnectionStatus('Disconnected')
        } else {
          setConnectionStatus('Connection lost')
          if (isMountedRef.current && currentReconnectAttempt.current < reconnectAttempts) {
            const attemptNumber = currentReconnectAttempt.current + 1
            setConnectionStatus(`Reconnecting... (${attemptNumber}/${reconnectAttempts})`)
            reconnectTimer.current = setTimeout(() => {
              if (isMountedRef.current) {
                currentReconnectAttempt.current = attemptNumber
                setReconnectCount(prev => prev + 1)
                connect()
              }
            }, reconnectInterval)
          } else {
            setConnectionStatus('Connection failed')
            if (isMountedRef.current) {
              toast.error('Failed to connect to CLIFF monitoring system')
            }
          }
        }
      }
      ws.current.onerror = (error) => {
        if (!isMountedRef.current) return
        setConnectionStatus('Connection error')
        setIsConnecting(false)
        isConnectedRef.current = false
      }
    } catch (error) {
      console.error(`🔌 [${connectionIdRef.current}] Failed to create WebSocket connection:`, error)
      setIsConnecting(false)
      setConnectionStatus('Connection failed')
    }
  }, [url, reconnectAttempts, reconnectInterval, handleMessage, clearTimers, startHeartbeat])
  const disconnect = useCallback(() => {
    console.log(`🔌 [${connectionIdRef.current}] Disconnecting...`)
    clearTimers()
    currentReconnectAttempt.current = reconnectAttempts 
    if (ws.current) {
      isConnectedRef.current = false
      ws.current.close(1000, 'User disconnect')
      ws.current = null
    }
    setIsConnected(false)
    setIsConnecting(false)
    setConnectionStatus('Disconnected')
  }, [reconnectAttempts, clearTimers])
  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN && isMountedRef.current) {
      try {
        const messageString = JSON.stringify({
          ...message,
          timestamp: new Date().toISOString(),
          connection_id: connectionIdRef.current
        })
        ws.current.send(messageString)
        setMessagesSent(prev => prev + 1)
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        toast.error('Failed to send message')
      }
    } else {
      toast.warning('Not connected to monitoring system')
    }
  }, [])
  const subscribe = useCallback((eventType: string) => {
    subscriptions.current.add(eventType)
    sendMessage({
      type: 'subscribe',
      subscription_type: eventType,
    })
  }, [sendMessage])
  const unsubscribe = useCallback((eventType: string) => {
    subscriptions.current.delete(eventType)
    sendMessage({
      type: 'unsubscribe',
      subscription_type: eventType,
    })
  }, [sendMessage])
  useEffect(() => {
    isMountedRef.current = true
    if (autoConnect && !isConnected && !isConnecting && !isConnectedRef.current) {
      const connectDelay = process.env.NODE_ENV === 'development' ? 100 : 0
      const connectTimer = setTimeout(() => {
        if (isMountedRef.current && !isConnectedRef.current) {
          connect()
        }
      }, connectDelay)
      return () => {
        clearTimeout(connectTimer)
      }
    }
  }, [autoConnect, connect]) 
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      clearTimers()
      if (ws.current) {
        isConnectedRef.current = false
        ws.current.close(1000, 'Component unmounted')
        ws.current = null
      }
    }
  }, [clearTimers])
  useEffect(() => {
    if (!autoConnect) return
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && 
          !isConnected && 
          !isConnecting && 
          !isConnectedRef.current &&
          isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current && !isConnectedRef.current) {
            connect()
          }
        }, 500)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isConnected, isConnecting, autoConnect, connect])
  useEffect(() => {
    if (!autoConnect) return
    const handleOnline = () => {
      if (!isConnected && 
          !isConnecting && 
          !isConnectedRef.current &&
          isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current && !isConnectedRef.current) {
            connect()
          }
        }, 1000)
      }
    }
    const handleOffline = () => {
      setConnectionStatus('No internet connection')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoConnect, isConnected, isConnecting, connect])
  const returnValue = useMemo((): UseWebSocketReturn => ({
    isConnected,
    isConnecting,
    connectionStatus,
    lastConnected,
    threatAlerts,
    dataUpdates,
    systemStatus,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    messagesReceived,
    messagesSent,
    reconnectCount,
  }), [
    isConnected,
    isConnecting,
    connectionStatus,
    lastConnected,
    threatAlerts,
    dataUpdates,
    systemStatus,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribe,
    unsubscribe,
    messagesReceived,
    messagesSent,
    reconnectCount,
  ])
  return returnValue
}
export default useWebSocket

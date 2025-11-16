'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useWebSocket } from '@/hooks/use-websocket'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
  source?: string
}

interface WebSocketProviderState {
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'
  lastMessage: WebSocketMessage | null
  sendMessage: (message: any) => void
  subscribe: (type: string, callback: (data: any) => void) => () => void
  reconnect: () => void
  disconnect: () => void
  messageHistory: WebSocketMessage[]
  connectionHealth: {
    uptime: number
    reconnectCount: number
    lastReconnect: Date | null
    averageLatency: number
    messageCount: number
  }
}

interface WebSocketProviderProps {
  children: React.ReactNode
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  enableHistory?: boolean
  maxHistorySize?: number
}

const initialState: WebSocketProviderState = {
  isConnected: false,
  connectionStatus: 'disconnected',
  lastMessage: null,
  sendMessage: () => {},
  subscribe: () => () => {},
  reconnect: () => {},
  disconnect: () => {},
  messageHistory: [],
  connectionHealth: {
    uptime: 0,
    reconnectCount: 0,
    lastReconnect: null,
    averageLatency: 0,
    messageCount: 0
  }
}

const WebSocketContext = createContext<WebSocketProviderState>(initialState)

export function WebSocketProvider({
  children,
  url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/cliff_frontend',
  reconnectInterval = 5000,
  maxReconnectAttempts = 10,
  heartbeatInterval = 30000,
  enableHistory = true,
  maxHistorySize = 100
}: WebSocketProviderProps) {
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([])
  const [subscribers, setSubscribers] = useState<Map<string, Set<(data: any) => void>>>(new Map())
  const [connectionHealth, setConnectionHealth] = useState(initialState.connectionHealth)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectTimeRef = useRef<Date | null>(null)
  const latencyMeasurements = useRef<number[]>([])
  const messageCountRef = useRef(0)

  const {
    isConnected,
    isConnecting,
    connectionStatus,
    lastConnected,
    threatAlerts,
    dataUpdates,
    systemStatus,
    connect,
    disconnect,
    sendMessage: wsSendMessage,
    subscribe: wsSubscribe,
    unsubscribe: wsUnsubscribe,
    messagesReceived,
    messagesSent,
    reconnectCount
  } = useWebSocket({
    url,
    autoConnect: false, // Disable auto connect to prevent connection errors
    reconnectAttempts: maxReconnectAttempts,
    reconnectInterval,
    heartbeatInterval
  })

  // Handle connection events
  useEffect(() => {
    if (isConnected && !connectTimeRef.current) {
      connectTimeRef.current = new Date()
      setConnectionHealth(prev => ({
        ...prev,
        uptime: 0
      }))
    }
  }, [isConnected])

  // Handle reconnection tracking
  useEffect(() => {
    if (reconnectCount > 0) {
      setConnectionHealth(prev => ({
        ...prev,
        reconnectCount,
        lastReconnect: new Date()
      }))
    }
  }, [reconnectCount])

  // Process incoming messages and alerts
  useEffect(() => {
    if (threatAlerts.length > 0) {
      const latestAlert = threatAlerts[0]
      const wsMessage: WebSocketMessage = {
        type: 'threat_alert',
        data: latestAlert,
        timestamp: new Date().toISOString(),
        source: 'websocket'
      }

      setLastMessage(wsMessage)
      messageCountRef.current += 1

      // Add to history if enabled
      if (enableHistory) {
        setMessageHistory(prev => {
          const updated = [wsMessage, ...prev]
          return updated.slice(0, maxHistorySize)
        })
      }

      // Notify subscribers
      const typeSubscribers = subscribers.get('threat_alert')
      if (typeSubscribers) {
        typeSubscribers.forEach(callback => {
          try {
            callback(latestAlert)
          } catch (error) {
            console.error('Error in WebSocket subscriber callback:', error)
          }
        })
      }

      // Update connection health
      setConnectionHealth(prev => ({
        ...prev,
        messageCount: messageCountRef.current
      }))
    }
  }, [threatAlerts, enableHistory, maxHistorySize, subscribers])

  // Process data updates
  useEffect(() => {
    if (dataUpdates.length > 0) {
      const latestUpdate = dataUpdates[0]
      const wsMessage: WebSocketMessage = {
        type: 'data_update',
        data: latestUpdate,
        timestamp: new Date().toISOString(),
        source: 'websocket'
      }

      setLastMessage(wsMessage)

      // Notify subscribers
      const typeSubscribers = subscribers.get('data_update')
      if (typeSubscribers) {
        typeSubscribers.forEach(callback => {
          try {
            callback(latestUpdate)
          } catch (error) {
            console.error('Error in WebSocket subscriber callback:', error)
          }
        })
      }
    }
  }, [dataUpdates, subscribers])

  // Process system status
  useEffect(() => {
    if (systemStatus) {
      const wsMessage: WebSocketMessage = {
        type: 'system_status',
        data: systemStatus,
        timestamp: new Date().toISOString(),
        source: 'websocket'
      }

      setLastMessage(wsMessage)

      // Notify subscribers
      const typeSubscribers = subscribers.get('system_status')
      if (typeSubscribers) {
        typeSubscribers.forEach(callback => {
          try {
            callback(systemStatus)
          } catch (error) {
            console.error('Error in WebSocket subscriber callback:', error)
          }
        })
      }
    }
  }, [systemStatus, subscribers])

  // Update connection uptime
  useEffect(() => {
    if (!isConnected || !connectTimeRef.current) return

    const interval = setInterval(() => {
      const uptime = Date.now() - connectTimeRef.current!.getTime()
      setConnectionHealth(prev => ({
        ...prev,
        uptime: Math.floor(uptime / 1000)
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isConnected])

  const sendMessage = (message: any) => {
    const messageToSend = {
      ...message,
      timestamp: new Date().toISOString(),
      client_id: 'cliff_frontend'
    }

    // Fix: Remove JSON.stringify here - let useWebSocket handle serialization
    wsSendMessage(messageToSend)
  }

  const subscribe = (type: string, callback: (data: any) => void) => {
    setSubscribers(prev => {
      const newMap = new Map(prev)
      if (!newMap.has(type)) {
        newMap.set(type, new Set())
      }
      newMap.get(type)!.add(callback)
      return newMap
    })

    // Return unsubscribe function
    return () => {
      setSubscribers(prev => {
        const newMap = new Map(prev)
        const typeSubscribers = newMap.get(type)
        if (typeSubscribers) {
          typeSubscribers.delete(callback)
          if (typeSubscribers.size === 0) {
            newMap.delete(type)
          }
        }
        return newMap
      })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Map WebSocket connection status to provider status
  const getConnectionStatus = (): WebSocketProviderState['connectionStatus'] => {
    if (isConnecting) return 'connecting'
    if (isConnected) return 'connected'
    if (reconnectCount > 0 && !isConnected) return 'reconnecting'
    if (connectionStatus === null || connectionStatus === 'Connection failed') return 'error'
    return 'disconnected'
  }

  const value: WebSocketProviderState = {
    isConnected,
    connectionStatus: getConnectionStatus(),
    lastMessage,
    sendMessage,
    subscribe,
    reconnect: connect,
    disconnect,
    messageHistory,
    connectionHealth
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext)
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  return context
}

// Hook for subscribing to specific message types
export const useWebSocketSubscription = (
  type: string, 
  callback: (data: any) => void,
  dependencies: any[] = []
) => {
  const { subscribe } = useWebSocketContext()

  useEffect(() => {
    const unsubscribe = subscribe(type, callback)
    return unsubscribe
  }, [type, subscribe, ...dependencies])
}

// Hook for real-time alerts
export const useRealTimeAlerts = () => {
  const [alerts, setAlerts] = useState<any[]>([])
  const { subscribe, isConnected } = useWebSocketContext()

  useEffect(() => {
    const unsubscribeAlert = subscribe('alert', (data) => {
      setAlerts(prev => [data, ...prev.slice(0, 49)]) // Keep last 50 alerts
    })

    const unsubscribeThreat = subscribe('threat_update', (data) => {
      setAlerts(prev => [{
        ...data,
        type: 'threat',
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 49)])
    })

    const unsubscribeSystem = subscribe('system_status', (data) => {
      if (data.alert) {
        setAlerts(prev => [{
          ...data,
          type: 'system',
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 49)])
      }
    })

    return () => {
      unsubscribeAlert()
      unsubscribeThreat()
      unsubscribeSystem()
    }
  }, [subscribe])

  return {
    alerts,
    isConnected,
    clearAlerts: () => setAlerts([])
  }
}

// Hook for real-time threat data
export const useRealTimeThreatData = () => {
  const [threats, setThreats] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const { subscribe, isConnected } = useWebSocketContext()

  useEffect(() => {
    const unsubscribeThreats = subscribe('threat_data', (data) => {
      setThreats(data.threats || [])
      setLastUpdate(new Date())
    })

    const unsubscribeUpdates = subscribe('threat_update', (data) => {
      setThreats(prev => {
        // Update existing threat or add new one
        const existing = prev.findIndex(t => t.id === data.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = { ...updated[existing], ...data }
          return updated
        } else {
          return [data, ...prev]
        }
      })
      setLastUpdate(new Date())
    })

    return () => {
      unsubscribeThreats()
      unsubscribeUpdates()
    }
  }, [subscribe])

  return {
    threats,
    lastUpdate,
    isConnected
  }
}

// Connection status component
export function ConnectionStatus({ className = '' }: { className?: string }) {
  const { isConnected, connectionStatus, connectionHealth } = useWebSocketContext()

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400'
      case 'connecting': 
      case 'reconnecting': return 'text-yellow-400'
      case 'error': 
      case 'disconnected': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      case 'connecting':
      case 'reconnecting':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      case 'error':
      case 'disconnected':
        return <div className="w-2 h-2 bg-red-400 rounded-full" />
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-sm font-medium ${getStatusColor()}`}>
        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
      </span>
      {isConnected && (
        <span className="text-xs text-slate-400">
          {connectionHealth.messageCount} msgs • {connectionHealth.averageLatency.toFixed(0)}ms
        </span>
      )}
    </div>
  )
}

export default WebSocketProvider

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { 
  ChatMessage, 
  ChatState, 
  ChatActions, 
  ChatHookReturn, 
  ChatSettings, 
  ChatStatus, 
  ChatInputMode,
  ChatApiRequest,
  ChatApiResponse,
  ChatNotification,
  CHAT_CONSTANTS,
  ChatError,
  ApiError,
  VoiceInputData,
  VoiceOutputData
} from '@/types/chat'
import { useWebSocketContext } from '@/providers/websocket-provider'

interface UseChatOptions {
  apiEndpoint?: string
  enableVoice?: boolean
  enableWebSocket?: boolean
  enablePersistence?: boolean
  initialSettings?: Partial<ChatSettings>
  maxMessages?: number
  studentId?: string
  sessionId?: string
}

const DEFAULT_SETTINGS: ChatSettings = {
  voiceEnabled: false,
  autoListen: false,
  continuousListening: false,
  language: CHAT_CONSTANTS.DEFAULT_LANGUAGE,
  voice: CHAT_CONSTANTS.DEFAULT_VOICE,
  speed: CHAT_CONSTANTS.DEFAULT_SPEED,
  volume: CHAT_CONSTANTS.DEFAULT_VOLUME,
  showTypingIndicator: true,
  enableNotifications: true,
  maxHistorySize: CHAT_CONSTANTS.MAX_HISTORY_SIZE,
  theme: 'dark'
}

const DEFAULT_STATUS: ChatStatus = {
  isConnected: true,
  isListening: false,
  isProcessing: false,
  isTyping: false,
  currentMode: 'idle'
}

const DEFAULT_INPUT_MODE: ChatInputMode = {
  type: 'text',
  isActive: false
}

export function useChat(options: UseChatOptions = {}): ChatHookReturn {
  const {
    apiEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nasa.kynux.dev/api'}/v1/ai/chat`,
    enableVoice = false,
    enableWebSocket = true,
    enablePersistence = true,
    initialSettings = {},
    maxMessages = CHAT_CONSTANTS.MAX_HISTORY_SIZE,
    studentId = `student_${Date.now()}`,
    sessionId = `session_${Date.now()}`
  } = options

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [settings, setSettings] = useState<ChatSettings>({ ...DEFAULT_SETTINGS, ...initialSettings })
  const [status, setStatus] = useState<ChatStatus>(DEFAULT_STATUS)
  const [activeInputMode, setActiveInputMode] = useState<ChatInputMode>(DEFAULT_INPUT_MODE)
  const [notifications, setNotifications] = useState<ChatNotification[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastActivity, setLastActivity] = useState(new Date())

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isMountedRef = useRef(true)

  // Context hooks
  const { 
    isConnected: wsConnected, 
    sendMessage: wsSendMessage, 
    subscribe: wsSubscribe 
  } = useWebSocketContext()

  // Storage keys
  const STORAGE_KEYS = {
    MESSAGES: `cliff_chat_messages_${studentId}`,
    SETTINGS: `cliff_chat_settings_${studentId}`,
    SESSION: `cliff_chat_session_${sessionId}`
  }

  // Load persisted data
  useEffect(() => {
    if (!enablePersistence) return

    try {
      // Load messages
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages)
        setMessages(parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      }

      // Load settings
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      }
    } catch (error) {
      console.error('Failed to load chat data from localStorage:', error)
    }
  }, [enablePersistence, studentId, sessionId])

  // Save to localStorage
  const persistData = useCallback(() => {
    if (!enablePersistence) return

    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save chat data to localStorage:', error)
    }
  }, [messages, settings, enablePersistence])

  // Persist data when messages or settings change
  useEffect(() => {
    persistData()
  }, [persistData])

  // WebSocket subscription with cleanup
  useEffect(() => {
    if (!enableWebSocket || !isMountedRef.current) return

    const unsubscribe = wsSubscribe('chat_message', (data: any) => {
      if (!isMountedRef.current) return
      
      try {
        const newMessage: ChatMessage = {
          id: data.id || uuidv4(),
          content: data.content || data.message,
          sender: 'ai',
          timestamp: new Date(data.timestamp || Date.now()),
          type: data.type || 'text',
          status: 'delivered',
          metadata: data.metadata
        }
        
        setMessages(prev => [...prev, newMessage])
        setLastActivity(new Date())
        
        
        // Show notification
        if (isMountedRef.current) {
          addNotification({
            type: 'message',
            title: 'CLIFF AI',
            message: data.content?.substring(0, 50) + '...' || 'Yeni mesaj',
          })
        }
      } catch (error) {
        if (isMountedRef.current) {
          console.error('Error processing WebSocket message:', error)
        }
      }
    })

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [enableWebSocket, wsSubscribe, settings.voiceEnabled])

  // Voice response event listener cleanup
  useEffect(() => {
    const handleVoiceResponse = (event: CustomEvent) => {
      if (!isMountedRef.current) return
      
      const responseData = event.detail
    }

    window.addEventListener('cliff:voice-response', handleVoiceResponse as EventListener)

    return () => {
      window.removeEventListener('cliff:voice-response', handleVoiceResponse as EventListener)
    }
  }, [settings.voiceEnabled])

  // Page visibility change cleanup
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isMountedRef.current) return
      
      if (document.visibilityState === 'hidden') {
        // Stop any ongoing processes when page is hidden
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Update status based on loading and connection state
  useEffect(() => {
    if (!isMountedRef.current) return
    
    setStatus(prev => ({
      ...prev,
      isListening: false,
      isProcessing: isLoading,
      isConnected: wsConnected,
      currentMode: isLoading ? 'processing' : 'idle'
    }))
  }, [isLoading, wsConnected])

  // API call function
  const callChatAPI = async (message: string, messageType: 'text' | 'voice' = 'text'): Promise<ChatApiResponse> => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    const apiRequest = {
      messages: [
        ...messages.slice(-5).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.content
        })),
        {
          role: 'user',
          content: message
        }
      ],
      model: 'grok-4-fast-reasoning',
      temperature: 0.7,
      max_tokens: 2048,
      use_fallback: true
    }

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(apiRequest),
      signal: abortControllerRef.current.signal
    })

    if (!response.ok) {
      throw new ApiError(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Transform unified AI response to ChatApiResponse format
    return {
      success: data.success,
      response: data.content || data.message,
      timestamp: data.timestamp,
      executionTime: data.response_time_ms,
      dataSources: data.provider_used ? [data.provider_used] : undefined,
      message: data.error_message
    }
  }

  // Görüntü oluşturma intent'i algılama
  const detectImageIntent = async (message: string): Promise<any> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nasa.kynux.dev/api'}/v1/images/detect-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Görüntü intent algılama hatası:', error)
      return null
    }
  }

  // Görüntü oluşturma
  const generateImage = async (request: any): Promise<any> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nasa.kynux.dev/api'}/v1/images/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Görüntü oluşturma hatası:', error)
      return null
    }
  }

  // Send message function - görüntü desteği ile güncellenmiş
  const sendMessage = async (content: string, type: 'text' | 'voice' = 'text'): Promise<void> => {
    if (!content.trim()) return
    if (content.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH) {
      throw new ChatError(`Message too long. Maximum ${CHAT_CONSTANTS.MAX_MESSAGE_LENGTH} characters allowed.`)
    }

    const messageId = uuidv4()
    const userMessage: ChatMessage = {
      id: messageId,
      content: content.trim(),
      sender: 'user',
      timestamp: new Date(),
      type,
      status: 'sending'
    }

    // Add user message to state
    setMessages(prev => [...prev, userMessage])
    setLastActivity(new Date())
    setIsLoading(true)
    setError(null)

    try {
      // Update message status to sent
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'sent' as const }
          : msg
      ))

      // Görüntü intent kontrolü
      const intentDetection = await detectImageIntent(content)
      
      if (intentDetection?.has_intent && intentDetection.confidence > 0.6) {
        // Görüntü oluşturma mesajı ekle
        const imageProcessingMessage: ChatMessage = {
          id: `${Date.now()}-processing`,
          content: '🎨 Görselinizi oluşturuyorum...',
          sender: 'ai',
          timestamp: new Date(),
          type: 'text',
          status: 'delivered'
        }
        
        setMessages(prev => [...prev, imageProcessingMessage])

        // Görüntü oluştur
        const imageResponse = await generateImage({
          message: content,
          enhance_space_context: true,
          user_id: studentId
        })

        // Processing mesajını kaldır
        setMessages(prev => prev.filter(msg => msg.id !== imageProcessingMessage.id))

        if (imageResponse?.success) {
          // Başarılı görüntü mesajı
          const imageMessage: ChatMessage = {
            id: `${Date.now()}-image`,
            content: `İşte istediğiniz görsel: "${imageResponse.original_prompt}"`,
            sender: 'ai',
            timestamp: new Date(),
            type: 'text',
            status: 'delivered',
            metadata: {
              imageUrl: imageResponse.image_url,
              imagePrompt: imageResponse.original_prompt,
              imageModel: imageResponse.model_used,
              isImageMessage: true
            }
          }
          
          setMessages(prev => [...prev, imageMessage])
          setIsLoading(false)
          return // Görüntü oluşturuldu, normal chat akışına devam etme
        } else {
          // Görüntü oluşturma başarısız, normal chat'e devam et
          const errorMessage: ChatMessage = {
            id: `${Date.now()}-error`,
            content: 'Görsel oluşturulurken bir hata oluştu. Bunun yerine sorunuzu yanıtlayayım.',
            sender: 'ai',
            timestamp: new Date(),
            type: 'text',
            status: 'delivered'
          }
          
          setMessages(prev => [...prev, errorMessage])
        }
      }

      // Call API
      const apiResponse = await callChatAPI(content, type)
      
      if (apiResponse.success && apiResponse.response) {
        // Create AI response message
        const aiMessage: ChatMessage = {
          id: uuidv4(),
          content: apiResponse.response,
          sender: 'ai',
          timestamp: new Date(apiResponse.timestamp || Date.now()),
          type: 'text',
          status: 'delivered',
          metadata: {
            executionTime: apiResponse.executionTime,
            dataSources: apiResponse.dataSources,
            confidence: 1.0
          }
        }

        // Add AI response to messages
        setMessages(prev => [...prev, aiMessage])
        
        // Mark user message as read
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, status: 'read' as const }
            : msg
        ))

        // Send via WebSocket if enabled
        if (enableWebSocket && wsConnected) {
          wsSendMessage({
            type: 'chat_message',
            data: {
              message: content,
              response: apiResponse.response,
              studentId,
              sessionId
            }
          })
        }

        // Auto listen if enabled and this was a voice message
        if (settings.autoListen && type === 'voice') {
          // Voice listening would be handled by voice interface component
        }

      } else {
        throw new ApiError(apiResponse.message || 'Unknown API error')
      }

    } catch (error: any) {
      console.error('Chat API error:', error)
      
      // Update message status to error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, status: 'error' as const }
          : msg
      ))

      const errorMessage = error instanceof ChatError ? error.message : 'Mesaj gönderilirken hata oluştu'
      setError(errorMessage)
      
      addNotification({
        type: 'error',
        title: 'Hata',
        message: errorMessage
      })

    } finally {
      setIsLoading(false)
    }
  }

  // Voice integration functions
  const handleVoiceInput = useCallback(async (voiceData: VoiceInputData) => {
    if (voiceData.isFinal && voiceData.transcript.trim()) {
      await sendMessage(voiceData.transcript.trim(), 'voice')
    }
  }, [sendMessage])

  // Utility functions
  const addNotification = (notification: Omit<ChatNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: ChatNotification = {
      ...notification,
      id: uuidv4(),
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 10))
  }

  const clearMessages = useCallback(() => {
    setMessages([])
    setLastActivity(new Date())
  }, [])

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const toggleMinimized = useCallback(() => {
    setIsMinimized(prev => !prev)
  }, [])

  const updateSettings = useCallback((newSettings: Partial<ChatSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  const setActiveInputModeCallback = useCallback((mode: ChatInputMode) => {
    setActiveInputMode(mode)
  }, [])

  const markMessageAsRead = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, status: 'read' as const }
        : msg
    ))
  }, [])

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  const resendMessage = useCallback(async (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId)
    if (message && message.sender === 'user') {
      const messageType = message.type === 'voice' ? 'voice' : 'text'
      await sendMessage(message.content, messageType)
    }
  }, [messages, sendMessage])

  const exportHistory = useCallback(() => {
    const dataStr = JSON.stringify(messages, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `cliff_chat_history_${new Date().toISOString().split('T')[0]}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [messages])

  const importHistory = useCallback((history: ChatMessage[]) => {
    setMessages(history)
    setLastActivity(new Date())
  }, [])

  const clearHistory = useCallback(() => {
    setMessages([])
    if (enablePersistence) {
      localStorage.removeItem(STORAGE_KEYS.MESSAGES)
    }
  }, [enablePersistence])

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  const reconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= CHAT_CONSTANTS.MAX_RECONNECT_ATTEMPTS) {
      setError('Maximum reconnection attempts reached')
      return
    }

    reconnectAttemptsRef.current += 1
    setError(null)
    setIsLoading(true)

    reconnectTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
      reconnectAttemptsRef.current = 0
    }, CHAT_CONSTANTS.RECONNECT_DELAY)
  }, [])

  // Enhanced cleanup with mounted check
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      
      // Cleanup abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      // Cleanup timers
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }

      // Clear notifications
      setNotifications([])
    }
  }, [])

  // Trim messages if exceeding max
  useEffect(() => {
    if (messages.length > maxMessages) {
      setMessages(prev => prev.slice(-maxMessages))
    }
  }, [messages.length, maxMessages])

  const state: ChatState = {
    messages,
    status,
    settings,
    context: {
      currentTopic: 'space_science',
      learningLevel: 'intermediate',
      studentProfile: {
        id: studentId,
        preferences: settings
      },
      sessionHistory: {
        startTime: new Date(Date.now() - lastActivity.getTime()),
        messageCount: messages.length,
        topics: ['space_science'],
        avgResponseTime: 2000
      }
    },
    notifications,
    isExpanded,
    isMinimized,
    activeInputMode,
    typingUsers: [],
    lastActivity
  }

  const actions: ChatActions = {
    sendMessage,
    clearMessages,
    toggleExpanded,
    toggleMinimized,
    updateSettings,
    setActiveInputMode: setActiveInputModeCallback,
    markMessageAsRead,
    deleteMessage,
    resendMessage,
    exportHistory,
    importHistory,
    clearHistory,
    dismissNotification
  }

  return {
    state,
    isLoading,
    error,
    reconnect,
    ...actions
  }
}

export default useChat

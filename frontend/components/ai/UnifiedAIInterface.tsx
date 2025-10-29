'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User,
  Loader2,
  Settings,
  Zap,
  Wifi,
  WifiOff,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'
import { useWebSocketContext } from '@/providers/websocket-provider'

interface UnifiedAIInterfaceProps {
  className?: string
  maxHeight?: string
  apiEndpoint?: string
  showHeader?: boolean
  compact?: boolean
  onMessageSent?: (message: any) => void
  onMessageReceived?: (message: any) => void
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  type: 'text'
}

const UnifiedAIInterface: React.FC<UnifiedAIInterfaceProps> = ({
  className,
  maxHeight = '600px',
  apiEndpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://nasa.kynux.dev/api'}/v1/ai/chat`,
  showHeader = true,
  compact = false,
  onMessageSent,
  onMessageReceived
}) => {
  // UI State
  const [inputText, setInputText] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  
  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Create refs to hold the latest callbacks to prevent infinite loops
  const onMessageSentRef = useRef(onMessageSent);
  useEffect(() => {
    onMessageSentRef.current = onMessageSent;
  });

  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  });

  // Hooks
  const { isConnected: wsConnected } = useWebSocketContext()
  
  const {
    state: chatState,
    sendMessage: chatSendMessage,
    isLoading: chatLoading,
    error: chatError,
    clearMessages: chatClearMessages
  } = useChat({
    apiEndpoint,
    enableVoice: false,
    enableWebSocket: true
  })

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatState.messages])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputText])

  // Handle text message sending
  const handleTextSubmit = useCallback(async () => {
    if (!inputText.trim() || chatLoading) return

    const userMessage = {
      id: `text-message-${Date.now()}`,
      content: inputText.trim(),
      sender: 'user' as const,
      timestamp: new Date(),
      type: 'text' as const
    }

    onMessageSentRef.current?.(userMessage)

    try {
      await chatSendMessage(inputText.trim(), 'text')
      setInputText('')
    } catch (error) {
      console.error('Message send error:', error)
    }
  }, [inputText, chatLoading, chatSendMessage])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }, [handleTextSubmit])

  // Clear conversation
  const handleClearConversation = useCallback(() => {
    chatClearMessages()
  }, [chatClearMessages])

  // Connection status
  const getConnectionStatus = () => {
    if (!wsConnected) return { text: 'Bağlantı Yok', color: 'text-accent-danger', icon: WifiOff }
    if (chatLoading) return { text: 'İşleniyor', color: 'text-accent-info', icon: Zap }
    return { text: 'Bağlı', color: 'text-accent-success', icon: Wifi }
  }

  const connectionStatus = getConnectionStatus()

  // Message component
  const MessageBubble = ({ message }: { message: any }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 mb-4",
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.sender === 'ai' && (
        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
          <Bot className="h-4 w-4 text-purple-400" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[75%] rounded-2xl px-4 py-3 relative",
        message.sender === 'user'
          ? 'bg-gray-800 text-white ml-auto'
          : 'bg-black border border-gray-800 text-white'
      )}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
      
      {message.sender === 'user' && (
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="h-4 w-4 text-white" />
        </div>
      )}
    </motion.div>
  )

  return (
    <div className="mx-4 md:mx-8 lg:mx-16 xl:mx-24 2xl:mx-32 my-4">
      <div className={cn(
        "flex flex-col bg-black border-0 rounded-xl overflow-hidden shadow-2xl",
        className
      )} style={{ maxHeight }}>
      
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-black">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">CLIFF AI</h3>
                  <Badge variant="default" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    <Zap className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <connectionStatus.icon className={cn('h-4 w-4', connectionStatus.color)} />
                  <span className={connectionStatus.color}>{connectionStatus.text}</span>
                  {chatState.messages.length > 0 && (
                    <>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-400">{chatState.messages.length} mesaj</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={cn(
                  "text-gray-400 hover:text-white",
                  isSettingsOpen && "text-blue-400"
                )}
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-400 hover:text-white"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 border-b border-gray-800 bg-black space-y-4"
            >
              <div className="grid grid-cols-1 gap-4">
                {/* Interface Settings */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-400" />
                    Arayüz
                  </h4>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearConversation}
                      className="text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Temizle
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col flex-1 min-h-0"
          >
              {/* Messages Area */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black"
                style={{ maxHeight: compact ? '300px' : '400px' }}
              >
                {chatState.messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Henüz mesaj yok
                    </h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                      CLIFF AI ile sohbetinize başlayın. Uzay bilimleri hakkında sorular sorabilirsiniz.
                    </p>
                  </div>
                ) : (
                  <>
                    {chatState.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}

                {/* Typing indicator */}
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 mb-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-purple-400" />
                    </div>
                    <div className="bg-black border border-gray-800 rounded-2xl px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-800 bg-black">
                <div className="flex items-end gap-3">
                  {/* Text Input */}
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="CLIFF AI ile sohbet edin..."
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 min-h-[48px] max-h-32"
                      rows={1}
                    />
                  </div>

                  {/* Send Button */}
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleTextSubmit}
                    disabled={!inputText.trim() || chatLoading}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>

                {/* Error Display */}
                {chatError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 px-3 py-2 bg-red-900/20 border border-red-800/30 rounded-lg"
                  >
                    <p className="text-sm text-red-400">
                      {chatError}
                    </p>
                  </motion.div>
                )}
              </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

export default UnifiedAIInterface
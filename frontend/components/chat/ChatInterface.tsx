'use client'
import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Bot, 
  Settings, 
  Minimize2, 
  Maximize2, 
  X,
  Zap,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Moon,
  Sun,
  Languages,
  Mic,
  MicOff,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Download,
  Trash2
} from 'lucide-react'
import { ChatInterfaceProps } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'
import { useWebSocketContext } from '@/providers/websocket-provider'
import ChatHistory from './ChatHistory'
import ChatInput from './ChatInput'
const ChatInterface: React.FC<ChatInterfaceProps> = ({
  className,
  compact = false,
  showHeader = true,
  showSettings = true,
  showHistory = true,
  maxHeight = '600px',
  initialExpanded = false,
  onMessageSent,
  onMessageReceived,
  customApiEndpoint
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { isConnected: wsConnected } = useWebSocketContext()
  const {
    state,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    toggleExpanded,
    toggleMinimized,
    updateSettings,
    exportHistory,
    clearHistory,
    dismissNotification,
    reconnect
  } = useChat({
    apiEndpoint: customApiEndpoint,
    enableVoice: true,
    enableWebSocket: true,
    enablePersistence: true
  })
  const {
    messages,
    status,
    settings,
    notifications,
    isExpanded,
    isMinimized,
    activeInputMode,
    lastActivity
  } = state
  useEffect(() => {
    if (initialExpanded && !isExpanded) {
      toggleExpanded()
    }
  }, [initialExpanded])
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      if (latestMessage.sender === 'user') {
        onMessageSent?.(latestMessage)
      } else {
        onMessageReceived?.(latestMessage)
      }
    }
  }, [messages, onMessageSent, onMessageReceived])
  const containerVariants = {
    minimized: {
      height: 'auto',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    expanded: {
      height: 'auto',
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  }
  const contentVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2 }
    },
    visible: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.3, delay: 0.1 }
    }
  }
  const getConnectionStatus = () => {
    if (!wsConnected) return { text: 'Bağlantı Yok', color: 'text-red-400', icon: WifiOff }
    if (status.isProcessing) return { text: 'İşleniyor', color: 'text-blue-400', icon: Zap }
    if (status.isListening) return { text: 'Dinleniyor', color: 'text-red-400', icon: Mic }
    return { text: 'Bağlı', color: 'text-green-400', icon: Wifi }
  }
  const connectionStatus = getConnectionStatus()
  const SettingsPanel = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-gray-800 p-4 bg-gray-900/50 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Ses Ayarları
          </h4>
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Ses girdi</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className={cn(
                  'h-6 w-10 p-0 rounded-full',
                  settings.voiceEnabled ? 'bg-blue-600' : 'bg-gray-600'
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded-full bg-white transition-transform',
                  settings.voiceEnabled ? 'translate-x-2' : '-translate-x-2'
                )} />
              </Button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Otomatik dinle</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ autoListen: !settings.autoListen })}
                className={cn(
                  'h-6 w-10 p-0 rounded-full',
                  settings.autoListen ? 'bg-blue-600' : 'bg-gray-600'
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded-full bg-white transition-transform',
                  settings.autoListen ? 'translate-x-2' : '-translate-x-2'
                )} />
              </Button>
            </label>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">
                Hız: {settings.speed}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speed}
                onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">
                Ses Seviyesi: {Math.round(settings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Arayüz
          </h4>
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Yazma göstergesi</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ showTypingIndicator: !settings.showTypingIndicator })}
                className={cn(
                  'h-6 w-10 p-0 rounded-full',
                  settings.showTypingIndicator ? 'bg-blue-600' : 'bg-gray-600'
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded-full bg-white transition-transform',
                  settings.showTypingIndicator ? 'translate-x-2' : '-translate-x-2'
                )} />
              </Button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Bildirimler</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSettings({ enableNotifications: !settings.enableNotifications })}
                className={cn(
                  'h-6 w-10 p-0 rounded-full',
                  settings.enableNotifications ? 'bg-blue-600' : 'bg-gray-600'
                )}
              >
                <div className={cn(
                  'h-4 w-4 rounded-full bg-white transition-transform',
                  settings.enableNotifications ? 'translate-x-2' : '-translate-x-2'
                )} />
              </Button>
            </label>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">
                Geçmiş boyutu: {settings.maxHistorySize}
              </label>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={settings.maxHistorySize}
                onChange={(e) => updateSettings({ maxHistorySize: parseInt(e.target.value) })}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200"
            >
              <option value="tr-TR">Türkçe</option>
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex justify-between pt-4 border-t border-gray-800">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={exportHistory}
            className="text-gray-400 hover:text-gray-300"
          >
            <Download className="h-3 w-3 mr-1" />
            Dışa Aktar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-gray-400 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Temizle
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSettingsOpen(false)}
          className="text-gray-400"
        >
          Kapat
        </Button>
      </div>
    </motion.div>
  )
  if (isMinimized) {
    return (
      <motion.div
        variants={containerVariants}
        animate="minimized"
        className={cn(
          'fixed bottom-6 right-6 z-50',
          className
        )}
      >
        <Button
          onClick={toggleMinimized}
          className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
        {notifications.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-semibold"
          >
            {notifications.length}
          </motion.div>
        )}
      </motion.div>
    )
  }
  return (
    <div className="mx-4 md:mx-8 lg:mx-16 xl:mx-24 2xl:mx-32">
      <motion.div
        ref={chatContainerRef}
        variants={containerVariants}
        animate={isExpanded ? 'expanded' : 'minimized'}
        className={cn(
          'bg-black backdrop-blur-md border border-gray-800 shadow-2xl overflow-hidden',
          compact ? 'rounded-lg' : 'rounded-2xl',
          className
        )}
        style={{ maxHeight }}
      >
        {showHeader && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                {status.isListening && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-red-400/50"
                    animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-white">CLIFF AI</h3>
                  <Badge variant="ai" size="sm">
                    <Zap className="h-2 w-2 mr-1" />
                    AI
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <connectionStatus.icon className={cn('h-3 w-3', connectionStatus.color)} />
                  <span className={connectionStatus.color}>{connectionStatus.text}</span>
                  {messages.length > 0 && (
                    <>
                      <span className="text-gray-500 mx-1">•</span>
                      <span className="text-gray-400">{messages.length} mesaj</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showSettings && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={cn(
                    'text-gray-400 hover:text-gray-300',
                    isSettingsOpen && 'text-blue-400'
                  )}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={toggleExpanded}
                className="text-gray-400 hover:text-gray-300"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={toggleMinimized}
                className="text-gray-400 hover:text-gray-300"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        <AnimatePresence>
          {isSettingsOpen && showSettings && <SettingsPanel />}
        </AnimatePresence>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="flex flex-col"
              style={{ 
                height: compact ? '400px' : '500px',
                maxHeight: `calc(${maxHeight} - ${showHeader ? '120px' : '60px'})`
              }}
            >
              {showHistory && (
                <div className="flex-1 overflow-hidden">
                  <ChatHistory
                    messages={messages}
                    loading={isLoading}
                    showTimestamps={true}
                    groupByDate={!compact}
                    onClear={clearMessages}
                    onExport={exportHistory}
                    maxHeight="100%"
                  />
                </div>
              )}
              <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <ChatInput
                  placeholder="CLIFF AI ile sohbet edin..."
                  onSend={sendMessage}
                  disabled={!wsConnected || isLoading}
                  maxLength={2000}
                  multiline={true}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {notifications.slice(0, 3).map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="absolute top-16 right-4 max-w-sm z-20"
            >
              <div className={cn(
                'p-3 rounded-lg border shadow-lg backdrop-blur-sm',
                notification.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-200' :
                notification.type === 'warning' ? 'bg-yellow-950/90 border-yellow-500/50 text-yellow-200' :
                'bg-blue-950/90 border-blue-500/50 text-blue-200'
              )}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <p className="text-xs mt-1 opacity-90">{notification.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => dismissNotification(notification.id)}
                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-30"
            >
              <div className="text-center p-6">
                <div className="text-red-400 mb-4">
                  <WifiOff className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-200 mb-2">Bağlantı Hatası</h3>
                <p className="text-sm text-gray-400 mb-4 max-w-md">{error}</p>
                <Button
                  onClick={reconnect}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Yeniden Bağlan
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-purple-400/20 to-transparent animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-blue-400/20 to-transparent animate-pulse-slow delay-1000" />
        </div>
      </motion.div>
    </div>
  )
}
export default ChatInterface
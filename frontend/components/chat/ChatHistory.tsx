'use client'
import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Loader2, 
  MessageSquare, 
  Trash2, 
  Download, 
  Calendar,
  Clock,
  ChevronDown,
  Bot,
  User
} from 'lucide-react'
import { ChatMessage, ChatHistoryProps } from '@/types/chat'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ChatMessageComponent from './ChatMessage'
import { cn, formatRelativeTime } from '@/lib/utils'
const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages,
  loading = false,
  hasMore = false,
  onLoadMore,
  onClear,
  onExport,
  maxHeight = '400px',
  showTimestamps = true,
  groupByDate = true
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set())
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const groupedMessages = useMemo(() => {
    if (!groupByDate) {
      return { ungrouped: messages }
    }
    const groups: { [key: string]: ChatMessage[] } = {}
    messages.forEach(message => {
      const dateKey = new Date(message.timestamp).toDateString()
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(message)
    })
    return groups
  }, [messages, groupByDate])
  const stats = useMemo(() => {
    const totalMessages = messages.length
    const userMessages = messages.filter(m => m.sender === 'user').length
    const aiMessages = messages.filter(m => m.sender === 'ai').length
    const voiceMessages = messages.filter(m => m.type === 'voice').length
    return {
      total: totalMessages,
      user: userMessages,
      ai: aiMessages,
      voice: voiceMessages
    }
  }, [messages])
  const scrollToBottom = (smooth = true) => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      })
    }
  }
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100
    setIsAtBottom(isNearBottom)
    setShowScrollButton(!isNearBottom && messages.length > 5)
    if (scrollTop < 100 && hasMore && !loading && onLoadMore) {
      onLoadMore()
    }
  }
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      setTimeout(() => scrollToBottom(), 100)
    }
  }, [messages.length, isAtBottom])
  useEffect(() => {
    if (groupByDate) {
      const dates = Object.keys(groupedMessages)
      setExpandedDates(new Set(dates.slice(0, 3))) // Expand first 3 dates by default
    }
  }, [groupedMessages, groupByDate])
  const toggleDateGroup = (dateKey: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey)
      } else {
        newSet.add(dateKey)
      }
      return newSet
    })
  }
  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
      } else {
        newSet.add(messageId)
      }
      return newSet
    })
  }
  const clearSelection = () => {
    setSelectedMessages(new Set())
  }
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün'
    } else {
      return date.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }
  if (messages.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <MessageSquare className="h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">
            Henüz mesaj yok
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            CLIFF AI ile sohbetinizi başlatın. Uzay bilimleri hakkında sorular sorabilir 
            veya eğitim içeriği isteyebilirsiniz.
          </p>
        </motion.div>
      </div>
    )
  }
  const renderMessages = () => {
    if (!groupByDate) {
      return (
        <div className="space-y-1">
          {messages.map((message, index) => (
            <ChatMessageComponent
              key={message.id}
              message={message}
              showTimestamp={showTimestamps}
              compact={false}
            />
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-6">
        {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
          <motion.div
            key={dateKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {}
            <div className="flex items-center justify-center">
              <button
                onClick={() => toggleDateGroup(dateKey)}
                className="flex items-center gap-2 px-3 py-1 bg-slate-800/50 hover:bg-slate-800/70 
                           border border-slate-700/50 rounded-full text-xs text-slate-300 
                           transition-colors duration-200"
              >
                <Calendar className="h-3 w-3" />
                <span>{formatDateHeader(dateKey)}</span>
                <Badge variant="secondary" size="sm">
                  {dateMessages.length}
                </Badge>
                <ChevronDown 
                  className={cn(
                    "h-3 w-3 transition-transform duration-200",
                    expandedDates.has(dateKey) ? "rotate-180" : ""
                  )}
                />
              </button>
            </div>
            {}
            <AnimatePresence>
              {expandedDates.has(dateKey) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {dateMessages.map((message) => (
                    <ChatMessageComponent
                      key={message.id}
                      message={message}
                      showTimestamp={showTimestamps}
                      compact={false}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    )
  }
  return (
    <div className="relative flex flex-col h-full">
      {}
      {messages.length > 0 && (
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{stats.total} mesaj</span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{stats.user}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              <span>{stats.ai}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="text-slate-400 hover:text-slate-300"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onClear && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-slate-400 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      {}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 space-y-4",
          "scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50"
        )}
        style={{ maxHeight }}
      >
        {}
        {hasMore && (
          <div 
            ref={loadMoreRef}
            className="flex items-center justify-center py-4"
          >
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Daha fazla mesaj yükleniyor...</span>
              </div>
            ) : onLoadMore && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                className="text-slate-400 hover:text-slate-300"
              >
                Daha fazla mesaj yükle
              </Button>
            )}
          </div>
        )}
        {}
        {renderMessages()}
        {}
        <AnimatePresence>
          {loading && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Mesajlar yükleniyor...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {}
        <div ref={bottomRef} className="h-1" />
      </div>
      {}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => scrollToBottom()}
            className={cn(
              "absolute bottom-4 right-4 z-10",
              "w-10 h-10 rounded-full",
              "bg-blue-600/90 hover:bg-blue-500",
              "text-white shadow-lg backdrop-blur-sm",
              "flex items-center justify-center",
              "transition-all duration-200"
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {selectedMessages.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">
                {selectedMessages.size} mesaj seçildi
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-slate-400"
                >
                  İptal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Sil
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default ChatHistory
'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
interface ChatInputProps {
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  showSendButton?: boolean
  multiline?: boolean
  onSend: (message: string, type?: 'text') => void
  onTyping?: (isTyping: boolean) => void
}
const TYPING_TIMEOUT = 1000
const ChatInput: React.FC<ChatInputProps> = ({
  placeholder = "Mesajınızı yazın...",
  maxLength = 1000,
  disabled = false,
  showSendButton = true,
  multiline = true,
  onSend,
  onTyping
}) => {
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const characterCount = inputValue.length
  const isOverLimit = characterCount > maxLength
  const isNearLimit = characterCount > maxLength * 0.8
  const canSend = inputValue.trim().length > 0 && !isOverLimit && !disabled
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const maxHeight = multiline ? 120 : 48
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`
    }
  }, [multiline])
  useEffect(() => {
    adjustTextareaHeight()
  }, [inputValue, adjustTextareaHeight])
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (!isTyping && value.length > 0) {
      setIsTyping(true)
      onTyping?.(true)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      onTyping?.(false)
    }, TYPING_TIMEOUT)
  }
  const handleSend = useCallback(() => {
    if (!canSend) return
    const messageContent = inputValue.trim()
    onSend(messageContent, 'text')
    setInputValue('')
    setIsTyping(false)
    onTyping?.(false)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 100)
  }, [canSend, inputValue, onSend, onTyping])
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey && multiline) {
        return
      } else {
        e.preventDefault()
        handleSend()
      }
    }
    if (e.key === 'Escape') {
      setInputValue('')
      textareaRef.current?.blur()
    }
  }
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])
  return (
    <div className="relative">
      {}
      <motion.div
        className={cn(
          'relative flex items-end gap-3 p-4 bg-black backdrop-blur-sm',
          'border border-gray-800 shadow-xl rounded-2xl',
          {
            'border-blue-500/50 shadow-blue-500/20': isFocused,
            'opacity-50': disabled
          }
        )}
        animate={{
          boxShadow: isFocused ? 
            '0 0 0 1px rgba(59, 130, 246, 0.5)' : 
            '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
        transition={{ duration: 0.2 }}
      >
        {}
        <div className={cn(
          'absolute inset-0 rounded-2xl bg-gradient-to-r opacity-10 blur-xl -z-10',
          isFocused ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-blue-500'
        )} />
        {}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            className={cn(
              'w-full px-4 py-3 bg-transparent text-white placeholder-gray-400',
              'border-0 outline-none resize-none scrollbar-hide',
              'text-base leading-relaxed',
              multiline ? 'min-h-[48px] max-h-[120px]' : 'h-[48px]',
              {
                'cursor-not-allowed': disabled
              }
            )}
            style={{ 
              fontSize: '16px' 
            }}
          />
          {}
          {(characterCount > 0 || isNearLimit) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'absolute bottom-1 right-1 text-xs px-2 py-1 rounded-full',
                'bg-gray-800/80 backdrop-blur-sm',
                {
                  'text-gray-400': !isNearLimit,
                  'text-yellow-400': isNearLimit && !isOverLimit,
                  'text-red-400': isOverLimit
                }
              )}
            >
              {characterCount}/{maxLength}
            </motion.div>
          )}
          {}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute top-1 right-1 text-xs text-blue-400"
              >
                yazıyor...
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {}
        {showSendButton && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="default"
              size="sm"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'h-10 w-10 rounded-xl transition-all duration-200',
                canSend ?
                  'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg' :
                  'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
      {}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 px-4 py-2 bg-gray-800/90 backdrop-blur-sm border border-gray-800 rounded-lg text-xs text-gray-400"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>Enter = Gönder</span>
                {multiline && <span>Shift + Enter = Yeni satır</span>}
              </div>
              <span className="text-gray-500">ESC = Temizle</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {}
      <AnimatePresence>
        {isOverLimit && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 px-4 py-2 bg-red-950/50 border border-red-500/50 rounded-lg text-sm text-red-300"
          >
            Mesaj çok uzun. Maksimum {maxLength} karakter kullanabilirsiniz.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
export default ChatInput
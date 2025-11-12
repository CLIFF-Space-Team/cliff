'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Sparkles } from 'lucide-react'
import ModernChatInterface from './ModernChatInterface'
import { cn } from '@/lib/utils'
interface FloatingChatButtonProps {
  className?: string
}
const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ className }) => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
    if (!isChatOpen) {
      setHasNewMessage(false)
    }
  }
  return (
    <>
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleChat}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'w-16 h-16 rounded-2xl',
              'bg-gradient-to-br from-purple-600 to-blue-600',
              'shadow-2xl shadow-purple-500/25',
              'flex items-center justify-center',
              'group cursor-pointer',
              className
            )}
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
            <div className="relative">
              <MessageCircle className="w-7 h-7 text-white" />
              {hasNewMessage && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                >
                  <motion.div
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-red-500 rounded-full opacity-50"
                  />
                </motion.div>
              )}
            </div>
            <motion.div
              className="absolute -inset-2"
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="absolute top-0 right-0 w-3 h-3 text-yellow-300" />
              <Sparkles className="absolute bottom-0 left-0 w-3 h-3 text-purple-300" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>
      <ModernChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </>
  )
}
export default FloatingChatButton
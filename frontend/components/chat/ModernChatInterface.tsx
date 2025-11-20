'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, X, Sparkles, Zap, RefreshCw, Image as ImageIcon, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  isTyping?: boolean
  isError?: boolean
  image_url?: string
  isImageGeneration?: boolean
  thread_id?: string
}

interface ModernChatInterfaceProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

const ModernChatInterface: React.FC<ModernChatInterfaceProps> = ({
  className,
  isOpen = true,
  onClose
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState<string>('')
  const [useAzureAgent, setUseAzureAgent] = useState(false)
  const [azureThreadId, setAzureThreadId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const detectImageRequest = useCallback((message: string): boolean => {
    const imageKeywords = [
      'görsel oluştur', 'resim yap', 'fotoğraf çek', 'görsel çiz', 'çiz',
      'create image', 'generate picture', 'draw', 'visualize', 'show me',
      'göster', 'oluştur', 'yap', 'tasarla', 'imagine', 'picture of',
      'görsel', 'resim', 'fotoğraf', 'çizim', 'illüstrasyon',
      'uzay gemisi çiz', 'mars yüzeyi', 'galaksi göster', 'nebula', 
      'robot', 'astronot', 'uzay', 'space', 'planet', 'star'
    ]
    const lowerMessage = message.toLowerCase()
    return imageKeywords.some(keyword => lowerMessage.includes(keyword))
  }, [])

  const generateImage = useCallback(async (prompt: string): Promise<{ success: boolean, image_url?: string, error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/image-generation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: 'imagen-4.0-ultra-generate-preview-06-06',
          style: 'space_themed',
          size: '1024x1024',
          context: { space_related: true, educational: true }
        })
      })

      if (!response.ok) {
        throw new Error('Image generation API error')
      }

      const data = await response.json()
      return {
        success: data.success,
        image_url: data.image_url,
        error: data.error_message
      }
    } catch (error) {
      console.error('Image generation error:', error)
      return {
        success: false,
        error: 'Görsel oluşturma sırasında bir hata oluştu.'
      }
    }
  }, [])

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessage || isLoading) return

    setMessages(prev => {
      const lastMessage = prev[prev.length - 1]
      if (lastMessage?.sender === 'ai' && lastMessage?.isError) {
        return prev.slice(0, -1)
      }
      return prev
    })

    setIsLoading(true)
    setIsTyping(true)

    try {
      let response: Response
      
      response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(-5).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            {
              role: 'user',
              content: lastUserMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      })

      if (!response.ok) {
        throw new Error('API yanıtı başarısız')
      }

      const data = await response.json()
      setIsTyping(false)
      
      if (useAzureAgent && data.thread_id) {
        setAzureThreadId(data.thread_id)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content || 'Üzgünüm, bir hata oluştu.',
        sender: 'ai',
        timestamp: new Date(),
        isError: !data.content,
        thread_id: data.thread_id
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Mesaj gönderme hatası:', error)
      setIsTyping(false)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [lastUserMessage, messages, isLoading, useAzureAgent, azureThreadId])

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setLastUserMessage(inputValue.trim())
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    const hasImageRequest = detectImageRequest(userMessage.content)

    if (hasImageRequest) {
      setIsGeneratingImage(true)
      try {
        const imageResult = await generateImage(userMessage.content)
        setIsGeneratingImage(false)

        if (imageResult.success && imageResult.image_url) {
          const imageMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: 'İşte istediğiniz görsel:',
            sender: 'ai',
            timestamp: new Date(),
            image_url: imageResult.image_url,
            isImageGeneration: true
          }
          setMessages(prev => [...prev, imageMessage])
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: imageResult.error || 'Görsel oluşturulamadı. Lütfen tekrar deneyin.',
            sender: 'ai',
            timestamp: new Date(),
            isError: true
          }
          setMessages(prev => [...prev, errorMessage])
        }
      } catch (error) {
        setIsGeneratingImage(false)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Görsel oluşturma sırasında bir hata oluştu.',
          sender: 'ai',
          timestamp: new Date(),
          isError: true
        }
        setMessages(prev => [...prev, errorMessage])
      }
      setIsLoading(false)
      return
    }

    setIsTyping(true)

    try {
      let response: Response
      
      response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.slice(-5).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            {
              role: 'user',
              content: userMessage.content
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      })

      if (!response.ok) {
        throw new Error('API yanıtı başarısız')
      }

      const data = await response.json()
      setIsTyping(false)
      
      if (useAzureAgent && data.thread_id) {
        setAzureThreadId(data.thread_id)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content || 'Üzgünüm, bir hata oluştu.',
        sender: 'ai',
        timestamp: new Date(),
        isError: !data.content,
        thread_id: data.thread_id
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('Mesaj gönderme hatası:', error)
      setIsTyping(false)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Bağlantı hatası oluştu. Lütfen tekrar deneyin.',
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, messages, isLoading, detectImageRequest, generateImage, useAzureAgent, azureThreadId])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  const MessageBubble = useMemo(() => React.memo(({ message }: { message: Message }) => (
    <div
      className={cn(
        'flex gap-3 mb-6',
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.sender === 'ai' && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/5 overflow-hidden">
          {message.isImageGeneration ? (
            <ImageIcon className="w-4 h-4 text-blue-400" />
          ) : (
            <img src="/img/cliffailogo.png" alt="AI" className="w-full h-full object-cover" />
          )}
        </div>
      )}
      <div className="flex flex-col max-w-[75%]">
        <div
          className={cn(
            'px-5 py-3.5 rounded-2xl backdrop-blur-sm shadow-sm transition-all duration-200',
            message.sender === 'user'
              ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm shadow-blue-500/10'
              : message.isError 
                ? 'bg-red-900/20 border border-red-500/30 text-red-100 rounded-tl-sm'
                : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-sm hover:bg-white/10'
          )}
        >
          <div className={cn("chat-markdown text-sm leading-relaxed", message.sender === 'user' ? "text-white" : "text-gray-100")}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          
          {message.image_url && (
            <div className="mt-3">
              <div className="relative rounded-lg overflow-hidden border border-white/20">
                <img 
                  src={message.image_url} 
                  alt="AI Generated Image" 
                  className="w-full max-w-xs h-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <div className="absolute top-2 right-2">
                  <a 
                    href={message.image_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors flex items-center justify-center"
                    title="Görseli aç"
                  >
                    <Download className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-[10px] mt-2 opacity-50 flex items-center justify-end">
            {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        
        {message.isError && message.sender === 'ai' && (
          <button
            onClick={retryLastMessage}
            disabled={isLoading}
            className={cn(
              'mt-2 self-start px-3 py-1.5 rounded-lg',
              'bg-white/10 hover:bg-white/20 border border-white/20',
              'text-white text-xs font-medium',
              'flex items-center gap-1.5',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className="w-3 h-3" />
            Tekrar Dene
          </button>
        )}
      </div>
      {message.sender === 'user' && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
          <span className="text-white text-xs font-bold">Siz</span>
        </div>
      )}
    </div>
  )), [retryLastMessage, isLoading])

  if (!isOpen) return null

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6', className)}>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-colors"
        />
      )}

      {/* Main Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
            className={cn(
              'relative w-full max-w-3xl h-[85vh] max-h-[800px]',
              'bg-[#0a0a0a]/90 backdrop-blur-xl',
              'border border-white/10 rounded-3xl',
              'shadow-2xl shadow-blue-900/20',
              'overflow-hidden flex flex-col',
              'ring-1 ring-white/5'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02] backdrop-blur-md relative z-10">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-50 group-hover:opacity-100 blur transition duration-500"></div>
                  <div className="relative w-10 h-10 rounded-xl bg-[#0a0a0a] flex items-center justify-center border border-white/10 overflow-hidden">
                    <img src="/img/cliffailogo.png" alt="CLIFF AI Logo" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0a] animate-pulse"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-bold text-lg tracking-tight">CLIFF AI</h3>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] rounded-full font-semibold uppercase tracking-wider">
                      Beta
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    Gemini 3.0 Pro
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center transition-all duration-200 hover:scale-105 group"
                    title="Kapat"
                  >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  </button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative mb-8"
                  >
                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 border border-white/20 relative z-10 overflow-hidden p-0.5">
                      <div className="w-full h-full rounded-[22px] overflow-hidden bg-black">
                        <img src="/img/cliffailogo.png" alt="CLIFF AI" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.h4 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold text-white mb-3 tracking-tight"
                  >
                    Merhaba, Ben <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">CLIFF</span>
                  </motion.h4>
                  
                  <motion.p 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-400 text-base mb-8 leading-relaxed"
                  >
                    Uzay keşfi, analiz ve görselleştirme konularında size yardımcı olmaya hazırım. Nereden başlamak istersiniz?
                  </motion.p>
                  
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                  >
                    {[
                      { icon: '🌍', text: 'Dünya hakkında bilgi ver', action: 'Dünya hakkında bilgi ver' },
                      { icon: '🎨', text: 'Mars görüntüsü oluştur', action: 'Mars yüzeyi görüntüsü oluştur' },
                      { icon: '⭐', text: 'Yıldız haritası göster', action: 'Yıldız haritası göster' },
                      { icon: '🌌', text: 'Galaksi nedir?', action: 'Galaksi nedir açıkla' }
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInputValue(item.action);
                          // Optional: auto send
                        }}
                        className="group flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-0.5"
                      >
                        <span className="text-lg group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                        <span className="text-sm text-gray-300 group-hover:text-white font-medium">{item.text}</span>
                      </button>
                    ))}
                  </motion.div>
                </div>
              )}
              
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {(isTyping || isGeneratingImage) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg overflow-hidden">
                    {isGeneratingImage ? (
                      <ImageIcon className="w-4 h-4 text-blue-400 animate-pulse" />
                    ) : (
                      <img src="/img/cliffailogo.png" alt="AI" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="bg-white/5 px-5 py-3 rounded-2xl rounded-tl-sm border border-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                      <span className="text-gray-400 text-xs font-medium">
                        {isGeneratingImage ? 'Görsel oluşturuluyor...' : 'CLIFF düşünüyor...'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 md:p-6 border-t border-white/5 bg-[#0a0a0a]/50 backdrop-blur-md">
              <div className="relative flex items-center gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500 blur-sm"></div>
                  <div className="relative flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-500/50 focus-within:border-blue-500/50 transition-all">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Bir soru sorun veya görsel isteyin..."
                      disabled={isLoading}
                      className={cn(
                        'w-full px-4 py-3.5',
                        'bg-transparent',
                        'text-white placeholder-gray-500 text-sm',
                        'focus:outline-none',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    />
                    <div className="pr-3 flex items-center gap-2">
                       {inputValue.length > 0 && (
                        <button 
                          onClick={() => setInputValue('')}
                          className="p-1 rounded-full hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                       )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className={cn(
                    'w-12 h-12 rounded-xl',
                    'bg-gradient-to-br from-blue-600 to-purple-600',
                    'flex items-center justify-center',
                    'transition-all duration-200',
                    'hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                    'group'
                  )}
                >
                  {isLoading ? (
                    <Sparkles className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-center text-gray-600 mt-3">
                CLIFF AI hata yapabilir. Önemli bilgileri kontrol edin.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ModernChatInterface
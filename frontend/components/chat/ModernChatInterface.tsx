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
        'flex gap-3 mb-4',
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.sender === 'ai' && (
        <div className="w-8 h-8 rounded-lg bg-pure-black border border-white/20 flex items-center justify-center flex-shrink-0">
          {message.isImageGeneration ? (
            <ImageIcon className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-white" />
          )}
        </div>
      )}
      <div className="flex flex-col max-w-[70%]">
        <div
          className={cn(
            'px-4 py-3 rounded-lg',
            message.sender === 'user'
              ? 'bg-white/10 text-white'
              : message.isError 
                ? 'bg-red-900/20 border border-red-500/30 text-red-100'
                : 'bg-pure-black border border-white/10 text-white/90'
          )}
        >
          <div className="chat-markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
          {}
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
          <p className="text-xs mt-2 opacity-50">
            {new Date(message.timestamp).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        {}
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
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">U</span>
        </div>
      )}
    </div>
  )), [retryLastMessage, isLoading])
  if (!isOpen) return null
  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4', className)}>
      {}
      {isOpen && (
        <div
          onClick={onClose}
          className="absolute inset-0 bg-pure-black/90"
        />
      )}
      {}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              'relative w-full max-w-2xl h-[80vh] max-h-[800px]',
              'bg-pure-black',
              'border border-white/20 rounded-2xl',
              'shadow-2xl',
              'overflow-hidden'
            )}
          >
        <div className="relative h-full flex flex-col">
          {}
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-pure-black">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-bold text-sm">CLIFF AI</h3>
                  <span className="px-2 py-0.5 bg-white/10 text-white text-xs rounded-full font-medium">
                    AI
                  </span>
                </div>
                <p className="text-xs text-white/60">
                  AI ile güçlendirildi
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors duration-200"
                title="Kapat"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            )}
          </div>
          {}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-pure-black">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 mx-auto mb-4 bg-white/10 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-white/90 font-bold text-xl mb-3">Merhaba! 👋</h4>
                <p className="text-white/60 text-base mb-6">
                  Ben CLIFF AI, AI ile güçlendirilmiş uzay asistanınızım.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    '🌍 Dünya hakkında bilgi ver', 
                    '🚀 Mars görüntüsü oluştur', 
                    '⭐ Yıldızlar çiz', 
                    '🌌 Galaksi göster'
                  ].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => setInputValue(topic.split(' ').slice(1).join(' '))}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/80 text-sm rounded-full transition-colors"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {}
            {(isTyping || isGeneratingImage) && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-pure-black border border-white/20 flex items-center justify-center">
                  {isGeneratingImage ? (
                    <ImageIcon className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="bg-white/10 px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                    <span className="text-white/60 text-xs">
                      {isGeneratingImage ? 'Görsel oluşturuluyor...' : 'Yazıyor...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {}
          <div className="p-4 border-t border-white/10 bg-pure-black">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Sorunuzu yazın..."
                  disabled={isLoading}
                  className={cn(
                    'w-full px-4 py-3',
                    'bg-white/10',
                    'border border-white/20 rounded-lg',
                    'text-white placeholder-white/50 text-base',
                    'focus:outline-none focus:border-white/40',
                    'transition-colors duration-200',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Zap className={cn(
                    "w-4 h-4 transition-colors",
                    isLoading ? "text-white/60" : "text-white/30"
                  )} />
                </div>
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  'px-4 py-3 rounded-lg',
                  'bg-white/10 hover:bg-white/20',
                  'flex items-center justify-center gap-2',
                  'transition-colors duration-200',
                  (!inputValue.trim() || isLoading) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-medium">Gönder</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  </div>
  )
}
export default ModernChatInterface
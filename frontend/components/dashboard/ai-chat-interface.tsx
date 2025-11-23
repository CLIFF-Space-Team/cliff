'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Send,
  User,
  Bot,
  Loader2,
  MessageSquare,
  Sparkles,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ChatMessage {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
  asteroidId?: string
  confidence?: number
  sources?: string[]
}

interface AIChatInterfaceProps {
  selectedAsteroidId?: string | null
  className?: string
  compact?: boolean
}

const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  selectedAsteroidId,
  className,
  compact = false
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        type: 'ai',
        content: `Merhaba! Ben AI Uzman Danışmanınızım. ${selectedAsteroidId ? `${selectedAsteroidId} asteroiti` : 'Asteroit tehditleri'} hakkında sorularınızı cevaplayabilirim. Ne öğrenmek istiyorsunuz?`,
        timestamp: new Date(),
        confidence: 0.95,
        sources: ['CliffAI Expert System']
      }])
    }
  }, [selectedAsteroidId, messages.length])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
      asteroidId: selectedAsteroidId || undefined
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    setIsTyping(true)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const endpoint = selectedAsteroidId 
        ? `/api/v1/ai-insights/asteroid/${encodeURIComponent(selectedAsteroidId)}/ai-chat`
        : '/api/v1/ai-analysis/quick-analysis'

      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          question: message,
          context: selectedAsteroidId ? { asteroid_id: selectedAsteroidId } : {}
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      
      // Typing simulation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        type: 'ai',
        content: data.ai_response?.answer || data.message || 'Üzgünüm, şu anda bu soruyu cevaplayamıyorum.',
        timestamp: new Date(),
        confidence: data.ai_response?.confidence || 0.8,
        sources: data.ai_response?.sources || ['AI Analysis Engine']
      }

      setMessages(prev => [...prev, aiMessage])

    } catch (error) {
      console.error('AI Chat error:', error)
      
      // Fallback response
      const errorMessage: ChatMessage = {
        id: `ai_error_${Date.now()}`,
        type: 'ai',
        content: generateFallbackResponse(message, selectedAsteroidId),
        timestamp: new Date(),
        confidence: 0.6,
        sources: ['Offline AI Assistant']
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  const generateFallbackResponse = (question: string, asteroidId?: string | null): string => {
    const q = question.toLowerCase()
    
    if (q.includes('tehlikeli') || q.includes('risk')) {
      return asteroidId 
        ? `${asteroidId} asteroiti hakkında risk analizi yapmaktayım. Şu anda mevcut veriler güvenli bir geçiş gösteriyor.`
        : 'Asteroid tehditleri sürekli izlenmektedir. Çoğu asteroid Dünya\'ya güvenli mesafede yaklaşır.'
    }
    
    if (q.includes('ne zaman') || q.includes('tarih')) {
      return asteroidId
        ? `${asteroidId} asteroitinin yaklaşım tarihini NASA verilerinden kontrol ediyorum. Genellikle birkaç gün önceden kesin tahminler verilir.`
        : 'Asteroid yaklaşım tarihleri NASA JPL Horizons sistemi ile sürekli güncellenmektedir.'
    }
    
    if (q.includes('büyük') || q.includes('boyut')) {
      return 'Asteroid boyutları teleskop gözlemleri ve radar ölçümleri ile belirlenir. Çoğu near-Earth asteroid 1 km\'den küçüktür.'
    }
    
    return `Sorunuzu anlıyorum ama şu anda detaylı analiz yapamıyorum. ${asteroidId ? `${asteroidId} asteroiti` : 'Asteroid sistemi'} hakkında daha spesifik sorular sorabilirsiniz.`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const quickQuestions = selectedAsteroidId ? [
    `${selectedAsteroidId} tehlikeli mi?`,
    'Risk seviyesi nasıl hesaplanıyor?',
    'Ne zaman yaklaşacak?',
    'Önerilen eylemler neler?'
  ] : [
    'En tehlikeli asteroit hangisi?',
    'Asteroid izleme nasıl yapılıyor?',
    'Çarpma riski ne kadar?',
    'Savunma sistemleri var mı?'
  ]

  if (compact) {
    return (
      <Card className={cn("bg-black/40 border-white/10", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-white">AI Sohbet</div>
              <div className="text-xs text-white/60">{messages.length - 1} mesaj</div>
            </div>
            <Button 
              size="sm" 
              className="ml-auto bg-blue-600 hover:bg-blue-500"
              onClick={() => inputRef.current?.focus()}
            >
              Sohbet Et
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("flex flex-col h-full bg-black/40 border-white/10", className)}>
      <CardHeader className="flex-none pb-4">
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-blue-400" />
          AI Uzman Danışman
          {selectedAsteroidId && (
            <Badge variant="secondary" className="h-5 px-2 bg-white/10 text-white/70">
              {selectedAsteroidId}
            </Badge>
          )}
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-auto" />
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-3 pr-2">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div className={cn(
                  "flex gap-2 max-w-[85%]",
                  message.type === 'user' ? "flex-row-reverse" : "flex-row"
                )}>
                  {/* Avatar */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.type === 'user' 
                      ? "bg-blue-600 text-white" 
                      : "bg-purple-600/20 border border-purple-500/30 text-purple-400"
                  )}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={cn(
                    "p-3 rounded-lg",
                    message.type === 'user' 
                      ? "bg-blue-600 text-white" 
                      : "bg-white/10 border border-white/20 text-white"
                  )}>
                    <div className="text-sm leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* Message Footer */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                      <Clock className="w-3 h-3 opacity-50" />
                      <span className="text-xs opacity-70">
                        {message.timestamp.toLocaleTimeString('tr-TR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      
                      {message.type === 'ai' && message.confidence && (
                        <>
                          <div className="w-1 h-1 rounded-full bg-white/30" />
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-xs opacity-70">
                              %{Math.round(message.confidence * 100)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Sources */}
                    {message.type === 'ai' && message.sources && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.sources.map((source, idx) => (
                          <Badge 
                            key={idx}
                            variant="outline" 
                            className="text-xs px-1.5 py-0 h-4 border-white/20 bg-white/5"
                          >
                            {source}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white/10 border border-white/20 rounded-lg p-3">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        <div className="flex-none">
          <div className="text-xs text-white/50 mb-2">Hızlı Sorular:</div>
          <div className="flex flex-wrap gap-1">
            {quickQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(question)
                  inputRef.current?.focus()
                }}
                className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="flex-none flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedAsteroidId ? `${selectedAsteroidId} hakkında soru sorun...` : 'Asteroid hakkında soru sorun...'}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(inputValue)}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default AIChatInterface
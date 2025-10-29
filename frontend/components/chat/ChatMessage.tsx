'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Copy, 
  RefreshCw, 
  Trash2, 
  Volume2, 
  VolumeX, 
  User, 
  Bot,
  Download,
  Maximize,
  ImageIcon
} from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
  onResend?: (id: string) => void
  onDelete?: (id: string) => void
  onCopy?: (content: string) => void
  onSpeak?: (content: string) => void
  isPlaying?: boolean
  showTimestamp?: boolean
  compact?: boolean
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'şimdi'
  if (diffMins < 60) return `${diffMins} dk önce`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} sa önce`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} gün önce`
}

export function ChatMessage({
  message,
  onResend,
  onDelete,
  onCopy,
  onSpeak,
  isPlaying = false,
  showTimestamp = true,
  compact = false
}: ChatMessageProps) {
  const isUser = message.sender === 'user'
  const isSystem = message.sender === 'system'
  const hasError = message.status === 'error'
  const hasImage = message.metadata?.isImageMessage && message.metadata?.imageUrl

  const handleCopy = () => {
    onCopy?.(message.content)
  }

  const handleResend = () => {
    onResend?.(message.id)
  }

  const handleDelete = () => {
    onDelete?.(message.id)
  }

  const handleSpeak = () => {
    onSpeak?.(message.content)
  }

  const handleImageDownload = () => {
    if (hasImage && message.metadata?.imageUrl) {
      const link = document.createElement('a')
      link.href = message.metadata.imageUrl
      link.download = `cliff-generated-image-${Date.now()}.jpg`
      link.click()
    }
  }

  const handleImageFullscreen = () => {
    if (hasImage && message.metadata?.imageUrl) {
      window.open(message.metadata.imageUrl, '_blank')
    }
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-4xl gap-3 px-4 py-6',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row',
        isSystem && 'justify-center',
        compact && 'py-3'
      )}
    >
      {!isSystem && (
        <div className={cn(
          'h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-medium',
          isUser ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
      )}

      <div className={cn(
        'flex flex-col gap-2 max-w-[80%]',
        isUser && 'items-end',
        isSystem && 'items-center max-w-full'
      )}>
        {/* Message Header */}
        {showTimestamp && (
          <div className={cn(
            'flex items-center gap-2 text-xs text-gray-500',
            isUser && 'flex-row-reverse'
          )}>
            <span className="font-medium">
              {isUser ? 'Sen' : isSystem ? 'Sistem' : 'CLIFF AI'}
            </span>
            <span>{formatTimeAgo(message.timestamp)}</span>
            {message.status && (
              <Badge variant={hasError ? 'destructive' : 'secondary'} className="text-xs">
                {message.status === 'sending' && 'Gönderiliyor'}
                {message.status === 'sent' && 'Gönderildi'}
                {message.status === 'delivered' && 'Teslim edildi'}
                {message.status === 'read' && 'Okundu'}
                {message.status === 'error' && 'Hata'}
              </Badge>
            )}
          </div>
        )}

        {/* Message Content */}
        <Card className={cn(
          'shadow-sm',
          isUser ? 'bg-blue-500 text-white border-blue-500' : 
          isSystem ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200',
          hasError && 'border-red-500 bg-red-50',
          hasImage && 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300'
        )}>
          <CardContent className="p-4">
            {/* Text Content */}
            <div className={cn(
              'text-sm leading-relaxed',
              isUser ? 'text-white' : 'text-gray-900',
              hasError && 'text-red-600'
            )}>
              <p className="whitespace-pre-wrap">
                {message.content}
              </p>
            </div>

            {/* Image Content */}
            {hasImage && message.metadata?.imageUrl && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ImageIcon className="h-4 w-4" />
                  <span>AI Tarafından Oluşturuldu</span>
                  {message.metadata.imageModel && (
                    <Badge variant="secondary" className="text-xs">
                      {message.metadata.imageModel}
                    </Badge>
                  )}
                </div>
                
                <div className="relative rounded-lg overflow-hidden border-2 border-purple-200">
                  <img
                    src={message.metadata.imageUrl}
                    alt={message.metadata.imagePrompt || 'AI Generated Image'}
                    className="w-full h-auto max-h-96 object-contain bg-gradient-to-br from-purple-50 to-blue-50"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  
                  {/* Image Controls */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white flex items-center justify-center"
                      onClick={handleImageFullscreen}
                      title="Tam ekranda görüntüle"
                    >
                      <Maximize className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary" 
                      className="h-8 w-8 p-0 bg-black/20 hover:bg-black/40 text-white flex items-center justify-center"
                      onClick={handleImageDownload}
                      title="Görseli indir"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Image Prompt */}
                {message.metadata.imagePrompt && (
                  <div className="bg-gray-50 rounded-md p-3 text-sm">
                    <div className="font-medium text-gray-700 mb-1">Orijinal İstek:</div>
                    <div className="text-gray-900 italic">"{message.metadata.imagePrompt}"</div>
                  </div>
                )}
              </div>
            )}

            {/* Message Metadata */}
            {message.metadata && !hasImage && (
              <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2 text-xs text-gray-500">
                {message.metadata.executionTime && (
                  <span>⏱️ {message.metadata.executionTime}ms</span>
                )}
                {message.metadata.confidence && (
                  <span>🎯 {Math.round(message.metadata.confidence * 100)}% güven</span>
                )}
                {message.metadata.dataSources && (
                  <span>📊 {message.metadata.dataSources.join(', ')}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {!isSystem && (
          <div className={cn(
            'flex items-center gap-1',
            isUser && 'flex-row-reverse'
          )}>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-6 px-2 text-gray-500 hover:text-gray-700"
            >
              <Copy className="h-3 w-3" />
            </Button>
            
            {onSpeak && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSpeak}
                className="h-6 px-2 text-gray-500 hover:text-gray-700"
                disabled={isPlaying}
              >
                {isPlaying ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
            )}

            {isUser && hasError && onResend && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResend}
                className="h-6 px-2 text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-6 px-2 text-gray-500 hover:text-red-500"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatMessage
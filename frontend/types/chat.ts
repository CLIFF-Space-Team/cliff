export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'ai' | 'system'
  timestamp: Date
  type?: 'text' | 'voice' | 'system' | 'error' | 'thinking'
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  metadata?: {
    confidence?: number
    executionTime?: number
    dataSources?: string[]
    voiceData?: VoiceMessageData
    imageUrl?: string
    imagePrompt?: string
    imageModel?: string
    isImageMessage?: boolean
  }
}

export interface VoiceMessageData {
  audioUrl?: string
  duration?: number
  waveform?: number[]
  transcription?: string
  audioLevel?: number
}

export interface ChatInputMode {
  type: 'text' | 'voice' | 'mixed'
  isActive: boolean
}

export interface ChatStatus {
  isConnected: boolean
  isListening: boolean
  isProcessing: boolean
  isTyping: boolean
  currentMode: 'idle' | 'listening' | 'processing' | 'responding' | 'error'
  error?: string
}

export interface ChatSettings {
  voiceEnabled: boolean
  autoListen: boolean
  continuousListening: boolean
  language: string
  voice: string
  speed: number
  volume: number
  showTypingIndicator: boolean
  enableNotifications: boolean
  maxHistorySize: number
  theme: 'dark' | 'light' | 'auto'
}

export interface ChatHistory {
  messages: ChatMessage[]
  totalCount: number
  lastUpdated: Date
  sessionId?: string
}

export interface ChatApiResponse {
  success: boolean
  message?: string
  response?: string
  mentor?: string
  timestamp?: string
  contextUnderstanding?: boolean
  engagementLevel?: string
  followUpSuggestions?: string[]
  executionTime?: number
  dataSources?: string[]
  metadata?: Record<string, any>
}

export interface ChatApiRequest {
  message: string
  studentId?: string
  sessionId?: string
  context?: {
    topic?: string
    learningLevel?: string
    previousMessages?: string[]
    voiceInput?: boolean
  }
  type?: 'educational' | 'general' | 'voice_command'
}

export interface ChatContextData {
  currentTopic?: string
  learningLevel?: 'beginner' | 'intermediate' | 'advanced'
  studentProfile?: {
    id: string
    name?: string
    preferences?: ChatSettings
    learningGoals?: string[]
  }
  sessionHistory?: {
    startTime: Date
    messageCount: number
    topics: string[]
    avgResponseTime: number
  }
}

export interface ChatNotification {
  id: string
  type: 'message' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actions?: ChatNotificationAction[]
}

export interface ChatNotificationAction {
  label: string
  action: () => void
  style?: 'primary' | 'secondary' | 'danger'
}

export interface ChatState {
  messages: ChatMessage[]
  status: ChatStatus
  settings: ChatSettings
  context: ChatContextData
  notifications: ChatNotification[]
  isExpanded: boolean
  isMinimized: boolean
  activeInputMode: ChatInputMode
  typingUsers: string[]
  lastActivity: Date
}

export interface ChatActions {
  sendMessage: (content: string, type?: 'text' | 'voice') => Promise<void>
  clearMessages: () => void
  toggleExpanded: () => void
  toggleMinimized: () => void
  updateSettings: (settings: Partial<ChatSettings>) => void
  setActiveInputMode: (mode: ChatInputMode) => void
  markMessageAsRead: (messageId: string) => void
  deleteMessage: (messageId: string) => void
  resendMessage: (messageId: string) => Promise<void>
  exportHistory: () => void
  importHistory: (history: ChatMessage[]) => void
  clearHistory: () => void
  dismissNotification: (notificationId: string) => void
}

export interface ChatHookReturn extends ChatActions {
  state: ChatState
  isLoading: boolean
  error: string | null
  reconnect: () => void
}

export interface VoiceInputData {
  transcript: string
  confidence: number
  audioLevel: number
  duration: number
  isFinal: boolean
  language?: string
}

export interface VoiceOutputData {
  text: string
  audioUrl?: string
  voice?: string
  speed?: number
  volume?: number
  duration?: number
}

export interface ChatWebSocketMessage {
  type: 'chat_message' | 'chat_response' | 'typing_start' | 'typing_stop' | 'status_update' | 'voice_data'
  data: any
  timestamp: string
  sessionId?: string
  userId?: string
}

export interface EducationalChatRequest {
  message: string
  topic?: string
  learningLevel?: string
  context?: Record<string, any>
  sessionId?: string
}

export interface EducationalChatResponse {
  response: string
  mentor: string
  contextUnderstanding: boolean
  engagementLevel: string
  followUpSuggestions: string[]
  executionTime: number
  dataSources?: string[]
  personalizedContent?: boolean
}

export interface ChatInterfaceProps {
  className?: string
  compact?: boolean
  showHeader?: boolean
  showSettings?: boolean
  showHistory?: boolean
  maxHeight?: string
  initialExpanded?: boolean
  onMessageSent?: (message: ChatMessage) => void
  onMessageReceived?: (message: ChatMessage) => void
  customApiEndpoint?: string
}

export interface ChatMessageProps {
  message: ChatMessage
  showTimestamp?: boolean
  showAvatar?: boolean
  allowActions?: boolean
  compact?: boolean
  onReply?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
  onResend?: (messageId: string) => void
}

export interface ChatInputProps {
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  voiceEnabled?: boolean
  showSendButton?: boolean
  multiline?: boolean
  onSend: (content: string, type: 'text' | 'voice') => void
  onTyping?: (isTyping: boolean) => void
  onVoiceStart?: () => void
  onVoiceEnd?: () => void
}

export interface ChatHistoryProps {
  messages: ChatMessage[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onClear?: () => void
  onExport?: () => void
  maxHeight?: string
  showTimestamps?: boolean
  groupByDate?: boolean
}

export type ChatMessageType = ChatMessage['type']
export type ChatSenderType = ChatMessage['sender']
export type ChatStatusType = ChatStatus['currentMode']
export type ChatThemeType = ChatSettings['theme']
export type ChatLanguageType = string
export type ChatVoiceType = string

export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_HISTORY_SIZE: 1000,
  DEFAULT_LANGUAGE: 'tr-TR',
  DEFAULT_VOICE: 'default',
  DEFAULT_SPEED: 1.0,
  DEFAULT_VOLUME: 0.8,
  TYPING_TIMEOUT: 3000,
  RECONNECT_DELAY: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
  VOICE_TIMEOUT: 30000,
  API_TIMEOUT: 30000
} as const

export const CHAT_THEMES = {
  DARK: 'dark',
  LIGHT: 'light', 
  AUTO: 'auto'
} as const

export const CHAT_LANGUAGES = [
  { code: 'tr-TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' }
] as const

export class ChatError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ChatError'
  }
}

export class VoiceError extends ChatError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details)
    this.name = 'VoiceError'
  }
}

export class ApiError extends ChatError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details)
    this.name = 'ApiError'
  }
}

export class WebSocketError extends ChatError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details)
    this.name = 'WebSocketError'
  }
}

export interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant' | 'system'
  timestamp: number
  type?: 'text' | 'voice' | 'image' | 'error' | 'thinking'
  attachments?: MessageAttachment[]
  metadata?: MessageMetadata
}

export interface MessageAttachment {
  id: string
  type: 'image' | 'file' | 'voice'
  url: string
  filename?: string
  size?: number
  mimeType?: string
  generatedBy?: 'ai' | 'user'
  prompt?: string // Orijinal görsel oluşturma prompt'u
}

export interface MessageMetadata {
  voice?: {
    duration?: number
    transcription?: string
  }
  image?: {
    prompt: string
    model: string
    generationTime?: number
    isSpaceThemed?: boolean
    detectedIntent?: boolean
  }
  processing?: {
    startTime: number
    endTime?: number
    status: 'pending' | 'completed' | 'failed'
  }
}

export interface ImageGenerationRequest {
  message: string
  prompt?: string
  enhance_space_context?: boolean
  user_id?: string
}

export interface ImageGenerationResponse {
  success: boolean
  image_url?: string
  original_prompt: string
  enhanced_prompt: string
  generation_time: number
  model_used: string
  error?: string
}

export interface ImageIntentDetection {
  has_intent: boolean
  confidence: number
  extracted_prompt: string
  original_language: string
  image_type: string
}
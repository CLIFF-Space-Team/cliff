
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export const API_ENDPOINTS = {
  nasa: {
    asteroids: '/api/v1/nasa/asteroids',
    earthEvents: '/api/v1/nasa/earth-events',
    spaceWeather: '/api/v1/nasa/space-weather',
    exoplanets: '/api/v1/nasa/exoplanets'
  },
  
  ai: {
    threatAnalysis: '/api/v1/ai-threat-analysis/analyze',
    chatCompletion: '/api/v1/enhanced-chat/completion',
    unified: '/api/v1/unified-ai/analyze'
  },
  
  ws: {
    threats: '/ws/threats',
    aiAnalysis: '/ws/ai-analysis',
    notifications: '/ws/notifications'
  }
}

export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}
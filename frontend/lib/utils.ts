import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names and merges Tailwind classes intelligently
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format numbers with appropriate suffixes (K, M, B, T)
 */
export function formatNumber(num: number, decimals: number = 1): string {
  if (num < 1000) return num.toString()
  
  const suffixes = ['', 'K', 'M', 'B', 'T']
  const suffixNum = Math.floor(Math.log10(num) / 3)
  const shortValue = parseFloat((num / Math.pow(1000, suffixNum)).toFixed(decimals))
  
  if (shortValue % 1 !== 0) {
    return shortValue.toFixed(decimals) + suffixes[suffixNum]
  }
  
  return shortValue + suffixes[suffixNum]
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Format distance with appropriate units
 */
export function formatDistance(distance: number, unit: 'km' | 'au' | 'ly' = 'km'): string {
  if (unit === 'km') {
    if (distance < 1000) return `${distance.toFixed(1)} km`
    if (distance < 1000000) return `${(distance / 1000).toFixed(1)} K km`
    if (distance < 1000000000) return `${(distance / 1000000).toFixed(1)} M km`
    return `${(distance / 1000000000).toFixed(1)} B km`
  }
  
  if (unit === 'au') {
    return `${distance.toFixed(3)} AU`
  }
  
  if (unit === 'ly') {
    return `${distance.toFixed(2)} ly`
  }
  
  return distance.toString()
}

/**
 * Format velocity with appropriate units
 */
export function formatVelocity(velocity: number, unit: 'kms' | 'mph' = 'kms'): string {
  if (unit === 'kms') {
    return `${velocity.toFixed(2)} km/s`
  }
  
  // Convert km/s to mph
  const mph = velocity * 2236.94
  return `${formatNumber(mph)} mph`
}

/**
 * Format time duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  
  return `${secs}s`
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  }
  
  return dateObj.toLocaleDateString('en-US', defaultOptions)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * clamp(factor, 0, 1)
}

/**
 * Map a value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + (outMax - outMin) * ((value - inMin) / (inMax - inMin))
}

/**
 * Generate a random ID
 */
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T
  if (typeof obj === 'object') {
    const copy: any = {}
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key])
    })
    return copy
  }
  return obj
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Sleep function for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxAttempts) {
        throw lastError
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await sleep(delay)
    }
  }
  
  throw lastError!
}

/**
 * Safe JSON parse with fallback
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI)
}

/**
 * Calculate threat level based on various factors
 */
export function calculateThreatLevel(
  proximity: number, // 0-1 scale
  velocity: number,  // 0-1 scale  
  size: number,      // 0-1 scale
  uncertainty: number = 0 // 0-1 scale
): 'low' | 'medium' | 'high' | 'critical' {
  const threatScore = (proximity * 0.4) + (velocity * 0.3) + (size * 0.3) - (uncertainty * 0.1)
  
  if (threatScore >= 0.8) return 'critical'
  if (threatScore >= 0.6) return 'high'
  if (threatScore >= 0.3) return 'medium'
  return 'low'
}

/**
 * Get color for threat level
 */
export function getThreatColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors = {
    low: '#10B981',    // green-500
    medium: '#F59E0B', // yellow-500
    high: '#EF4444',   // red-500
    critical: '#DC2626' // red-600
  }
  
  return colors[level]
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  
  const dLat = degToRad(lat2 - lat1)
  const dLng = degToRad(lng2 - lng1)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  )
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length - 3) + '...'
}

/**
 * Convert object to query string
 */
export function objectToQueryString(obj: Record<string, any>): string {
  return Object.entries(obj)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}
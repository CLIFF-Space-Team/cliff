'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, Zap, Globe, Satellite, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// Base Spinner Component
export function Spinner({ 
  size = 'md',
  className,
  color = 'primary'
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  color?: 'primary' | 'secondary' | 'destructive' | 'warning' | 'success'
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    destructive: 'text-destructive',
    warning: 'text-warning',
    success: 'text-success'
  }

  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}

// CLIFF-themed Loading Spinner
export function CLIFFSpinner({ 
  size = 'md',
  className 
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16', 
    xl: 'h-24 w-24'
  }

  return (
    <div className={cn('relative', sizeClasses[size], className)}>
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 border-2 border-primary/30 border-t-primary rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Inner ring */}
      <motion.div
        className="absolute inset-2 border-2 border-secondary/30 border-b-secondary rounded-full"
        animate={{ rotate: -360 }}
        transition={{ duration: 0.75, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Satellite className="h-4 w-4 text-accent" />
        </motion.div>
      </div>
    </div>
  )
}

// Skeleton Loading Components
export function SkeletonLine({ 
  width = 'full',
  height = 'md',
  className 
}: {
  width?: string | 'full' | '3/4' | '1/2' | '1/4'
  height?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const widthClasses = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2', 
    '1/4': 'w-1/4'
  }

  const heightClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-6'
  }

  return (
    <div 
      className={cn(
        'bg-muted/50 rounded animate-pulse',
        typeof width === 'string' && widthClasses[width as keyof typeof widthClasses] ? widthClasses[width as keyof typeof widthClasses] : width,
        heightClasses[height],
        className
      )}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border border-border rounded-lg bg-card', className)}>
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-muted/50 rounded-full animate-pulse" />
          <div className="space-y-2 flex-1">
            <SkeletonLine width="3/4" />
            <SkeletonLine width="1/2" height="sm" />
          </div>
        </div>
        <div className="space-y-2">
          <SkeletonLine />
          <SkeletonLine width="3/4" />
          <SkeletonLine width="1/2" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ 
  rows = 5,
  columns = 4,
  className 
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Table Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLine key={i} width="3/4" height="lg" />
        ))}
      </div>
      
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLine key={colIndex} width={colIndex === 0 ? 'full' : '3/4'} />
          ))}
        </div>
      ))}
    </div>
  )
}

// Progressive Loading Component
export function ProgressiveLoader({ 
  progress = 0,
  message = 'Yükleniyor...',
  steps = [],
  currentStep = 0,
  className
}: {
  progress?: number
  message?: string
  steps?: string[]
  currentStep?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground">{message}</span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-secondary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={cn(
                'h-2 w-2 rounded-full flex-shrink-0',
                index < currentStep ? 'bg-success' :
                index === currentStep ? 'bg-primary animate-pulse' :
                'bg-muted-foreground/50'
              )} />
              <span className={cn(
                'text-sm',
                index < currentStep ? 'text-success-foreground' :
                index === currentStep ? 'text-primary-foreground' :
                'text-muted-foreground'
              )}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// CLIFF Dashboard Loading States
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine width="1/4" height="lg" />
          <SkeletonLine width="1/2" height="sm" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine width="20" height="lg" />
          <SkeletonLine width="20" height="lg" />
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SpaceVisualizationSkeleton() {
  return (
    <div className="relative w-full h-full bg-background rounded-lg overflow-hidden">
      {/* 3D Scene Skeleton */}
      <div className="absolute inset-0 bg-card-deep">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10" />
        
        {/* Mock planets */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full"
            style={{
              width: `${20 + Math.random() * 40}px`,
              height: `${20 + Math.random() * 40}px`,
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`
            }}
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Loading Overlay */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center space-y-4">
          <CLIFFSpinner size="lg" />
          <div className="space-y-2">
            <p className="text-foreground font-medium">3D Uzay Simülasyonu Yükleniyor</p>
            <p className="text-muted-foreground text-sm">Gök cisimlerinin konumları hesaplanıyor...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AsteroidTrackerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-3 border border-border rounded-lg bg-card">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-muted/50 rounded animate-pulse" />
                <SkeletonLine width="1/2" height="sm" />
              </div>
              <SkeletonLine width="1/4" height="lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Asteroid List */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border border-border rounded-lg bg-card">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SkeletonLine width="1/4" height="lg" />
                <div className="h-5 w-12 bg-muted/50 rounded animate-pulse" />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-1">
                    <SkeletonLine width="3/4" height="sm" />
                    <SkeletonLine width="1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Full Screen Loading
export function FullScreenLoader({ 
  message = 'CLIFF Sistem Başlatılıyor...',
  subtitle = 'Uzay verisi senkronize ediliyor',
  progress,
  className
}: {
  message?: string
  subtitle?: string
  progress?: number
  className?: string
}) {
  return (
    <div className={cn(
      'fixed inset-0 bg-background/90 backdrop-blur-lg flex items-center justify-center z-50',
      className
    )}>
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 100 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{ 
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1, 0.5]
            }}
            transition={{ 
              duration: 2 + Math.random() * 2, 
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative text-center space-y-8 max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <CLIFFSpinner size="xl" />
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {message}
            </h1>
            <p className="text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </motion.div>

        {progress !== undefined && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <ProgressiveLoader progress={progress} message="" />
          </motion.div>
        )}

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="space-y-2 text-sm text-muted-foreground"
        >
          <div className="flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Globe className="h-4 w-4" />
            </motion.div>
            NASA API Bağlantısı: Aktif
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4 text-success" />
            AI Sistemleri: Hazır
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// SPACE AND NATURE themed loading component - FPS optimized
export function SpaceAndNatureLoader({ 
  message = 'SPACE AND NATURE yükleniyor...',
  subtitle = 'Kozmik veriler senkronize ediliyor',
  className
}: {
  message?: string
  subtitle?: string
  className?: string
}) {
  return (
    <div className={cn(
      'fixed inset-0 pure-black-gradient backdrop-blur-lg flex items-center justify-center z-50',
      className
    )}>
      {/* Optimized star field background - Mobile friendly */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              willChange: 'opacity, transform',
              transform: 'translateZ(0)' // Hardware acceleration
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1.2, 0.5]
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeInOut'
            }}
          />
        ))}
      </div>

      {/* Central loading animation */}
      <div className="relative text-center space-y-8 max-w-md z-10">
        
        {/* Main logo animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative"
        >
          {/* Outer orbital ring */}
          <motion.div
            className="absolute inset-0 w-24 h-24 mx-auto border-2 border-white/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          />
          
          {/* Middle ring with planets */}
          <motion.div
            className="absolute inset-2 w-20 h-20 mx-auto border border-green-400/30 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            style={{
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          >
            {/* Small planet dots */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-green-400 rounded-full"
                style={{
                  top: '50%',
                  left: '50%',
                  transformOrigin: `${40 * Math.cos((i * 120 * Math.PI) / 180)}px ${40 * Math.sin((i * 120 * Math.PI) / 180)}px`
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
              />
            ))}
          </motion.div>
          
          {/* Center Earth-like sphere */}
          <motion.div
            className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-500 to-green-600 shadow-lg"
            animate={{ 
              scale: [1, 1.1, 1],
              boxShadow: [
                '0 0 20px rgba(59, 130, 246, 0.3)',
                '0 0 30px rgba(34, 197, 94, 0.4)',
                '0 0 20px rgba(59, 130, 246, 0.3)'
              ]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
            style={{
              willChange: 'transform, box-shadow',
              transform: 'translateZ(0)'
            }}
          >
            {/* Earth surface patterns */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-300/40 to-blue-400/40" />
            <div className="absolute top-2 left-3 w-3 h-2 bg-green-300 rounded-full opacity-60" />
            <div className="absolute bottom-3 right-2 w-2 h-3 bg-green-400 rounded-full opacity-50" />
          </motion.div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gradient-minimal">
              SPACE AND NATURE
            </h1>
            <p className="text-lg font-medium text-white/90">
              {message}
            </p>
            <p className="text-white/60 text-sm">
              {subtitle}
            </p>
          </div>
        </motion.div>

        {/* Progress indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-4"
        >
          {/* Loading dots */}
          <div className="flex justify-center space-x-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-white rounded-full"
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity, 
                  delay: i * 0.2,
                  ease: 'easeInOut'
                }}
                style={{
                  willChange: 'opacity, transform',
                  transform: 'translateZ(0)'
                }}
              />
            ))}
          </div>

          {/* System status */}
          <div className="space-y-2 text-sm text-white/70">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                  willChange: 'transform',
                  transform: 'translateZ(0)'
                }}
              >
                🌍
              </motion.div>
              Doğal Sistemler: Aktif
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
              className="flex items-center justify-center gap-2"
            >
              ⚡ Uzay Verileri: Senkronize
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              className="flex items-center justify-center gap-2"
            >
              🌿 AI Ekosistemleri: Hazır
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default {
  Spinner,
  CLIFFSpinner,
  SpaceAndNatureLoader,
  SkeletonLine,
  SkeletonCard,
  SkeletonTable,
  ProgressiveLoader,
  DashboardSkeleton,
  SpaceVisualizationSkeleton,
  AsteroidTrackerSkeleton,
  FullScreenLoader
}
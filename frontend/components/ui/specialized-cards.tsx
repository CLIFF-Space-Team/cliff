'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

// Metric Card Component
export function MetricCard({
  title,
  value,
  unit,
  trend,
  trendValue,
  description,
  icon: Icon,
  className,
  variant = 'default'
}: {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
  variant?: 'default' | 'danger' | 'warning' | 'success'
}) {
  const variantStyles = {
    default: 'border-border bg-card',
    danger: 'border-destructive/50 bg-destructive/10',
    warning: 'border-warning/50 bg-warning/10',
    success: 'border-success/50 bg-success/10'
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  return (
    <Card className={cn(variantStyles[variant], 'transition-all hover:border-primary/50', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">{unit}</span>
            )}
          </div>
          
          {trend && trendValue && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'stable' && 'text-muted-foreground'
              )}>
                {trendValue}
              </span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground/80">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Threat Card Component
export function ThreatCard({
  title,
  level,
  probability,
  impact,
  description,
  source,
  lastUpdated,
  className
}: {
  title: string
  level: 'düşük' | 'orta' | 'yüksek' | 'kritik'
  probability: number
  impact: string
  description: string
  source: string
  lastUpdated: string
  className?: string
}) {
  return (
    <Card className={cn('bg-card border-border', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base text-foreground">
              {title}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <ThreatLevelBadge level={level} />
              <span className="text-xs text-muted-foreground">
                {probability}% olasılık
              </span>
            </div>
          </div>
          <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Etki:</span>
            <span className="text-foreground">{impact}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kaynak:</span>
            <span className="text-foreground">{source}</span>
          </div>
        </div>
        
        <p className="text-sm text-foreground/80">
          {description}
        </p>
        
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground/80">
            Son güncelleme: {lastUpdated}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Status Badge Component
export function StatusBadge({
  status,
  className
}: {
  status: 'aktif' | 'pasif' | 'hata' | 'beklemede' | 'bağlı' | 'bağlantısız'
  className?: string
}) {
  const statusConfig = {
    'aktif': {
      color: 'bg-success/10 text-success border-success/20',
      icon: CheckCircle
    },
    'pasif': {
      color: 'bg-muted/20 text-muted-foreground border-muted/30',
      icon: Clock
    },
    'hata': {
      color: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: AlertTriangle
    },
    'beklemede': {
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: Clock
    },
    'bağlı': {
      color: 'bg-success/10 text-success border-success/20',
      icon: Wifi
    },
    'bağlantısız': {
      color: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: WifiOff
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 text-xs border',
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )
}

// Data Source Badge Component
export function DataSourceBadge({
  source,
  className
}: {
  source: 'nasa' | 'noaa' | 'esa' | 'internal' | 'simulation'
  className?: string
}) {
  const sourceConfig = {
    'nasa': {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      label: 'NASA'
    },
    'noaa': {
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      label: 'NOAA'
    },
    'esa': {
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      label: 'ESA'
    },
    'internal': {
      color: 'bg-muted/20 text-muted-foreground border-muted/30',
      label: 'İç Veri'
    },
    'simulation': {
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      label: 'Simülasyon'
    }
  }

  const config = sourceConfig[source]

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs border',
        config.color,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}

// Threat Level Badge Component
export function ThreatLevelBadge({
  level,
  className
}: {
  level: 'düşük' | 'orta' | 'yüksek' | 'kritik'
  className?: string
}) {
  const levelConfig = {
    'düşük': {
      color: 'bg-success/10 text-success border-success/20',
      icon: CheckCircle
    },
    'orta': {
      color: 'bg-warning/10 text-warning border-warning/20',
      icon: Clock
    },
    'yüksek': {
      color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      icon: AlertTriangle
    },
    'kritik': {
      color: 'bg-destructive/10 text-destructive border-destructive/20',
      icon: AlertTriangle
    }
  }

  const config = levelConfig[level]
  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        'flex items-center gap-1 text-xs border font-medium',
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  )
}

// Notification Badge Component
export function NotificationBadge({
  count,
  variant = 'default',
  className
}: {
  count: number
  variant?: 'default' | 'danger' | 'warning' | 'success'
  className?: string
}) {
  if (count === 0) return null

  const variantStyles = {
    default: 'bg-primary text-primary-foreground',
    danger: 'bg-destructive text-destructive-foreground',
    warning: 'bg-warning text-warning-foreground',
    success: 'bg-success text-success-foreground'
  }

  return (
    <div className={cn(
      'inline-flex items-center justify-center min-w-[18px] h-[18px] text-xs font-bold rounded-full',
      variantStyles[variant],
      className
    )}>
      {count > 99 ? '99+' : count}
    </div>
  )
}

export default {
  MetricCard,
  ThreatCard,
  StatusBadge,
  DataSourceBadge,
  ThreatLevelBadge,
  NotificationBadge
}
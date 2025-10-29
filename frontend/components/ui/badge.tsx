import React from 'react'
import { cn } from '@/lib/utils'
import { VariantProps, cva } from 'class-variance-authority'

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border",
        
        // Missing variants - adding these to fix TypeScript errors
        info: "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20",
        danger: "border-transparent bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-md shadow-red-500/20",
        warning: "border-transparent bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md shadow-yellow-500/20",
        
        // Threat level badges
        critical: "border-transparent bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg shadow-red-500/25 animate-pulse-subtle",
        high: "border-transparent bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/20",
        medium: "border-transparent bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md shadow-yellow-500/20",
        low: "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/20",
        
        // Status badges
        active: "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20",
        inactive: "border-transparent bg-slate-600 text-slate-200",
        pending: "border-transparent bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-md shadow-yellow-500/20",
        error: "border-transparent bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md shadow-red-500/20",
        success: "border-transparent bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-500/20",
        
        // Cosmic themed badges
        cosmic: "border-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/25",
        nebula: "border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25",
        solar: "border-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25",
        
        // Data source badges
        nasa: "border-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20",
        realtime: "border-transparent bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-md shadow-green-500/20 animate-pulse",
        ai: "border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20",
        
        // Size variants with glow
        glowSmall: "border-transparent bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/50 text-[10px] px-2 py-0.5",
        glowMedium: "border-transparent bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-xl shadow-cyan-500/50",
        glowLarge: "border-transparent bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-2xl shadow-cyan-500/50 text-sm px-4 py-1",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[10px]",
        lg: "px-3 py-1 text-sm",
        xl: "px-4 py-1.5 text-base",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce",
        ping: "animate-ping",
        spin: "animate-spin",
        glow: "animate-pulse-glow",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children?: React.ReactNode
  icon?: React.ReactNode
  count?: number | string
  dot?: boolean
  interactive?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation, 
    children, 
    icon, 
    count, 
    dot = false, 
    interactive = false,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, animation }),
          interactive && "cursor-pointer hover:scale-105 transition-transform",
          dot && "w-3 h-3 p-0 rounded-full",
          className
        )}
        {...props}
      >
        {dot ? null : (
          <div className="flex items-center gap-1">
            {icon && <span className="text-[10px]">{icon}</span>}
            {children}
            {count && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-[10px] font-bold">
                {count}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

Badge.displayName = "Badge"

// Specialized Badge components for CLIFF
const ThreatLevelBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & {
  level: 'critical' | 'high' | 'medium' | 'low'
}>(({ level, children, ...props }, ref) => {
  const levelText = {
    critical: 'CRITICAL',
    high: 'HIGH',
    medium: 'MEDIUM',
    low: 'LOW'
  }[level]

  return (
    <Badge
      ref={ref}
      variant={level}
      animation={level === 'critical' ? 'pulse' : 'none'}
      {...props}
    >
      {children || levelText}
    </Badge>
  )
})
ThreatLevelBadge.displayName = "ThreatLevelBadge"

const StatusBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success'
  showDot?: boolean
}>(({ status, showDot = true, children, ...props }, ref) => {
  const statusText = {
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    error: 'Error',
    success: 'Success'
  }[status]

  const statusIcon = showDot ? (
    <div className={cn(
      "w-2 h-2 rounded-full",
      status === 'active' && "bg-green-400 animate-pulse",
      status === 'inactive' && "bg-gray-400",
      status === 'pending' && "bg-yellow-400 animate-pulse",
      status === 'error' && "bg-red-400 animate-pulse",
      status === 'success' && "bg-green-400"
    )} />
  ) : null

  return (
    <Badge
      ref={ref}
      variant={status}
      icon={statusIcon}
      {...props}
    >
      {children || statusText}
    </Badge>
  )
})
StatusBadge.displayName = "StatusBadge"

const DataSourceBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & {
  source: 'nasa' | 'realtime' | 'ai' | 'cosmic'
}>(({ source, children, ...props }, ref) => {
  const sourceText = {
    nasa: 'NASA',
    realtime: 'LIVE',
    ai: 'AI',
    cosmic: 'COSMIC'
  }[source]

  return (
    <Badge
      ref={ref}
      variant={source}
      animation={source === 'realtime' ? 'pulse' : 'none'}
      {...props}
    >
      {children || sourceText}
    </Badge>
  )
})
DataSourceBadge.displayName = "DataSourceBadge"

const CounterBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant'> & {
  count: number
  max?: number
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info'
}>(({ count, max = 99, variant = 'default', ...props }, ref) => {
  const displayCount = count > max ? `${max}+` : count.toString()
  const badgeVariant = variant === 'danger' ? 'danger' : 
                      variant === 'warning' ? 'warning' : 
                      variant === 'success' ? 'success' : 
                      variant === 'info' ? 'info' : 'default'

  return (
    <Badge
      ref={ref}
      variant={badgeVariant}
      size="sm"
      className="min-w-[20px] justify-center"
      {...props}
    >
      {displayCount}
    </Badge>
  )
})
CounterBadge.displayName = "CounterBadge"

const NotificationBadge = React.forwardRef<HTMLDivElement, Omit<BadgeProps, 'variant' | 'dot'> & {
  count?: number
  dot?: boolean
  priority?: 'low' | 'medium' | 'high' | 'critical'
}>(({ count, dot = false, priority = 'medium', className, ...props }, ref) => {
  const priorityVariant = priority

  if (dot) {
    return (
      <Badge
        ref={ref}
        variant={priorityVariant}
        dot={true}
        animation={priority === 'critical' ? 'ping' : 'pulse'}
        className={cn("absolute -top-1 -right-1", className)}
        {...props}
      />
    )
  }

  if (!count || count === 0) return null

  return (
    <Badge
      ref={ref}
      variant={priorityVariant}
      size="sm"
      animation={priority === 'critical' ? 'pulse' : 'none'}
      className={cn("absolute -top-2 -right-2 min-w-[18px] justify-center", className)}
      {...props}
    >
      {count > 99 ? '99+' : count}
    </Badge>
  )
})
NotificationBadge.displayName = "NotificationBadge"

export { 
  Badge, 
  badgeVariants,
  ThreatLevelBadge,
  StatusBadge,
  DataSourceBadge,
  CounterBadge,
  NotificationBadge
}
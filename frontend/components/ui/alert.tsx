import React from 'react'
import { cn } from '@/lib/utils'
import { VariantProps, cva } from 'class-variance-authority'
import { X, AlertTriangle, CheckCircle, Info, Zap, Satellite, Globe } from 'lucide-react'
const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/10",
        warning: "border-yellow-500/50 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 [&>svg]:text-yellow-600 dark:[&>svg]:text-yellow-400",
        success: "border-green-500/50 text-green-600 dark:text-green-400 bg-green-500/10 [&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        info: "border-blue-500/50 text-blue-600 dark:text-blue-400 bg-blue-500/10 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400",
        critical: "border-red-500/50 text-red-100 bg-gradient-to-r from-red-900/80 to-pink-900/80 backdrop-blur-md shadow-lg shadow-red-500/25 animate-pulse-subtle [&>svg]:text-red-400",
        threat: "border-orange-500/50 text-orange-100 bg-gradient-to-r from-orange-900/80 to-red-900/80 backdrop-blur-md shadow-lg shadow-orange-500/25 [&>svg]:text-orange-400",
        asteroid: "border-yellow-500/50 text-yellow-100 bg-gradient-to-r from-yellow-900/80 to-orange-900/80 backdrop-blur-md shadow-lg shadow-yellow-500/25 [&>svg]:text-yellow-400",
        space: "border-purple-500/50 text-purple-100 bg-gradient-to-r from-purple-900/80 to-indigo-900/80 backdrop-blur-md shadow-lg shadow-purple-500/25 [&>svg]:text-purple-400",
        earth: "border-green-500/50 text-green-100 bg-gradient-to-r from-green-900/80 to-emerald-900/80 backdrop-blur-md shadow-lg shadow-green-500/25 [&>svg]:text-green-400",
        solar: "border-orange-400/50 text-orange-100 bg-gradient-to-r from-orange-800/80 to-yellow-800/80 backdrop-blur-md shadow-lg shadow-orange-400/25 [&>svg]:text-orange-300",
        cosmic: "border-cyan-500/50 text-cyan-100 bg-gradient-to-r from-cyan-900/80 to-blue-900/80 backdrop-blur-md shadow-lg shadow-cyan-500/25 [&>svg]:text-cyan-400",
      },
      size: {
        default: "p-4",
        sm: "p-3 text-sm",
        lg: "p-6 text-base",
        xl: "p-8 text-lg",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce-slow",
        glow: "animate-glow-pulse",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)
export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  children?: React.ReactNode
  icon?: React.ReactNode
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  timestamp?: Date
  priority?: 'low' | 'medium' | 'high' | 'critical'
}
const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className, 
    variant, 
    size, 
    animation, 
    children, 
    icon, 
    title, 
    dismissible = false,
    onDismiss,
    timestamp,
    priority,
    ...props 
  }, ref) => {
    const defaultIcons = {
      destructive: <AlertTriangle className="h-4 w-4" />,
      warning: <AlertTriangle className="h-4 w-4" />,
      success: <CheckCircle className="h-4 w-4" />,
      info: <Info className="h-4 w-4" />,
      critical: <Zap className="h-4 w-4" />,
      threat: <AlertTriangle className="h-4 w-4" />,
      asteroid: <Globe className="h-4 w-4" />,
      space: <Satellite className="h-4 w-4" />,
      earth: <Globe className="h-4 w-4" />,
      solar: <Zap className="h-4 w-4" />,
      cosmic: <Satellite className="h-4 w-4" />,
    }
    const alertIcon = icon || (variant && defaultIcons[variant as keyof typeof defaultIcons])
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          alertVariants({ variant, size, animation }),
          dismissible && "pr-12",
          className
        )}
        {...props}
      >
        {alertIcon}
        <div className="flex-1">
          {title && (
            <AlertTitle className="mb-1">
              {title}
              {timestamp && (
                <span className="ml-2 text-xs opacity-70">
                  {timestamp.toLocaleTimeString()}
                </span>
              )}
            </AlertTitle>
          )}
          <AlertDescription>
            {children}
          </AlertDescription>
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute right-2 top-2 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            aria-label="Uyarıyı kapat"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {}
        {(variant === 'critical' || variant === 'cosmic' || variant === 'space') && (
          <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden rounded-lg">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-radial from-current to-transparent animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-gradient-radial from-current to-transparent animate-pulse-slow delay-1000" />
          </div>
        )}
      </div>
    )
  }
)
Alert.displayName = "Alert"
const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"
const ThreatAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'> & {
  threatLevel: 'critical' | 'high' | 'medium' | 'low'
  threatType: string
  source: string
  estimatedImpact?: string
}>(({ threatLevel, threatType, source, estimatedImpact, title, children, ...props }, ref) => {
  const variantMap = {
    critical: 'critical',
    high: 'threat', 
    medium: 'warning',
    low: 'info'
  } as const
  const threatTitle = title || `${threatLevel.toUpperCase()} SEVİYE TEHDİT TESPİT EDİLDİ`
  return (
    <Alert
      ref={ref}
      variant={variantMap[threatLevel]}
      animation={threatLevel === 'critical' ? 'pulse' : 'none'}
      title={threatTitle}
      timestamp={new Date()}
      {...props}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Tür:</span>
          <span>{threatType}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Kaynak:</span>
          <span>{source}</span>
        </div>
        {estimatedImpact && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Tahmini Etki:</span>
            <span>{estimatedImpact}</span>
          </div>
        )}
        {children && (
          <div className="pt-2 border-t border-current/20">
            {children}
          </div>
        )}
      </div>
    </Alert>
  )
})
ThreatAlert.displayName = "ThreatAlert"
const SystemAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'> & {
  system: string
  status: 'online' | 'offline' | 'error' | 'maintenance'
  details?: string
}>(({ system, status, details, title, children, ...props }, ref) => {
  const statusVariants = {
    online: 'success',
    offline: 'warning',
    error: 'destructive',
    maintenance: 'info'
  } as const
  const systemTitle = title || `${system} Sistemi ${status.toUpperCase()}`
  return (
    <Alert
      ref={ref}
      variant={statusVariants[status]}
      title={systemTitle}
      timestamp={new Date()}
      {...props}
    >
      <div className="space-y-2">
        {details && (
          <div className="text-sm">
            {details}
          </div>
        )}
        {children}
      </div>
    </Alert>
  )
})
SystemAlert.displayName = "SystemAlert"
const DataAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'> & {
  dataSource: string
  updateType: 'new' | 'updated' | 'anomaly' | 'lost'
  recordCount?: number
}>(({ dataSource, updateType, recordCount, title, children, ...props }, ref) => {
  const updateVariants = {
    new: 'success',
    updated: 'info',
    anomaly: 'warning',
    lost: 'destructive'
  } as const
  const dataTitle = title || `${dataSource} Verisi ${updateType.toUpperCase()}`
  return (
    <Alert
      ref={ref}
      variant={updateVariants[updateType]}
      title={dataTitle}
      timestamp={new Date()}
      {...props}
    >
      <div className="space-y-2">
        {recordCount && (
          <div className="text-sm">
            <span className="font-medium">Etkilenen kayıtlar:</span> {recordCount}
          </div>
        )}
        {children}
      </div>
    </Alert>
  )
})
DataAlert.displayName = "DataAlert"
const CosmicEventAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'> & {
  eventType: 'solar_flare' | 'asteroid' | 'satellite' | 'space_weather' | 'earth_event'
  severity: 'low' | 'moderate' | 'high' | 'extreme'
  location?: string
  duration?: string
}>(({ eventType, severity, location, duration, title, children, ...props }, ref) => {
  const eventVariants = {
    solar_flare: 'solar',
    asteroid: 'asteroid',
    satellite: 'space',
    space_weather: 'cosmic',
    earth_event: 'earth'
  } as const
  const eventTitle = title || `${eventType.replace('_', ' ').toUpperCase()} OLAY - ${severity.toUpperCase()}`
  return (
    <Alert
      ref={ref}
      variant={eventVariants[eventType]}
      animation={severity === 'extreme' ? 'pulse' : 'none'}
      title={eventTitle}
      timestamp={new Date()}
      {...props}
    >
      <div className="space-y-2">
        {location && (
          <div className="text-sm">
            <span className="font-medium">Konum:</span> {location}
          </div>
        )}
        {duration && (
          <div className="text-sm">
            <span className="font-medium">Süre:</span> {duration}
          </div>
        )}
        {children}
      </div>
    </Alert>
  )
})
CosmicEventAlert.displayName = "CosmicEventAlert"
export { 
  Alert, 
  AlertTitle, 
  AlertDescription, 
  alertVariants,
  ThreatAlert,
  SystemAlert,
  DataAlert,
  CosmicEventAlert
}
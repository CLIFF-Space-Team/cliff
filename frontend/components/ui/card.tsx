import React from 'react'
import { cn } from '@/lib/utils'
import { VariantProps, cva } from 'class-variance-authority'
const cardVariants = cva(
  "rounded-lg border text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-card border-border",
        cosmic: "bg-gradient-to-br from-pure-black/90 to-cliff-dark-gray/80 backdrop-blur-md border-cliff-light-gray/20 shadow-lg shadow-cliff-light-gray/10",
        glass: "bg-pure-black/20 backdrop-blur-lg border-cliff-light-gray/10 shadow-lg",
        danger: "bg-gradient-to-br from-red-950/80 to-pink-950/80 backdrop-blur-md border-red-400/20 shadow-lg shadow-red-500/10",
        warning: "bg-gradient-to-br from-yellow-950/80 to-orange-950/80 backdrop-blur-md border-yellow-400/20 shadow-lg shadow-yellow-500/10",
        success: "bg-gradient-to-br from-green-950/80 to-emerald-950/80 backdrop-blur-md border-green-400/20 shadow-lg shadow-green-500/10",
        info: "bg-gradient-to-br from-pure-black/90 to-cliff-dark-gray/80 backdrop-blur-md border-cliff-light-gray/20 shadow-lg shadow-cliff-light-gray/10",
        dark: "bg-pure-black/95 border-cliff-dark-gray/50 shadow-xl",
        gradient: "bg-gradient-to-br from-pure-black/90 via-cliff-dark-gray/80 to-cliff-medium-gray/70 backdrop-blur-md border-gradient-to-r from-cliff-light-gray/20 to-cliff-medium-gray/20",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-12",
        compact: "p-3",
      },
      interactive: {
        true: "cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        false: "",
      },
      glow: {
        true: "shadow-2xl",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
      glow: false,
    },
  }
)
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children?: React.ReactNode
}
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, glow, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, interactive, glow }), className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-gradient bg-gradient-to-r from-cliff-white to-cliff-light-gray bg-clip-text text-transparent",
      className
    )}
    {...props}
  >
    {children}
  </h3>
))
CardTitle.displayName = "CardTitle"
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground text-slate-300", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-4", className)} {...props} />
))
CardContent.displayName = "CardContent"
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-6 border-t border-border/50", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"
const ThreatCard = React.forwardRef<HTMLDivElement, CardProps & {
  threatLevel?: 'low' | 'medium' | 'high' | 'critical'
}>(({ threatLevel = 'low', className, children, ...props }, ref) => {
  const threatVariantMap: Record<string, "success" | "warning" | "danger"> = {
    'low': 'success',
    'medium': 'warning',  
    'high': 'danger',
    'critical': 'danger'
  }
  const threatVariant = threatVariantMap[threatLevel]
  return (
    <Card
      ref={ref}
      variant={threatVariant}
      glow={threatLevel === 'critical'}
      className={cn(
        threatLevel === 'critical' && "animate-pulse-subtle border-red-500/50",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
})
ThreatCard.displayName = "ThreatCard"
const DataCard = React.forwardRef<HTMLDivElement, CardProps & {
  status?: 'active' | 'inactive' | 'error' | 'loading'
}>(({ status = 'active', className, children, ...props }, ref) => {
  const statusVariantMap: Record<string, "cosmic" | "glass" | "danger" | "info"> = {
    'active': 'cosmic',
    'inactive': 'glass', 
    'error': 'danger',
    'loading': 'info'
  }
  const statusVariant = statusVariantMap[status]
  return (
    <Card
      ref={ref}
      variant={statusVariant}
      interactive={status === 'active'}
      className={cn(
        status === 'loading' && "animate-pulse",
        status === 'error' && "border-red-500/50",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  )
})
DataCard.displayName = "DataCard"
const MetricCard = React.forwardRef<HTMLDivElement, CardProps & {
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'stable'
  icon?: React.ReactNode
}>(({ value, label, trend, icon, className, children, ...props }, ref) => {
  const trendColor = {
    'up': 'text-green-400',
    'down': 'text-red-400',
    'stable': 'text-blue-400'
  }[trend || 'stable']
  return (
    <Card
      ref={ref}
      variant="cosmic"
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm text-slate-400">{label}</p>
            <p className={cn("text-3xl font-bold", trendColor)}>{value}</p>
          </div>
          {icon && (
            <div className="text-slate-400">
              {icon}
            </div>
          )}
        </div>
        {children}
      </CardContent>
      {}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-cliff-light-gray to-transparent animate-pulse-slow" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-cliff-medium-gray to-transparent animate-pulse-slow delay-1000" />
      </div>
    </Card>
  )
})
MetricCard.displayName = "MetricCard"
export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  ThreatCard,
  DataCard,
  MetricCard,
  cardVariants
}
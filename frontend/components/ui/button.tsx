import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { VariantProps, cva } from 'class-variance-authority'
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-500 to-purple-600 text-primary-foreground hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300",
        destructive: "bg-gradient-to-r from-red-500 to-pink-600 text-destructive-foreground hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground border-blue-400/30 hover:border-blue-400/50 hover:bg-blue-400/10",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:bg-blue-400/10 text-blue-200",
        link: "text-primary underline-offset-4 hover:underline text-blue-300 hover:text-blue-200",
        cosmic: "bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-white hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600 shadow-lg hover:shadow-cyan-500/25 transition-all duration-300",
        danger: "bg-gradient-to-r from-red-600 to-orange-500 text-white hover:from-red-700 hover:to-orange-600 shadow-lg hover:shadow-red-500/25 transition-all duration-300",
        success: "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-green-500/25 transition-all duration-300",
        warning: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 shadow-lg hover:shadow-yellow-500/25 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
        iconLg: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children?: React.ReactNode
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading
    return (
      <button
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && "relative",
          isDisabled && "cursor-not-allowed"
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
        <div className={cn("flex items-center gap-2", loading && "opacity-0")}>
          {leftIcon && !loading && leftIcon}
          {children}
          {rightIcon && !loading && rightIcon}
        </div>
      </button>
    )
  }
)
Button.displayName = "Button"
export { Button, buttonVariants }
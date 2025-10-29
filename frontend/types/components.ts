import React from 'react'
import { VariantProps } from 'class-variance-authority'
import { SpaceObject } from './api'

// Base Component Types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  id?: string
  'data-testid'?: string
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  onKeyDown?: (event: React.KeyboardEvent) => void
}

// UI Component Variant Types
export interface ButtonVariants {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'cosmic' | 'danger' | 'success' | 'warning'
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon' | 'iconSm' | 'iconLg'
}

export interface CardVariants {
  variant?: 'default' | 'cosmic' | 'glass' | 'danger' | 'warning' | 'success' | 'info' | 'dark' | 'gradient'
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'compact'
  interactive?: boolean
  glow?: boolean
}

export interface BadgeVariants {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'critical' | 'high' | 'medium' | 'low' | 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'cosmic' | 'nebula' | 'solar' | 'nasa' | 'realtime' | 'ai'
  size?: 'default' | 'sm' | 'lg' | 'xl'
  animation?: 'none' | 'pulse' | 'bounce' | 'ping' | 'spin' | 'glow'
}

export interface AlertVariants {
  variant?: 'default' | 'destructive' | 'warning' | 'success' | 'info' | 'critical' | 'threat' | 'asteroid' | 'space' | 'earth' | 'solar' | 'cosmic'
  size?: 'default' | 'sm' | 'lg' | 'xl'
  animation?: 'none' | 'pulse' | 'bounce' | 'glow'
}

// Button Component Props
export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

// Card Component Props
export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    CardVariants {}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// Specialized Card Props
export interface ThreatCardProps extends CardProps {
  threatLevel?: 'low' | 'medium' | 'high' | 'critical'
}

export interface DataCardProps extends CardProps {
  status?: 'active' | 'inactive' | 'error' | 'loading'
}

export interface MetricCardProps extends CardProps {
  value: string | number
  label: string
  trend?: 'up' | 'down' | 'stable'
  icon?: React.ReactNode
}

// Badge Component Props
export interface BadgeProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    BadgeVariants {
  icon?: React.ReactNode
  count?: number | string
  dot?: boolean
  interactive?: boolean
}

export interface ThreatLevelBadgeProps extends Omit<BadgeProps, 'variant'> {
  level: 'critical' | 'high' | 'medium' | 'low'
}

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success'
  showDot?: boolean
}

export interface DataSourceBadgeProps extends Omit<BadgeProps, 'variant'> {
  source: 'nasa' | 'realtime' | 'ai' | 'cosmic'
}

export interface NotificationBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  count?: number
  dot?: boolean
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

// Alert Component Props
export interface AlertProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    AlertVariants {
  icon?: React.ReactNode
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  timestamp?: Date
  priority?: 'low' | 'medium' | 'high' | 'critical'
}

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}
export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

// Specialized Alert Props
export interface ThreatAlertProps extends Omit<AlertProps, 'variant'> {
  threatLevel: 'critical' | 'high' | 'medium' | 'low'
  threatType: string
  source: string
  estimatedImpact?: string
}

export interface SystemAlertProps extends Omit<AlertProps, 'variant'> {
  system: string
  status: 'online' | 'offline' | 'error' | 'maintenance'
  details?: string
}

export interface CosmicEventAlertProps extends Omit<AlertProps, 'variant'> {
  eventType: 'solar_flare' | 'asteroid' | 'satellite' | 'space_weather' | 'earth_event'
  severity: 'low' | 'moderate' | 'high' | 'extreme'
  location?: string
  duration?: string
}

// Dashboard Component Props
export interface ThreatOverviewProps {
  className?: string
  compact?: boolean
  showDetails?: boolean
}

export interface RealTimeAlertsProps {
  className?: string
  maxAlerts?: number
  showFilters?: boolean
  autoScroll?: boolean
  soundEnabled?: boolean
}

export interface AsteroidTrackerProps {
  className?: string
  maxItems?: number
  showFilters?: boolean
  autoRefresh?: boolean
  view?: 'list' | 'grid' | 'compact'
}

export interface SpaceWeatherStationProps {
  className?: string
  showDetails?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

// 3D Visualization Props
export interface SpaceVisualizationProps {
  className?: string
  width?: number
  height?: number
  autoRotate?: boolean
  showControls?: boolean
  showStats?: boolean
  quality?: 'low' | 'medium' | 'high' | 'ultra'
  cameraPosition?: [number, number, number]
  objects?: SpaceObject[]
  onObjectClick?: (object: SpaceObject) => void
  onObjectHover?: (object: SpaceObject | null) => void
}

// Form Component Props
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  autoResize?: boolean
}

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  children: React.ReactNode
  disabled?: boolean
  error?: string
  label?: string
}

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

export interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
  value: string
}

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
}

// Layout Component Props
export interface ContainerProps extends BaseComponentProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  centerContent?: boolean
  padding?: boolean
}

export interface GridProps extends BaseComponentProps {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  responsive?: boolean
}

export interface FlexProps extends BaseComponentProps {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: boolean
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

// Navigation Component Props
export interface NavItemProps {
  href?: string
  active?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  badge?: string | number
  children: React.ReactNode
  onClick?: () => void
}

export interface BreadcrumbProps {
  items: Array<{
    label: string
    href?: string
    active?: boolean
  }>
  separator?: React.ReactNode
}

export interface TabsProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
}

export interface TabItemProps {
  value: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  disabled?: boolean
}

// Modal and Overlay Props
export interface ModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export interface DialogProps extends ModalProps {
  title?: string
  description?: string
  actions?: React.ReactNode
}

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'right' | 'bottom' | 'left'
  variant?: 'default' | 'dark' | 'light'
  delay?: number
}

export interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  position?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}

// Data Display Props
export interface TableProps {
  data: any[]
  columns: Array<{
    key: string
    label: string
    sortable?: boolean
    render?: (value: any, item: any, index: number) => React.ReactNode
    width?: string | number
  }>
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (key: string, order: 'asc' | 'desc') => void
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (item: any, index: number) => void
  selectedRows?: string[]
  onSelectionChange?: (selectedRows: string[]) => void
  pagination?: PaginationProps
}

export interface ListProps {
  items: any[]
  renderItem: (item: any, index: number) => React.ReactNode
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
  size?: 'sm' | 'md' | 'lg'
}

// Chart and Visualization Props
export interface ChartProps {
  data: any[]
  width?: number
  height?: number
  responsive?: boolean
  theme?: 'light' | 'dark'
  className?: string
}

export interface LineChartProps extends ChartProps {
  xAxisKey: string
  yAxisKey: string
  lines: Array<{
    key: string
    color?: string
    strokeWidth?: number
  }>
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

export interface BarChartProps extends ChartProps {
  xAxisKey: string
  yAxisKey: string
  bars: Array<{
    key: string
    color?: string
  }>
  orientation?: 'vertical' | 'horizontal'
  showGrid?: boolean
  showLegend?: boolean
  showTooltip?: boolean
}

export interface PieChartProps extends ChartProps {
  dataKey: string
  nameKey: string
  colors?: string[]
  showLegend?: boolean
  showTooltip?: boolean
  innerRadius?: number
  outerRadius?: number
}

// Loading and State Props
export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | false
}

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  className?: string
}

export interface ProgressProps {
  value?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  label?: string
  className?: string
}

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

// Theme and Provider Props
export interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: 'dark' | 'light' | 'system'
  storageKey?: string
  enableSystem?: boolean
}

export interface WebSocketProviderProps {
  children: React.ReactNode
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  enableHistory?: boolean
  maxHistorySize?: number
}

export interface QueryProviderProps {
  children: React.ReactNode
}

// Event Handler Types
export interface ClickHandler {
  (event: React.MouseEvent<HTMLElement>): void
}

export interface KeyHandler {
  (event: React.KeyboardEvent<HTMLElement>): void
}

export interface ChangeHandler<T = string> {
  (value: T): void
}

export interface FormHandler {
  (event: React.FormEvent<HTMLFormElement>): void
}

// Animation and Transition Props
export interface AnimationProps {
  duration?: number
  delay?: number
  easing?: string
  loop?: boolean | number
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse'
}

export interface TransitionProps {
  in?: boolean
  timeout?: number
  appear?: boolean
  enter?: boolean
  exit?: boolean
  mountOnEnter?: boolean
  unmountOnExit?: boolean
  onEnter?: () => void
  onEntering?: () => void
  onEntered?: () => void
  onExit?: () => void
  onExiting?: () => void
  onExited?: () => void
}

// Accessibility Props
export interface AccessibilityProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-expanded'?: boolean
  'aria-hidden'?: boolean
  'aria-disabled'?: boolean
  'aria-selected'?: boolean
  'aria-checked'?: boolean | 'mixed'
  'aria-pressed'?: boolean | 'mixed'
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  'aria-live'?: 'off' | 'polite' | 'assertive'
  'aria-atomic'?: boolean
  role?: string
  tabIndex?: number
}

// Responsive Props
export interface ResponsiveValue<T> {
  base?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}

export type ResponsiveProps<T> = T | ResponsiveValue<T>

// Polymorphic Component Props
export interface PolymorphicProps<T extends React.ElementType> {
  as?: T
  children?: React.ReactNode
  className?: string
}

export type PolymorphicComponentProps<
  T extends React.ElementType,
  Props = {}
> = PolymorphicProps<T> &
  Props &
  Omit<React.ComponentPropsWithoutRef<T>, keyof (PolymorphicProps<T> & Props)>

// Component Ref Types
export type ComponentRef<T extends React.ElementType> = React.ComponentRef<T>

// Style System Props
export interface SpacingProps {
  m?: ResponsiveProps<string | number>
  mx?: ResponsiveProps<string | number>
  my?: ResponsiveProps<string | number>
  mt?: ResponsiveProps<string | number>
  mr?: ResponsiveProps<string | number>
  mb?: ResponsiveProps<string | number>
  ml?: ResponsiveProps<string | number>
  p?: ResponsiveProps<string | number>
  px?: ResponsiveProps<string | number>
  py?: ResponsiveProps<string | number>
  pt?: ResponsiveProps<string | number>
  pr?: ResponsiveProps<string | number>
  pb?: ResponsiveProps<string | number>
  pl?: ResponsiveProps<string | number>
}

export interface ColorProps {
  color?: ResponsiveProps<string>
  bg?: ResponsiveProps<string>
  borderColor?: ResponsiveProps<string>
}

export interface TypographyProps {
  fontSize?: ResponsiveProps<string | number>
  fontWeight?: ResponsiveProps<string | number>
  lineHeight?: ResponsiveProps<string | number>
  letterSpacing?: ResponsiveProps<string | number>
  textAlign?: ResponsiveProps<'left' | 'center' | 'right' | 'justify'>
  textTransform?: ResponsiveProps<'none' | 'uppercase' | 'lowercase' | 'capitalize'>
}

export interface LayoutProps {
  width?: ResponsiveProps<string | number>
  height?: ResponsiveProps<string | number>
  minWidth?: ResponsiveProps<string | number>
  minHeight?: ResponsiveProps<string | number>
  maxWidth?: ResponsiveProps<string | number>
  maxHeight?: ResponsiveProps<string | number>
  display?: ResponsiveProps<string>
  overflow?: ResponsiveProps<string>
  position?: ResponsiveProps<string>
  top?: ResponsiveProps<string | number>
  right?: ResponsiveProps<string | number>
  bottom?: ResponsiveProps<string | number>
  left?: ResponsiveProps<string | number>
  zIndex?: ResponsiveProps<string | number>
}

// Style System Combined Props
export interface SystemProps extends SpacingProps, ColorProps, TypographyProps, LayoutProps {}

// Forward Ref Types
export type ForwardRefComponent<T, P = {}> = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<P> & React.RefAttributes<T>
>

// Generic Component Types
export interface GenericComponentProps<T = any> extends BaseComponentProps {
  data?: T
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onError?: (error: Error) => void
}
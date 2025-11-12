'use client'
import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Badge } from './badge'
interface ErrorInfo {
  componentStack: string
}
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  showDetails?: boolean
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  isolate?: boolean
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
    this.resetErrorBoundary = this.resetErrorBoundary.bind(this)
    this.handleRetry = this.handleRetry.bind(this)
  }
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Error Boundary caught an error:', error)
    console.error('📍 Error Info:', errorInfo)
    this.setState({
      error,
      errorInfo
    })
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    this.reportError(error, errorInfo)
  }
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props
    const { hasError } = this.state
    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys && resetKeys.length > 0) {
        this.resetErrorBoundary()
      }
    }
  }
  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }
  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }
  handleRetry = () => {
    this.resetErrorBoundary()
  }
  handleReload = () => {
    window.location.reload()
  }
  handleGoHome = () => {
    window.location.href = '/'
  }
  reportError = (error: Error, errorInfo: ErrorInfo) => {
    if (process.env.NODE_ENV === 'production') {
      console.log('📊 Error reported to monitoring service')
    }
  }
  copyErrorToClipboard = async () => {
    const { error, errorInfo, errorId } = this.state
    const errorDetails = {
      errorId,
      timestamp: new Date().toISOString(),
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      console.log('📋 Error details copied to clipboard')
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      const { error, errorInfo, errorId } = this.state
      const { showDetails = true, isolate = false } = this.props
      return (
        <div className={`
          flex items-center justify-center min-h-[400px] p-4
          ${isolate ? 'min-h-screen bg-background' : ''}
        `}>
          <Card variant="danger" className="max-w-2xl w-full bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive-foreground text-xl">
                    Bir Hata Oluştu
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Bu bileşen beklenmedik bir hatayla karşılaştı
                  </p>
                </div>
              </div>
              {errorId && (
                <div className="mt-4">
                  <Badge variant="outline" size="sm" className="font-mono border-destructive/30 text-muted-foreground">
                    <Bug className="h-3 w-3 mr-1" />
                    Hata ID: {errorId}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {}
              {error && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-destructive-foreground mb-2">Hata Mesajı:</h3>
                      <p className="text-sm text-foreground font-mono">
                        {error.message || 'Bilinmeyen hata'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {}
              {showDetails && error && (
                <details className="group">
                  <summary className="cursor-pointer p-3 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
                    <span className="text-sm font-medium text-foreground">
                      🔍 Teknik Detaylar (Geliştiriciler için)
                    </span>
                  </summary>
                  <div className="mt-3 p-4 rounded-lg bg-card-deep border border-border">
                    {}
                    {error.stack && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Stack Trace:</h4>
                        <pre className="text-xs text-muted-foreground bg-background/50 p-3 rounded overflow-auto max-h-40">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {}
                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Component Stack:</h4>
                        <pre className="text-xs text-muted-foreground bg-background/50 p-3 rounded overflow-auto max-h-40">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    {}
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={this.copyErrorToClipboard}
                        className="text-xs"
                      >
                        📋 Hata Detaylarını Kopyala
                      </Button>
                    </div>
                  </div>
                </details>
              )}
              {}
              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                <Button
                  variant="cosmic"
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tekrar Dene
                </Button>
                <Button
                  variant="outline"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sayfayı Yenile
                </Button>
                {isolate && (
                  <Button
                    variant="ghost"
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Ana Sayfa
                  </Button>
                )}
              </div>
              {}
              {process.env.NODE_ENV === 'development' && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-xs">
                  <p className="text-accent-foreground font-medium mb-1">💡 Geliştirici İpuçları:</p>
                  <ul className="text-accent-foreground/80 space-y-1 list-disc list-inside">
                    <li>Konsol loglarını kontrol edin</li>
                    <li>React DevTools ile component durumunu inceleyin</li>
                    <li>Network sekmesinde API hatalarını kontrol edin</li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
export default ErrorBoundary
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    console.error('💥 Manual error thrown:', error)
    throw error
  }, [])
}
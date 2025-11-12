'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, MetricCard, ThreatCard } from '@/components/ui'
import { Badge, ThreatLevelBadge, StatusBadge } from '@/components/ui'
import { Progress } from '@/components/ui/progress'
import { useThreatData } from '@/hooks/use-threat-data'
import { useAIAnalysis } from '@/hooks/use-ai-analysis'
import { AlertTriangle, Shield, Target, Activity, TrendingUp, Clock, Globe, Brain, Zap, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { cn, formatNumber, formatRelativeTime } from '@/lib/utils'
import { convertThreatLevel, getThreatColor } from '@/types/api'
import { motion, AnimatePresence } from 'framer-motion'
interface ThreatOverviewProps {
  className?: string
  compact?: boolean
  showDetails?: boolean
}
const ThreatOverview: React.FC<ThreatOverviewProps> = ({ 
  className, 
  compact = false, 
  showDetails = true 
}) => {
  const { threatLevel, comprehensiveAssessment, activeAlerts, isLoading, lastRefresh } = useThreatData()
  const {
    startAnalysis,
    refreshAnalysis,
    isAnalysisRunning,
    currentAnalysis,
    latestSummary,
    recentInsights,
    correlationAlerts,
    isStartingAnalysis,
    canAnalyze,
    timeUntilNext,
    formatTimeRemaining
  } = useAIAnalysis()
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAnalysisRunning && !latestSummary) {
        startAnalysis()
      }
    }, 2000) // 2 saniye sonra otomatik başlat
    return () => clearTimeout(timer)
  }, [startAnalysis, isAnalysisRunning, latestSummary])
  const aiInsights = useMemo(() => {
    const insights = []
    if (recentInsights.length > 0) {
      return recentInsights.slice(0, 3).map(insight => ({
        type: insight.insight_type === 'HIGH_RISK' ? 'warning' :
              insight.insight_type === 'CORRELATION' ? 'info' : 'success',
        icon: insight.insight_type === 'HIGH_RISK' ? AlertTriangle :
              insight.insight_type === 'CORRELATION' ? Target : CheckCircle,
        title: insight.title,
        message: insight.description,
        confidence: insight.confidence_score
      }))
    }
    if (comprehensiveAssessment?.active_threats?.length > 0) {
      const highThreats = comprehensiveAssessment.active_threats.filter(t =>
        convertThreatLevel(t.severity) === 'Yüksek'
      )
      if (highThreats.length > 0) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: 'Yüksek Öncelik Tehditleri',
          message: `${highThreats.length} adet yüksek seviye tehdit tespit edildi. Sürekli izleme önerilir.`,
          confidence: 0.92
        })
      }
      const asteroids = comprehensiveAssessment.active_threats.filter(t => t.threat_type === 'asteroid')
      if (asteroids.length > 0) {
        insights.push({
          type: 'info',
          icon: Target,
          title: 'Asteroit Takip Sistemi',
          message: `${asteroids.length} asteroit yakın geçiş rotasında. Çarpma riski düşük seviyede.`,
          confidence: 0.87
        })
      }
    }
    insights.push({
      type: 'success',
      icon: CheckCircle,
      title: 'AI Sistem Durumu',
      message: 'Tüm izleme sistemleri optimal çalışıyor. Veri akışı stabil.',
      confidence: 0.95
    })
    return insights.slice(0, 3) // En fazla 3 insight
  }, [recentInsights, comprehensiveAssessment])
  const threatMetrics = useMemo(() => {
    if (!comprehensiveAssessment && !threatLevel) return null
    const assessment = comprehensiveAssessment
    const level = threatLevel
    const activeThreats = assessment?.active_threats || []
    const high = activeThreats.filter(t => 
      convertThreatLevel(t.severity) === 'Yüksek'
    ).length
    const medium = activeThreats.filter(t => 
      convertThreatLevel(t.severity) === 'Orta'
    ).length
    const low = activeThreats.filter(t => 
      convertThreatLevel(t.severity) === 'Düşük'
    ).length
    const total = activeThreats.length
    let aiProgress = 0
    let aiStatus = 'Hazır'
    if (isStartingAnalysis) {
      aiProgress = 0
      aiStatus = 'Başlatılıyor'
    } else if (isAnalysisRunning && currentAnalysis) {
      aiProgress = currentAnalysis.progress_percentage || 0
      aiStatus = 'Analiz Ediliyor'
    } else if (latestSummary) {
      aiProgress = 100
      aiStatus = 'Tamamlandı'
    } else {
      aiProgress = 0
      aiStatus = 'Başlatılacak'
    }
    const newIn24h = activeAlerts.filter(alert => {
      const created = new Date(alert.created_at)
      const now = new Date()
      const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
      return diffHours <= 24
    }).length
    return {
      total: total,
      high: high,
      medium: medium,
      low: low,
      activeMonitoring: level?.active_threats_count || 0,
      newIn24h: newIn24h,
      riskScore: level?.risk_score || 0,
      currentLevel: convertThreatLevel(level?.overall_threat_level || 'LOW'),
      aiProgress: aiProgress,
      aiStatus: aiStatus
    }
  }, [comprehensiveAssessment, threatLevel, activeAlerts, currentAnalysis, latestSummary, isAnalysisRunning])
  const activeThreatTypes = useMemo(() => {
    if (!comprehensiveAssessment) return []
    const threatCategories = comprehensiveAssessment.threat_categories || {}
    return Object.entries(threatCategories)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => {
        const turkishNames: Record<string, string> = {
          'asteroid': 'Asteroit',
          'earth_event': 'Doğal Olay', 
          'space_weather': 'Uzay Havası',
          'solar_flare': 'Güneş Patlaması',
          'geomagnetic': 'Jeomanyetik'
        }
        const maxSeverity = comprehensiveAssessment.active_threats
          .filter(t => t.threat_type === type)
          .reduce((max, threat) => {
            const current = convertThreatLevel(threat.severity)
            if (current === 'Yüksek') return 'Yüksek'
            if (current === 'Orta' && max !== 'Yüksek') return 'Orta'
            return max === 'Yüksek' ? 'Yüksek' : 'Düşük'
          }, 'Düşük')
        return {
          type: turkishNames[type] || type,
          count: count as number,
          severity: maxSeverity
        }
      })
      .slice(0, 5) // Maksimum 5 tür göster
  }, [comprehensiveAssessment])
  const lastUpdated = lastRefresh
  if (isLoading && !threatMetrics) {
    return (
      <Card variant="default" className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-cliff-light-gray/20 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-cliff-light-gray/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }
  if (!threatMetrics) {
    return (
      <Card variant="default" className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-400 animate-pulse" />
            AI Destekli Tehdit Analizi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-cliff-light-gray">AI analiz sistemi başlatılıyor...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card variant="default" className={cn("relative overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-cyan-400" />
            AI Destekli Tehdit Analizi
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getThreatColor(threatMetrics.currentLevel) }}
            />
          </CardTitle>
          <div className="flex items-center gap-3">
            {}
            <button
              onClick={() => refreshAnalysis && refreshAnalysis()}
              disabled={isAnalysisRunning || isStartingAnalysis}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                "border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isAnalysisRunning && "animate-pulse"
              )}
              title={canAnalyze ? "Analizi yenile" : `${formatTimeRemaining && formatTimeRemaining(timeUntilNext)} sonra tekrar analiz yapılabilir`}
            >
              <RefreshCw className={cn(
                "h-3 w-3",
                (isAnalysisRunning || isStartingAnalysis) && "animate-spin"
              )} />
              {isAnalysisRunning || isStartingAnalysis ? "Analiz Ediliyor" : "Yenile"}
            </button>
            {}
            {!canAnalyze && timeUntilNext > 0 && (
              <div className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                ⏱️ {formatTimeRemaining && formatTimeRemaining(timeUntilNext)}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-cliff-light-gray">
              <Clock className="h-4 w-4" />
              {lastUpdated && formatRelativeTime(lastUpdated)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-500/20"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {isAnalysisRunning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
              ) : (
                <Zap className="h-4 w-4 text-cyan-400" />
              )}
              <span className="text-sm font-medium text-cyan-300">AI Analiz Sistemi</span>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "border-cyan-500/30 transition-colors",
                isAnalysisRunning ? "bg-blue-500/20 text-blue-400 animate-pulse" : "bg-cyan-500/20 text-cyan-400"
              )}
            >
              {threatMetrics.aiStatus}
            </Badge>
          </div>
          {}
          <Progress
            value={threatMetrics.aiProgress}
            className="h-3 mb-2"
          />
          {}
          <div className="space-y-2">
            <div className="text-xs text-cliff-light-gray">
              {currentAnalysis?.current_activity || "Gerçek zamanlı NASA veri analizi sistemi"}
            </div>
            {}
            {(isAnalysisRunning || isStartingAnalysis) && (
              <div className="flex items-center justify-between text-xs bg-slate-800/50 rounded px-2 py-1">
                <span className="text-blue-400 capitalize">
                  {currentAnalysis?.current_phase?.replace('_', ' ') || 'Başlatılıyor'}
                </span>
                <span className="text-cyan-300 font-mono">
                  %{Math.round(threatMetrics?.aiProgress || 0)}
                </span>
              </div>
            )}
            {}
            {currentAnalysis && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="bg-slate-800/30 rounded px-2 py-1 text-center">
                  <div className="text-xs text-yellow-400 font-mono">
                    {currentAnalysis.threats_processed || 0}
                  </div>
                  <div className="text-xs text-gray-400">Tehdit</div>
                </div>
                <div className="bg-slate-800/30 rounded px-2 py-1 text-center">
                  <div className="text-xs text-purple-400 font-mono">
                    {currentAnalysis.correlations_found || 0}
                  </div>
                  <div className="text-xs text-gray-400">Bağlantı</div>
                </div>
                <div className="bg-slate-800/30 rounded px-2 py-1 text-center">
                  <div className="text-xs text-green-400 font-mono">
                    {currentAnalysis.ai_insights_generated || 0}
                  </div>
                  <div className="text-xs text-gray-400">Insight</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
        {}
        <AnimatePresence mode="wait">
          {aiInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Önerileri
              </h3>
              {aiInsights.map((insight, index) => {
                const IconComponent = insight.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      insight.type === 'warning' && 'bg-red-500/10 border-red-500/20',
                      insight.type === 'info' && 'bg-blue-500/10 border-blue-500/20',
                      insight.type === 'success' && 'bg-green-500/10 border-green-500/20'
                    )}
                  >
                    <IconComponent className={cn(
                      'h-4 w-4 mt-0.5',
                      insight.type === 'warning' && 'text-red-400',
                      insight.type === 'info' && 'text-blue-400',
                      insight.type === 'success' && 'text-green-400'
                    )} />
                    <div className="flex-1">
                      <h4 className="font-medium text-cliff-white text-sm">
                        {insight.title}
                      </h4>
                      <p className="text-xs text-cliff-light-gray mt-1">
                        {insight.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2">
                        <span className="text-xs text-cliff-light-gray">Güvenilirlik:</span>
                        <Badge variant="outline" size="sm" className="text-xs">
                          {Math.round(insight.confidence * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            value={formatNumber(threatMetrics.total)}
            title="Toplam Tehdit"
            icon={Target}
            trend="stable"
            className="border-blue-500/20"
          />
          <MetricCard
            value={threatMetrics.high}
            title="Yüksek Seviye"
            icon={AlertTriangle}
            trend={threatMetrics.high > 0 ? "up" : "stable"}
            className="border-red-500/20"
          />
          <MetricCard
            value={threatMetrics.activeMonitoring}
            title="Aktif İzleme"
            icon={Activity}
            trend="stable"
            className="border-green-500/20"
          />
        </div>
        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{threatMetrics.high}</div>
              <div className="text-xs text-red-300">Yüksek</div>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">{threatMetrics.medium}</div>
              <div className="text-xs text-orange-300">Orta</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{threatMetrics.low}</div>
              <div className="text-xs text-green-300">Düşük</div>
            </CardContent>
          </Card>
        </div>
        {}
        {showDetails && activeThreatTypes && activeThreatTypes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-cliff-white flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Aktif Tehdit Türleri
            </h3>
            <div className="grid gap-3">
              {activeThreatTypes.map((threatType, index) => (
                <div
                  key={threatType.type}
                  className="flex items-center justify-between p-3 rounded-lg bg-pure-black border border-cliff-light-gray/30"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getThreatColor(threatType.severity as any) }}
                    />
                    <span className="font-medium text-cliff-white">
                      {threatType.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" size="sm">
                      {threatType.count} aktif
                    </Badge>
                    <Badge 
                      variant={threatType.severity === 'Yüksek' ? 'destructive' : 
                              threatType.severity === 'Orta' ? 'warning' : 'default'} 
                      size="sm"
                    >
                      {threatType.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {}
        {showDetails && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-cliff-light-gray/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {threatMetrics.newIn24h}
              </div>
              <div className="text-xs text-cliff-light-gray">Son 24 Saat</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {formatNumber(threatMetrics.activeMonitoring)}
              </div>
              <div className="text-xs text-cliff-light-gray">İzlemede</div>
            </div>
            <div className="text-center md:col-span-1 col-span-2">
              <div 
                className="text-2xl font-bold"
                style={{ color: getThreatColor(threatMetrics.currentLevel) }}
              >
                {threatMetrics.currentLevel}
              </div>
              <div className="text-xs text-cliff-light-gray">Mevcut Seviye</div>
            </div>
          </div>
        )}
        {}
        <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-cyan-400 to-transparent animate-pulse-slow" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-radial from-blue-400 to-transparent animate-pulse-slow delay-1000" />
        </div>
      </CardContent>
    </Card>
  )
}
export default ThreatOverview
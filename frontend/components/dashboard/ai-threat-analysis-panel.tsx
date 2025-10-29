'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useAIAnalysis } from '@/hooks/use-ai-analysis'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  Network,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Cpu,
  Database,
  Target,
  Lightbulb,
  Shield
} from 'lucide-react'

interface AIAnalysisPanelProps {
  className?: string
  compact?: boolean
}

const AIThreatAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ 
  className, 
  compact = false 
}) => {
  const {
    currentAnalysis,
    isAnalysisRunning,
    recentInsights,
    correlationAlerts,
    urgentCorrelations,
    highConfidenceInsights,
    latestSummary,
    isAISystemHealthy,
    startAnalysis,
    isStartingAnalysis,
    isConnected
  } = useAIAnalysis()

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleStartAnalysis = useCallback(async () => {
    try {
      await startAnalysis({
        sources: ['nasa_neo', 'nasa_eonet', 'nasa_donki', 'spacex_api'],
        lookback_days: 7,
        include_predictions: true
      })
    } catch (error) {
      console.error('Failed to start analysis:', error)
    }
  }, [startAnalysis])

  const getPhaseDescription = (phase: string) => {
    const phases: Record<string, string> = {
      'initialization': 'Sistem Başlatılıyor',
      'data_collection': 'Veri Toplanıyor',
      'threat_analysis': 'AI Tehdit Analizi',
      'priority_calculation': 'Öncelik Hesaplama',
      'risk_assessment': 'Risk Değerlendirme',
      'correlation_analysis': 'Korelasyon Analizi',
      'ai_enhancement': 'AI Stratejik Analiz',
      'finalization': 'Sonuçlandırılıyor',
      'complete': 'Tamamlandı'
    }
    return phases[phase] || phase
  }

  const getPhaseBorderColor = (phase: string) => {
    const colors: Record<string, string> = {
      'initialization': 'border-blue-500/50',
      'data_collection': 'border-purple-500/50',
      'threat_analysis': 'border-orange-500/50',
      'priority_calculation': 'border-yellow-500/50',
      'risk_assessment': 'border-red-500/50',
      'correlation_analysis': 'border-green-500/50',
      'ai_enhancement': 'border-cyan-500/50',
      'finalization': 'border-indigo-500/50',
      'complete': 'border-emerald-500/50'
    }
    return colors[phase] || 'border-gray-500/50'
  }

  if (compact) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className={cn(
                  "h-8 w-8",
                  isAISystemHealthy ? "text-blue-400" : "text-red-400"
                )} />
                {isAnalysisRunning && (
                  <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-400">AI Analiz</p>
                <p className="text-lg font-bold text-white">
                  {isAnalysisRunning ? 'Aktif' : 'Beklemede'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {urgentCorrelations.length > 0 && (
                <Badge variant="destructive" size="sm">
                  {urgentCorrelations.length} Acil
                </Badge>
              )}
              {highConfidenceInsights.length > 0 && (
                <Badge variant="secondary" size="sm">
                  {highConfidenceInsights.length} Insight
                </Badge>
              )}
              <Button 
                size="sm" 
                onClick={handleStartAnalysis}
                disabled={isStartingAnalysis || isAnalysisRunning}
              >
                <Play className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className={cn(
              "h-5 w-5",
              isAISystemHealthy ? "text-blue-400" : "text-red-400"
            )} />
            AI Tehdit Analiz Sistemi
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Badge variant={isAISystemHealthy ? "success" : "destructive"} size="sm">
              {isAISystemHealthy ? "Sağlıklı" : "Hata"}
            </Badge>
            
            {!isAnalysisRunning && (
              <Button 
                onClick={handleStartAnalysis}
                disabled={isStartingAnalysis}
                size="sm"
              >
                {isStartingAnalysis ? (
                  <>
                    <Cpu className="h-4 w-4 mr-2 animate-spin" />
                    Başlatılıyor
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Analiz Başlat
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Real-time Analysis Progress */}
        {isAnalysisRunning && currentAnalysis && (
          <Card className={cn(
            "border-2 transition-all duration-500",
            getPhaseBorderColor(currentAnalysis.current_phase)
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400 animate-pulse" />
                  <span className="font-medium text-white">
                    {getPhaseDescription(currentAnalysis.current_phase)}
                  </span>
                </div>
                <Badge variant="outline" size="sm">
                  {currentAnalysis.progress_percentage.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-4">
              <Progress 
                value={currentAnalysis.progress_percentage} 
                className="h-2"
              />
              
              <div className="text-sm text-gray-400">
                {currentAnalysis.current_activity}
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-400">
                    {currentAnalysis.threats_processed}
                  </div>
                  <div className="text-xs text-gray-400">İşlenen</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-400">
                    {currentAnalysis.correlations_found}
                  </div>
                  <div className="text-xs text-gray-400">Korelasyon</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-400">
                    {currentAnalysis.ai_insights_generated}
                  </div>
                  <div className="text-xs text-gray-400">AI Insight</div>
                </div>
              </div>
              
              {currentAnalysis.estimated_completion_time && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  Tahmini Tamamlanma: {formatRelativeTime(new Date(currentAnalysis.estimated_completion_time))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Latest Summary Report */}
        {latestSummary && (
          <Card className="border-emerald-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Son Analiz Özeti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">
                    {latestSummary.total_threats_analyzed}
                  </div>
                  <div className="text-xs text-gray-400">Toplam Tehdit</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-400">
                    {latestSummary.high_priority_threats}
                  </div>
                  <div className="text-xs text-gray-400">Yüksek Öncelik</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-400">
                    {latestSummary.critical_correlations}
                  </div>
                  <div className="text-xs text-gray-400">Kritik Korelasyon</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-400">
                    {latestSummary.ai_recommendations_count}
                  </div>
                  <div className="text-xs text-gray-400">AI Öneri</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Genel Risk:</span>
                  <Badge variant={
                    latestSummary.overall_risk_assessment === 'CRITICAL' ? 'destructive' :
                    latestSummary.overall_risk_assessment === 'HIGH' ? 'warning' :
                    latestSummary.overall_risk_assessment === 'MEDIUM' ? 'secondary' : 'default'
                  }>
                    {latestSummary.overall_risk_assessment}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Güvenilirlik:</span>
                  <Progress value={latestSummary.confidence_score * 100} className="w-20 h-2" />
                </div>
              </div>
              
              {latestSummary.immediate_actions_required.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Acil Eylemler
                  </h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {latestSummary.immediate_actions_required.slice(0, 3).map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Target className="h-3 w-3 mt-0.5 text-red-400 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent AI Insights */}
        {recentInsights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-400" />
                AI Insight'lar
                <Badge variant="secondary" size="sm">
                  {recentInsights.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentInsights.slice(0, 3).map((insight) => (
                  <div 
                    key={insight.insight_id}
                    className="p-3 rounded-lg bg-gray-900/50 border border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-white">
                        {insight.title}
                      </h4>
                      <div className="flex items-center gap-1">
                        <Progress value={insight.confidence_score * 100} className="w-16 h-1" />
                        <span className="text-xs text-gray-400">
                          {(insight.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-300 mb-2">
                      {insight.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={insight.impact_assessment === 'CRITICAL' ? 'destructive' : 'secondary'}
                        size="sm"
                      >
                        {insight.insight_type}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(new Date(insight.analysis_timestamp))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgent Correlations */}
        {urgentCorrelations.length > 0 && (
          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <Network className="h-4 w-4" />
                Acil Korelasyon Uyarıları
                <Badge variant="destructive" size="sm">
                  {urgentCorrelations.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {urgentCorrelations.slice(0, 2).map((alert) => (
                  <div 
                    key={alert.correlation_id}
                    className="p-3 rounded-lg bg-red-900/20 border border-red-500/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="destructive" size="sm">
                        {alert.significance_level} Korelasyon
                      </Badge>
                      <div className="text-sm font-medium text-red-400">
                        Risk: {(alert.compound_risk_score * 100).toFixed(0)}%
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-2">
                      {alert.ai_analysis_summary}
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" size="sm">
                        {alert.related_threat_ids.length + 1} Tehdit
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {alert.correlation_type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-400" />
                  <span className="text-sm text-gray-300">Veri Kaynakları</span>
                </div>
                <Badge variant={isConnected ? "success" : "destructive"} size="sm">
                  {isConnected ? "Bağlı" : "Bağlantı Kesildi"}
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-gray-300">AI Sistemi</span>
                </div>
                <Badge variant={isAISystemHealthy ? "success" : "destructive"} size="sm">
                  {isAISystemHealthy ? "Aktif" : "Hata"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}

export default AIThreatAnalysisPanel
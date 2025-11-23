'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  Shield,
  Eye,
  Target,
  Activity,
  Flame,
  Maximize,
  MapPin,
  Zap,
  Rocket
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AIAnalysisData {
  risk_score: number
  risk_label: string
  impact_probability: string
  impact_energy: string
  impact_area: string
  size_comparison: string
  speed_comparison: string
  summary: string
}

interface AIInsightData {
  asteroidId: string
  asteroidName: string
  aiAnalysis: AIAnalysisData
  lastAnalyzed: Date
}

interface AIInsightsWidgetProps {
  selectedAsteroidId?: string | null
  className?: string
  onRequestAnalysis?: (asteroidId: string) => void
}

const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({
  selectedAsteroidId,
  className,
  onRequestAnalysis
}) => {
  const [aiInsightData, setAIInsightData] = useState<AIInsightData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateAIInsights = async (asteroidId: string): Promise<AIInsightData> => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiBase}/api/v1/ai-insights/asteroid/${encodeURIComponent(asteroidId)}/ai-insight`)
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`)
      }
      
      const data = await response.json()
      const insight = data.ai_insight
      
      return {
        asteroidId: insight.asteroid_id,
        asteroidName: insight.asteroid_name,
        aiAnalysis: insight.ai_analysis, // Backend artık JSON dönüyor
        lastAnalyzed: new Date(insight.analysis_timestamp),
      }
    } catch (error) {
      console.error('AI Insight API call failed:', error)
      return {
        asteroidId,
        asteroidName: asteroidId,
        aiAnalysis: {
          risk_score: 5,
          risk_label: "HATA",
          impact_probability: "?",
          impact_energy: "?",
          impact_area: "?",
          size_comparison: "?",
          speed_comparison: "?",
          summary: "Veri alınırken bir hata oluştu."
        },
        lastAnalyzed: new Date(),
      }
    }
  }

  useEffect(() => {
    if (selectedAsteroidId) {
      setIsLoading(true)
      generateAIInsights(selectedAsteroidId)
        .then(setAIInsightData)
        .catch(console.error)
        .finally(() => setIsLoading(false))
    } else {
      setAIInsightData(null)
    }
  }, [selectedAsteroidId])

  const getRiskColor = (score: number) => {
    if (score <= 2) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    if (score <= 5) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    if (score <= 8) return 'text-orange-400 bg-orange-500/10 border-orange-500/30'
    return 'text-red-400 bg-red-500/10 border-red-500/30'
  }

  const handleRefresh = () => {
    if (selectedAsteroidId) {
      setIsLoading(true)
      generateAIInsights(selectedAsteroidId)
        .then(setAIInsightData)
        .catch(console.error)
        .finally(() => setIsLoading(false))
      
      onRequestAnalysis?.(selectedAsteroidId)
    }
  }

  if (!selectedAsteroidId) {
    return (
      <Card className={cn("bg-black/40 border-white/10 backdrop-blur-sm", className)}>
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center justify-center py-8">
            <Brain className="w-12 h-12 text-blue-400 opacity-50 mb-4" />
            <h3 className="text-white/60 text-sm mb-2">AI Görüşleri</h3>
            <p className="text-white/40 text-xs">
              Bir asteroid seçin ve AI analizini görün
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("bg-black/60 border-white/10 backdrop-blur-md shadow-xl overflow-hidden", className)}>
      <CardHeader className="pb-2 border-b border-white/5">
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-semibold tracking-wide">AI ANALİZİ</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30 bg-blue-400/5">
            GOOGLE POWERED
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 space-y-4"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                  <Brain className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-400 font-medium">Google'da Araştırılıyor...</div>
                  <div className="text-xs text-white/40 mt-1">NASA JPL ve Sentry verileri taranıyor</div>
                </div>
              </div>
            </motion.div>
          ) : aiInsightData ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* 1. Risk Dashboard Section */}
              <div className="grid grid-cols-2 gap-3">
                {/* Risk Score Card */}
                <div className={cn("p-3 rounded-xl border flex flex-col items-center justify-center relative overflow-hidden", getRiskColor(aiInsightData.aiAnalysis.risk_score))}>
                  <div className="text-[10px] uppercase font-bold opacity-70 mb-1">Risk Skoru</div>
                  <div className="text-4xl font-black tracking-tighter">
                    {aiInsightData.aiAnalysis.risk_score}
                    <span className="text-lg opacity-50 font-medium">/10</span>
                  </div>
                  <Badge className="mt-2 bg-black/20 border-0 text-xs">
                    {aiInsightData.aiAnalysis.risk_label}
                  </Badge>
                </div>

                {/* Probability Card */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2 opacity-70">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] uppercase font-bold">Çarpma İhtimali</span>
                  </div>
                  <div className="text-xl font-mono font-bold text-white">
                    {aiInsightData.aiAnalysis.impact_probability}
                  </div>
                  <Progress 
                    value={aiInsightData.aiAnalysis.risk_score * 10} 
                    className="h-1 mt-3 bg-white/10" 
                  />
                </div>
              </div>

              {/* 2. Impact Scenario Grid */}
              <div>
                <div className="text-[10px] uppercase font-bold text-white/40 mb-2 flex items-center gap-2">
                  <Flame className="w-3 h-3" /> Etki Senaryosu
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <Zap className="w-3 h-3 text-yellow-400 mb-1" />
                    <div className="text-[9px] text-white/40">Enerji</div>
                    <div className="text-xs font-medium text-white leading-tight">
                      {aiInsightData.aiAnalysis.impact_energy}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <Maximize className="w-3 h-3 text-blue-400 mb-1" />
                    <div className="text-[9px] text-white/40">Boyut</div>
                    <div className="text-xs font-medium text-white leading-tight">
                      {aiInsightData.aiAnalysis.size_comparison}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <MapPin className="w-3 h-3 text-red-400 mb-1" />
                    <div className="text-[9px] text-white/40">Alan</div>
                    <div className="text-xs font-medium text-white leading-tight">
                      {aiInsightData.aiAnalysis.impact_area}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Speed & Fact */}
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-3 border border-white/5">
                <div className="flex items-start gap-3">
                  <Rocket className="w-4 h-4 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-cyan-200 mb-1">
                      {aiInsightData.aiAnalysis.speed_comparison}
                    </div>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      {aiInsightData.aiAnalysis.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                onClick={handleRefresh}
                variant="ghost"
                className="w-full h-8 text-xs text-white/40 hover:text-white hover:bg-white/5"
              >
                <Activity className="w-3 h-3 mr-2" />
                Analizi Yenile
              </Button>
            </motion.div>
          ) : (
            <div className="text-center py-8 text-white/40 text-sm">
              Veri yüklenemedi.
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

export default AIInsightsWidget

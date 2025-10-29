'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Clock, Target, Zap, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ThreatData {
  threat_id: string
  title: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  threat_type: string
  source: string
  final_risk_score: number
  confidence_score: number
  coordinates?: { lat: number; lng: number }
  time_to_impact_hours?: number
  impact_probability: number
}

interface AsteroidDetailPanelProps {
  asteroid: ThreatData | null
  isOpen: boolean
  onClose: () => void
}

export const AsteroidDetailPanel: React.FC<AsteroidDetailPanelProps> = ({
  asteroid,
  isOpen,
  onClose
}) => {
  if (!asteroid) return null

  // Tehdit seviyesi rengi
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-400 bg-red-400/10 border-red-400/20'
      case 'HIGH': return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
      case 'LOW': return 'text-green-400 bg-green-400/10 border-green-400/20'
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
    }
  }

  // Risk seviyesi ikonu
  const getRiskIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle className="w-5 h-5 text-red-400" />
      case 'HIGH': return <Zap className="w-5 h-5 text-orange-400" />
      case 'MEDIUM': return <Target className="w-5 h-5 text-yellow-400" />
      case 'LOW': return <Info className="w-5 h-5 text-green-400" />
      default: return <Info className="w-5 h-5 text-gray-400" />
    }
  }

  // Risk skorunu yüzdeye çevir
  const riskPercentage = Math.round(asteroid.final_risk_score * 100)
  const confidencePercentage = Math.round(asteroid.confidence_score * 100)
  const impactPercentage = Math.round(asteroid.impact_probability * 100)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-pure-black/95 border border-cyan-400/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-800/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getRiskIcon(asteroid.severity)}
                  <div>
                    <h2 className="text-xl font-bold text-white">{asteroid.title}</h2>
                    <p className="text-sm text-gray-400 mt-1">ID: {asteroid.threat_id}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-white hover:bg-gray-800/50"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                
                {/* Tehdit Seviyesi */}
                <Card className="p-4 bg-gray-900/50 border-gray-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">Tehdit Seviyesi</h3>
                    <Badge className={getSeverityColor(asteroid.severity)}>
                      {asteroid.severity}
                    </Badge>
                  </div>
                  
                  {/* Risk Skoru Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Risk Skoru</span>
                      <span className="text-white font-mono">{riskPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          riskPercentage >= 80 ? 'bg-red-400' :
                          riskPercentage >= 60 ? 'bg-orange-400' :
                          riskPercentage >= 40 ? 'bg-yellow-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${riskPercentage}%` }}
                      />
                    </div>
                  </div>
                </Card>

                {/* Analiz Detayları */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Güven Skoru */}
                  <Card className="p-4 bg-gray-900/50 border-gray-800/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-medium text-white">Güven Skoru</h4>
                    </div>
                    <div className="text-2xl font-bold text-cyan-400">{confidencePercentage}%</div>
                    <div className="text-xs text-gray-400 mt-1">AI analiz güveni</div>
                  </Card>

                  {/* Çarpma Olasılığı */}
                  <Card className="p-4 bg-gray-900/50 border-gray-800/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <h4 className="font-medium text-white">Çarpma Olasılığı</h4>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">{impactPercentage}%</div>
                    <div className="text-xs text-gray-400 mt-1">İstatistiksel risk</div>
                  </Card>

                  {/* Zaman Bilgisi */}
                  {asteroid.time_to_impact_hours && (
                    <Card className="p-4 bg-gray-900/50 border-gray-800/50">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <h4 className="font-medium text-white">Çarpışmaya Kalan Süre</h4>
                      </div>
                      <div className="text-2xl font-bold text-blue-400">
                        {asteroid.time_to_impact_hours < 24 
                          ? `${Math.round(asteroid.time_to_impact_hours)}h`
                          : `${Math.round(asteroid.time_to_impact_hours / 24)}d`
                        }
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {asteroid.time_to_impact_hours < 48 ? 'Acil!' : 'Yakın gelecek'}
                      </div>
                    </Card>
                  )}

                  {/* Veri Kaynağı */}
                  <Card className="p-4 bg-gray-900/50 border-gray-800/50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Info className="w-4 h-4 text-green-400" />
                      <h4 className="font-medium text-white">Veri Kaynağı</h4>
                    </div>
                    <div className="text-lg font-semibold text-green-400 capitalize">
                      {asteroid.source.replace('_', ' ').replace('nasa', 'NASA')}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Güvenilir kaynak</div>
                  </Card>
                </div>

                {/* Koordinat Bilgisi */}
                {asteroid.coordinates && (
                  <Card className="p-4 bg-gray-900/50 border-gray-800/50">
                    <h4 className="font-medium text-white mb-3">Konum Bilgisi</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Enlem:</span>
                        <span className="ml-2 text-white font-mono">
                          {asteroid.coordinates.lat.toFixed(4)}°
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Boylam:</span>
                        <span className="ml-2 text-white font-mono">
                          {asteroid.coordinates.lng.toFixed(4)}°
                        </span>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Eylem Önerileri */}
                <Card className="p-4 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-400/30">
                  <h4 className="font-medium text-cyan-400 mb-3 flex items-center">
                    <Zap className="w-4 h-4 mr-2" />
                    AI Önerileri
                  </h4>
                  <div className="space-y-2 text-sm">
                    {asteroid.severity === 'CRITICAL' && (
                      <div className="text-red-400">• Acil izleme protokolü aktive edilmeli</div>
                    )}
                    {asteroid.severity === 'HIGH' && (
                      <div className="text-orange-400">• Sürekli gözlem altında tutulmalı</div>
                    )}
                    {riskPercentage > 50 && (
                      <div className="text-yellow-400">• Risk azaltma stratejileri değerlendirilmeli</div>
                    )}
                    <div className="text-cyan-400">• Yörünge hesaplamaları güncellenmeli</div>
                    <div className="text-green-400">• İlgili kurumlara bildirim yapılmalı</div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-800/50 bg-gray-900/30">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  CLIFF AI Tehdit Analiz Sistemi tarafından analiz edildi
                </div>
                <Button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  Kapat
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AsteroidDetailPanel
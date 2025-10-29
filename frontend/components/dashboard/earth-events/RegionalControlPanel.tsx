'use client'

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { GeographicRegion, REGION_COLORS, REGION_INFO } from '@/lib/geographic-regions'
import { useEarthEventsStore } from '@/stores/earthEventsStore'

interface RegionalControlPanelProps {
  isOpen: boolean
  onToggle: () => void
}

const regionOrder = [
  GeographicRegion.EUROPE,
  GeographicRegion.ASIA,
  GeographicRegion.NORTH_AMERICA,
  GeographicRegion.SOUTH_AMERICA,
  GeographicRegion.AFRICA,
  GeographicRegion.OCEANIA,
  GeographicRegion.MIDDLE_EAST,
  GeographicRegion.ARCTIC
]

export function RegionalControlPanel({ isOpen, onToggle }: RegionalControlPanelProps) {
  const {
    regionColorMode,
    setRegionColorMode,
    regionVisibility,
    toggleRegionVisibility,
    selectedRegion,
    selectRegion,
    getRegionStats,
    events
  } = useEarthEventsStore()

  const regionStats = useMemo(() => getRegionStats(), [events])

  const getRegionEventCount = (region: GeographicRegion) => {
    const stats = regionStats.find(s => s.region === region)
    return stats?.eventCount || 0
  }

  const handleRegionSelect = (region: GeographicRegion) => {
    if (selectedRegion === region) {
      selectRegion(null)
    } else {
      selectRegion(region)
    }
  }

  const allVisible = Array.from(regionVisibility.values()).every(visible => visible)
  const allHidden = Array.from(regionVisibility.values()).every(visible => !visible)

  const toggleAllRegions = () => {
    if (allVisible || (!allVisible && !allHidden)) {
      regionOrder.forEach(region => {
        if (regionVisibility.get(region)) {
          toggleRegionVisibility(region)
        }
      })
    } else {
      regionOrder.forEach(region => {
        if (!regionVisibility.get(region)) {
          toggleRegionVisibility(region)
        }
      })
    }
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-white font-medium">Bölgesel Kontroller</span>
        </div>
        <ChevronDownIcon 
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-700/50"
          >
            <div className="p-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">
                    Bölgesel Renk Modu
                  </label>
                  <button
                    onClick={() => setRegionColorMode(!regionColorMode)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      regionColorMode ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      regionColorMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">
                    Tüm Bölgeler
                  </span>
                  <button
                    onClick={toggleAllRegions}
                    className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                  >
                    {allVisible ? 'Tümünü Gizle' : 'Tümünü Göster'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {regionOrder.map(region => {
                  const regionInfo = REGION_INFO[region]
                  const regionColors = REGION_COLORS[region]
                  const isVisible = regionVisibility.get(region)
                  const isSelected = selectedRegion === region
                  const eventCount = getRegionEventCount(region)

                  return (
                    <div
                      key={region}
                      className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-blue-500/20 border border-blue-500/50' 
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <button
                        onClick={() => handleRegionSelect(region)}
                        className="flex items-center gap-3 flex-1"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white/20"
                            style={{ backgroundColor: regionColors?.primary }}
                          />
                          <span className="text-sm font-medium text-white">
                            {regionInfo?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-gray-400">
                            {eventCount} olay
                          </span>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => toggleRegionVisibility(region)}
                        className={`ml-2 w-5 h-5 rounded border-2 transition-colors flex items-center justify-center ${
                          isVisible
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {isVisible && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>

              {selectedRegion && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: REGION_COLORS[selectedRegion]?.primary }}
                    />
                    <span className="text-sm font-medium text-blue-300">
                      {REGION_INFO[selectedRegion]?.name} Seçildi
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {getRegionEventCount(selectedRegion)} olay bu bölgede aktif. 
                    Sadece bu bölgedeki olaylar gösteriliyor.
                  </p>
                </motion.div>
              )}

              {regionColorMode && (
                <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full" />
                    <span className="text-sm font-medium text-green-300">
                      Bölgesel Renk Modu Aktif
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Olaylar kategoriye değil, bulundukları bölgeye göre renklendiriliyor.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RegionalControlPanel
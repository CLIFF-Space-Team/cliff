'use client'
import React, { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImpactResults, ImpactLocation } from './types'
import { 
  AlertTriangle, Flame, Waves, Activity, Zap, Users, Mountain, 
  Wind, Globe, TrendingUp, FileText, Download, Share2, ChevronDown, ChevronUp, Sparkles, Presentation
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { MemeGenerator } from './MemeGenerator'
import { SlideReport } from './SlideReport/SlideReport'
import { MemeComposer } from './3D/MemeComposer'
interface ProfessionalResultsPanelProps {
  results: ImpactResults
  location: ImpactLocation
  asteroidParams: {
    diameter_m: number
    velocity_kms: number
    angle_deg: number
    density: number
  }
}
export function ProfessionalResultsPanel({ 
  results, 
  location,
  asteroidParams 
}: ProfessionalResultsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    atmospheric: true,
    crater: true,
    effects: true
  })
  const [showMemeGenerator, setShowMemeGenerator] = useState(false)
  const [showSlideReport, setShowSlideReport] = useState(false)
  const [impactImage, setImpactImage] = useState<string>()
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  const handleDownloadPNG = async () => {
    if (!reportRef.current) return
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `asteroid-impact-report-${location.cityName || 'location'}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('PNG indirme hatası:', error)
    }
  }
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })
      const imgWidth = 210
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= 297
      }
      pdf.save(`asteroid-impact-report-${location.cityName || 'location'}-${Date.now()}.pdf`)
    } catch (error) {
      console.error('PDF indirme hatası:', error)
    }
  }
  const handleOpenSlideReport = async () => {
    if (!impactImage && !isGeneratingImage) {
      setIsGeneratingImage(true)
      try {
        const imageData = await MemeComposer.renderImpact({
          lat: location.lat,
          lng: location.lng,
          impactMetrics: {
            energy: results.energy.megatonsTNT,
            craterDiameter: results.crater.finalDiameter_m / 1000,
            craterDepth: results.crater.finalDepth_m / 1000,
            magnitude: results.seismic.magnitude,
            thermalRadiation: results.thermal.fireball_maxRadius_m,
            maxWindSpeed: results.airBlast.radius_20psi_km,
            seismicMagnitude: results.seismic.magnitude
          },
          asteroidDiameter: asteroidParams.diameter_m
        })
        setImpactImage(imageData)
      } catch (error) {
        console.error('3D görsel üretimi hatası:', error)
      } finally {
        setIsGeneratingImage(false)
      }
    }
    setShowSlideReport(true)
  }
  const formatScientific = (num: number) => {
    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
      return '0.00e+0'
    }
    return num.toExponential(2)
  }
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
      return '0.00'
    }
    return num.toFixed(decimals)
  }
  return (
    <>
      <MemeGenerator
        open={showMemeGenerator}
        onClose={() => setShowMemeGenerator(false)}
        memeOptions={{
          asteroidParams,
          location,
          results
        }}
      />
      {showSlideReport && (
        <SlideReport
          results={results}
          location={location}
          asteroidParams={asteroidParams}
          onClose={() => setShowSlideReport(false)}
          impactImage={impactImage}
        />
      )}
      <Card className="bg-pure-black/95 backdrop-blur-md border-cliff-white/10 h-full flex flex-col">
        <CardHeader className="border-b border-cliff-white/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-cliff-white">
              <FileText className="h-5 w-5 text-blue-400" />
              Bilimsel Etki Raporu
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 gap-1.5"
                onClick={handleOpenSlideReport}
                disabled={isGeneratingImage}
                title="Slayt Raporu"
              >
                <Presentation className="h-4 w-4 text-blue-400" />
                <span className="text-xs">{isGeneratingImage ? '⏳' : 'Slayt'}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={() => setShowMemeGenerator(true)}
                title="Meme oluştur ve paylaş"
              >
                <Sparkles className="h-4 w-4 text-orange-400" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={handleDownloadPNG}
                title="PNG olarak indir"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2"
                onClick={handleDownloadPDF}
                title="PDF olarak indir"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>
        <p className="text-xs text-cliff-light-gray mt-1">
          NASA/JPL Impact Physics • Collins et al. (2005) • Holsapple & Housen (2007)
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-4 overflow-y-auto flex-1" ref={reportRef}>
        {}
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">
                {results.comparison.realWorldEvent}
              </h3>
              <p className="text-sm text-cliff-white mb-3">
                Bu etki <strong className="text-red-400">{results.comparison.realWorldEvent}</strong> olayının{' '}
                <strong className="text-yellow-400">{formatNumber(results.comparison.multiplier, 1)}x</strong> gücündedir.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/30 rounded px-2 py-1.5">
                  <p className="text-[10px] text-cliff-light-gray">Enerji (Megaton TNT)</p>
                  <p className="text-sm font-bold text-white">{formatNumber(results.energy.megatonsTNT)} MT</p>
                </div>
                <div className="bg-black/30 rounded px-2 py-1.5">
                  <p className="text-[10px] text-cliff-light-gray">Kiloton TNT</p>
                  <p className="text-sm font-bold text-white">{formatNumber(results.energy.kilotonsTNT)} kt</p>
                </div>
                <div className="bg-black/30 rounded px-2 py-1.5 col-span-2">
                  <p className="text-[10px] text-cliff-light-gray">Toplam Enerji (Joule)</p>
                  <p className="text-xs font-mono text-blue-300">{formatScientific(results.energy.joules)} J</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {}
        <div className="border border-blue-500/30 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('atmospheric')}
            className="w-full bg-blue-500/10 hover:bg-blue-500/20 transition-colors p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-blue-400">Atmosferik Giriş ve Yörünge</h4>
            </div>
            {expandedSections.atmospheric ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.atmospheric && (
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Giriş Hızı</p>
                  <p className="text-sm font-bold text-white">{asteroidParams.velocity_kms} km/s</p>
                </div>
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Çarpma Açısı</p>
                  <p className="text-sm font-bold text-white">{asteroidParams.angle_deg}°</p>
                </div>
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Çap</p>
                  <p className="text-sm font-bold text-white">{asteroidParams.diameter_m} m</p>
                </div>
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Yoğunluk</p>
                  <p className="text-sm font-bold text-white">{asteroidParams.density} kg/m³</p>
                </div>
              </div>
              {results.atmospheric.occurredInAtmosphere && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mt-2">
                  <p className="text-xs text-yellow-300 font-semibold mb-1">⚠️ Atmosferik Parçalanma</p>
                  <p className="text-xs text-cliff-white">
                    <strong>Yükseklik:</strong> {formatNumber(results.atmospheric.breakupAltitude_m / 1000, 1)} km
                  </p>
                  <p className="text-xs text-cliff-white">
                    <strong>Hava Patlaması Enerjisi:</strong> {formatScientific(results.atmospheric.airburstEnergy_joules)} J
                  </p>
                  <p className="text-xs text-cliff-white">
                    <strong>Ateş Topu Yarıçapı:</strong> {formatNumber(results.atmospheric.fireballRadius_m)} m
                  </p>
                </div>
              )}
              <div className="text-[10px] text-blue-300 bg-blue-500/5 rounded p-2">
                📚 <strong>Referans:</strong> Chyba et al. (1993), Hills & Goda (1993) - Atmospheric Entry Physics
              </div>
            </div>
          )}
        </div>
        {}
        <div className="border border-orange-500/30 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('crater')}
            className="w-full bg-orange-500/10 hover:bg-orange-500/20 transition-colors p-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-orange-400" />
              <h4 className="text-sm font-semibold text-orange-400">
                Krater Morfolojisi ({results.crater.craterType.toUpperCase()})
              </h4>
            </div>
            {expandedSections.crater ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expandedSections.crater && (
            <div className="p-3 space-y-2">
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded p-3 border border-orange-500/30">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <p className="text-xs text-cliff-light-gray">Çap (Transient)</p>
                    <p className="text-lg font-bold text-white">
                      {formatNumber(results.crater.transientDiameter_m / 1000, 2)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cliff-light-gray">Çap (Final)</p>
                    <p className="text-lg font-bold text-orange-400">
                      {formatNumber(results.crater.finalDiameter_m / 1000, 2)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cliff-light-gray">Derinlik (Transient)</p>
                    <p className="text-lg font-bold text-white">
                      {formatNumber(results.crater.transientDepth_m / 1000, 3)} km
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cliff-light-gray">Derinlik (Final)</p>
                    <p className="text-lg font-bold text-orange-400">
                      {formatNumber(results.crater.finalDepth_m / 1000, 3)} km
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-cliff-white">
                    <strong>Hacim:</strong> {formatNumber(results.crater.volume_km3, 2)} km³
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Kenar Yüksekliği</p>
                  <p className="text-sm font-bold text-white">{formatNumber(results.crater.rimHeight_m)} m</p>
                </div>
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Kenar Çapı</p>
                  <p className="text-sm font-bold text-white">{formatNumber(results.crater.rimDiameter_m / 1000, 2)} km</p>
                </div>
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Ejecta Kalınlığı</p>
                  <p className="text-sm font-bold text-white">{formatNumber(results.crater.ejectaBlanketThickness_m, 1)} m</p>
                </div>
                <div className="bg-pure-black/50 rounded p-2">
                  <p className="text-[10px] text-cliff-light-gray">Ejecta Menzili</p>
                  <p className="text-sm font-bold text-white">{formatNumber(results.crater.ejectaBlanketRange_m / 1000, 1)} km</p>
                </div>
              </div>
              {results.crater.hasCentralPeak && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded p-2">
                  <p className="text-xs text-purple-300 font-semibold mb-1">🏔️ Merkez Tepe (Complex Crater)</p>
                  <p className="text-xs text-cliff-white">
                    <strong>Yükseklik:</strong> {formatNumber(results.crater.centralPeakHeight_m || 0)} m
                  </p>
                  <p className="text-[10px] text-purple-200 mt-1">
                    Büyük etkilerde krater merkez kararsızlık nedeniyle tepe oluşturur.
                  </p>
                </div>
              )}
              <div className="text-[10px] text-orange-300 bg-orange-500/5 rounded p-2">
                📚 <strong>Referans:</strong> Holsapple & Housen (2007) - Crater Scaling Laws • Melosh (1989)
              </div>
            </div>
          )}
        </div>
        {}
        <div className="bg-pure-black/50 border border-brown-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-brown-400" />
            <h4 className="text-sm font-semibold text-brown-400">Fırlatılan Malzeme (Ejecta)</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/30 rounded p-2">
              <p className="text-[10px] text-cliff-light-gray">Toplam Kütle</p>
              <p className="text-xs font-mono text-white">{formatScientific(results.ejecta.totalEjectaMass_kg)} kg</p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[10px] text-cliff-light-gray">Fırlatma Hızı</p>
              <p className="text-sm font-bold text-white">{formatNumber(results.ejecta.ejectaVelocity_ms)} m/s</p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[10px] text-cliff-light-gray">Maksimum Menzil</p>
              <p className="text-sm font-bold text-white">{formatNumber(results.ejecta.maxEjectaRange_km, 1)} km</p>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[10px] text-cliff-light-gray">Erimiş Kayaç</p>
              <p className="text-xs font-mono text-orange-300">{formatScientific(results.ejecta.meltVolume_m3)} m³</p>
            </div>
          </div>
          <div className="mt-2 bg-red-500/10 border border-red-500/30 rounded p-2">
            <p className="text-[10px] text-red-300">
              🔥 <strong>Buharlaşan Malzeme:</strong> {formatScientific(results.ejecta.vaporizedMass_kg)} kg
            </p>
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-orange-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Wind className="h-4 w-4 text-orange-400" />
            <h4 className="text-sm font-semibold text-orange-400">Hava Dalgası (Overpressure)</h4>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center bg-red-500/20 rounded px-2 py-1.5">
              <span className="text-xs text-cliff-white">20 psi - Tüm yapılar yıkılır</span>
              <span className="text-sm font-bold text-red-400">{formatNumber(results.airBlast.radius_20psi_km, 2)} km</span>
            </div>
            <div className="flex justify-between items-center bg-orange-500/20 rounded px-2 py-1.5">
              <span className="text-xs text-cliff-white">10 psi - Betonarme binalar hasar</span>
              <span className="text-sm font-bold text-orange-400">{formatNumber(results.airBlast.radius_10psi_km, 2)} km</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-500/20 rounded px-2 py-1.5">
              <span className="text-xs text-cliff-white">5 psi - Çoğu bina yıkılır</span>
              <span className="text-sm font-bold text-yellow-400">{formatNumber(results.airBlast.radius_5psi_km, 2)} km</span>
            </div>
            <div className="flex justify-between items-center bg-green-500/20 rounded px-2 py-1.5">
              <span className="text-xs text-cliff-white">1 psi - Camlar kırılır</span>
              <span className="text-sm font-bold text-green-400">{formatNumber(results.airBlast.radius_1psi_km, 2)} km</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-orange-300 bg-orange-500/5 rounded p-2">
            📚 <strong>Referans:</strong> Kinney & Graham (1985) - Explosive Shocks in Air
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-yellow-400" />
            <h4 className="text-sm font-semibold text-yellow-400">Termal Radyasyon</h4>
          </div>
          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded p-2 mb-2">
            <p className="text-xs text-cliff-light-gray mb-1">Ateş Topu Parametreleri</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-cliff-light-gray">Maksimum Yarıçap</p>
                <p className="text-sm font-bold text-white">{formatNumber(results.thermal.fireball_maxRadius_m)} m</p>
              </div>
              <div>
                <p className="text-[10px] text-cliff-light-gray">Süre</p>
                <p className="text-sm font-bold text-white">{formatNumber(results.thermal.fireball_duration_s, 1)} s</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-cliff-light-gray">Maksimum Sıcaklık</p>
                <p className="text-sm font-bold text-orange-400">{formatNumber(results.thermal.fireball_maxTemperature_K)} K</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center bg-red-500/20 rounded px-2 py-1">
              <span className="text-xs text-cliff-white">3. derece yanık</span>
              <span className="text-sm font-bold text-red-400">{formatNumber(results.thermal.thirdDegree_km, 2)} km</span>
            </div>
            <div className="flex justify-between items-center bg-orange-500/20 rounded px-2 py-1">
              <span className="text-xs text-cliff-white">2. derece yanık</span>
              <span className="text-sm font-bold text-orange-400">{formatNumber(results.thermal.secondDegree_km, 2)} km</span>
            </div>
            <div className="flex justify-between items-center bg-yellow-500/20 rounded px-2 py-1">
              <span className="text-xs text-cliff-white">1. derece yanık</span>
              <span className="text-sm font-bold text-yellow-400">{formatNumber(results.thermal.firstDegree_km, 2)} km</span>
            </div>
            <div className="flex justify-between items-center bg-green-500/20 rounded px-2 py-1">
              <span className="text-xs text-cliff-white">Ahşap tutuşma</span>
              <span className="text-sm font-bold text-green-400">{formatNumber(results.thermal.ignitesWood_km, 2)} km</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-yellow-300 bg-yellow-500/5 rounded p-2">
            📚 <strong>Referans:</strong> Glasstone & Dolan (1977) - Thermal Radiation Effects
          </div>
        </div>
        {}
        <div className="bg-pure-black/50 border border-purple-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-purple-400" />
            <h4 className="text-sm font-semibold text-purple-400">Sismik Etki</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-500/20 rounded p-2">
              <p className="text-xs text-cliff-light-gray">Richter Büyüklüğü</p>
              <p className="text-2xl font-bold text-white">{formatNumber(results.seismic.magnitude, 1)}</p>
            </div>
            <div className="bg-purple-500/20 rounded p-2">
              <p className="text-xs text-cliff-light-gray">Moment Magnitude</p>
              <p className="text-2xl font-bold text-white">{formatNumber(results.seismic.magnitude_Moment, 1)}</p>
            </div>
            <div className="col-span-2 bg-black/30 rounded p-2">
              <p className="text-[10px] text-cliff-light-gray">Hissedilme Mesafesi</p>
              <p className="text-lg font-bold text-purple-300">{formatNumber(results.seismic.feltRadius_km, 0)} km</p>
            </div>
            <div className="col-span-2 bg-black/30 rounded p-2">
              <p className="text-[10px] text-cliff-light-gray">Sismik Enerji</p>
              <p className="text-xs font-mono text-purple-200">{formatScientific(results.seismic.seismicEnergy_joules)} J</p>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-purple-300 bg-purple-500/5 rounded p-2">
            📚 <strong>Referans:</strong> Schultz & Gault (1975) • Ivanov (2005) - Seismic Effects
          </div>
        </div>
        {}
        {results.tsunami && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="h-4 w-4 text-blue-400" />
              <h4 className="text-sm font-semibold text-blue-400">Tsunami Analizi</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/30 rounded p-2">
                <p className="text-xs text-cliff-light-gray">Maksimum Yükseklik</p>
                <p className="text-2xl font-bold text-white">{formatNumber(results.tsunami.maxHeight_m, 1)} m</p>
              </div>
              <div className="bg-black/30 rounded p-2">
                <p className="text-xs text-cliff-light-gray">Varış Süresi</p>
                <p className="text-2xl font-bold text-white">{results.tsunami.arrivalTime_minutes} dk</p>
              </div>
              <div className="col-span-2 bg-black/30 rounded p-2">
                <p className="text-[10px] text-cliff-light-gray">Dalga Hızı</p>
                <p className="text-sm font-bold text-blue-300">{formatNumber(results.tsunami.waveSpeed_ms)} m/s</p>
              </div>
            </div>
          </div>
        )}
        {}
        {!location.isOcean && results.casualties.estimated > 0 && (
          <div className={`border rounded-lg p-3 ${
            results.casualties.severity === 'catastrophic' ? 'bg-red-500/20 border-red-500/30' :
            results.casualties.severity === 'severe' ? 'bg-orange-500/20 border-orange-500/30' :
            results.casualties.severity === 'moderate' ? 'bg-yellow-500/20 border-yellow-500/30' :
            'bg-green-500/20 border-green-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-red-400" />
              <h4 className="text-sm font-semibold text-red-400">Etkilenen Nüfus</h4>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              ~{results.casualties.estimated.toLocaleString('tr-TR')}
            </p>
            <p className="text-xs text-cliff-white">
              Etki Seviyesi: {
                results.casualties.severity === 'catastrophic' ? '🔴 Kitlesel (Catastrophic)' :
                results.casualties.severity === 'severe' ? '🟠 Ciddi (Severe)' :
                results.casualties.severity === 'moderate' ? '🟡 Orta (Moderate)' :
                '🟢 Düşük (Minor)'
              }
            </p>
          </div>
        )}
        {}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-xs text-blue-300 leading-relaxed">
            <strong>🔬 Metodoloji:</strong> Bu hesaplamalar NASA Ames Research Center ve JPL'in geliştirdiği
            Impact Effects Calculator'a dayanmaktadır. Modeller Collins et al. (2005), Holsapple & Housen (2007),
            Melosh (1989), ve Ivanov (2005) çalışmalarından türetilmiştir.
          </p>
          <div className="mt-2 pt-2 border-t border-blue-500/20">
            <p className="text-[10px] text-blue-200">
              ⚠️ Gerçek etki, hedef malzemesi, atmosfer koşulları, ve proje kompozisyonuna göre %20-50 oranında değişebilir.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  )
}

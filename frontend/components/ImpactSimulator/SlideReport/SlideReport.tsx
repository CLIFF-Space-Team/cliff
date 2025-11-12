'use client'
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X, Download, FileText } from 'lucide-react'
import { ImpactResults, ImpactLocation } from '../types'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { MemeComposer } from '../3D/MemeComposer'
interface SlideReportProps {
  results: ImpactResults
  location: ImpactLocation
  asteroidParams: {
    diameter_m: number
    velocity_kms: number
    angle_deg: number
    density: number
  }
  onClose: () => void
  impactImage?: string
}
interface SlideImages {
  impact?: string
  crater?: string
  atmospheric?: string
  thermal?: string
  shockwave?: string
}
export function SlideReport({ 
  results, 
  location, 
  asteroidParams, 
  onClose,
  impactImage 
}: SlideReportProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [slideImages, setSlideImages] = useState<SlideImages>({})
  const [loadingImages, setLoadingImages] = useState(false)
  const totalSlides = 6
  const slideRef = useRef<HTMLDivElement>(null)
  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % totalSlides)
  }, [totalSlides])
  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides)
  }, [totalSlides])
  useEffect(() => {
    let isMounted = true
    const loadSlideImages = async () => {
      if (loadingImages) return
      const needsLoading = 
        (currentSlide === 2 && !slideImages.crater) ||
        (currentSlide === 3 && !slideImages.atmospheric) ||
        (currentSlide === 4 && !slideImages.thermal) ||
        (currentSlide === 5 && !slideImages.shockwave)
      if (!needsLoading) return
      setLoadingImages(true)
      try {
        const images: Partial<SlideImages> = {}
        if (currentSlide === 2 && !slideImages.crater) {
          const craterImg = await MemeComposer.renderCraterCrossSection(
            results.crater.finalDiameter_m / 1000,
            results.crater.finalDepth_m / 1000
          )
          if (isMounted) images.crater = craterImg
        }
        if (currentSlide === 3 && !slideImages.atmospheric) {
          const atmosphericImg = await MemeComposer.renderAtmosphericEntry(
            asteroidParams.velocity_kms,
            asteroidParams.angle_deg
          )
          if (isMounted) images.atmospheric = atmosphericImg
        }
        if (currentSlide === 4 && !slideImages.thermal) {
          const thermalImg = await MemeComposer.renderThermalFireball(
            results.thermal.fireball_maxRadius_m,
            results.thermal.fireball_maxTemperature_K
          )
          if (isMounted) images.thermal = thermalImg
        }
        if (currentSlide === 5 && !slideImages.shockwave) {
          const shockwaveImg = await MemeComposer.renderShockwave(
            results.airBlast.radius_20psi_km
          )
          if (isMounted) images.shockwave = shockwaveImg
        }
        if (isMounted && Object.keys(images).length > 0) {
          setSlideImages(prev => ({ ...prev, impact: impactImage, ...images }))
        }
      } catch (error) {
        console.error('3D görsel yükleme hatası:', error)
      } finally {
        if (isMounted) setLoadingImages(false)
      }
    }
    loadSlideImages()
    return () => {
      isMounted = false
    }
  }, [currentSlide, impactImage, results.crater.finalDiameter_m, results.crater.finalDepth_m, results.thermal.fireball_maxRadius_m, results.thermal.fireball_maxTemperature_K, results.airBlast.radius_20psi_km, asteroidParams.velocity_kms, asteroidParams.angle_deg, slideImages.crater, slideImages.atmospheric, slideImages.thermal, slideImages.shockwave, loadingImages])
  const handleDownloadPNG = async () => {
    if (!slideRef.current || isExporting) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        width: slideRef.current.offsetWidth,
        height: slideRef.current.offsetHeight,
      })
      const link = document.createElement('a')
      link.download = `impact-report-slide-${currentSlide + 1}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (error) {
      console.error('PNG export hatası:', error)
    } finally {
      setIsExporting(false)
    }
  }
  const handleDownloadPDF = async () => {
    if (!slideRef.current || isExporting) return
    setIsExporting(true)
    const originalSlide = currentSlide
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })
      for (let i = 0; i < totalSlides; i++) {
        setCurrentSlide(i)
        await new Promise(resolve => setTimeout(resolve, 800))
        if (!slideRef.current) continue
        const canvas = await html2canvas(slideRef.current, {
          backgroundColor: '#000000',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: slideRef.current.offsetWidth,
          height: slideRef.current.offsetHeight,
        })
        const imgData = canvas.toDataURL('image/png', 1.0)
        if (i > 0) {
          pdf.addPage()
        }
        const imgWidth = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      }
      pdf.save(`asteroid-impact-report-${location.cityName || 'location'}-${Date.now()}.pdf`)
    } catch (error) {
      console.error('PDF export hatası:', error)
    } finally {
      setIsExporting(false)
      setCurrentSlide(originalSlide)
    }
  }
  const slideVariants = useMemo(() => ({
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  }), [])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isExporting) return
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevSlide()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide, onClose, isExporting])
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div className="w-full h-full relative">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleDownloadPNG}
            disabled={isExporting}
            className="text-white hover:bg-white/10"
            title="Mevcut slaytı PNG olarak indir"
          >
            <Download className="h-4 w-4 mr-2" />
            PNG
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="text-white hover:bg-white/10"
            title="Tüm slaytları PDF olarak indir"
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-4 w-4 mr-2" />
            Kapat
          </Button>
        </div>
        <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-6xl h-full max-h-[90vh] relative">
            <AnimatePresence mode="wait" custom={currentSlide}>
              <motion.div
                key={currentSlide}
                custom={currentSlide}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 }
                }}
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black rounded-lg md:rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                ref={slideRef}
              >
                <div className="h-full p-6 md:p-12 flex">
                  {currentSlide === 0 && (
                    <div className="w-full flex items-center justify-center">
                      <div className="text-center space-y-4 md:space-y-6">
                        <h1 className="text-3xl md:text-6xl font-bold text-white mb-2 md:mb-4">
                          Asteroid Çarpma Analizi
                        </h1>
                        <div className="text-xl md:text-3xl text-blue-400">
                          {location.cityName || location.countryName || `${location.lat.toFixed(2)}°, ${location.lng.toFixed(2)}°`}
                        </div>
                        <div className="text-sm md:text-xl text-gray-400 mt-4 md:mt-8">
                          Çap: {asteroidParams.diameter_m}m • Hız: {asteroidParams.velocity_kms} km/s • Açı: {asteroidParams.angle_deg}°
                        </div>
                        <div className="text-xs md:text-lg text-gray-500 mt-2 md:mt-4">
                          NASA/JPL Impact Physics Calculator
                        </div>
                      </div>
                    </div>
                  )}
                  {currentSlide === 1 && (
                    <div className="w-full grid grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center space-y-6">
                        <h2 className="text-4xl font-bold text-white">Etki Özeti</h2>
                        <div className="space-y-4">
                          <div className="bg-black/40 rounded-lg p-4 border border-red-500/30">
                            <div className="text-sm text-gray-400">Toplam Enerji</div>
                            <div className="text-3xl font-bold text-red-400">
                              {results.energy.megatonsTNT.toFixed(2)} MT
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {results.energy.kilotonsTNT.toFixed(0)} kiloton TNT
                            </div>
                          </div>
                          <div className="bg-black/40 rounded-lg p-4 border border-orange-500/30">
                            <div className="text-sm text-gray-400">Karşılaştırma</div>
                            <div className="text-xl font-bold text-orange-400">
                              {results.comparison.realWorldEvent}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {results.comparison.multiplier.toFixed(1)}x güç
                            </div>
                          </div>
                          <div className="bg-black/40 rounded-lg p-4 border border-yellow-500/30">
                            <div className="text-sm text-gray-400">Enerji (Joule)</div>
                            <div className="text-lg font-mono text-yellow-400">
                              {results.energy.joules.toExponential(2)} J
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        {slideImages.impact ? (
                          <img src={slideImages.impact} alt="Impact" className="rounded-lg w-full h-auto shadow-2xl" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                            <div className="text-center">
                              <div className="text-6xl mb-2">💥</div>
                              <div className="text-sm text-gray-400">3D görsel yükleniyor...</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentSlide === 2 && (
                    <div className="w-full grid grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center space-y-6">
                        <h2 className="text-4xl font-bold text-white">Krater Analizi</h2>
                        <div className="space-y-3">
                          <div className="text-sm text-gray-400 uppercase tracking-wide">
                            {results.crater.craterType} Krater
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/40 rounded-lg p-3 border border-orange-500/30">
                              <div className="text-xs text-gray-400">Final Çap</div>
                              <div className="text-2xl font-bold text-orange-400">
                                {(results.crater.finalDiameter_m / 1000).toFixed(2)} km
                              </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-3 border border-orange-500/30">
                              <div className="text-xs text-gray-400">Final Derinlik</div>
                              <div className="text-2xl font-bold text-orange-400">
                                {(results.crater.finalDepth_m / 1000).toFixed(3)} km
                              </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-3 border border-blue-500/30">
                              <div className="text-xs text-gray-400">Transient Çap</div>
                              <div className="text-xl font-bold text-white">
                                {(results.crater.transientDiameter_m / 1000).toFixed(2)} km
                              </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-3 border border-blue-500/30">
                              <div className="text-xs text-gray-400">Transient Derinlik</div>
                              <div className="text-xl font-bold text-white">
                                {(results.crater.transientDepth_m / 1000).toFixed(3)} km
                              </div>
                            </div>
                          </div>
                          <div className="bg-black/40 rounded-lg p-3 border border-purple-500/30">
                            <div className="text-xs text-gray-400">Toplam Hacim</div>
                            <div className="text-2xl font-bold text-purple-400">
                              {results.crater.volume_km3.toFixed(2)} km³
                            </div>
                          </div>
                          {results.crater.hasCentralPeak && (
                            <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-500/40">
                              <div className="text-sm text-purple-300">🏔️ Merkez Tepe</div>
                              <div className="text-lg font-bold text-white">
                                {results.crater.centralPeakHeight_m?.toFixed(0)} m yükseklik
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        {slideImages.crater ? (
                          <img src={slideImages.crater} alt="Crater" className="rounded-lg w-full h-auto shadow-2xl" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-500/10 to-brown-500/10 rounded-lg flex flex-col items-center justify-center border border-orange-500/20 p-8">
                            <div className="text-8xl mb-4">🌋</div>
                            <div className="text-center">
                              <div className="text-sm text-gray-400 mb-2">3D krater render ediliyor...</div>
                              <div className="text-2xl font-bold text-white mb-2">
                                Kenar Yüksekliği
                              </div>
                              <div className="text-4xl font-bold text-orange-400">
                                {results.crater.rimHeight_m.toFixed(0)} m
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentSlide === 3 && (
                    <div className="w-full grid grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center space-y-6">
                        <h2 className="text-4xl font-bold text-white">Atmosferik Giriş</h2>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-black/40 rounded-lg p-3 border border-blue-500/30">
                              <div className="text-xs text-gray-400">Giriş Hızı</div>
                              <div className="text-2xl font-bold text-blue-400">
                                {asteroidParams.velocity_kms} km/s
                              </div>
                            </div>
                            <div className="bg-black/40 rounded-lg p-3 border border-blue-500/30">
                              <div className="text-xs text-gray-400">Çarpma Açısı</div>
                              <div className="text-2xl font-bold text-blue-400">
                                {asteroidParams.angle_deg}°
                              </div>
                            </div>
                          </div>
                          {results.atmospheric.occurredInAtmosphere && (
                            <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/40">
                              <div className="text-sm text-yellow-300 font-semibold mb-2">
                                ⚠️ Atmosferik Parçalanma
                              </div>
                              <div className="space-y-2 text-sm text-white">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Parçalanma Yüksekliği:</span>
                                  <span className="font-bold">
                                    {(results.atmospheric.breakupAltitude_m / 1000).toFixed(1)} km
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Hava Patlaması Enerjisi:</span>
                                  <span className="font-mono text-xs">
                                    {results.atmospheric.airburstEnergy_joules.toExponential(2)} J
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Ateş Topu Yarıçapı:</span>
                                  <span className="font-bold">
                                    {results.atmospheric.fireballRadius_m.toFixed(0)} m
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/30">
                            <div className="text-xs text-gray-400">Asteroid Özellikleri</div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>
                                <span className="text-gray-400">Çap:</span>
                                <span className="ml-2 font-bold text-white">{asteroidParams.diameter_m} m</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Yoğunluk:</span>
                                <span className="ml-2 font-bold text-white">{asteroidParams.density} kg/m³</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        {slideImages.atmospheric ? (
                          <img src={slideImages.atmospheric} alt="Atmospheric Entry" className="rounded-lg w-full h-auto shadow-2xl" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-blue-500/10 via-cyan-500/10 to-transparent rounded-lg flex flex-col items-center justify-center border border-blue-500/20 p-8">
                            <div className="text-8xl mb-4">🌍</div>
                            <div className="text-center space-y-2">
                              <div className="text-sm text-gray-400">3D giriş render ediliyor...</div>
                              <div className="text-xl text-gray-400">Giriş Trajektörü</div>
                              <div className="text-4xl font-bold text-blue-400">
                                {asteroidParams.angle_deg}°
                              </div>
                              <div className="text-sm text-gray-500">
                                Yatay düzleme göre
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentSlide === 4 && (
                    <div className="w-full grid grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center space-y-6">
                        <h2 className="text-4xl font-bold text-white">Termal Radyasyon</h2>
                        <div className="space-y-3">
                          <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-lg p-4 border border-orange-500/40">
                            <div className="text-sm text-gray-300 mb-2">Ateş Topu Parametreleri</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <div className="text-xs text-gray-400">Maksimum Yarıçap</div>
                                <div className="text-xl font-bold text-white">
                                  {results.thermal.fireball_maxRadius_m.toFixed(0)} m
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-400">Süre</div>
                                <div className="text-xl font-bold text-white">
                                  {results.thermal.fireball_duration_s.toFixed(1)} s
                                </div>
                              </div>
                              <div className="col-span-2">
                                <div className="text-xs text-gray-400">Maksimum Sıcaklık</div>
                                <div className="text-2xl font-bold text-orange-400">
                                  {results.thermal.fireball_maxTemperature_K.toFixed(0)} K
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-sm text-gray-400 mb-2">Yanık Etki Mesafeleri</div>
                            <div className="flex justify-between items-center bg-red-500/30 rounded p-2 border border-red-500/50">
                              <span className="text-sm text-white">3. derece yanık</span>
                              <span className="text-lg font-bold text-red-300">
                                {results.thermal.thirdDegree_km.toFixed(2)} km
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-orange-500/30 rounded p-2 border border-orange-500/50">
                              <span className="text-sm text-white">2. derece yanık</span>
                              <span className="text-lg font-bold text-orange-300">
                                {results.thermal.secondDegree_km.toFixed(2)} km
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-yellow-500/30 rounded p-2 border border-yellow-500/50">
                              <span className="text-sm text-white">1. derece yanık</span>
                              <span className="text-lg font-bold text-yellow-300">
                                {results.thermal.firstDegree_km.toFixed(2)} km
                              </span>
                            </div>
                            <div className="flex justify-between items-center bg-amber-500/30 rounded p-2 border border-amber-500/50">
                              <span className="text-sm text-white">Ahşap tutuşma</span>
                              <span className="text-lg font-bold text-amber-300">
                                {results.thermal.ignitesWood_km.toFixed(2)} km
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        {slideImages.thermal ? (
                          <img src={slideImages.thermal} alt="Thermal Fireball" className="rounded-lg w-full h-auto shadow-2xl" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-red-500/20 via-orange-500/20 to-yellow-500/20 rounded-lg flex flex-col items-center justify-center border border-orange-500/30 p-8">
                            <div className="text-8xl mb-4">🔥</div>
                            <div className="text-center space-y-4">
                              <div className="text-sm text-gray-400">3D ateş topu render ediliyor...</div>
                              <div className="text-xl text-gray-300">Maksimum Ateş Topu</div>
                              <div className="text-5xl font-bold text-orange-400">
                                {(results.thermal.fireball_maxRadius_m / 1000).toFixed(2)} km
                              </div>
                              <div className="text-lg text-gray-400">yarıçap</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {currentSlide === 5 && (
                    <div className="w-full grid grid-cols-2 gap-8">
                      <div className="flex flex-col justify-center space-y-6">
                        <h2 className="text-4xl font-bold text-white">Şok Dalgası & Sismik Etki</h2>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-2">Hava Dalgası (Overpressure)</div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center bg-red-500/30 rounded p-2 border border-red-500/50">
                                <span className="text-xs text-white">20 psi - Tüm yapılar yıkılır</span>
                                <span className="text-lg font-bold text-red-300">
                                  {results.airBlast.radius_20psi_km.toFixed(2)} km
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-orange-500/30 rounded p-2 border border-orange-500/50">
                                <span className="text-xs text-white">10 psi - Betonarme hasar</span>
                                <span className="text-lg font-bold text-orange-300">
                                  {results.airBlast.radius_10psi_km.toFixed(2)} km
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-yellow-500/30 rounded p-2 border border-yellow-500/50">
                                <span className="text-xs text-white">5 psi - Çoğu bina yıkılır</span>
                                <span className="text-lg font-bold text-yellow-300">
                                  {results.airBlast.radius_5psi_km.toFixed(2)} km
                                </span>
                              </div>
                              <div className="flex justify-between items-center bg-green-500/30 rounded p-2 border border-green-500/50">
                                <span className="text-xs text-white">1 psi - Camlar kırılır</span>
                                <span className="text-lg font-bold text-green-300">
                                  {results.airBlast.radius_1psi_km.toFixed(2)} km
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/40">
                            <div className="text-sm text-gray-300 mb-2">Sismik Aktivite</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-gray-400">Richter Büyüklüğü</div>
                                <div className="text-3xl font-bold text-purple-300">
                                  {results.seismic.magnitude.toFixed(1)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-400">Hissedilme Mesafesi</div>
                                <div className="text-2xl font-bold text-white">
                                  {results.seismic.feltRadius_km.toFixed(0)} km
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        {slideImages.shockwave ? (
                          <img src={slideImages.shockwave} alt="Shockwave" className="rounded-lg w-full h-auto shadow-2xl" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-lg flex flex-col items-center justify-center border border-purple-500/20 p-8">
                            <div className="text-8xl mb-6">💨</div>
                            <div className="text-center space-y-4">
                              <div className="text-sm text-gray-400">3D şok dalgası render ediliyor...</div>
                              <div className="text-xl text-gray-300">Maksimum Overpressure</div>
                              <div className="text-5xl font-bold text-red-400">20 psi</div>
                              <div className="text-2xl text-gray-400">
                                {results.airBlast.radius_20psi_km.toFixed(2)} km yarıçap
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 md:bottom-8 left-0 right-0 flex items-center justify-between px-4 md:px-12">
                  <Button
                    variant="ghost"
                    onClick={prevSlide}
                    className="text-white hover:bg-white/10"
                    disabled={currentSlide === 0 || isExporting}
                  >
                    <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                  <div className="flex gap-1.5 md:gap-2">
                    {Array.from({ length: totalSlides }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => !isExporting && setCurrentSlide(idx)}
                        disabled={isExporting}
                        className={`h-1.5 md:h-2 rounded-full transition-all ${
                          idx === currentSlide 
                            ? 'w-6 md:w-8 bg-blue-400' 
                            : 'w-1.5 md:w-2 bg-white/30 hover:bg-white/50'
                        } ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    onClick={nextSlide}
                    className="text-white hover:bg-white/10"
                    disabled={currentSlide === totalSlides - 1 || isExporting}
                  >
                    <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                  </Button>
                </div>
                <div className="absolute top-4 md:top-8 left-4 md:left-8 text-xs md:text-sm text-gray-400">
                  {isExporting ? '📄 PDF oluşturuluyor...' : `Slayt ${currentSlide + 1} / ${totalSlides}`}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

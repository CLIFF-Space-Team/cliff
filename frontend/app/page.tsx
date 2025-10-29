'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Shield, Globe, Zap, Activity, ChevronDown, Menu, X, Home, Star, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import EarthPreview from '@/components/landing/EarthPreview'
import { FloatingChatButton } from '@/components/chat'

// Scroll Navigation Component
const ScrollNavigation = () => {
  const [activeSection, setActiveSection] = useState('hero')
  const [scrollProgress, setScrollProgress] = useState(0)

  const sections = React.useMemo(() => [
    { id: 'hero', icon: Home, label: 'Ana Sayfa' },
    { id: 'features', icon: Star, label: 'Özellikler' },
    { id: 'cta', icon: Rocket, label: 'Başla' },
  ], [])

  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY
          const windowHeight = window.innerHeight
          const documentHeight = document.documentElement.scrollHeight

          // Calculate overall scroll progress (0 to 1)
          const maxScroll = documentHeight - windowHeight
          const progress = maxScroll > 0 ? scrollPosition / maxScroll : 0
          setScrollProgress(Math.min(Math.max(progress, 0), 1))

          // Determine active section
          const centerPosition = scrollPosition + windowHeight / 2
          for (const section of sections) {
            const element = document.getElementById(section.id)
            if (element) {
              const { offsetTop, offsetHeight } = element
              if (centerPosition >= offsetTop && centerPosition < offsetTop + offsetHeight) {
                setActiveSection(section.id)
                break
              }
            }
          }
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [sections])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const activeIndex = sections.findIndex(s => s.id === activeSection)

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 hidden lg:block">
      <div className="relative flex flex-col items-center gap-10">
        {/* Background connection line segments - avoid icons */}
        {sections.map((_, index) => {
          if (index === sections.length - 1) return null
          return (
            <div
              key={`line-${index}`}
              className="absolute w-px bg-white/10"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: `calc(${(index * 100 / (sections.length - 1))}% + 22px)`,
                height: `calc(${(100 / (sections.length - 1))}% - 44px)`,
              }}
            />
          )
        })}
        
        {/* Dynamic progress line based on scroll position */}
        {sections.map((_, index) => {
          if (index === sections.length - 1) return null
          
          // Calculate progress for this segment
          const segmentProgress = scrollProgress * (sections.length - 1)
          const segmentStart = index
          const segmentEnd = index + 1
          
          let height = 0
          if (segmentProgress > segmentEnd) {
            // Fully filled
            height = 100
          } else if (segmentProgress > segmentStart) {
            // Partially filled
            height = ((segmentProgress - segmentStart) / (segmentEnd - segmentStart)) * 100
          }
          
          return (
            <motion.div
              key={`progress-${index}`}
              className="absolute w-0.5 origin-top overflow-hidden"
              style={{
                left: '50%',
                transform: 'translateX(-50%)',
                top: `calc(${(index * 100 / (sections.length - 1))}% + 22px)`,
                height: `calc(${(100 / (sections.length - 1))}% - 44px)`,
              }}
            >
              <motion.div
                className="w-full bg-gradient-to-b from-white via-white to-white/70 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                initial={{ height: '0%' }}
                animate={{ 
                  height: `${height}%`
                }}
                transition={{ 
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </motion.div>
          )
        })}
        
        {sections.map((section) => {
          const isActive = activeSection === section.id
          const Icon = section.icon
          
          return (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className="group relative z-20 transition-transform hover:scale-105 active:scale-95"
            >
              {/* Icon container */}
              <div
                className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 bg-pure-black ${
                  isActive
                    ? 'ring-4 ring-white shadow-lg'
                    : 'bg-white/5 border border-white/15 hover:bg-white/10 hover:border-white/30'
                }`}
              >
                <div className={`absolute inset-0 rounded-full ${isActive ? 'bg-white' : ''}`} />
                <Icon
                  className={`relative w-5 h-5 transition-colors duration-300 ${
                    isActive ? 'text-black' : 'text-white'
                  }`}
                />
              </div>
              
              {/* Label tooltip */}
              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <div className="bg-black/90 px-3 py-1.5 rounded-lg border border-white/20 whitespace-nowrap">
                  <span className="text-xs font-medium text-white">{section.label}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  // Deterministic yıldızlar (SSR/CSR uyumu için)
  const starCount = 30
  const stars = React.useMemo(() => Array.from({ length: starCount }, (_, i) => i), [])
  const seededRand = (seed: number) => {
    // Deterministic [0,1) üretici
    const x = Math.sin(seed * 9301 + 49297) * 233280
    return x - Math.floor(x)
  }

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { setMounted(true) }, [])

  // Disable scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const features = [
    {
      icon: Globe,
      title: "3D Güneş Sistemi",
      description: "Gerçek zamanlı astronomik veriler ile interaktif 3D uzay simülasyonu",
      gradient: "from-blue-500/20 to-cyan-500/20"
    },
    {
      icon: Shield,
      title: "Tehdit Analizi",
      description: "Gelişmiş AI algoritmaları ile uzay tehditlerinin erken tespiti",
      gradient: "from-red-500/20 to-orange-500/20"
    },
    {
      icon: Zap,
      title: "AI Yardımcısı",
      description: "Doğal dil işleme ile uzay bilimi eğitimi ve analiz desteği",
      gradient: "from-purple-500/20 to-pink-500/20"
    },
    {
      icon: Activity,
      title: "Gerçek Zamanlı İzleme",
      description: "NASA API'leri ile canlı uzay hava durumu ve asteroid takibi",
      gradient: "from-green-500/20 to-emerald-500/20"
    }
  ]

  const stats = [
    { value: "60+", label: "FPS Performans", description: "3D Render Hızı" },
    { value: "24/7", label: "Gerçek Zamanlı", description: "NASA Veri Akışı" },
    { value: "AI", label: "Yapay Zeka", description: "Akıllı Analiz" },
    { value: "∞", label: "Sınırsız", description: "Keşif İmkanı" }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden safe-area-top safe-area-bottom">
      {/* Scroll Navigation - Right Side */}
      <ScrollNavigation />
      
      {/* Navigation Header - Responsive */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-area-top ${
          scrollY > 50 
            ? 'bg-pure-black/98 backdrop-blur-xl border-b border-cliff-white/10 shadow-lg' 
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo - Responsive */}
            <motion.div
              className="flex items-center space-x-2 md:space-x-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="relative">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-white" />
                <div className="absolute -top-1 -right-1 w-2 h-2 md:w-3 md:h-3 bg-accent-success rounded-full animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gradient-minimal">CLIFF 3D</h1>
                <p className="text-xs text-cliff-light-gray hidden sm:block">Space System</p>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {[
                { name: 'Ana Sayfa', href: '#', active: true },
                { name: 'Özellikler', href: '#features' },
                { name: 'Hakkında', href: '#about' },
                { name: 'İletişim', href: '#contact' }
              ].map((item) => (
                <motion.a
                  key={item.name}
                  href={item.href}
                  className={`px-3 lg:px-4 py-2 rounded-lg transition-all duration-200 text-sm lg:text-base ${
                    item.active
                      ? 'text-white bg-cliff-white/10'
                      : 'text-cliff-light-gray hover:text-white hover:bg-cliff-white/5'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.name}
                </motion.a>
              ))}
            </nav>

            {/* Desktop CTA + Mobile Menu Button */}
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="hidden md:block">
                <motion.div
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(255, 255, 255, 0.3)"
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Button className="bg-gradient-to-r from-cliff-white to-cliff-light-gray text-pure-black hover:from-cliff-light-gray hover:to-cliff-white transition-all duration-600 ease-in-out font-semibold tap-target relative overflow-hidden group">
                    Sisteme Gir
                    <motion.div
                      whileHover={{ x: 3 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="ml-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                  </Button>
                </motion.div>
              </Link>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden tap-target"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-pure-black/98 backdrop-blur-xl border-t border-cliff-white/10"
            >
              <div className="container mx-auto px-4 py-6 space-y-4">
                <nav className="space-y-2">
                  {[
                    { name: 'Ana Sayfa', href: '#', active: true },
                    { name: 'Özellikler', href: '#features' },
                    { name: 'Hakkında', href: '#about' },
                    { name: 'İletişim', href: '#contact' }
                  ].map((item) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-4 py-3 rounded-lg transition-all duration-200 tap-target ${
                        item.active
                          ? 'text-white bg-cliff-white/10 border border-cliff-white/20'
                          : 'text-cliff-light-gray active:text-white active:bg-cliff-white/5'
                      }`}
                      whileTap={{ scale: 0.98 }}
                    >
                      {item.name}
                    </motion.a>
                  ))}
                </nav>
                
                <div className="pt-4 border-t border-cliff-white/10">
                  <Link href="/dashboard" className="block">
                    <motion.div
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 8px 25px rgba(255, 255, 255, 0.25)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Button className="w-full bg-gradient-to-r from-cliff-white to-cliff-light-gray text-pure-black hover:from-cliff-light-gray hover:to-cliff-white transition-all duration-600 ease-in-out font-semibold tap-target relative overflow-hidden group">
                        Sisteme Gir
                        <motion.div
                          whileHover={{ x: 3 }}
                          transition={{ type: "spring", stiffness: 400 }}
                          className="ml-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </motion.div>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section - Responsive */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center px-4 md:px-6 lg:px-8 pt-16 md:pt-20">
        {/* Background Effects - Minimalist */}
        <div className="absolute inset-0 bg-gradient-to-b from-pure-black via-[#0a0a0a] to-pure-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.02)_0%,_transparent_50%)]" />
        {/* Minimal star effect */}
        <div className="absolute inset-0 opacity-20" suppressHydrationWarning>
          {mounted && stars.map((i) => {
            const r1 = seededRand(i + 1)
            const r2 = seededRand(i + 101)
            const r3 = seededRand(i + 1001)
            return (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${r1 * 100}%`,
                  top: `${r2 * 100}%`,
                  opacity: r3 * 0.5 + 0.3,
                }}
              />
            )
          })}
        </div>

        {/* Content Grid - Responsive */}
        <div className="container mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center lg:text-left space-y-6 md:space-y-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="inline-flex"
            >
              <Badge className="bg-gradient-to-r from-cliff-white/10 to-cliff-light-gray/10 text-cliff-white border-cliff-white/20 px-3 md:px-4 py-1.5 md:py-2 text-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                  <span>v2.0.0 Pure Black Edition</span>
                </div>
              </Badge>
            </motion.div>

            {/* Main Title - Responsive Typography */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight responsive-title">
                <span className="text-gradient-minimal">CLIFF 3D</span>
                <br />
                <span className="text-cliff-white">Space System</span>
              </h1>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-cliff-light-gray max-w-2xl mx-auto lg:mx-0">
                Kozmik Seviye Akıllı Tahmin Çerçevesi ile uzay bilimlerinde 
                <span className="text-accent-success font-semibold"> yeni nesil keşif</span> deneyimi
              </p>
            </div>

            {/* CTA Buttons - Responsive */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link href="/dashboard">
                <motion.div
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 15px 40px rgba(255, 255, 255, 0.3)",
                    y: -2
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Button 
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-cliff-white to-cliff-light-gray text-pure-black hover:from-cliff-light-gray hover:to-cliff-white transition-all duration-600 ease-in-out font-semibold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 tap-target relative overflow-hidden group"
                  >
                    Sisteme Giriş Yap
                    <motion.div
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="ml-2"
                    >
                      <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                    </motion.div>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-800 ease-in-out" />
                  </Button>
                </motion.div>
              </Link>
              
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto border-cliff-white/30 text-cliff-white hover:bg-cliff-white/10 transition-all duration-600 ease-in-out text-base md:text-lg px-6 md:px-8 py-3 md:py-4 tap-target"
              >
                Demo İzle
              </Button>
            </motion.div>

            {/* Stats Grid - Responsive */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 pt-8 md:pt-12"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  className="text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.2 + index * 0.1 }}
                >
                  <div className="text-xl md:text-2xl lg:text-3xl font-bold text-gradient-minimal mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs md:text-sm font-semibold text-cliff-white mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-cliff-light-gray">
                    {stat.description}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - 3D Earth Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative h-64 sm:h-80 md:h-96 lg:h-full min-h-[400px] lg:min-h-[600px]"
          >
            {/* 3D Earth Container */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden border border-cliff-white/10 bg-pure-black-gradient">
              {/* Performance Indicator */}
              <div className="absolute top-3 right-3 md:top-4 md:right-4 z-10 bg-pure-black/80 backdrop-blur-md rounded-lg px-2 py-1 md:px-3 md:py-2 border border-cliff-white/10">
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-accent-success rounded-full animate-pulse"></div>
                  <span className="text-xs text-cliff-light-gray">Live 3D</span>
                </div>
              </div>

              {/* 3D Earth Preview */}
              <EarthPreview className="w-full h-full mobile-3d-optimized" />

              {/* Floating Info Cards - Hidden on mobile for performance */}
              <div className="hidden md:block absolute inset-0 pointer-events-none">
                <motion.div
                  className="absolute top-1/4 left-4 bg-pure-black/90 backdrop-blur-md rounded-lg p-3 border border-cliff-white/10 pointer-events-auto"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1.5 }}
                >
                  <div className="flex items-center gap-2 text-accent-success">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-semibold">Real-time Data</span>
                  </div>
                  <p className="text-xs text-cliff-light-gray mt-1">NASA API Integration</p>
                </motion.div>

                <motion.div
                  className="absolute bottom-1/4 right-4 bg-pure-black/90 backdrop-blur-md rounded-lg p-3 border border-cliff-white/10 pointer-events-auto"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1.7 }}
                >
                  <div className="flex items-center gap-2 text-accent-info">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm font-semibold">AI Powered</span>
                  </div>
                  <p className="text-xs text-cliff-light-gray mt-1">Smart Analysis</p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator - Hidden on mobile */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden md:block"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 2.0 }}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center space-y-2 text-cliff-light-gray"
          >
            <span className="text-sm">Keşfetmeye devam et</span>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section - Responsive */}
      <section id="features" className="py-16 md:py-24 lg:py-32 px-4 md:px-6 lg:px-8">
        <div className="container mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12 md:mb-16 lg:mb-20"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-minimal mb-4 md:mb-6">
              Gelişmiş Özellikler
            </h2>
            <p className="text-base md:text-lg lg:text-xl text-cliff-light-gray max-w-3xl mx-auto">
              CLIFF 3D Space System, uzay bilimlerinde eğitim ve araştırma için 
              gereken tüm modern teknolojileri bir arada sunar
            </p>
          </motion.div>

          {/* Features Grid - Responsive & Modern */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <Card className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#141414] border border-cliff-white/10 hover:border-cliff-white/20 transition-all duration-300 h-full mobile-card">
                  {/* Subtle hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <CardContent className="relative p-6 md:p-8">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 md:mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg`}>
                      <feature.icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4 mobile-text-xl">
                      {feature.title}
                    </h3>
                    
                    <p className="text-sm md:text-base text-cliff-light-gray/90 leading-relaxed mobile-text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Responsive */}
      <section id="cta" className="py-16 md:py-24 lg:py-32 px-4 md:px-6 lg:px-8">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#141414] border-cliff-white/20 max-w-4xl mx-auto shadow-2xl">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              
              <CardContent className="p-8 md:p-12 lg:p-16">
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-minimal mb-4 md:mb-6 responsive-title">
                  Uzay Keşfine Hazır mısın?
                </h2>
                
                <p className="text-base md:text-lg lg:text-xl text-cliff-light-gray/90 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                  CLIFF 3D Space System ile uzayın derinliklerine dalın, 
                  gerçek zamanlı verilerle eğitim alın ve AI destekli analizlerle geleceği keşfedin.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
                  <Link href="/dashboard" className="flex-1 sm:flex-initial">
                    <motion.div
                      whileHover={{ 
                        scale: 1.03,
                        y: -2
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Button 
                        size="lg"
                        className="w-full bg-gradient-to-r from-white to-cliff-light-gray text-pure-black hover:from-cliff-light-gray hover:to-white transition-all duration-300 font-semibold text-base md:text-lg px-6 md:px-8 py-3 md:py-4 tap-target shadow-lg hover:shadow-xl"
                      >
                        Hemen Başla
                        <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer - Modern & Clean */}
      <footer className="relative border-t border-cliff-white/10 py-8 md:py-12 px-4 md:px-6 lg:px-8 bg-gradient-to-b from-pure-black to-[#0a0a0a]">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Shield className="h-6 w-6 text-white" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent-success rounded-full animate-pulse" />
              </div>
              <div>
                <span className="text-base font-bold text-white block">
                  CLIFF 3D Space System
                </span>
                <span className="text-xs text-cliff-light-gray">
                  Kozmik Seviye Akıllı Tahmin Çerçevesi
                </span>
              </div>
            </div>
            
            <div className="text-xs md:text-sm text-cliff-light-gray text-center md:text-right">
              <p className="font-medium">© 2025 CLIFF 3D. Pure Black Edition.</p>
              <p className="mt-1 text-cliff-light-gray/70">
                Eğitim ve Araştırma için NASA API Entegrasyonu
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Floating CTA - Shows when not in viewport */}
      <AnimatePresence>
        {typeof window !== 'undefined' && scrollY > window.innerHeight && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 md:hidden z-50 safe-area-bottom"
          >
            <Link href="/dashboard">
              <motion.div
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: "0 10px 30px rgba(255, 255, 255, 0.4)"
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Button className="w-full bg-gradient-to-r from-cliff-white to-cliff-light-gray text-pure-black hover:from-cliff-light-gray hover:to-cliff-white transition-all duration-600 ease-in-out font-semibold text-base py-4 tap-target relative overflow-hidden group">
                  CLIFF 3D'ye Gir
                  <motion.div
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="ml-2"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modern Chat Interface */}
      <FloatingChatButton />
    </div>
  )
}

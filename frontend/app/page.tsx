'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowRight, Shield, Globe, Activity, 
  Menu, X, Crosshair, Brain, Rocket, Cpu,
  Award, Star, Database, Satellite, BarChart3, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import EarthPreview from '@/components/landing/EarthPreview'
import { FloatingChatButton } from '@/components/chat'

const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animationFrameId: number
    let particles: Array<{x: number, y: number, size: number, speed: number, opacity: number}> = []
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    const createParticles = () => {
      particles = []
      const count = Math.floor(window.innerWidth / 10)
      for (let i = 0; i < count; i++) {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2, speed: Math.random() * 0.5 + 0.1, opacity: Math.random() * 0.5 + 0.1 })
      }
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      particles.forEach(p => {
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        p.y -= p.speed
        if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width }
      })
      animationFrameId = requestAnimationFrame(draw)
    }
    window.addEventListener('resize', resize)
    resize(); createParticles(); draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animationFrameId) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-30 pointer-events-none" />
}

const TechBadge = ({ name, icon: Icon }: { name: string, icon: any }) => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
    <Icon className="w-4 h-4 text-cliff-light-gray" />
    <span className="text-sm font-medium text-gray-300">{name}</span>
  </div>
)

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const features = [
    {
      icon: Crosshair,
      title: "Asteroid Çarpışma Simülatörü",
      description: "NASA verilerini kullanarak potansiyel çarpışma senaryolarını ve etkilerini 3D ortamda simüle edin.",
      color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20"
    },
    {
      icon: Globe,
      title: "Gerçek Zamanlı İzleme",
      description: "Dünya'ya yakın cisimleri (NEO) ve uzay hava durumunu anlık olarak takip edin.",
      color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20"
    },
    {
      icon: Brain,
      title: "Yapay Zeka Destekli Analiz",
      description: "Gelişmiş yapay zeka modelleri ile tehdit seviyelerini otomatik analiz edin ve risk değerlendirmesi yapın.",
      color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20"
    }
  ]

  const achievements = [
    {
      icon: Award,
      title: "NASA Space Apps Challenge 2025",
      subtitle: "Aksaray Birincisi",
      description: "NASA Space Apps Challenge Aksaray yerel etkinliğinde birincilik ödülü.",
      color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20"
    },
    {
      icon: Star,
      title: "TÜBİTAK 4006 Bilim Fuarı",
      subtitle: "Kabul Edildi",
      description: "TÜBİTAK 4006 Bilim Fuarı'na proje olarak kabul edilerek sergilenmeye hak kazandı.",
      color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20"
    },
    {
      icon: Rocket,
      title: "TEKNOFEST 2025",
      subtitle: "Başvuru Aşamasında",
      description: "TEKNOFEST 2025 Yazılım yarışmasına başvuru sürecimiz devam etmektedir.",
      color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20"
    }
  ]

  const techStack = [
    { name: "NASA NEO API", desc: "Yakın Dünya Cisimleri" },
    { name: "NASA EONET", desc: "Doğal Afet İzleme" },
    { name: "NASA DONKI", desc: "Uzay Hava Durumu" },
    { name: "JPL Horizons", desc: "Yörünge Mekaniği" },
    { name: "JPL Sentry", desc: "Çarpışma Risk Analizi" },
    { name: "Three.js / R3F", desc: "3D Görselleştirme" },
  ]

  return (
    <div className="min-h-screen bg-[#020204] text-white overflow-x-hidden selection:bg-white/20">
      <AnimatedBackground />

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#020204]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-white/20 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CLIFF</h1>
              <p className="text-[10px] text-gray-400 tracking-wider uppercase">VERİCİLER Takımı</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#ozellikler" className="text-sm text-gray-400 hover:text-white transition-colors">Özellikler</Link>
            <Link href="#basarilar" className="text-sm text-gray-400 hover:text-white transition-colors">Başarılar</Link>
            <Link href="#hakkimizda" className="text-sm text-gray-400 hover:text-white transition-colors">Hakkımızda</Link>
            <Link href="/dashboard">
              <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6 font-medium transition-all duration-300 hover:scale-105">
                Sisteme Gir
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed inset-0 z-40 bg-[#020204] pt-24 px-6 md:hidden">
            <div className="flex flex-col gap-6 text-lg">
              <Link href="#ozellikler" onClick={() => setIsMobileMenuOpen(false)}>Özellikler</Link>
              <Link href="#basarilar" onClick={() => setIsMobileMenuOpen(false)}>Başarılar</Link>
              <Link href="#hakkimizda" onClick={() => setIsMobileMenuOpen(false)}>Hakkımızda</Link>
              <Link href="/dashboard">
                <Button className="w-full bg-white text-black py-6 text-lg">Sisteme Gir</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs font-medium text-yellow-200">NASA Space Apps 2025 Aksaray Birincisi</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Gezegen Savunma ve{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-white">
                Erken Uyarı Sistemi
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
              CLIFF, NASA'nın gerçek zamanlı verileri ve yapay zeka teknolojileri ile Dünya'yı tehdit eden kozmik cisimleri izleyen, analiz eden ve olası çarpışma senaryolarını simüle eden kapsamlı bir uzay tehdit izleme platformudur.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/dashboard">
                <Button className="h-12 px-8 rounded-full bg-white text-black hover:bg-gray-200 text-base font-medium group">
                  Platformu Keşfet
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/impact-simulator">
                <Button variant="outline" className="h-12 px-8 rounded-full border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                  Simülatörü Dene
                </Button>
              </Link>
            </div>
            <div className="pt-8 border-t border-white/10">
              <p className="text-sm text-gray-500 mb-4 font-semibold tracking-wider uppercase">Kullanılan Teknolojiler</p>
              <div className="flex flex-wrap gap-3 opacity-90 hover:opacity-100 transition-all duration-500">
                <TechBadge name="NASA API" icon={Satellite} />
                <TechBadge name="Yapay Zeka" icon={Brain} />
                <TechBadge name="3D Görselleştirme" icon={Globe} />
                <TechBadge name="Gerçek Zamanlı Veri" icon={BarChart3} />
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative h-[500px] lg:h-[600px] w-full">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] opacity-30 animate-pulse" />
            <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-sm">
              <EarthPreview />
              <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="absolute top-8 right-8 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 max-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-xs font-bold text-red-400">KRİTİK UYARI</span>
                </div>
                <p className="text-xs text-gray-300">Potansiyel tehlikeli asteroid tespit edildi.</p>
              </motion.div>
              <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="absolute bottom-8 left-8 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-xs text-gray-400">Sistem Durumu</div>
                    <div className="text-sm font-bold text-green-400">Aktif - Analiz Devam Ediyor</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ozellikler */}
      <section id="ozellikler" className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Platform Özellikleri</h2>
            <p className="text-gray-400">CLIFF, uzay tehditlerini izlemek ve analiz etmek için geliştirilmiş kapsamlı bir platformdur.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group relative p-1 rounded-3xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 border border-white/5">
                <div className="relative h-full rounded-[22px] p-8 overflow-hidden">
                  <div className={`absolute top-0 right-0 p-32 rounded-full blur-[80px] opacity-20 ${feature.bg}`} />
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.border} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Basarilar */}
      <section id="basarilar" className="py-24 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 px-4 py-1 mb-6">BAŞARILARIMIZ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ödüller ve Katılımlar</h2>
            <p className="text-gray-400">CLIFF projesi, ulusal ve uluslararası platformlarda başarıyla temsil edilmektedir.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {achievements.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.border} border flex items-center justify-center mb-6`}>
                  <item.icon className={`w-7 h-7 ${item.color}`} />
                </div>
                <h3 className="text-lg font-bold mb-1 text-white">{item.title}</h3>
                <p className={`text-sm font-semibold mb-3 ${item.color}`}>{item.subtitle}</p>
                <p className="text-gray-400 text-sm leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulasyon */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="bg-[#050508] rounded-[3rem] border border-white/10 p-8 md:p-16 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-500/5 to-transparent" />
            <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/5 to-transparent" />
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 relative z-10">
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-4 py-1">SİMÜLASYON</Badge>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Etkiyi Hesaplayın:{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                    Çarpışma Simülatörü
                  </span>
                </h2>
                <p className="text-lg text-gray-400">
                  Bir asteroidin Dünya'ya çarpması durumunda oluşacak etkiyi hesaplayın. Atmosferik giriş, krater boyutu ve enerji salınımını fizik tabanlı motorumuzla görselleştirin.
                </p>
                <ul className="space-y-4">
                  {["Fizik tabanlı atmosferik giriş hesaplamaları", "Dinamik krater ve hasar analizi", "3D görselleştirme motoru"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/impact-simulator">
                  <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white border-0 h-12 px-8 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                    Simülasyonu Başlat
                  </Button>
                </Link>
              </div>
              <div className="relative h-[400px] rounded-2xl overflow-hidden border border-white/10 group shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-xs text-red-400 font-mono mb-1">ÇARPIŞ HIZI</div>
                      <div className="text-3xl font-bold font-mono">28.000 km/sa</div>
                    </div>
                    <Activity className="w-8 h-8 text-red-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Teknoloji Altyapisi */}
      <section className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Veri Kaynakları ve Teknoloji Altyapısı</h2>
            <p className="text-gray-400">CLIFF, NASA'nın resmi API'leri ve modern web teknolojileri üzerine inşa edilmiştir.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {techStack.map((tech, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all text-center">
                <Database className="w-6 h-6 text-blue-400 mx-auto mb-3" />
                <h4 className="font-semibold text-white text-sm mb-1">{tech.name}</h4>
                <p className="text-xs text-gray-500">{tech.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Hakkimizda */}
      <section id="hakkimizda" className="py-24 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-4 py-1 mb-6">HAKKIMIZDA</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">VERİCİLER Takımı</h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                CLIFF (Cosmic Level Intelligent Forecast Framework), VERİCİLER takımı tarafından geliştirilen, 
                yapay zeka destekli kapsamlı bir uzay tehdit izleme ve erken uyarı sistemidir.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                <Users className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-xl font-bold mb-3">Proje Amacı</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Gezegenimizi tehdit eden asteroidleri, doğal afetleri ve uzay hava olaylarını gerçek zamanlı olarak izlemek, 
                  yapay zeka ile analiz etmek ve toplumu bilgilendirmek amacıyla geliştirilmiştir. NASA'nın açık veri kaynaklarını 
                  kullanarak bilimsel tabanlı risk değerlendirmesi yapmaktadır.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-white/5 border border-white/5">
                <Shield className="w-8 h-8 text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold mb-3">Bilimsel Altyapı</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Platform; NASA NeoWs, EONET, DONKI ve JPL Horizons gibi resmi veri kaynaklarından beslenmektedir. 
                  Yörünge mekaniği hesaplamaları, Monte Carlo simülasyonları ve makine öğrenmesi tabanlı risk sınıflandırma 
                  algoritmaları ile desteklenmektedir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-[#020204]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <span className="font-semibold text-gray-300">CLIFF</span>
                <span className="text-gray-500 text-sm ml-2">Cosmic Level Intelligent Forecast Framework</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 text-center">
              VERİCİLER Takımı &copy; 2025. Tüm hakları saklıdır.
            </div>
          </div>
        </div>
      </footer>

      <FloatingChatButton />
    </div>
  )
}

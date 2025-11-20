'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { 
  ArrowRight, Shield, Globe, Zap, Activity, ChevronDown, 
  Menu, X, Crosshair, Brain, Rocket, Cpu 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticles = () => {
      particles = []
      const count = Math.floor(window.innerWidth / 10)
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2,
          speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.5 + 0.1
        })
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
        if (p.y < 0) {
          p.y = canvas.height
          p.x = Math.random() * canvas.width
        }
      })
      
      animationFrameId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    resize()
    createParticles()
    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 opacity-30 pointer-events-none"
    />
  )
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
  const { scrollY } = useScroll()
  
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
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20"
    },
    {
      icon: Globe,
      title: "Gerçek Zamanlı İzleme",
      description: "Dünya'ya yakın cisimleri (NEO) ve uzay hava durumunu anlık olarak takip edin.",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20"
    },
    {
      icon: Brain,
      title: "AI Destekli Analiz",
      description: "Gemini 3.0 Pro ve GPT-5.1 modelleri ile tehdit seviyelerini otomatik analiz edin.",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20"
    }
  ]

  return (
    <div className="min-h-screen bg-[#020204] text-white overflow-x-hidden selection:bg-white/20">
      <AnimatedBackground />
      
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-[#020204]/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      }`}>
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-white/20 to-transparent border border-white/10 flex items-center justify-center backdrop-blur-md">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">CLIFF 3D</h1>
              <p className="text-[10px] text-gray-400 tracking-wider uppercase">Planetary Defense</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Özellikler</Link>
            <Link href="#simulation" className="text-sm text-gray-400 hover:text-white transition-colors">Simülasyon</Link>
            <Link href="#ai" className="text-sm text-gray-400 hover:text-white transition-colors">AI Teknolojisi</Link>
            
            <Link href="/dashboard">
              <Button className="bg-white text-black hover:bg-gray-200 rounded-full px-6 font-medium transition-all duration-300 hover:scale-105">
                Sisteme Gir
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-[#020204] pt-24 px-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-lg">
              <Link href="#features" onClick={() => setIsMobileMenuOpen(false)}>Özellikler</Link>
              <Link href="#simulation" onClick={() => setIsMobileMenuOpen(false)}>Simülasyon</Link>
              <Link href="/dashboard">
                <Button className="w-full bg-white text-black py-6 text-lg">
                  Sisteme Gir
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6">
        <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-200">Yenilendi: V2.0 Sürümü Yayında</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
              Kozmik Tehditleri <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-white">
                Önceden Görün
              </span>
            </h1>
            
            <p className="text-lg text-gray-400 max-w-xl leading-relaxed">
              NASA'nın gerçek zamanlı verileri ve gelişmiş Yapay Zeka modelleri ile gezegenimizi tehdit eden asteroidleri takip edin ve olası çarpışmaları simüle edin.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link href="/dashboard">
                <Button className="h-12 px-8 rounded-full bg-white text-black hover:bg-gray-200 text-base font-medium group">
                  Keşfetmeye Başla
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" className="h-12 px-8 rounded-full border-white/20 text-white hover:bg-white/10 backdrop-blur-sm">
                Canlı Demoyu İzle
              </Button>
            </div>

            <div className="pt-8 border-t border-white/10">
              <p className="text-sm text-gray-500 mb-4 font-semibold tracking-wider">POWERED BY</p>
              <div className="flex flex-wrap gap-4 opacity-90 hover:opacity-100 transition-all duration-500">
                <TechBadge name="GPT-5.1" icon={Brain} />
                <TechBadge name="Gemini 3.0 Pro" icon={Cpu} />
                <TechBadge name="Grok 4" icon={Rocket} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative h-[500px] lg:h-[600px] w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-[100px] opacity-30 animate-pulse" />
            <div className="relative h-full w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur-sm">
              <EarthPreview />
              
              <motion.div 
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute top-8 right-8 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 max-w-[200px]"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span className="text-xs font-bold text-red-400">KRİTİK UYARI</span>
                </div>
                <p className="text-xs text-gray-300">Potansiyel tehlikeli asteroid 2024-XJ yaklaşıyor.</p>
              </motion.div>

               <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute bottom-8 left-8 p-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-xs text-gray-400">Sistem Durumu</div>
                    <div className="text-sm font-bold text-green-400">Online & Analiz Ediyor</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Yeni Nesil Savunma Teknolojisi</h2>
            <p className="text-gray-400">Sadece izlemiyoruz, en gelişmiş yapay zeka modelleri ile analiz ediyor ve simüle ediyoruz.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-1 rounded-3xl bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 border border-white/5"
              >
                <div className="relative h-full rounded-[22px] p-8 overflow-hidden">
                  <div className={`absolute top-0 right-0 p-32 rounded-full blur-[80px] opacity-20 ${feature.bg}`} />
                  
                  <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.border} border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`w-7 h-7 ${feature.color}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="simulation" className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="bg-[#050508] rounded-[3rem] border border-white/10 p-8 md:p-16 overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-red-500/5 to-transparent" />
            <div className="absolute bottom-0 left-0 w-1/2 h-full bg-gradient-to-r from-blue-500/5 to-transparent" />
            
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8 relative z-10">
                <Badge className="bg-red-500/20 text-red-300 border-red-500/30 px-4 py-1">YENİ ÖZELLİK</Badge>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Etkiyi Hissedin: <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                    Çarpışma Simülatörü
                  </span>
                </h2>
                <p className="text-lg text-gray-400">
                  Bir asteroidin Dünya'ya çarpması durumunda oluşacak etkiyi hesaplayın. Atmosferik giriş, krater boyutu ve enerji salınımını fizik tabanlı motorumuzla görselleştirin.
                </p>
                <ul className="space-y-4">
                  {[
                    "Fizik tabanlı atmosferik giriş hesaplamaları",
                    "Dinamik krater ve hasar analizi",
                    "3D görselleştirme motoru"
                  ].map((item, i) => (
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
                      <div className="text-xs text-red-400 font-mono mb-1">IMPACT VELOCITY</div>
                      <div className="text-3xl font-bold font-mono">28,000 km/h</div>
                    </div>
                    <Activity className="w-8 h-8 text-red-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-white/5 bg-[#020204]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-gray-400">CLIFF 3D Space System</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-white transition-colors">Gizlilik</Link>
              <Link href="#" className="hover:text-white transition-colors">Kullanım Şartları</Link>
              <Link href="#" className="hover:text-white transition-colors">API</Link>
            </div>
            <div className="text-sm text-gray-600">
              &copy; 2025. Powered by Kynux (Berk Erenmemiş).
            </div>
          </div>
        </div>
      </footer>

      <FloatingChatButton />
    </div>
  )
}
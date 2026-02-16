'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, Bell, Search, X, Settings, Globe2, LogOut, User, ChevronDown } from 'lucide-react'
import FPSMonitor from '@/components/3d/performance/FPSMonitor'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { NAVIGATION_ITEMS } from '@/types/dashboard-layout'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  className?: string
  isMobileSidebarOpen?: boolean
  setIsMobileSidebarOpen?: (open: boolean) => void
}

const VIEW_LABELS: Record<string, string> = {
  'earth-events': 'Dünya Olayları',
  'asteroid-info': 'Asteroid Bilgi Paneli',
  'threat-analysis': 'Tehdit Analizi',
  '3d-threat-visualization': '3D Tehdit Görselleştirme',
  'system-monitor': 'Sistem İzleme',
  'chat-interface': 'AI Chat',
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ 
  className,
}) => {
  const { toggleMobileSidebar, activeView, setView } = useDashboardStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredNavItems = searchQuery.trim()
    ? NAVIGATION_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <header
      className={cn(
        'h-20 flex-shrink-0 border-b border-white/5 bg-[#020204] sticky top-0 z-40',
        className
      )}
    >
      <div className="h-full px-6 flex items-center justify-between gap-4">
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={toggleMobileSidebar}
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="hidden md:flex items-center text-sm text-gray-500">
            <span className="text-gray-300 font-medium">Kontrol Paneli</span>
            <span className="mx-2 text-gray-700">/</span>
            <span>{VIEW_LABELS[activeView] || 'Genel Bakış'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/5 border border-green-500/10">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-green-500">Sistem Online</span>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <FPSMonitor compact={true} targetFPS={60} showGraph={false} showDetails={false} />
            )}
          </div>

          <div className="hidden md:block w-px h-8 bg-white/5" />

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              {searchOpen ? (
                <div className="flex items-center bg-white/5 border border-white/10 rounded-full px-3 py-1 gap-2">
                  <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Sayfa ara..."
                    className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-40"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
                    }}
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery('') }}>
                    <X className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
                  </button>
                  {searchQuery.trim() && filteredNavItems.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden shadow-xl z-50">
                      {filteredNavItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => { setView(item.id as any); setSearchOpen(false); setSearchQuery('') }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative" ref={bellRef}>
              <Button
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full relative"
                onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false) }}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#020204]" />
              </Button>
              {bellOpen && (
                <div className="absolute top-full mt-2 right-0 w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Bildirimler</span>
                    <span className="text-[10px] px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full">3 yeni</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {[
                      { title: 'Yeni NEO tespit edildi', desc: 'Kritik risk seviyesinde asteroid yaklaşıyor', time: '2dk önce', color: 'bg-red-500' },
                      { title: 'Güneş fırtınası uyarısı', desc: 'Orta seviye manyetik fırtına bekleniyor', time: '15dk önce', color: 'bg-yellow-500' },
                      { title: 'Sistem güncellemesi', desc: 'Veri kaynakları başarıyla güncellendi', time: '1sa önce', color: 'bg-green-500' },
                    ].map((n, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", n.color)} />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-white truncate">{n.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{n.desc}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-white/5">
                    <button className="text-xs text-blue-400 hover:text-blue-300 w-full text-center">Tümünü Gör</button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false) }}
                className="flex items-center gap-2 ml-2 group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 border border-white/10 group-hover:border-white/30 transition-colors" />
                <ChevronDown className={cn("w-3.5 h-3.5 text-gray-500 transition-transform hidden md:block", profileOpen && "rotate-180")} />
              </button>
              {profileOpen && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-medium text-white">Kullanıcı</p>
                    <p className="text-[10px] text-gray-500">admin@cliff.space</p>
                  </div>
                  <div className="py-1">
                    {[
                      { icon: User, label: 'Profil', action: () => {} },
                      { icon: Settings, label: 'Ayarlar', action: () => {} },
                      { icon: Globe2, label: 'Dil: Türkçe', action: () => {} },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { item.action(); setProfileOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-white/5 py-1">
                    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                      <LogOut className="w-4 h-4" />
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  )
}
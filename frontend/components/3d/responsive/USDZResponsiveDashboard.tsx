'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { USDZResponsiveWrapper } from './USDZResponsiveWrapper'
import { USDZMobileTouchControls } from './USDZMobileTouchControls'

// Screen size detection hook
const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth
      if (width < 768) setScreenSize('mobile')
      else if (width < 1024) setScreenSize('tablet')
      else setScreenSize('desktop')
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [])

  return screenSize
}

// Navigation items
const NAV_ITEMS = [
  { id: 'overview', label: 'Genel Bakış', icon: '🌍', active: true },
  { id: 'asteroids', label: 'Asteroidler', icon: '☄️', active: false },
  { id: 'threats', label: 'Tehditler', icon: '⚠️', active: false },
  { id: 'solar-system', label: 'Güneş Sistemi', icon: '🌞', active: false },
  { id: 'settings', label: 'Ayarlar', icon: '⚙️', active: false }
]

// Mobile navigation component
const MobileNavigation: React.FC<{
  items: typeof NAV_ITEMS
  activeItem: string
  onItemSelect: (itemId: string) => void
  isVisible: boolean
}> = ({ items, activeItem, onItemSelect, isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-50 bg-pure-black/95 backdrop-blur-md border-t border-cliff-light-gray/20"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="flex justify-around items-center py-2 px-4">
            {items.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => onItemSelect(item.id)}
                className={`flex flex-col items-center p-2 rounded-lg min-w-0 ${
                  activeItem === item.id
                    ? 'bg-cliff-blue/20 text-cliff-blue'
                    : 'text-cliff-light-gray hover:text-cliff-white'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="text-xs truncate max-w-16">{item.label}</span>
                {activeItem === item.id && (
                  <motion.div
                    className="absolute -top-1 left-1/2 w-1 h-1 bg-cliff-blue rounded-full transform -translate-x-1/2"
                    layoutId="mobile-nav-indicator"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Tablet sidebar component
const TabletSidebar: React.FC<{
  items: typeof NAV_ITEMS
  activeItem: string
  onItemSelect: (itemId: string) => void
  isCollapsed: boolean
  onToggle: () => void
}> = ({ items, activeItem, onItemSelect, isCollapsed, onToggle }) => {
  return (
    <motion.div
      className="fixed left-0 top-0 bottom-0 z-40 bg-pure-black/95 backdrop-blur-md border-r border-cliff-light-gray/20"
      animate={{ width: isCollapsed ? 60 : 240 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cliff-light-gray/20">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-cliff-blue to-cliff-purple rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold">🚀</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-cliff-white">CLIFF</h1>
                <p className="text-xs text-cliff-light-gray">Solar System</p>
              </div>
            </motion.div>
          )}
          
          <motion.button
            onClick={onToggle}
            className="p-2 hover:bg-cliff-light-gray/10 rounded-lg"
            whileTap={{ scale: 0.95 }}
          >
            <motion.span
              animate={{ rotate: isCollapsed ? 0 : 180 }}
              transition={{ duration: 0.3 }}
              className="inline-block text-cliff-light-gray"
            >
              ◀
            </motion.span>
          </motion.button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 py-4">
          {items.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => onItemSelect(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left relative ${
                activeItem === item.id
                  ? 'bg-cliff-blue/20 text-cliff-blue border-r-2 border-cliff-blue'
                  : 'text-cliff-light-gray hover:text-cliff-white hover:bg-cliff-light-gray/5'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="text-sm font-medium truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// Desktop sidebar component
const DesktopSidebar: React.FC<{
  items: typeof NAV_ITEMS
  activeItem: string
  onItemSelect: (itemId: string) => void
}> = ({ items, activeItem, onItemSelect }) => {
  return (
    <div className="w-64 bg-pure-black/95 backdrop-blur-md border-r border-cliff-light-gray/20 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-cliff-light-gray/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cliff-blue to-cliff-purple rounded-xl flex items-center justify-center">
            <span className="text-lg font-bold">🚀</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-cliff-white">CLIFF</h1>
            <p className="text-sm text-cliff-light-gray">Solar System Explorer</p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6">
        <div className="px-4 mb-4">
          <h2 className="text-xs font-semibold text-cliff-light-gray uppercase tracking-wider">
            Navigation
          </h2>
        </div>
        
        {items.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => onItemSelect(item.id)}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left relative ${
              activeItem === item.id
                ? 'bg-cliff-blue/20 text-cliff-blue border-r-2 border-cliff-blue'
                : 'text-cliff-light-gray hover:text-cliff-white hover:bg-cliff-light-gray/5'
            }`}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
            {activeItem === item.id && (
              <motion.div
                className="absolute right-0 top-0 bottom-0 w-1 bg-cliff-blue rounded-l-full"
                layoutId="desktop-nav-indicator"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-cliff-light-gray/20">
        <div className="bg-gradient-to-r from-cliff-blue/20 to-cliff-purple/20 rounded-lg p-4 border border-cliff-blue/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-6 h-6 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-xs text-green-900">●</span>
            </div>
            <span className="text-sm text-cliff-white font-medium">NASA API Aktif</span>
          </div>
          <p className="text-xs text-cliff-light-gray">
            Gerçek zamanlı asteroid verileri alınıyor
          </p>
        </div>
      </div>
    </div>
  )
}

// Main responsive dashboard component
export const USDZResponsiveDashboard: React.FC<{
  className?: string
}> = ({ className = '' }) => {
  const screenSize = useScreenSize()
  const [activeItem, setActiveItem] = useState('overview')
  const [mobileNavVisible, setMobileNavVisible] = useState(false)
  const [tabletSidebarCollapsed, setTabletSidebarCollapsed] = useState(false)

  // Layout configuration based on screen size
  const layoutConfig = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return {
          showSidebar: false,
          showMobileNav: true,
          contentPadding: { left: 0, bottom: 80 }
        }
      case 'tablet':
        return {
          showSidebar: true,
          showMobileNav: false,
          contentPadding: { left: tabletSidebarCollapsed ? 60 : 240, bottom: 0 }
        }
      case 'desktop':
        return {
          showSidebar: true,
          showMobileNav: false,
          contentPadding: { left: 256, bottom: 0 }
        }
    }
  }, [screenSize, tabletSidebarCollapsed])

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    setActiveItem(itemId)
    if (screenSize === 'mobile') {
      setMobileNavVisible(false)
    }
  }

  // Handle mobile menu toggle
  const handleMobileMenuToggle = () => {
    setMobileNavVisible(!mobileNavVisible)
  }

  return (
    <div className={`min-h-screen bg-space-black relative ${className}`}>
      {/* Desktop Sidebar */}
      {screenSize === 'desktop' && (
        <div className="fixed left-0 top-0 bottom-0 z-40">
          <DesktopSidebar
            items={NAV_ITEMS}
            activeItem={activeItem}
            onItemSelect={handleItemSelect}
          />
        </div>
      )}

      {/* Tablet Sidebar */}
      {screenSize === 'tablet' && (
        <TabletSidebar
          items={NAV_ITEMS}
          activeItem={activeItem}
          onItemSelect={handleItemSelect}
          isCollapsed={tabletSidebarCollapsed}
          onToggle={() => setTabletSidebarCollapsed(!tabletSidebarCollapsed)}
        />
      )}

      {/* Main Content Area */}
      <div
        className="relative"
        style={{
          marginLeft: layoutConfig.contentPadding.left,
          marginBottom: layoutConfig.contentPadding.bottom
        }}
      >
        {/* 3D Solar System */}
        <div className="h-screen relative">
          {screenSize === 'mobile' ? (
            <USDZMobileTouchControls className="h-full w-full">
              <USDZResponsiveWrapper />
            </USDZMobileTouchControls>
          ) : (
            <USDZResponsiveWrapper />
          )}

          {/* Mobile Menu Button */}
          {screenSize === 'mobile' && (
            <motion.button
              onClick={handleMobileMenuToggle}
              className="absolute top-4 left-4 z-30 p-3 bg-pure-black/80 backdrop-blur-md rounded-full border border-cliff-light-gray/20"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: mobileNavVisible ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-lg text-cliff-white">☰</span>
              </motion.div>
            </motion.button>
          )}
        </div>
      </div>

      {/* Mobile Navigation */}
      <MobileNavigation
        items={NAV_ITEMS}
        activeItem={activeItem}
        onItemSelect={handleItemSelect}
        isVisible={mobileNavVisible}
      />

      {/* Mobile backdrop */}
      {mobileNavVisible && screenSize === 'mobile' && (
        <motion.div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMobileNavVisible(false)}
        />
      )}
    </div>
  )
}

export default USDZResponsiveDashboard
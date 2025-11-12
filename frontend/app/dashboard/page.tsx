'use client'
import React, { Suspense } from 'react'
import ErrorBoundary from '@/components/ui/error-boundary'
import { useDashboardStore } from '@/stores/useDashboardStore'
import { ViewType } from '@/types/dashboard-layout'
import { DashboardHeader } from '@/components/dashboard/layout/DashboardHeader'
import { LeftNavigationSidebar } from '@/components/dashboard/layout/LeftNavigationSidebar'
import { MobileNavigation } from '@/components/dashboard/layout/MobileNavigation'
import { DynamicContentPanel } from '@/components/dashboard/layout/DynamicContentPanel'
import { CentralVisualization } from '@/components/dashboard/layout/CentralVisualization'
import { RealTimeThreatAlerts } from '@/components/dashboard/real-time-threat-alerts'
import {
  DashboardSkeleton,
  FullScreenLoader,
} from '@/components/ui/loading-states'
const DashboardPage: React.FC = () => {
  return (
    <ErrorBoundary fallback={<p>Dashboard yüklenirken bir hata oluþtu.</p>}>
      <Suspense fallback={<FullScreenLoader />}>
        <DashboardLayout />
      </Suspense>
    </ErrorBoundary>
  )
}
const DashboardLayout: React.FC = () => {
  const { isMobileSidebarOpen, toggleMobileSidebar, activeView } = useDashboardStore()
  const renderMainContent = () => {
    switch (activeView) {
      case 'earth-events':
        return (
          <div className="flex-1 p-2 md:p-4">
            <ErrorBoundary fallback={<div className="h-full bg-pure-black rounded-xl flex items-center justify-center text-cliff-light-gray">Earth Events yüklenirken hata oluþtu</div>}>
              <Suspense fallback={<DashboardSkeleton />}>
                <DynamicContentPanel />
              </Suspense>
            </ErrorBoundary>
          </div>
        )
      case 'threat-analysis':
      case 'system-monitor':
      case 'chat-interface':
        return (
          <>
            {}
            <div className="hidden lg:block flex-1 p-2 md:p-4">
              <ErrorBoundary fallback={<div className="h-full bg-pure-black rounded-xl flex items-center justify-center text-cliff-light-gray">3D Model yüklenirken hata oluþtu</div>}>
                <Suspense fallback={<DashboardSkeleton />}>
                  <CentralVisualization />
                </Suspense>
              </ErrorBoundary>
            </div>
            {}
            <div className="w-full lg:w-96 p-2 md:p-4 lg:pl-2">
              <ErrorBoundary fallback={<div className="h-full bg-pure-black rounded-xl flex items-center justify-center text-cliff-light-gray">Panel yüklenirken hata oluþtu</div>}>
                <Suspense fallback={<DashboardSkeleton />}>
                  <DynamicContentPanel />
                </Suspense>
              </ErrorBoundary>
            </div>
          </>
        )
      default:
        return (
          <div className="flex-1 p-2 md:p-4">
            <ErrorBoundary fallback={<div className="h-full bg-pure-black rounded-xl flex items-center justify-center text-cliff-light-gray">3D Model yüklenirken hata oluþtu</div>}>
              <Suspense fallback={<DashboardSkeleton />}>
                <CentralVisualization />
              </Suspense>
            </ErrorBoundary>
          </div>
        )
    }
  }
  return (
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden text-foreground">
      <DashboardHeader
        isMobileSidebarOpen={isMobileSidebarOpen}
        setIsMobileSidebarOpen={toggleMobileSidebar}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftNavigationSidebar />
        <main className="flex-1 flex overflow-hidden">
          {renderMainContent()}
        </main>
      </div>
      {}
      <MobileNavigation />
      {}
      <div className="lg:hidden">
        {isMobileSidebarOpen && (
          <div className="absolute inset-0 bg-pure-black/90 backdrop-blur-sm z-30 flex items-center justify-center">
            <div className="text-center text-white p-8">
              <h3 className="text-xl font-semibold mb-4">?? NASA EONET Dashboard</h3>
              <p className="text-white/70 mb-6">
                {activeView === 'earth-events'
                  ? 'Earth events 3D›2D transition modu aktif'
                  : 'Earth events artýk 3D Dünya üzerinde görüntüleniyor'
                }
              </p>
              <button
                onClick={toggleMobileSidebar}
                className="px-6 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                {activeView === 'earth-events' ? 'Transition Moduna Dön' : '3D Görünüme Dön'}
              </button>
            </div>
          </div>
        )}
      </div>
      {}
      <RealTimeThreatAlerts
        maxAlerts={3}
        enableSound={true}
        position="top-right"
        autoConnect={true}
      />
    </div>
  )
}
export default DashboardPage

'use client';

import { useQueryClient } from '@tanstack/react-query';

import { ChatPanel } from '@/components/ai/ChatPanel';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { LiveActivityTicker } from '@/components/layout/LiveActivityTicker';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    try {
      await api.post('/api/v1/threats/refresh');
    } catch {
      /* swallow — backend may already be cycling */
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.threats.all });
  };

  return (
    <div className="flex h-[100dvh] w-full bg-surface-0 text-text-primary">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader onRefresh={handleRefresh} />
        <LiveActivityTicker />
        {/* Below-lg: page scrolls so the aside under the 3D scene isn't
         *  clipped by `overflow-hidden`. At lg+ we lock viewport height and
         *  let the side-by-side grid manage its own scroll regions.
         *  pb on mobile reserves space for the bottom nav. */}
        <main className="relative min-h-0 flex-1 overflow-y-auto pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 lg:overflow-hidden">
          {children}
        </main>
      </div>
      <ChatPanel />
      <MobileBottomNav />
    </div>
  );
}

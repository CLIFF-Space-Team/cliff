import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ViewType } from '@/types/dashboard-layout';

type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

interface DashboardState {
  activeView: ViewType;
  isMobileSidebarOpen: boolean;
  quality: QualityLevel;
  showOrbits: boolean;
  enableRotation: boolean;
  enableShadows: boolean;
  enableReflections: boolean;
  setView: (view: ViewType) => void;
  toggleMobileSidebar: () => void;
  setQuality: (quality: QualityLevel) => void;
  toggleOrbits: () => void;
  toggleRotation: () => void;
  toggleShadows: () => void;
  toggleReflections: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      activeView: 'earth-events',
      isMobileSidebarOpen: false,
      quality: 'medium',
      showOrbits: true,
      enableRotation: true,
      enableShadows: true,
      enableReflections: false,
      setView: (view) => set({ activeView: view }, false, 'setView'),
      toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen }), false, 'toggleMobileSidebar'),
      setQuality: (quality) => set({ quality }, false, 'setQuality'),
      toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits }), false, 'toggleOrbits'),
      toggleRotation: () => set((state) => ({ enableRotation: !state.enableRotation }), false, 'toggleRotation'),
      toggleShadows: () => set((state) => ({ enableShadows: !state.enableShadows }), false, 'toggleShadows'),
      toggleReflections: () => set((state) => ({ enableReflections: !state.enableReflections }), false, 'toggleReflections'),
    }),
    {
      name: 'dashboard-store'
    }
  )
);
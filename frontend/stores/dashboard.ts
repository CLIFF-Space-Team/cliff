'use client';

import { create } from 'zustand';

export type SceneQuality = 'low' | 'medium' | 'high';

interface DashboardState {
  selectedNeoId: string | null;
  sceneQuality: SceneQuality;
  isSidebarOpen: boolean;
  isChatOpen: boolean;
  setSelectedNeoId: (id: string | null) => void;
  setSceneQuality: (quality: SceneQuality) => void;
  toggleSidebar: () => void;
  toggleChat: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedNeoId: null,
  sceneQuality: 'high',
  isSidebarOpen: true,
  isChatOpen: false,
  setSelectedNeoId: (id) => set({ selectedNeoId: id }),
  setSceneQuality: (quality) => set({ sceneQuality: quality }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),
}));

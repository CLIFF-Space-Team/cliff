'use client';

import { create } from 'zustand';

interface CompareState {
  /** Up to 2 selected NEO ids. */
  picks: string[];
  add: (neoId: string) => void;
  remove: (neoId: string) => void;
  clear: () => void;
  setSlot: (slot: 0 | 1, neoId: string | null) => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  picks: [],
  add: (neoId) =>
    set((s) => {
      if (s.picks.includes(neoId)) return s;
      if (s.picks.length >= 2) return { picks: [s.picks[1]!, neoId] };
      return { picks: [...s.picks, neoId] };
    }),
  remove: (neoId) => set((s) => ({ picks: s.picks.filter((id) => id !== neoId) })),
  clear: () => set({ picks: [] }),
  setSlot: (slot, neoId) =>
    set((s) => {
      const next = [...s.picks];
      while (next.length < 2) next.push('');
      if (neoId === null) {
        next[slot] = '';
      } else {
        next[slot] = neoId;
      }
      return { picks: next.filter((id) => id) };
    }),
}));

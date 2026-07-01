import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'emerald' | 'ocean' | 'royal' | 'crimson' | 'amber' | 'graphite';

export interface ThemeDef {
  name:  ThemeName;
  label: string;
  /** Representative swatch colors (600/400) for the picker UI */
  swatch: [string, string];
}

export const THEMES: ThemeDef[] = [
  { name: 'emerald',  label: 'Emerald',  swatch: ['#16a34a', '#4ade80'] },
  { name: 'ocean',    label: 'Ocean',    swatch: ['#2563eb', '#60a5fa'] },
  { name: 'royal',    label: 'Royal',    swatch: ['#7c3aed', '#a78bfa'] },
  { name: 'crimson',  label: 'Crimson',  swatch: ['#e11d48', '#fb7185'] },
  { name: 'amber',    label: 'Amber',    swatch: ['#d97706', '#fbbf24'] },
  { name: 'graphite', label: 'Graphite', swatch: ['#475569', '#94a3b8'] },
];

function applyTheme(theme: ThemeName) {
  if (theme === 'emerald') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

interface ThemeStore {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'emerald',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
    }),
    {
      name: 'flexischool-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);

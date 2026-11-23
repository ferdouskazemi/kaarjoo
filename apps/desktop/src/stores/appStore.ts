import { create } from 'zustand';
import { setAppLanguage } from '../i18n';

export type AppView = 'home' | 'profile' | 'jobs' | 'queue' | 'applications' | 'settings';
export type AppTheme = 'dark' | 'light' | 'system';
export type AppLanguage = 'fa' | 'en';

interface AppState {
  currentView: AppView;
  theme: AppTheme;
  language: AppLanguage;
  isCommandPaletteOpen: boolean;
  engineConnected: boolean;
  hardwareTier: 'lite' | 'standard' | 'pro';
  
  setCurrentView: (view: AppView) => void;
  setTheme: (theme: AppTheme) => void;
  setLanguage: (lang: AppLanguage) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setEngineConnected: (connected: boolean) => void;
  setHardwareTier: (tier: 'lite' | 'standard' | 'pro') => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'home',
  theme: 'dark',
  language: 'fa',
  isCommandPaletteOpen: false,
  engineConnected: false,
  hardwareTier: 'standard',

  setCurrentView: (view) => set({ currentView: view }),
  setTheme: (theme) => {
    set({ theme });
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.remove('dark', 'light');
      root.classList.add(theme);
    }
  },
  setLanguage: (language) => {
    set({ language });
    setAppLanguage(language);
  },
  setCommandPaletteOpen: (isCommandPaletteOpen) => set({ isCommandPaletteOpen }),
  setEngineConnected: (engineConnected) => set({ engineConnected }),
  setHardwareTier: (hardwareTier) => set({ hardwareTier }),
}));

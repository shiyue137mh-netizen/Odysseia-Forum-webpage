import { create } from 'zustand';

import {
  getUserSettings,
  saveUserSettings,
  type UserSettings,
} from '@/shared/lib/settings';

interface SettingsState {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => boolean;
  resetSettingsState: (nextSettings?: UserSettings) => void;
}

const readInitialSettings = (): UserSettings => {
  if (typeof window === 'undefined') {
    return getUserSettings();
  }

  return getUserSettings();
};

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: readInitialSettings(),

  updateSettings: (updates) => {
    const nextSettings = { ...get().settings, ...updates };
    if (!saveUserSettings(nextSettings)) return false;
    set({ settings: nextSettings });
    return true;
  },

  resetSettingsState: (nextSettings) => {
    set({ settings: nextSettings ?? readInitialSettings() });
  },
}));

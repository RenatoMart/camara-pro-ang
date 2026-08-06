import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { StorageKeys } from '@/services/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

type SettingsState = {
  themePreference: ThemePreference;
  hasSeenOnboarding: boolean;
};

type SettingsActions = {
  setThemePreference: (preference: ThemePreference) => void;
  completeOnboarding: () => void;
  reset: () => void;
};

const initialState: SettingsState = {
  themePreference: 'system',
  hasSeenOnboarding: false,
};

/**
 * Preferencias del usuario, persistidas en el dispositivo.
 *
 * Patrón: separar `State` y `Actions` en tipos distintos mantiene el store
 * legible y permite tipar los selectores sin ambigüedad.
 */
export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    set => ({
      ...initialState,

      setThemePreference: preference => set({ themePreference: preference }),
      completeOnboarding: () => set({ hasSeenOnboarding: true }),
      reset: () => set(initialState),
    }),
    {
      name: StorageKeys.settings,
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

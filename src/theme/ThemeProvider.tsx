import React, {
  createContext,
  useContext,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';

import { darkColors, lightColors, type AppColors } from './colors';
import {
  duration,
  elevation,
  radius,
  roundedCorner,
  spacing,
  typography,
} from './tokens';

export type Theme = {
  scheme: 'light' | 'dark';
  colors: AppColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  elevation: typeof elevation;
  duration: typeof duration;
  /** Añádelo junto a cualquier `borderRadius`. */
  roundedCorner: typeof roundedCorner;
};

const baseTheme = {
  spacing,
  radius,
  typography,
  elevation,
  duration,
  roundedCorner,
};

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  ...baseTheme,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  ...baseTheme,
};

const ThemeContext = createContext<Theme>(lightTheme);

/**
 * Resuelve el tema a partir de la preferencia del usuario y, si es
 * `'system'`, del esquema del sistema operativo.
 */
function resolveScheme(
  preference: ThemePreference,
  systemScheme: 'light' | 'dark',
): 'light' | 'dark' {
  return preference === 'system' ? systemScheme : preference;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const preference = useSettingsStore(state => state.themePreference);

  const theme = useMemo(
    () =>
      resolveScheme(preference, systemScheme) === 'dark'
        ? darkTheme
        : lightTheme,
    [preference, systemScheme],
  );

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

/** Acceso al tema activo. Única vía permitida para leer colores. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}

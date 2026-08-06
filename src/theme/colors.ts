/**
 * Paleta de colores.
 *
 * Regla: ningún componente debe escribir un hex directamente. Siempre se
 * consume a través de `useTheme()` para que el modo oscuro funcione gratis.
 */

/** Colores crudos. No usar directamente en componentes. */
const palette = {
  blue50: '#EEF4FF',
  blue100: '#D9E5FF',
  blue500: '#2F6BFF',
  blue600: '#1F52D6',
  blue700: '#173FA6',

  neutral0: '#FFFFFF',
  neutral50: '#F7F8FA',
  neutral100: '#EDEFF3',
  neutral200: '#DDE1E8',
  neutral300: '#C2C8D2',
  neutral500: '#7A8494',
  neutral600: '#5A6472',
  neutral700: '#3B4350',
  neutral800: '#232932',
  neutral900: '#14181E',
  neutral950: '#0B0E12',

  green500: '#1F9D55',
  amber500: '#D97706',
  red500: '#DC2626',
  red600: '#B91C1C',

  transparent: 'transparent',
} as const;

/** Colores semánticos: lo que sí se usa en la UI. */
export type AppColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  overlay: string;

  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverted: string;

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;

  success: string;
  warning: string;
  danger: string;
  dangerPressed: string;

  transparent: string;
};

export const lightColors: AppColors = {
  background: palette.neutral50,
  surface: palette.neutral0,
  surfaceElevated: palette.neutral0,
  border: palette.neutral200,
  overlay: 'rgba(11, 14, 18, 0.45)',

  textPrimary: palette.neutral900,
  textSecondary: palette.neutral600,
  textDisabled: palette.neutral300,
  textInverted: palette.neutral0,

  primary: palette.blue500,
  primaryPressed: palette.blue600,
  primarySoft: palette.blue50,
  onPrimary: palette.neutral0,

  success: palette.green500,
  warning: palette.amber500,
  danger: palette.red500,
  dangerPressed: palette.red600,

  transparent: palette.transparent,
};

export const darkColors: AppColors = {
  background: palette.neutral950,
  surface: palette.neutral900,
  surfaceElevated: palette.neutral800,
  border: palette.neutral700,
  overlay: 'rgba(0, 0, 0, 0.6)',

  textPrimary: palette.neutral0,
  textSecondary: palette.neutral300,
  textDisabled: palette.neutral600,
  textInverted: palette.neutral900,

  primary: palette.blue500,
  primaryPressed: palette.blue700,
  primarySoft: palette.neutral800,
  onPrimary: palette.neutral0,

  success: palette.green500,
  warning: palette.amber500,
  danger: palette.red500,
  dangerPressed: palette.red600,

  transparent: palette.transparent,
};

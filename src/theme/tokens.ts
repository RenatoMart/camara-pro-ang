import { Platform, type TextStyle } from 'react-native';

/** Escala de espaciado en múltiplos de 4. Nunca uses números sueltos. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type Spacing = keyof typeof spacing;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type Radius = keyof typeof radius;

/**
 * Acompaña siempre a `borderRadius`: suaviza la curva al estilo iOS
 * (esquinas "squircle" en vez de un arco de círculo).
 *
 * ```ts
 * { borderRadius: radius.md, ...roundedCorner }
 * ```
 */
export const roundedCorner = { borderCurve: 'continuous' } as const;

const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

/**
 * Monoespaciada del sistema, para datos técnicos que cambian rápido
 * (ISO, zoom, cuenta atrás): el ancho fijo evita que el layout "salte".
 */
const monoFontFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/** Variantes tipográficas. Añade aquí antes que estilos ad-hoc. */
export const typography = {
  displayLg: {
    fontFamily,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  title: {
    fontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontFamily,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  bodyStrong: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  caption: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  overline: {
    fontFamily,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  monoLg: {
    fontFamily: monoFontFamily,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
  },
  mono: {
    fontFamily: monoFontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  monoXs: {
    fontFamily: monoFontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Sombras con la sintaxis CSS `boxShadow`.
 *
 * Sustituye a los antiguos `shadowColor`/`shadowOffset`/`elevation`: una sola
 * declaración funciona igual en iOS y Android, admite varias sombras y no
 * obliga a ramificar por plataforma.
 */
export const elevation = {
  none: { boxShadow: 'none' },
  sm: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)' },
  md: { boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)' },
  lg: { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)' },
} as const;

export type Elevation = keyof typeof elevation;

/** Duraciones de animación, en ms. */
export const duration = {
  fast: 120,
  normal: 220,
  slow: 400,
} as const;

/** Área mínima táctil recomendada por las guías de accesibilidad. */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH_SIZE = 44;

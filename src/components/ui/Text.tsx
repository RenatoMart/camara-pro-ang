import React from 'react';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useTheme, type TypographyVariant } from '@/theme';
import type { AppColors } from '@/theme/colors';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  /** Nombre semántico del color, no un hex. */
  color?: keyof AppColors;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
};

/**
 * Texto de la app. Sustituye siempre al `Text` de react-native.
 *
 * Centralizarlo permite cambiar tipografía o modo oscuro en un solo archivo,
 * y garantiza que el texto respete el tamaño de fuente del sistema.
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  return (
    <RNText
      style={[
        theme.typography[variant] as TextStyle,
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}

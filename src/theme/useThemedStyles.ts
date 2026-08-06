import { useMemo } from 'react';
import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useTheme, type Theme } from './ThemeProvider';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

/**
 * Crea hojas de estilo que dependen del tema, memoizadas por tema.
 *
 * Uso:
 * ```ts
 * const useStyles = makeStyles(theme => ({
 *   container: { backgroundColor: theme.colors.surface },
 * }));
 *
 * const styles = useStyles();
 * ```
 *
 * Se prefiere esto a estilos inline porque `StyleSheet.create` evita recrear
 * objetos en cada render.
 */
export function makeStyles<T extends NamedStyles>(
  factory: (theme: Theme) => T,
) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}

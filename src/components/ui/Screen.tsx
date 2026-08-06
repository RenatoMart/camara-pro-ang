import React, { type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/theme';

export type ScreenProps = PropsWithChildren<{
  /** Envuelve el contenido en un ScrollView. */
  scrollable?: boolean;
  /** Ajusta el layout cuando aparece el teclado (útil en formularios). */
  avoidKeyboard?: boolean;
  /**
   * Bordes seguros a respetar cuando `scrollable` es `false`.
   *
   * Con `scrollable`, el safe area lo resuelve iOS de forma nativa vía
   * `contentInsetAdjustmentBehavior="automatic"`, que además maneja bien el
   * teclado y las barras dinámicas.
   */
  edges?: readonly Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

/**
 * Contenedor raíz de cada pantalla.
 *
 * Resuelve de una sola vez tres cosas que suelen olvidarse pantalla por
 * pantalla: safe area (notch / barra de gestos), color de la status bar según
 * el tema, y comportamiento del teclado.
 */
export function Screen({
  children,
  scrollable = false,
  avoidKeyboard = false,
  edges = ['bottom'],
  padded = true,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const content = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        padded ? styles.padded : null,
        styles.grow,
        contentContainerStyle,
      ]}
      // Deja que la plataforma calcule los insets: soporta safe areas
      // dinámicas y permite que el contenido scrollee bajo la status bar.
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        padded ? styles.padded : null,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  // Sólo se aplica padding manual cuando NO hay scroll: en ese caso no existe
  // un ScrollView al que la plataforma pueda ajustar los insets.
  const safeAreaPadding: ViewStyle = scrollable
    ? {}
    : {
        paddingTop: edges.includes('top') ? insets.top : 0,
        paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges.includes('left') ? insets.left : 0,
        paddingRight: edges.includes('right') ? insets.right : 0,
      };

  return (
    <View style={[styles.container, safeAreaPadding, style]}>
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  flex: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  padded: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
}));

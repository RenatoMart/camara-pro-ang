import React, { memo, useCallback, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

export type ShutterButtonProps = {
  onPress: () => void;
  /** Mientras se captura, el botón muestra actividad y no responde. */
  busy?: boolean;
};

const SIZE = 72;
const INNER_SIZE = 56;

/**
 * Disparador principal.
 *
 * Círculo doble clásico de cámara: anillo fijo + botón interior que se
 * encoge al pulsar (animación de escala por transform, en el hilo nativo).
 */
export const ShutterButton = memo(function ShutterButtonBase({
  onPress,
  busy = false,
}: ShutterButtonProps) {
  const theme = useTheme();
  const styles = useStyles();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.85,
      useNativeDriver: true,
      speed: 40,
    }).start();
  }, [scale]);

  const pressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
    }).start();
  }, [scale]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel="Tomar foto"
      accessibilityState={{ busy }}
      style={styles.ring}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale }] }]}>
        {busy ? (
          <ActivityIndicator color={theme.hud.background} size="small" />
        ) : null}
      </Animated.View>
    </Pressable>
  );
});

const useStyles = makeStyles(theme => ({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: theme.radius.full,
    borderWidth: 3,
    borderColor: theme.hud.shutterRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: theme.radius.full,
    backgroundColor: theme.hud.shutterInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

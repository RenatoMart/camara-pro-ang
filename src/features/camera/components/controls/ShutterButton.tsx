import React, { memo, useCallback, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

export type ShutterButtonProps = {
  onPress: () => void;
  /** Mientras se captura una foto, el botón muestra actividad y no responde. */
  busy?: boolean;
  /**
   * `foto` (por defecto) es el disco blanco de toda la vida. `video` lo
   * cambia por el botón rojo de grabar/parar, como en cualquier cámara.
   */
  variant?: 'foto' | 'video';
  /** Sólo con `variant="video"`: si está grabando, el botón pasa a "parar". */
  recording?: boolean;
};

const SIZE = 72;
const INNER_SIZE = 56;
/** Lado del cuadrado de "detener", más pequeño que el disco para que se lea como un botón distinto, no como el mismo disco recortado. */
const STOP_SIZE = 28;

/**
 * Disparador principal.
 *
 * Círculo doble clásico de cámara: anillo fijo + botón interior que se
 * encoge al pulsar (animación de escala por transform, en el hilo nativo).
 */
export const ShutterButton = memo(function ShutterButtonBase({
  onPress,
  busy = false,
  variant = 'foto',
  recording = false,
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

  const isVideo = variant === 'video';
  const label = isVideo
    ? recording
      ? 'Detener grabación'
      : 'Grabar vídeo'
    : 'Tomar foto';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, selected: isVideo && recording }}
      style={styles.ring}
    >
      <Animated.View
        style={[
          isVideo ? styles.innerVideo : styles.inner,
          isVideo && recording ? styles.innerVideoRecording : null,
          { transform: [{ scale }] },
        ]}
      >
        {busy && !isVideo ? (
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
  innerVideo: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: theme.radius.full,
    backgroundColor: theme.hud.recording,
  },
  // Encogido y con esquinas suaves: el "cuadrado de parar" clásico.
  innerVideoRecording: {
    width: STOP_SIZE,
    height: STOP_SIZE,
    borderRadius: theme.radius.sm,
    ...theme.roundedCorner,
  },
}));

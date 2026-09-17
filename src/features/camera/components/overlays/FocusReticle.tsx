import React, { memo, useEffect } from 'react';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

export type FocusReticleProps = {
  /** Centro del cuadrado, en coordenadas del visor. */
  x: number;
  y: number;
  /** Avisa cuando la animación termina, para que quien la monta la retire. */
  onFinished: () => void;
};

const SIZE = 72;
/** Cuánto se agranda al aparecer, antes de asentarse — el "chasquido" clásico de enfoque. */
const START_SCALE = 1.3;
const HOLD_MS = 700;
const FADE_MS = 250;

/**
 * El cuadrado que aparece al tocar para enfocar/medir, como en cualquier
 * cámara: entra con un chasquido, se mantiene un momento y se desvanece.
 * Puramente decorativo — el enfoque de verdad ya se disparó en
 * `CameraViewport` antes de montar esto.
 */
export const FocusReticle = memo(function FocusReticleBase({
  x,
  y,
  onFinished,
}: FocusReticleProps) {
  const theme = useTheme();
  const styles = useStyles();

  const scale = useSharedValue(START_SCALE);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withDelay(
        HOLD_MS,
        withTiming(0, { duration: FADE_MS }, finished => {
          if (finished) {
            runOnJS(onFinished)();
          }
        }),
      ),
    );
    scale.value = withTiming(1, { duration: 180 });
    // Sólo debe correr una vez al montar: `onFinished` es estable por
    // `useCallback` en quien lo llama, pero no hace falta re-lanzar la
    // animación si cambiara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.square,
        {
          left: x - SIZE / 2,
          top: y - SIZE / 2,
          borderColor: theme.hud.accent,
        },
        animatedStyle,
      ]}
    />
  );
});

const useStyles = makeStyles(() => ({
  square: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderWidth: 1.5,
  },
}));

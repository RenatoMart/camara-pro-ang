import React, { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme';

export type TickSliderProps = {
  min: number;
  max: number;
  /** A qué múltiplo se ajusta el valor al arrastrar. */
  step: number;
  value: number;
  /** Ausente en modo decorativo: el arrastre no hace nada. */
  onChange?: (value: number) => void;
  disabled?: boolean;
  formatValue: (value: number) => string;
};

/** Cuántas marcas se dibujan, da igual el rango: es la regla, no el dato. */
const TICK_COUNT = 25;
const TRACK_HEIGHT = 40;

/**
 * `'worklet'` explícito: se llama tanto desde el gesto como desde
 * `useAnimatedStyle`, los dos en el hilo de UI. Sin la directiva, Reanimated
 * no la reconoce como función de worklet y falla al intentar despacharla
 * desde ahí — el error típico pasa por `RemoteFunctionUnpacker`.
 */
function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/**
 * Regla de rayitas para ajustar un valor arrastrando, como el EV o el ISO de
 * cualquier cámara con modo PRO.
 *
 * El indicador vive en un `SharedValue` y se mueve en el hilo de UI sin
 * pasar por React en cada píxel del arrastre — la misma razón por la que el
 * zoom del visor se optimizó igual: `onChange` sólo se llama de tanto en
 * tanto (cada pocos eventos), lo justo para no saturar el hilo de JS.
 */
export const TickSlider = memo(function TickSliderBase({
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
  formatValue,
}: TickSliderProps) {
  const theme = useTheme();
  const styles = useStyles();

  const trackWidth = useSharedValue(0);
  const dragValue = useSharedValue(value);
  const isDragging = useRef(false);
  const updateTick = useSharedValue(0);
  /**
   * Último valor que de verdad se avisó a `onChange`. Al pegar el dedo
   * contra un extremo, el gesto sigue disparando eventos con el mismo
   * `snapped` repetido — sin este freno se llamaba a `onChange` igual cada
   * pocos eventos, y en el caso de ISO/velocidad cada llamada nueva cancela
   * la anterior en la cámara (`OperationCanceledException`), disparando una
   * ráfaga de errores por quedarse pegado al límite.
   */
  const lastEmitted = useSharedValue(value);

  // Mientras no se está arrastrando, el indicador sigue al valor real (por
  // ejemplo si algo externo lo cambia); durante el arrastre manda el propio
  // gesto, igual que el zoom con `isPinching`.
  useEffect(() => {
    if (!isDragging.current) {
      const clamped = clamp(value, min, max);
      dragValue.value = clamped;
      // Nuevo punto de partida: un cambio externo (p. ej. volver a
      // automático y luego a un valor por defecto distinto) no debe quedar
      // bloqueado por el freno de "no repetir" de un arrastre anterior.
      lastEmitted.value = clamped;
    }
  }, [value, min, max, dragValue, lastEmitted]);

  const onTrackLayout = useCallback(
    (event: LayoutChangeEvent) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  const setDragging = useCallback((dragging: boolean) => {
    isDragging.current = dragging;
  }, []);

  const emitChange = useCallback(
    (next: number) => {
      onChange?.(next);
    },
    [onChange],
  );

  const pan = Gesture.Pan()
    .enabled(!disabled && onChange != null)
    .onStart(() => {
      runOnJS(setDragging)(true);
    })
    .onUpdate(event => {
      if (trackWidth.value <= 0) {
        return;
      }
      const fraction = clamp(event.x / trackWidth.value, 0, 1);
      const raw = min + fraction * (max - min);
      const snapped = clamp(Math.round(raw / step) * step, min, max);
      dragValue.value = snapped;

      updateTick.value += 1;
      if (updateTick.value % 3 === 0 && snapped !== lastEmitted.value) {
        lastEmitted.value = snapped;
        runOnJS(emitChange)(snapped);
      }
    })
    .onEnd(() => {
      if (dragValue.value !== lastEmitted.value) {
        lastEmitted.value = dragValue.value;
        runOnJS(emitChange)(dragValue.value);
      }
      runOnJS(setDragging)(false);
    });

  const thumbStyle = useAnimatedStyle(() => {
    const range = max - min || 1;
    const fraction = clamp((dragValue.value - min) / range, 0, 1);
    return {
      left: `${fraction * 100}%`,
    };
  });

  return (
    <View style={[styles.container, disabled ? styles.disabled : null]}>
      <Text variant="mono" style={{ color: theme.hud.text }} align="center">
        {formatValue(value)}
      </Text>

      <GestureDetector gesture={pan}>
        <View style={styles.track} onLayout={onTrackLayout}>
          <View style={styles.ticksRow} pointerEvents="none">
            {Array.from({ length: TICK_COUNT }, (_, index) => (
              <View key={index} style={styles.tick} />
            ))}
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              { backgroundColor: theme.hud.accent },
              thumbStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  container: {
    gap: theme.spacing.xs,
  },
  disabled: {
    opacity: 0.4,
  },
  track: {
    height: TRACK_HEIGHT,
    justifyContent: 'center',
  },
  ticksRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tick: {
    width: 2,
    height: 14,
    borderRadius: 1,
    backgroundColor: theme.hud.gridLine,
  },
  thumb: {
    position: 'absolute',
    width: 3,
    height: TRACK_HEIGHT,
    marginLeft: -1.5,
    borderRadius: 1.5,
  },
}));

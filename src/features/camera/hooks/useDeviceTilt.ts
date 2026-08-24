import { useState } from 'react';
import {
  SensorType,
  runOnJS,
  useAnimatedReaction,
  useAnimatedSensor,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { LEVEL_EXIT_DEG, LEVEL_TOLERANCE_DEG } from '../constants/guides';

/** Intervalo de muestreo del sensor de gravedad, en ms. */
const SENSOR_INTERVAL_MS = 80;

const TO_DEGREES = 180 / Math.PI;

export type DeviceTilt = {
  /** Grados de roll (horizonte torcido), como SharedValue en el hilo de UI. */
  roll: SharedValue<number>;
  /** Grados de pitch (inclinación adelante/atrás). */
  pitch: SharedValue<number>;
  /** true cuando el horizonte está dentro de la tolerancia (con histéresis). */
  isLevel: boolean;
  /** false si esta build no tiene sensor de gravedad. */
  isAvailable: boolean;
};

/**
 * Inclinación del teléfono a partir del sensor de gravedad, vía Reanimated.
 *
 * Los ángulos continuos viven en SharedValues del hilo de UI (nada de
 * re-renders por lectura); a React sólo llega `isLevel`, que cambia rara vez
 * y con histéresis.
 *
 * La fórmula replica `tiltFromGravity` de `utils/geometry.ts` (donde está
 * probada); aquí va inline porque el cuerpo de un worklet no puede llamar a
 * funciones normales de JS.
 */
export function useDeviceTilt(enabled: boolean): DeviceTilt {
  const gravity = useAnimatedSensor(SensorType.GRAVITY, {
    interval: SENSOR_INTERVAL_MS,
  });

  const [isLevel, setIsLevel] = useState(false);
  const levelShared = useSharedValue(false);

  const roll = useDerivedValue(() => {
    const { x, y } = gravity.sensor.value;
    // Giro completo en el plano de la pantalla y desviación respecto al
    // cuarto de vuelta más cercano: así el nivel funciona igual con el
    // teléfono en vertical que en horizontal. Ver `tiltFromGravity`.
    const screenAngle = Math.atan2(x, -y) * TO_DEGREES;
    return screenAngle - Math.round(screenAngle / 90) * 90;
  });

  const pitch = useDerivedValue(() => {
    const { x, y, z } = gravity.sensor.value;
    return Math.atan2(z, Math.sqrt(x * x + y * y)) * TO_DEGREES;
  });

  useAnimatedReaction(
    () => roll.value,
    currentRoll => {
      if (!enabled) {
        return;
      }
      // Histéresis: entra nivelado bajo la tolerancia, sale sobre el umbral.
      const limit = levelShared.value ? LEVEL_EXIT_DEG : LEVEL_TOLERANCE_DEG;
      const next = Math.abs(currentRoll) <= limit;
      if (next !== levelShared.value) {
        levelShared.value = next;
        runOnJS(setIsLevel)(next);
      }
    },
    [enabled],
  );

  return {
    roll,
    pitch,
    isLevel: enabled ? isLevel : false,
    isAvailable: gravity.isAvailable,
  };
}

import { useEffect, useRef } from 'react';

import {
  AUTO_SHUTTER_COOLDOWN_MS,
  AUTO_SHUTTER_HOLD_MS,
} from '../constants/guides';

type AutoShutterOptions = {
  /** Interruptor del modo (preferencia del usuario). */
  enabled: boolean;
  /** Estado actual del nivel de horizonte. */
  isLevel: boolean;
  /** Dispara la captura. */
  onTrigger: () => void;
};

/**
 * Disparo automático por nivelación.
 *
 * Cuando el modo está activo y el horizonte se mantiene nivelado durante
 * `AUTO_SHUTTER_HOLD_MS`, dispara una vez. Después queda desarmado hasta que
 * el usuario rompa el nivel y vuelva a nivelarlo, con una pausa mínima entre
 * disparos, para no ametrallar fotos por mantener el teléfono quieto.
 */
export function useAutoShutter({
  enabled,
  isLevel,
  onTrigger,
}: AutoShutterOptions): void {
  const armedRef = useRef(true);
  const lastShotAtRef = useRef(0);
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  useEffect(() => {
    if (!enabled) {
      armedRef.current = true;
      return;
    }

    if (!isLevel) {
      // Romper el nivel es lo que rearma el siguiente disparo.
      armedRef.current = true;
      return;
    }

    if (!armedRef.current) {
      return;
    }

    const holdTimer = setTimeout(() => {
      const sinceLastShot = Date.now() - lastShotAtRef.current;
      if (sinceLastShot < AUTO_SHUTTER_COOLDOWN_MS) {
        return;
      }
      armedRef.current = false;
      lastShotAtRef.current = Date.now();
      triggerRef.current();
    }, AUTO_SHUTTER_HOLD_MS);

    return () => {
      clearTimeout(holdTimer);
    };
  }, [enabled, isLevel]);
}

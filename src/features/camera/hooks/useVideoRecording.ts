import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';

import { logger } from '@/utils/logger';

import { CameraRoll, hapticImpact } from '../services/nativeModules';

/**
 * Lo mínimo que la pantalla necesita del visor para grabar.
 *
 * Igual que `CameraHandle` de `useCapture.ts`: se tipa aquí y no con el tipo
 * de VisionCamera para que la pantalla no dependa del paquete.
 */
export type VideoHandle = {
  startRecording: () => Promise<void>;
  /**
   * Pide que pare la grabación y devuelve el archivo final. `undefined` si
   * no había nada grabándose.
   */
  stopRecording: () => Promise<{ uri: string } | undefined>;
};

export type VideoRecording = {
  /** Ref a colgar del visor de cámara. */
  videoRef: MutableRefObject<VideoHandle | null>;
  isRecording: boolean;
  /** Segundos grabados, para el cronómetro del HUD. */
  seconds: number;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

/** Guarda el vídeo en la galería del sistema; si falla, no se pierde: queda en caché. */
async function saveToGallery(uri: string): Promise<void> {
  try {
    await CameraRoll.saveAsset(uri, { type: 'video' });
  } catch (error) {
    logger.warn('No se pudo guardar el vídeo en la galería; queda en caché', {
      error,
    });
  }
}

/**
 * Grabación de vídeo: empieza, para, guarda en la galería del sistema y
 * lleva la cuenta de segundos para el cronómetro.
 */
export function useVideoRecording(): VideoRecording {
  const videoRef = useRef<VideoHandle | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  // Mismo motivo que `capturingRef` en `useCapture`: dos toques seguidos
  // llegan antes de que React vuelva a renderizar con `isRecording` al día.
  const startingRef = useRef(false);

  const start = useCallback(async () => {
    const video = videoRef.current;
    if (!video || startingRef.current || isRecording) {
      return;
    }

    startingRef.current = true;
    try {
      await video.startRecording();
      setSeconds(0);
      setIsRecording(true);
      hapticImpact('medium');
    } catch (error) {
      logger.error('No se pudo empezar a grabar', error);
    } finally {
      startingRef.current = false;
    }
  }, [isRecording]);

  const stop = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isRecording) {
      return;
    }

    // Se apaga primero: si `stopRecording` tarda (escribiendo el archivo), el
    // botón no debe seguir mostrándose como "grabando".
    setIsRecording(false);
    try {
      const result = await video.stopRecording();
      if (result?.uri) {
        hapticImpact('medium');
        await saveToGallery(result.uri);
      }
    } catch (error) {
      logger.error('La grabación falló al terminar', error);
    }
  }, [isRecording]);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const interval = setInterval(() => {
      setSeconds(current => current + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Objeto estable salvo cuando cambia algo real: sin esto, cada componente
  // que reciba `recording` (el botón, los efectos de seguridad al cambiar de
  // modo) lo vería "cambiar" en cada render y perdería su propia memoización.
  return useMemo(
    () => ({ videoRef, isRecording, seconds, start, stop }),
    [videoRef, isRecording, seconds, start, stop],
  );
}

import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import { useCameraStore } from '@/store/cameraStore';
import { logger } from '@/utils/logger';

import { ASPECTS } from '../constants/guides';
import { CameraRoll, hapticImpact } from '../services/nativeModules';
import { cropPhotoToAspect } from '../utils/cropPhoto';
import { composeGhost } from '../utils/ghostCompose';

/**
 * Lo mínimo que la pantalla necesita del visor para disparar.
 *
 * Se tipa aquí, y no con el tipo de VisionCamera, para que la pantalla no
 * dependa del paquete: `CameraViewport` es quien rellena este contrato.
 */
export type CameraHandle = {
  takePictureAsync: (options?: {
    quality?: number;
  }) => Promise<{ uri: string } | undefined>;
};

export type Capture = {
  /** Ref a colgar del visor de cámara. */
  cameraRef: MutableRefObject<CameraHandle | null>;
  /**
   * true mientras se dispara y se recorta la foto — no incluye fundir el
   * fantasma, que sigue en segundo plano y no bloquea el siguiente disparo.
   */
  isCapturing: boolean;
  /**
   * Toma la foto y devuelve su uri (o `null`). Con el fantasma fundiéndose,
   * la uri devuelta es la toma limpia: la versión fundida llega después y
   * sustituye la miniatura y el guardado en galería cuando esté lista.
   */
  capture: () => Promise<string | null>;
};

/**
 * Guarda la foto en la galería del sistema.
 *
 * Si no se puede (permiso negado), la foto no se pierde: queda en la caché de
 * la app y sigue sirviendo para la miniatura y el modo fantasma.
 */
async function saveToGallery(uri: string): Promise<void> {
  try {
    await CameraRoll.saveAsset(uri, { type: 'photo' });
  } catch (error) {
    logger.warn('No se pudo guardar en la galería; la foto queda en caché', {
      error,
    });
  }
}

/**
 * Captura de fotos: dispara, guarda en la galería del sistema (pidiendo
 * permiso la primera vez) y deja la uri como "última foto" para la miniatura.
 */
export function useCapture(): Capture {
  const cameraRef = useRef<CameraHandle | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  // El cerrojo va en un ref y no en el estado: dos toques seguidos ocurren
  // antes de que React vuelva a renderizar, así que el `isCapturing` que ve
  // el segundo todavía sería `false` y saldrían dos fotos de un solo disparo.
  const capturingRef = useRef(false);
  const setLastPhoto = useCameraStore(state => state.setLastPhoto);
  const aspect = useCameraStore(state => state.aspect);
  const ghostUri = useCameraStore(state => state.ghostUri);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const ghostBurn = useCameraStore(state => state.ghostBurn);

  // Fundir el fantasma va aparte de `capture()`: decodificar dos imágenes a
  // resolución completa y volver a codificar tarda, y si el fantasma viene
  // de la galería (`content://`, no `file://`) esa lectura a veces se cuelga
  // varios segundos del lado nativo — `composeGhost` ya tiene su propio
  // plazo para no colgarse para siempre, pero antes ese plazo se esperaba
  // **con el disparador bloqueado**. Ahora la foto limpia se guarda y libera
  // el disparador de inmediato; la fusión llega después y, si hace falta,
  // sustituye la miniatura por la versión fundida.
  const finishWithGhost = useCallback(
    async (croppedUri: string, ghost: string, opacity: number) => {
      const composed = await composeGhost(croppedUri, ghost, opacity);
      if (composed === null) {
        // Vale más la toma limpia que ninguna: se guarda ella en vez de la
        // fusión que no llegó. La miniatura ya la mostraba desde `capture()`,
        // así que aquí no hay nada que actualizar salvo la galería.
        logger.warn(
          'Se guarda la foto sin fundir: la composición falló o tardó demasiado',
        );
        await saveToGallery(croppedUri);
        return;
      }
      setLastPhoto(composed);
      await saveToGallery(composed);
    },
    [setLastPhoto],
  );

  const capture = useCallback(async (): Promise<string | null> => {
    const camera = cameraRef.current;
    if (!camera || capturingRef.current) {
      return null;
    }

    capturingRef.current = true;
    setIsCapturing(true);
    try {
      const photo = await camera.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) {
        return null;
      }

      hapticImpact('medium');

      // La cámara siempre entrega el fotograma completo del sensor: el
      // recorte al formato elegido (1:1, 4:5…) no lo hace VisionCamera, hay
      // que aplicarlo aquí para que la foto coincida con lo que tapaba
      // `AspectMask` en el visor.
      const ratio =
        ASPECTS.find(option => option.kind === aspect)?.ratio ?? null;
      const croppedUri = await cropPhotoToAspect(photo.uri, ratio);

      // La miniatura se actualiza ya, tanto si hay fusión pendiente como si
      // no: es lo que hace sentir el disparo instantáneo.
      setLastPhoto(croppedUri);

      if (ghostBurn && ghostUri !== null) {
        // Sólo se guarda una foto por disparo: la fundida si sale a tiempo,
        // o esta misma si la fusión falla o tarda — nunca las dos, que
        // duplicaría cada toma con fantasma en la galería.
        void finishWithGhost(croppedUri, ghostUri, ghostOpacity);
      } else {
        await saveToGallery(croppedUri);
      }

      return croppedUri;
    } catch (error) {
      logger.error('La captura falló', error);
      return null;
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  }, [
    setLastPhoto,
    aspect,
    ghostBurn,
    ghostUri,
    ghostOpacity,
    finishWithGhost,
  ]);

  return { cameraRef, isCapturing, capture };
}

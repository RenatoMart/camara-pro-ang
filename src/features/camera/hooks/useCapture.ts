import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import { useCameraStore } from '@/store/cameraStore';
import { logger } from '@/utils/logger';

import { CameraRoll, hapticImpact } from '../services/nativeModules';
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
  /** true mientras se toma y guarda la foto. */
  isCapturing: boolean;
  /** Toma la foto, la guarda en la galería y devuelve su uri (o null). */
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
  const ghostUri = useCameraStore(state => state.ghostUri);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const ghostBurn = useCameraStore(state => state.ghostBurn);

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

      // Con el fantasma activo y «fundir en la foto» encendido, lo que se
      // guarda es la mezcla, no la toma limpia. Si componer falla, se sigue
      // con la original: vale más una foto sin fundir que ninguna.
      let finalUri = photo.uri;
      if (ghostBurn && ghostUri !== null) {
        const composed = await composeGhost(photo.uri, ghostUri, ghostOpacity);
        if (composed !== null) {
          finalUri = composed;
        } else {
          logger.warn('Se guarda la foto sin fundir: la composición falló');
        }
      }

      setLastPhoto(finalUri);
      await saveToGallery(finalUri);

      return finalUri;
    } catch (error) {
      logger.error('La captura falló', error);
      return null;
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  }, [setLastPhoto, ghostBurn, ghostUri, ghostOpacity]);

  return { cameraRef, isCapturing, capture };
}

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useCameraStore } from '@/store/cameraStore';
import { logger } from '@/utils/logger';

import {
  GALLERY_PHOTOS_QUERY_KEY,
  GALLERY_STALE_TIME_MS,
  GalleryPermissionError,
  fetchGalleryPhotos,
} from '../api/galleryPhotos';

export type Ghost = {
  /** Hay una foto superpuesta ahora mismo. */
  active: boolean;
  /** Se está buscando la foto del carrete. */
  busy: boolean;
  /** Por qué no se pudo encender, o `null` si no hay nada que contar. */
  aviso: string | null;
  toggle: () => void;
};

/**
 * Enciende y apaga la superposición fantasma.
 *
 * Elegir qué foto se superpone es la parte que importa: lo natural es
 * repetir el encuadre de la que acabas de tomar, pero `lastPhotoUri` es
 * estado de sesión y nace vacío en cada arranque. Antes eso dejaba el botón
 * deshabilitado —la función parecía rota nada más abrir la app—, así que si
 * no hay foto de la sesión se recurre a la última del carrete, que es
 * exactamente lo que el usuario tiene en mente al pulsarlo.
 */
export function useGhost(): Ghost {
  const queryClient = useQueryClient();
  const ghostUri = useCameraStore(state => state.ghostUri);
  const setGhost = useCameraStore(state => state.setGhost);
  const lastPhotoUri = useCameraStore(state => state.lastPhotoUri);

  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const toggle = useCallback(() => {
    setAviso(null);

    if (ghostUri !== null) {
      setGhost(null);
      return;
    }

    if (lastPhotoUri !== null) {
      setGhost(lastPhotoUri);
      return;
    }

    setBusy(true);
    queryClient
      .fetchQuery({
        queryKey: GALLERY_PHOTOS_QUERY_KEY,
        queryFn: fetchGalleryPhotos,
        staleTime: GALLERY_STALE_TIME_MS,
      })
      .then(photos => {
        const ultima = photos[0];
        if (ultima === undefined) {
          setAviso('Todavía no hay ninguna foto que superponer: toma una.');
          return;
        }
        setGhost(ultima.uri);
      })
      .catch((error: unknown) => {
        if (error instanceof GalleryPermissionError) {
          setAviso('Sin permiso para leer tus fotos; concédelo y reinténtalo.');
          return;
        }
        logger.error('No se pudo leer la última foto para el fantasma', error);
        setAviso('No se pudo leer la última foto.');
      })
      .finally(() => {
        setBusy(false);
      });
  }, [ghostUri, lastPhotoUri, queryClient, setGhost]);

  return { active: ghostUri !== null, busy, aviso, toggle };
}

import { CommonResolutions, type Size } from 'react-native-vision-camera';

/**
 * Catálogo de calidades de vídeo.
 *
 * Las tres son las que trae de fábrica cualquier cámara de teléfono (720p,
 * 1080p, 4K, todas a 30 fps): no hay control de fps aparte porque el propio
 * dispositivo del usuario graba las tres a la misma tasa. Cuáles están
 * realmente disponibles se detecta en `utils/videoCapabilities.ts` a partir
 * de lo que reporta el sensor — este catálogo es sólo el menú completo.
 */

export type VideoQualityKind = '720p' | '1080p' | '4k';

export type VideoQuality = {
  kind: VideoQualityKind;
  label: string;
  short: string;
  /** Resolución objetivo, con el teléfono en vertical (ver `ASPECTS`). */
  resolution: Size;
  /**
   * Lado largo mínimo que debe reportar el sensor para dar esta calidad por
   * soportada. Ver `videoCapabilities.ts`.
   */
  minLongSide: number;
};

export const VIDEO_QUALITIES: ReadonlyArray<VideoQuality> = [
  {
    kind: '720p',
    label: '720p HD',
    short: '720p',
    resolution: CommonResolutions.HD_16_9,
    minLongSide: 1280,
  },
  {
    kind: '1080p',
    label: '1080p Full HD',
    short: '1080p',
    resolution: CommonResolutions.FHD_16_9,
    minLongSide: 1920,
  },
  {
    kind: '4k',
    label: '4K Ultra HD',
    short: '4K',
    resolution: CommonResolutions.UHD_16_9,
    minLongSide: 3840,
  },
];

/** Fps fijo de grabación: el mismo para las tres calidades. */
export const VIDEO_FPS = 30;

import type { CameraDevice } from 'react-native-vision-camera';

import {
  VIDEO_QUALITIES,
  type VideoQualityKind,
} from '../constants/videoQuality';

/**
 * Qué calidades de vídeo admite de verdad este sensor.
 *
 * `device.getSupportedResolutions('video')` es la lista real de resoluciones
 * que el sensor puede entregar; se compara contra el lado largo de cada
 * calidad del catálogo en vez de buscar una coincidencia exacta, porque la
 * sesión negocia la resolución final por aspecto y no promete un tamaño
 * milimétrico. Si el sensor llega o supera el lado largo de una calidad, esa
 * calidad está disponible.
 */
export function supportedVideoQualities(
  device: CameraDevice | undefined,
): VideoQualityKind[] {
  if (device == null) {
    return [];
  }

  const resolutions = device.getSupportedResolutions('video');
  const maxSide = resolutions.reduce(
    (max, size) => Math.max(max, size.width, size.height),
    0,
  );

  return VIDEO_QUALITIES.filter(quality => maxSide >= quality.minLongSide).map(
    quality => quality.kind,
  );
}

/** Orden de mejor a peor, para degradar cuando falta la calidad preferida. */
const QUALITY_RANK: readonly VideoQualityKind[] = ['4k', '1080p', '720p'];

/**
 * La calidad a usar de verdad: la preferida si el sensor la admite, o si no,
 * la mejor de las que sí admite.
 *
 * Sin esto, un teléfono que topa en 1080p pero tiene guardada la preferencia
 * en 4K (de una sesión anterior, o de otro teléfono si el usuario cambia de
 * aparato) intentaría grabar en una resolución que el sensor rechaza.
 */
export function bestSupportedVideoQuality(
  supported: readonly VideoQualityKind[],
  preferred: VideoQualityKind,
): VideoQualityKind {
  if (supported.includes(preferred)) {
    return preferred;
  }
  return QUALITY_RANK.find(kind => supported.includes(kind)) ?? preferred;
}

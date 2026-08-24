import { PermissionsAndroid, Platform } from 'react-native';

import { CameraRoll } from '../services/nativeModules';

export type GalleryPhoto = {
  id: string;
  uri: string;
};

export const GALLERY_PAGE_SIZE = 90;

/**
 * Clave y frescura de la consulta del carrete.
 *
 * Viven aquí para que la galería y el fantasma compartan la misma entrada de
 * caché: al abrir el fantasma nada más arrancar no se relee el carrete si la
 * galería ya lo trajo, y viceversa.
 */
export const GALLERY_PHOTOS_QUERY_KEY = ['galeria', 'fotos'] as const;
export const GALLERY_STALE_TIME_MS = 30_000;

/** Error tipado para distinguir "sin permiso" de un fallo real. */
export class GalleryPermissionError extends Error {
  constructor() {
    super('Permiso de galería denegado');
    this.name = 'GalleryPermissionError';
  }
}

/** Permiso de lectura del carrete en Android (cambió en Android 13). */
async function ensureAndroidReadPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  const permission =
    Number(Platform.Version) >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

  const status = await PermissionsAndroid.request(permission);
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Últimas fotos del carrete, más recientes primero.
 *
 * Pide el permiso de lectura la primera vez y lanza `GalleryPermissionError`
 * si se deniega, para que la pantalla muestre el estado correcto.
 */
export async function fetchGalleryPhotos(): Promise<GalleryPhoto[]> {
  if (!(await ensureAndroidReadPermission())) {
    throw new GalleryPermissionError();
  }

  const page = await CameraRoll.getPhotos({
    first: GALLERY_PAGE_SIZE,
    assetType: 'Photos',
  });

  return page.edges.map(edge => ({
    id: edge.node.image.uri,
    uri: edge.node.image.uri,
  }));
}

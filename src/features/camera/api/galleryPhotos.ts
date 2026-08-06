import { PermissionsAndroid, Platform } from 'react-native';

import {
  getCameraRollModule,
  getMediaLibraryModule,
} from '../services/nativeModules';

export type GalleryPhoto = {
  id: string;
  uri: string;
};

export const GALLERY_PAGE_SIZE = 90;

/** Error tipado para distinguir "sin permiso" de un fallo real. */
export class GalleryPermissionError extends Error {
  constructor() {
    super('Permiso de galería denegado');
    this.name = 'GalleryPermissionError';
  }
}

export class GalleryUnavailableError extends Error {
  constructor() {
    super('Galería no disponible en esta build');
    this.name = 'GalleryUnavailableError';
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
 * Últimas fotos del carrete, más recientes primero, con el módulo que
 * exista: expo-media-library en Expo Go, CameraRoll en la build nativa.
 *
 * Pide el permiso de lectura la primera vez. Lanza errores tipados para que
 * la pantalla muestre el estado correcto (permiso vs. build sin módulo).
 */
export async function fetchGalleryPhotos(): Promise<GalleryPhoto[]> {
  const mediaLibrary = getMediaLibraryModule();
  if (mediaLibrary) {
    const permission = await mediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      throw new GalleryPermissionError();
    }

    const page = await mediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: GALLERY_PAGE_SIZE,
      sortBy: [[mediaLibrary.SortBy.creationTime, false]],
    });

    return page.assets.map(asset => ({ id: asset.id, uri: asset.uri }));
  }

  const cameraRoll = getCameraRollModule();
  if (cameraRoll) {
    if (!(await ensureAndroidReadPermission())) {
      throw new GalleryPermissionError();
    }

    const page = await cameraRoll.CameraRoll.getPhotos({
      first: GALLERY_PAGE_SIZE,
      assetType: 'Photos',
    });

    return page.edges.map(edge => ({
      id: edge.node.image.uri,
      uri: edge.node.image.uri,
    }));
  }

  throw new GalleryUnavailableError();
}

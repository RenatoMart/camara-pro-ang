import type * as CameraRollPkg from '@react-native-camera-roll/camera-roll';
import type * as ExpoCamera from 'expo-camera';
import type * as ExpoFileSystem from 'expo-file-system/legacy';
import type * as ExpoHaptics from 'expo-haptics';
import type * as ExpoMediaLibrary from 'expo-media-library/legacy';
import { Vibration } from 'react-native';
import type * as NitroImage from 'react-native-nitro-image';
import type * as VisionCamera from 'react-native-vision-camera';

import { logger } from '@/utils/logger';

/**
 * Carga protegida de los módulos nativos de la cámara.
 *
 * La app corre en dos mundos con librerías de cámara distintas:
 *
 * - **Expo Go**: trae compilados `expo-camera`, `expo-sensors`,
 *   `expo-media-library`… pero NO VisionCamera.
 * - **Build nativa** (`npm run android` / `ios`): trae VisionCamera y
 *   CameraRoll compilados, pero NO los módulos de Expo
 *   (`install-expo-modules` no soporta RN 0.86).
 *
 * Importar el paquete equivocado en el mundo equivocado revienta la app al
 * arrancar (en desarrollo, Metro reporta el error como fatal incluso dentro
 * de un try/catch). Por eso primero se detecta el runtime con `global.expo`
 * —que sólo existe cuando expo-modules-core está instalado nativamente— y
 * sólo entonces se hace el `require()` correspondiente.
 */

type CameraModule = typeof ExpoCamera;
type MediaLibraryModule = typeof ExpoMediaLibrary;
type HapticsModule = typeof ExpoHaptics;
type FileSystemModule = typeof ExpoFileSystem;
type VisionCameraModule = typeof VisionCamera;
type CameraRollModule = typeof CameraRollPkg;
type NitroImageModule = typeof NitroImage;

/** ¿Corre la app dentro de Expo Go (o de una build con expo-modules)? */
export function isExpoRuntime(): boolean {
  return (globalThis as { expo?: unknown }).expo != null;
}

const cache = new Map<string, unknown | null>();

function load<T>(name: string, loader: () => T): T | null {
  if (cache.has(name)) {
    return cache.get(name) as T | null;
  }

  let loaded: T | null = null;
  try {
    loaded = loader();
  } catch {
    logger.warn(`Módulo nativo no disponible en esta build: ${name}`);
  }

  cache.set(name, loaded);
  return loaded;
}

// — Módulos de Expo: sólo dentro de Expo Go —

export const getCameraModule = (): CameraModule | null =>
  isExpoRuntime() ? load('expo-camera', () => require('expo-camera')) : null;

export const getMediaLibraryModule = (): MediaLibraryModule | null =>
  isExpoRuntime()
    ? load('expo-media-library', () => require('expo-media-library/legacy'))
    : null;

export const getHapticsModule = (): HapticsModule | null =>
  isExpoRuntime() ? load('expo-haptics', () => require('expo-haptics')) : null;

/** Escritura de archivos dentro de Expo Go (para la foto ya compuesta). */
export const getFileSystemModule = (): FileSystemModule | null =>
  isExpoRuntime()
    ? load('expo-file-system', () => require('expo-file-system/legacy'))
    : null;

// — Librerías nativas: sólo en la build compilada (npm run android / ios) —

export const getVisionCameraModule = (): VisionCameraModule | null =>
  isExpoRuntime()
    ? null
    : load('react-native-vision-camera', () =>
        require('react-native-vision-camera'),
      );

export const getCameraRollModule = (): CameraRollModule | null =>
  isExpoRuntime()
    ? null
    : load('@react-native-camera-roll/camera-roll', () =>
        require('@react-native-camera-roll/camera-roll'),
      );

/** Escritura de archivos en la build nativa (para la foto ya compuesta). */
export const getNitroImageModule = (): NitroImageModule | null =>
  isExpoRuntime()
    ? null
    : load('react-native-nitro-image', () =>
        require('react-native-nitro-image'),
      );

/** ¿Existe alguna cámara nativa en esta build? */
export const isCameraAvailable = (): boolean =>
  getCameraModule() !== null || getVisionCameraModule() !== null;

/** Vibración corta de confirmación, con lo que haya disponible. */
export function hapticImpact(style: 'light' | 'medium' = 'light'): void {
  const haptics = getHapticsModule();
  if (haptics) {
    const feedback =
      style === 'medium'
        ? haptics.ImpactFeedbackStyle.Medium
        : haptics.ImpactFeedbackStyle.Light;
    void haptics.impactAsync(feedback).catch(() => undefined);
    return;
  }
  Vibration.vibrate(style === 'medium' ? 40 : 15);
}

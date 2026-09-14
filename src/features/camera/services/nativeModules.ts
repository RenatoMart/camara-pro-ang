import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { NativeModules, Vibration } from 'react-native';
import { loadImage } from 'react-native-nitro-image';

/**
 * Módulos nativos de la cámara.
 *
 * La app se compila siempre como build nativa, así que estos paquetes están
 * enlazados y se pueden importar de forma normal. Este archivo existe para
 * que el resto de la feature dependa de un contrato propio en vez de hablar
 * directamente con cada librería: cambiar de paquete se hace aquí.
 *
 * - Visor y captura → `react-native-vision-camera` (se usa vía sus hooks y
 *   componentes, así que se importa donde se renderiza).
 * - Carrete → `@react-native-camera-roll/camera-roll`.
 * - Escritura de imágenes → `react-native-nitro-image`.
 * - Lectura de `content://` → `ContentUriReader` (módulo propio, Kotlin puro
 *   en `android/app/src/main/java/com/camaraproang/`, sin paquete de npm).
 * - Vibración → `Vibration` de React Native.
 */

export { CameraRoll, loadImage };

type ContentUriReaderModule = {
  /** Bytes del `uri` dado, como base64. Sólo Android; `ContentResolver`. */
  readAsBase64: (uri: string) => Promise<string>;
};

export const ContentUriReader =
  NativeModules.ContentUriReader as ContentUriReaderModule;

/** Vibración corta de confirmación. */
export function hapticImpact(style: 'light' | 'medium' = 'light'): void {
  Vibration.vibrate(style === 'medium' ? 40 : 15);
}

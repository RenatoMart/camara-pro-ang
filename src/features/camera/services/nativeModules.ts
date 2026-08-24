import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { Vibration } from 'react-native';
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
 * - Vibración → `Vibration` de React Native.
 */

export { CameraRoll, loadImage };

/** Vibración corta de confirmación. */
export function hapticImpact(style: 'light' | 'medium' = 'light'): void {
  Vibration.vibrate(style === 'medium' ? 40 : 15);
}

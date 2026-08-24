import { NitroModules, type HybridObject } from 'react-native-nitro-modules';

/**
 * Motor nativo del asistente de composición.
 *
 * Implementado en C++ propio, no en una librería de React Native: ver
 * `android/app/src/main/jni/composition/`. Esta interfaz es sólo el
 * contrato JSI; toda la lógica vive del lado nativo, incluida la carga del
 * modelo: JavaScript no toca nunca los bytes del `.tflite`.
 */
export interface CompositionEngine extends HybridObject<{ android: 'c++' }> {
  /**
   * Carga el modelo desde los assets del APK y reserva sus tensores.
   *
   * El trabajo corre en un hilo aparte del lado nativo, por eso devuelve una
   * promesa: ni el hilo de JS ni el de la cámara se bloquean mientras tanto.
   */
  loadModelFromAsset(assetName: string): Promise<void>;
  /**
   * Corre la inferencia sobre un frame ya preparado (224×224×3 `uint8` RGB).
   * Devuelve las 14 probabilidades del modelo, o un buffer vacío si el
   * modelo todavía no terminó de cargar.
   */
  analyze(rgbPixels: ArrayBuffer): ArrayBuffer;
}

/**
 * Nombre del modelo dentro de `assets/` del APK.
 *
 * El archivo vive en `src/features/camera/ai/assets/`, que
 * `android/app/build.gradle` declara como carpeta de assets del módulo: se
 * empaqueta desde ahí sin copiarlo a dos sitios.
 */
const MODEL_ASSET = 'modelo_composicion_int8.tflite';

const engine =
  NitroModules.createHybridObject<CompositionEngine>('CompositionEngine');

let loadPromise: Promise<void> | null = null;

/**
 * Carga el modelo en el motor nativo, una sola vez sin importar cuántos
 * componentes la pidan a la vez.
 *
 * Si la carga falla se olvida la promesa, para que el siguiente intento
 * vuelva a probar: un fallo puntual no debe dejar el asistente muerto hasta
 * reiniciar la app.
 */
export function ensureCompositionModelLoaded(): Promise<void> {
  loadPromise ??= engine
    .loadModelFromAsset(MODEL_ASSET)
    .catch((error: unknown) => {
      loadPromise = null;
      throw error;
    });
  return loadPromise;
}

export function getCompositionEngine(): CompositionEngine {
  return engine;
}

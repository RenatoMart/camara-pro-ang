import { useCallback, useRef, useState, type MutableRefObject } from 'react';

import { useCameraStore } from '@/store/cameraStore';
import { logger } from '@/utils/logger';

import { ASPECTS } from '../constants/guides';
import type { WhiteBalanceGains } from '../constants/manualControls';
import { CameraRoll, hapticImpact } from '../services/nativeModules';
import { cropPhotoToAspect } from '../utils/cropPhoto';
import { composeGhost } from '../utils/ghostCompose';

/**
 * Lo mínimo que la pantalla necesita del visor para disparar.
 *
 * Se tipa aquí, y no con el tipo de VisionCamera, para que la pantalla no
 * dependa del paquete: `CameraViewport` es quien rellena este contrato.
 */
export type CameraHandle = {
  takePictureAsync: () => Promise<{ uri: string } | undefined>;
  /**
   * ISO + velocidad de obturación manuales, en un solo golpe (Camera2 los
   * liga: no hay forma de fijar uno sin fijar también el otro). No hace
   * nada si la cámara aún no está lista o el sensor no admite manual.
   */
  setManualExposure: (iso: number, shutterSeconds: number) => Promise<void>;
  /**
   * Balance de blancos manual, dado directamente como ganancias (no
   * Kelvin: ver `manualControls.ts` sobre por qué un Kelvin absoluto no
   * sirve sin calibrar contra este sensor en concreto).
   */
  setManualWhiteBalance: (gains: WhiteBalanceGains) => Promise<void>;
  /** Vuelve exposición y balance de blancos a automático. */
  resetManualControls: () => Promise<void>;
  /**
   * ISO + velocidad que el automático está aplicando ahora mismo (o `null`
   * si aún no hay lectura). Sirve para arrancar el control manual desde el
   * valor real en vez de uno inventado — por eso es síncrona: hace falta el
   * valor en el mismo instante en que el usuario toca la regla, no un
   * instante después.
   */
  readLiveExposure: () => { iso: number; shutterSeconds: number } | null;
  /** Igual que `readLiveExposure`, para el balance de blancos. */
  readLiveWhiteBalanceGains: () => WhiteBalanceGains | null;
};

export type Capture = {
  /** Ref a colgar del visor de cámara. */
  cameraRef: MutableRefObject<CameraHandle | null>;
  /**
   * true mientras se dispara y se recorta la foto — no incluye fundir el
   * fantasma, que sigue en segundo plano y no bloquea el siguiente disparo.
   */
  isCapturing: boolean;
  /**
   * Toma la foto y devuelve su uri (o `null`). Con el fantasma fundiéndose,
   * la uri devuelta es la toma limpia: la versión fundida llega después y
   * sustituye la miniatura y el guardado en galería cuando esté lista.
   */
  capture: () => Promise<string | null>;
};

/**
 * Tope de tiempo para el disparo nativo.
 *
 * Red de seguridad, no la defensa principal: si la app pasa a segundo plano
 * (o la sesión de cámara se interrumpe por cualquier otro motivo) justo
 * mientras se dispara, la promesa nativa de `capturePhotoToFile` puede
 * quedarse sin resolver ni rechazar nunca — la cámara que la respaldaba ya
 * no está. Sin esto, `isCapturing` se quedaba en `true` para siempre: el
 * disparador mostraba el aro de carga sin parar y no dejaba disparar de
 * nuevo. Mismo patrón que `composeGhost` (`COMPOSE_TIMEOUT_MS`).
 */
const CAPTURE_TIMEOUT_MS = 8_000;

/**
 * Si el disparo nativo no resuelve a tiempo, se abandona la espera (no se
 * puede cancelar la promesa nativa en sí) y se trata como una captura
 * fallida — vale más poder reintentar que quedarse esperando.
 */
async function takePictureWithTimeout(
  camera: CameraHandle,
): Promise<{ uri: string } | undefined> {
  return Promise.race([
    camera.takePictureAsync(),
    new Promise<undefined>(resolve => {
      setTimeout(() => {
        logger.warn(
          'El disparo tardó demasiado; se libera el disparador para poder reintentar',
        );
        resolve(undefined);
      }, CAPTURE_TIMEOUT_MS);
    }),
  ]);
}

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
  const aspect = useCameraStore(state => state.aspect);
  const ghostUri = useCameraStore(state => state.ghostUri);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const ghostBurn = useCameraStore(state => state.ghostBurn);

  // Fundir el fantasma va aparte de `capture()`: decodificar dos imágenes a
  // resolución completa y volver a codificar tarda, y si el fantasma viene
  // de la galería (`content://`, no `file://`) esa lectura a veces se cuelga
  // varios segundos del lado nativo — `composeGhost` ya tiene su propio
  // plazo para no colgarse para siempre, pero antes ese plazo se esperaba
  // **con el disparador bloqueado**. Ahora la foto limpia se guarda y libera
  // el disparador de inmediato; la fusión llega después y, si hace falta,
  // sustituye la miniatura por la versión fundida.
  const finishWithGhost = useCallback(
    async (croppedUri: string, ghost: string, opacity: number) => {
      const composed = await composeGhost(croppedUri, ghost, opacity);
      if (composed === null) {
        // Vale más la toma limpia que ninguna: se guarda ella en vez de la
        // fusión que no llegó. La miniatura ya la mostraba desde `capture()`,
        // así que aquí no hay nada que actualizar salvo la galería.
        logger.warn(
          'Se guarda la foto sin fundir: la composición falló o tardó demasiado',
        );
        await saveToGallery(croppedUri);
        return;
      }
      setLastPhoto(composed);
      await saveToGallery(composed);
    },
    [setLastPhoto],
  );

  const capture = useCallback(async (): Promise<string | null> => {
    if (capturingRef.current) {
      // Ya hay un disparo en marcha: se ignora el toque de más en silencio,
      // es lo normal al tocar rápido dos veces.
      return null;
    }
    const camera = cameraRef.current;
    if (!camera) {
      // La cámara se desmonta mientras se reconecta tras una interrupción
      // (segundo plano, llamada entrante…) — sin aviso, un toque en ese
      // instante no hacía nada y se sentía igual que un cuelgue.
      logger.warn('No se pudo disparar: la cámara todavía no está lista');
      hapticImpact('medium');
      return null;
    }

    capturingRef.current = true;
    setIsCapturing(true);
    // Cuánto tarda cada paso hasta que el disparador vuelve a estar libre
    // (`isCapturing` a `false`), que es lo que de verdad nota el usuario —
    // no incluye guardar en galería ni fundir el fantasma, que ya corren
    // en segundo plano. Sólo se ve con `npm run android` (`logger` se apaga
    // en release), es para medir en el propio teléfono, no telemetría.
    const startedAt = Date.now();
    try {
      const photo = await takePictureWithTimeout(camera);
      const capturedAt = Date.now();
      if (!photo?.uri) {
        hapticImpact('medium');
        return null;
      }

      hapticImpact('medium');

      // La cámara siempre entrega el fotograma completo del sensor: el
      // recorte al formato elegido (1:1, 4:5…) no lo hace VisionCamera, hay
      // que aplicarlo aquí para que la foto coincida con lo que tapaba
      // `AspectMask` en el visor.
      const ratio =
        ASPECTS.find(option => option.kind === aspect)?.ratio ?? null;
      const croppedUri = await cropPhotoToAspect(photo.uri, ratio);
      const croppedAt = Date.now();
      logger.debug('Tiempos de captura (ms)', {
        sensorYCodificacion: capturedAt - startedAt,
        recorte: croppedAt - capturedAt,
        totalHastaLiberarDisparador: croppedAt - startedAt,
      });

      // La miniatura se actualiza ya, tanto si hay fusión pendiente como si
      // no: es lo que hace sentir el disparo instantáneo.
      setLastPhoto(croppedUri);

      // Guardar en galería va en segundo plano, igual que fundir el
      // fantasma: al usuario ya le mostramos la miniatura, así que no tiene
      // sentido tenerlo esperando a que el sistema termine de escribir el
      // archivo en la galería para poder disparar la siguiente foto.
      if (ghostBurn && ghostUri !== null) {
        // Sólo se guarda una foto por disparo: la fundida si sale a tiempo,
        // o esta misma si la fusión falla o tarda — nunca las dos, que
        // duplicaría cada toma con fantasma en la galería.
        void finishWithGhost(croppedUri, ghostUri, ghostOpacity);
      } else {
        void saveToGallery(croppedUri);
      }

      return croppedUri;
    } catch (error) {
      logger.error('La captura falló', error);
      // El toque de todas formas hizo algo, aunque haya salido mal — sin
      // esto no había ninguna señal, y un fallo silencioso se siente igual
      // que un cuelgue.
      hapticImpact('medium');
      return null;
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  }, [
    setLastPhoto,
    aspect,
    ghostBurn,
    ghostUri,
    ghostOpacity,
    finishWithGhost,
  ]);

  return { cameraRef, isCapturing, capture };
}

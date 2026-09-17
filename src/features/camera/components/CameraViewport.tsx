import { useIsFocused } from '@react-navigation/native';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import {
  Camera,
  CommonResolutions,
  usePhotoOutput,
  useVideoOutput,
  type CameraDevice,
  type CameraFrameOutput,
  type CameraOutput,
  type CameraRef,
  type Constraint,
  type Size,
} from 'react-native-vision-camera';

import { Text } from '@/components/ui/Text';
import { useAppState } from '@/hooks/useAppState';
import { makeStyles } from '@/theme';
import { logger } from '@/utils/logger';

import type { FlashKind } from '../constants/guides';
import {
  mapFriendlyEvToDeviceIndex,
  type ExposureRange,
} from '../constants/manualControls';
import { VIDEO_FPS } from '../constants/videoQuality';
import type { CameraHandle } from '../hooks/useCapture';
import type { VideoHandle } from '../hooks/useVideoRecording';

import { FocusReticle } from './overlays/FocusReticle';

export type CameraViewportProps = {
  flash: FlashKind;
  /**
   * La cámara elegida, o `undefined` mientras el módulo nativo todavía la
   * está enumerando. Vive en la pantalla y no aquí dentro porque el zoom
   * (mín./máx./pasos ópticos) también sale de este objeto y hace falta más
   * arriba, para el botón indicador.
   */
  device: CameraDevice | undefined;
  /**
   * Factor de zoom real (1 = angular normal), no normalizado.
   *
   * Es el valor de partida y el que manda cuando cambia por algo que no es
   * el pellizco (el botón de zoom, cambiar de cámara…). Mientras se pellizca,
   * el que manda de verdad es el `SharedValue` interno: éste sólo se pone al
   * día al final, para no pelearse con el gesto en marcha.
   */
  zoom: number;
  /**
   * Avisa del factor de zoom vigente: al soltar el pellizco, y de tanto en
   * tanto mientras se pellizca (lo justo para que el indicador en pantalla
   * se vea fluido sin saturar el hilo de JS). Quien la recibe decide dónde
   * vive el estado; aquí sólo se calcula el gesto.
   */
  onZoomChange: (zoom: number) => void;
  /**
   * Compensación de exposición (EV) tal como la ve el usuario: siempre
   * -4..+4 (`FRIENDLY_EV_RANGE`), no el índice crudo del sensor. Este
   * componente es quien la traduce a lo que `setExposureBias` espera de
   * verdad en Android — ver el mapeo más abajo y su porqué en
   * `constants/manualControls.ts`.
   */
  ev: number;
  /**
   * Toque suelto sobre el visor, antes de decidir si enfoca. Devuelve
   * `true` si ya hizo algo con el toque (p. ej. ocultar el panel PRO) — en
   * ese caso el visor no enfoca a la vez, para no mezclar "cerrar un menú"
   * con "tocar para enfocar".
   */
  onTap?: () => boolean;
  cameraRef: React.MutableRefObject<CameraHandle | null>;
  /**
   * Avisa del rango real de ISO/velocidad del sensor en cuanto la sesión
   * arranca (antes no existe: `CameraController` tarda en estar listo). Es
   * `null` mientras no se conoce, o si el sensor no admite exposición
   * manual — `ManualControlEditor` lo usa para saber si puede ofrecer el
   * control.
   */
  onExposureRangeChange: (range: ExposureRange | null) => void;
  /** Igual que `onExposureRangeChange`, pero para el balance de blancos. */
  onWhiteBalanceSupportedChange: (supported: boolean) => void;
  /**
   * Output de frames del asistente de composición, o `null` en modo manual.
   *
   * Sólo se añade a la cámara cuando no es `null`: en manual la sesión ni
   * siquiera transmite frames al analizador, así que no hay coste alguno.
   */
  compositionFrameOutput?: CameraFrameOutput | null;
  /**
   * Resolución objetivo de la foto, o `undefined` para el valor por defecto
   * de este componente (`DEFAULT_PHOTO_RESOLUTION`, más rápido que el
   * preset genérico de `usePhotoOutput`). El modo «Ultra HD» pasa aquí la
   * máxima real del sensor (`device.getSupportedResolutions('photo')`,
   * calculada en la pantalla).
   */
  photoResolution?: Size;
  /**
   * Modo vídeo activo.
   *
   * La salida de vídeo sólo se añade a la cámara mientras es `true` — igual
   * que `compositionFrameOutput` con el modo automático—, así que grabar no
   * cuesta nada en Foto ni en Pro.
   */
  isVideoMode: boolean;
  /** Resolución objetivo de la grabación (ver `constants/videoQuality.ts`). */
  videoResolution: Size;
  /** Si hay permiso de micrófono: sin él, se graba igual mudo. */
  enableAudio: boolean;
  videoRef: React.MutableRefObject<VideoHandle | null>;
};

/** Todas las grabaciones van a 30 fps: ver `VIDEO_FPS`. */
const VIDEO_CONSTRAINTS: Constraint[] = [{ fps: VIDEO_FPS }];

/**
 * Resolución de foto por defecto fuera de Ultra HD.
 *
 * El preset genérico de `usePhotoOutput` es `CommonResolutions.UHD_4_3`
 * (~12,2 MP) — de fábrica, sin que nadie lo pidiera, cada foto en Foto/Pro
 * pagaba el mismo costo de sensor+codificación que Ultra HD, que es
 * justamente el modo pensado para eso. Medido en un Redmi Note 15: ~1-1,5 s
 * sólo de captura+codificación a ese tamaño (ver los tiempos que registra
 * `useCapture.ts`). `QHD_4_3` (~5 MP) es de sobra para pantalla y para
 * compartir, y al pedir un tamaño de salida menor la cámara puede leer y
 * codificar menos datos — falta confirmar cuánto baja en este teléfono en
 * concreto. Ultra HD sigue pidiendo la resolución máxima real del sensor
 * cuando el usuario la elige a propósito.
 */
const DEFAULT_PHOTO_RESOLUTION = CommonResolutions.QHD_4_3;

/**
 * Tope de zoom digital, por encima del límite físico del sensor
 * (`device.maxZoom`).
 *
 * Muchos teléfonos reportan un `maxZoom` de 15-30×, pero pasado un punto es
 * puro recorte de píxeles sin detalle real: mejor no dejar que el pellizco
 * llegue ahí y decepcione.
 */
export const MAX_USEFUL_ZOOM = 8;

/**
 * ¿El fallo viene de ajustar la cámara antes de que su sesión esté corriendo?
 *
 * VisionCamera aplica zoom, exposición y linterna en cuanto existe el
 * controlador, sin esperar a que la sesión abra, así que al montar el visor y
 * al volver de segundo plano esos ajustes se rechazan. El propio ajuste se
 * reintenta cuando la sesión abre, de modo que no hay nada que corregir: sólo
 * conviene no tratarlo como un error de verdad.
 */
function isSessionNotReadyError(error: Error): boolean {
  return /Camera is not active|OperationCanceled/i.test(error.message);
}

/**
 * Ejecuta una llamada imperativa a la cámara (control manual, tocar para
 * enfocar…) sin dejar rechazos sueltos.
 *
 * Arrastrar un control dispara una llamada nativa por cada evento que deja
 * pasar el throttle de `TickSlider`: si el dedo se mueve rápido, la
 * siguiente llega antes de que la anterior termine y CameraX cancela la
 * vieja con `OperationCanceledException` — es el comportamiento normal de
 * "me superó un valor más nuevo", no un fallo. Como estas llamadas se
 * disparan con `void` (no hay quien las espere), dejar que ese rechazo
 * llegara sin capturar inundaba la consola vía
 * `promiseRejectionTrackingOptions`.
 *
 * `label` identifica qué llamada era en el log — varias cosas distintas
 * (ISO/S, WB, tocar para enfocar…) pasan por aquí, y un mensaje genérico no
 * decía cuál había fallado de verdad.
 */
async function runManualControlCall(
  label: string,
  call: () => Promise<void>,
): Promise<void> {
  try {
    await call();
  } catch (error) {
    if (error instanceof Error && isSessionNotReadyError(error)) {
      logger.debug(`${label}: descartado, superado por otro más nuevo`);
      return;
    }
    logger.error(`${label}: falló`, error);
  }
}

/**
 * El visor de cámara.
 *
 * Mientras el módulo nativo enumera las cámaras muestra un aviso en lugar de
 * montar `<Camera>`, que lanzaría si la lista aún está vacía.
 */
export const CameraViewport = memo(function CameraViewportBase({
  flash,
  device,
  zoom,
  onZoomChange,
  ev,
  onTap,
  cameraRef,
  onExposureRangeChange,
  onWhiteBalanceSupportedChange,
  compositionFrameOutput,
  photoResolution,
  isVideoMode,
  videoResolution,
  enableAudio,
  videoRef,
}: CameraViewportProps) {
  // El sistema retira el acceso a la cámara cuando la app deja de estar en
  // primer plano; mantener la sesión abierta hace que Android la rechace con
  // «Camera is disabled, probably due to a device policy!» y que cualquier
  // ajuste posterior (zoom, flash) falle con «Camera is not active».
  // Por eso la sesión sigue al ciclo de vida de la app y al foco de la
  // pantalla: al volver, el visor se reengancha solo.
  const appState = useAppState();
  const isFocused = useIsFocused();
  const isActive = appState === 'active' && isFocused;

  // `qualityPrioritization: 'speed'` (CAPTURE_MODE_ZERO_SHUTTER_LAG) se probó
  // aquí para el retraso del disparo, pero medido con datos reales en este
  // teléfono no bajó el tiempo de captura ni un poco (ver el historial de
  // `useCapture.ts`) — y sí tiene un costo real y continuo: mientras la
  // cámara está abierta, mantiene un buffer de frames recientes vivo todo el
  // rato, no sólo al disparar. Pagar ese costo sin el beneficio que se
  // buscaba no tiene sentido, así que se quitó: `usePhotoOutput` se queda con
  // el balance por defecto de la librería (`CAPTURE_MODE_MINIMIZE_LATENCY`),
  // que ya de por sí no es el modo lento de "maximizar calidad".
  const photoOutput = usePhotoOutput({
    targetResolution: photoResolution ?? DEFAULT_PHOTO_RESOLUTION,
  });
  const videoOutput = useVideoOutput({
    targetResolution: videoResolution,
    enableAudio,
  });
  const outputs = useMemo(() => {
    const list: CameraOutput[] = [photoOutput];
    if (compositionFrameOutput != null) {
      list.push(compositionFrameOutput);
    }
    if (isVideoMode) {
      list.push(videoOutput);
    }
    return list;
  }, [photoOutput, compositionFrameOutput, isVideoMode, videoOutput]);

  // Sin esto VisionCamera usa su manejador por defecto, que hace
  // `console.error` en lugar de pasar por el `logger` de la app.
  const handleError = useCallback((error: Error) => {
    if (isSessionNotReadyError(error)) {
      logger.debug('Ajuste de cámara descartado: la sesión aún no está lista');
      return;
    }
    logger.error('Fallo en la sesión de cámara', error);
  }, []);

  // El flash se decide en el momento del disparo (API de VisionCamera):
  // se guarda en un ref para que el adaptador lea siempre el valor vigente.
  const flashRef = useRef(flash);
  flashRef.current = flash;

  // ISO/velocidad/WB manuales van por aquí: a diferencia del zoom y el EV,
  // no existe una prop declarativa (`<Camera iso={...}>`) que los enlace —
  // `CameraController` sólo los expone de forma imperativa
  // (`setExposureLocked`, `setWhiteBalanceLocked`), así que hace falta el
  // controlador nativo en sí, no sólo el `SharedValue`.
  const nativeCameraRef = useRef<CameraRef>(null);

  // El controlador (y con él, los rangos reales de ISO/velocidad) sólo
  // existe una vez arrancada la sesión — antes de `onStarted`, `.controller`
  // es `undefined` aunque el ref ya esté montado.
  const handleStarted = useCallback(() => {
    const controller = nativeCameraRef.current?.controller;
    if (controller == null) {
      onExposureRangeChange(null);
      onWhiteBalanceSupportedChange(false);
      return;
    }
    onExposureRangeChange(
      controller.device.supportsExposureLocking
        ? {
            minIso: controller.minISO,
            maxIso: controller.maxISO,
            minShutterSeconds: controller.minExposureDuration,
            maxShutterSeconds: controller.maxExposureDuration,
          }
        : null,
    );
    onWhiteBalanceSupportedChange(
      controller.device.supportsWhiteBalanceLocking,
    );
  }, [onExposureRangeChange, onWhiteBalanceSupportedChange]);

  useEffect(() => {
    cameraRef.current = {
      takePictureAsync: async () => {
        const file = await photoOutput.capturePhotoToFile(
          { flashMode: flashRef.current },
          {},
        );
        return { uri: `file://${file.filePath}` };
      },
      setManualExposure: async (iso, shutterSeconds) => {
        const controller = nativeCameraRef.current?.controller;
        if (controller == null) {
          return;
        }
        await runManualControlCall('ISO/velocidad manual', () =>
          controller.setExposureLocked(shutterSeconds, iso),
        );
      },
      setManualWhiteBalance: async gains => {
        const controller = nativeCameraRef.current?.controller;
        if (controller == null) {
          return;
        }
        await runManualControlCall('Balance de blancos manual', () =>
          controller.setWhiteBalanceLocked(gains),
        );
      },
      resetManualControls: async () => {
        const controller = nativeCameraRef.current?.controller;
        if (controller == null) {
          return;
        }
        await runManualControlCall('Volver a automático', () =>
          controller.resetFocus(),
        );
      },
      readLiveExposure: () => {
        const controller = nativeCameraRef.current?.controller;
        if (
          controller == null ||
          controller.iso <= 0 ||
          controller.exposureDuration <= 0
        ) {
          return null;
        }
        return {
          iso: controller.iso,
          shutterSeconds: controller.exposureDuration,
        };
      },
      readLiveWhiteBalanceGains: () => {
        const controller = nativeCameraRef.current?.controller;
        if (controller == null) {
          return null;
        }
        const gains = controller.whiteBalanceGains;
        if (gains.redGain <= 0 || gains.blueGain <= 0) {
          return null;
        }
        return gains;
      },
    };
    return () => {
      cameraRef.current = null;
    };
  }, [cameraRef, photoOutput]);

  // Un `Recorder` sólo graba una vez: `startRecording` crea uno nuevo cada
  // vez, y `finishResolver` es cómo `stopRecording` se entera del archivo
  // final — llega por el callback de `Recorder.startRecording`, no por el
  // valor de retorno de `stopRecording()` (que sólo pide el cierre).
  const activeRecorder = useRef<Awaited<
    ReturnType<typeof videoOutput.createRecorder>
  > | null>(null);
  const finishResolver = useRef<((uri: string | undefined) => void) | null>(
    null,
  );

  useEffect(() => {
    videoRef.current = {
      startRecording: async () => {
        const recorder = await videoOutput.createRecorder({});
        activeRecorder.current = recorder;
        await recorder.startRecording(
          filePath => {
            finishResolver.current?.(`file://${filePath}`);
            finishResolver.current = null;
            activeRecorder.current = null;
          },
          error => {
            logger.error('La grabación de vídeo falló', error);
            finishResolver.current?.(undefined);
            finishResolver.current = null;
            activeRecorder.current = null;
          },
        );
      },
      stopRecording: async () => {
        const recorder = activeRecorder.current;
        if (recorder == null) {
          return undefined;
        }
        const uri = await new Promise<string | undefined>(resolve => {
          finishResolver.current = resolve;
          recorder.stopRecording().catch(() => resolve(undefined));
        });
        return uri != null ? { uri } : undefined;
      },
    };
    return () => {
      videoRef.current = null;
    };
  }, [videoRef, videoOutput]);

  // El zoom en sí vive en un `SharedValue`, no en una prop de React: es lo
  // que enlaza `<Camera zoom>` directo al controlador nativo por el hilo de
  // UI (`react-native-vision-camera-worklets`), sin cruzar a JS en cada
  // fotograma del pellizco. Pasarle un número normal en vez de esto era la
  // causa de que el zoom "seguía acercando solo" un rato tras soltar los
  // dedos: cada micro-cambio hacía una ronda completa por el puente antes de
  // llegar a la cámara, y el hilo de JS se quedaba procesando la cola de
  // toques ya pasados.
  const zoomShared = useSharedValue(zoom);
  // Mientras se pellizca, el zoom lo manda el gesto: si este efecto
  // reescribiera `zoomShared` con la prop (que va uno o dos pasos por detrás,
  // vía `onZoomChange`), el zoom "rebotaría" hacia atrás en mitad del gesto.
  const isPinching = useRef(false);
  useEffect(() => {
    if (!isPinching.current) {
      zoomShared.value = zoom;
    }
  }, [zoom, zoomShared]);

  const zoomAtPinchStart = useSharedValue(zoom);
  // Cuenta los eventos del pellizco para avisar a React sólo de tanto en
  // tanto: el zoom de verdad no necesita a JS (va por `zoomShared`), pero el
  // indicador en pantalla sí, y no hace falta que se entere 120 veces por
  // segundo para verse fluido.
  const updateTick = useSharedValue(0);

  const setPinching = useCallback((value: boolean) => {
    isPinching.current = value;
  }, []);

  const minZoom = device?.minZoom ?? 1;
  const maxZoom = Math.min(device?.maxZoom ?? 1, MAX_USEFUL_ZOOM);

  // Tocar para enfocar y medir (AF+AE): `focusTo` ya existe en el propio
  // `<Camera>` (vía `CameraRef`), y CameraX hace todo el trabajo de mapear
  // el punto de pantalla al sensor y armar la región de medición — no hace
  // falta ni NDK ni C++ para esto, es la misma `FocusMeteringAction` de
  // siempre. Sin `AWB` en los modos: no debe pelearse con el balance de
  // blancos manual si está activo. Los modos que de verdad se piden se
  // acotan a lo que `device.supportsFocusMetering`/`supportsExposureMetering`
  // digan — pedir uno que el sensor no admite hace fallar la llamada
  // entera, no sólo ese modo (`IllegalArgumentException` de CameraX).
  const [focusTap, setFocusTap] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const focusTapKeyRef = useRef(0);
  const clearFocusTap = useCallback(() => setFocusTap(null), []);

  const handleTap = useCallback(
    (x: number, y: number) => {
      // Si el toque ya cerró un panel (bandeja PRO, editor manual), no
      // enfoca también: mezclaría "quitar el menú de en medio" con "medir
      // aquí", que son intenciones distintas.
      const consumed = onTap?.() ?? false;
      if (consumed) {
        return;
      }
      const cam = nativeCameraRef.current;
      if (cam == null) {
        return;
      }
      focusTapKeyRef.current += 1;
      setFocusTap({ x, y, key: focusTapKeyRef.current });

      // CameraX rechaza la llamada entera (`IllegalArgumentException: None
      // of the specified AF/AE/AWB MeteringPoints is supported`) si se le
      // pide un modo que este sensor no admite — antes se pedían AF y AE
      // sin comprobar, y con uno de los dos sin soporte fallaba también el
      // otro. El retículo ya se mostró arriba: sirve de aviso igual aunque
      // el sensor no admita ninguno de los dos.
      const modes: Array<'AF' | 'AE'> = [];
      if (device?.supportsFocusMetering) {
        modes.push('AF');
      }
      if (device?.supportsExposureMetering) {
        modes.push('AE');
      }
      if (modes.length === 0) {
        return;
      }
      void runManualControlCall('Tocar para enfocar', () =>
        cam.focusTo({ x, y }, { modes }),
      );
    },
    [onTap, device],
  );

  const gesture = useMemo(() => {
    // Sin `.runOnJS(true)`: el pellizco corre entero en el hilo de UI como
    // worklet. Sólo `setPinching` y el aviso del indicador cruzan a JS, y
    // sólo cuando hace falta.
    const pinch = Gesture.Pinch()
      .onStart(() => {
        zoomAtPinchStart.value = zoomShared.value;
        runOnJS(setPinching)(true);
      })
      .onUpdate(event => {
        const next = Math.min(
          Math.max(zoomAtPinchStart.value * event.scale, minZoom),
          maxZoom,
        );
        zoomShared.value = next;

        updateTick.value += 1;
        if (updateTick.value % 4 === 0) {
          runOnJS(onZoomChange)(next);
        }
      })
      .onEnd(() => {
        runOnJS(onZoomChange)(zoomShared.value);
        runOnJS(setPinching)(false);
      });

    // El toque sí va a JS directo: no se repite decenas de veces por
    // segundo, así que no hay nada que optimizar.
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd(event => {
        handleTap(event.x, event.y);
      });

    return Gesture.Simultaneous(pinch, tap);
  }, [
    minZoom,
    maxZoom,
    onZoomChange,
    handleTap,
    setPinching,
    zoomShared,
    zoomAtPinchStart,
    updateTick,
  ]);

  // El EV, igual que el zoom, va por `SharedValue`: `<Camera exposure>`
  // también lo admite y así no cruza a JS por cada punto entero de ajuste.
  // Pero antes hay que traducirlo: `ev` llega en la escala -4..+4 que ve el
  // usuario, y `setExposureBias` en Android espera el índice crudo del
  // sensor (`device.minExposureBias`/`maxExposureBias`) — ver el porqué en
  // `constants/manualControls.ts`.
  const evShared = useSharedValue(
    mapFriendlyEvToDeviceIndex(ev, {
      min: device?.minExposureBias ?? 0,
      max: device?.maxExposureBias ?? 0,
    }),
  );
  useEffect(() => {
    evShared.value = mapFriendlyEvToDeviceIndex(ev, {
      min: device?.minExposureBias ?? 0,
      max: device?.maxExposureBias ?? 0,
    });
  }, [ev, device, evShared]);

  if (device == null) {
    return <ViewportLoading />;
  }

  // En vídeo, el botón de flash de la barra superior enciende la linterna en
  // vez de disparar el flash de una foto: un solo disparo de luz no sirve de
  // nada mientras se graba. `auto` no tiene equivalente en la linterna
  // (es todo o nada), así que se trata como `on`.
  const torchMode =
    isVideoMode && device.hasTorch && flash !== 'off' ? 'on' : 'off';

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill}>
        <Camera
          ref={nativeCameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          outputs={outputs}
          isActive={isActive}
          zoom={zoomShared}
          exposure={evShared}
          torchMode={torchMode}
          constraints={isVideoMode ? VIDEO_CONSTRAINTS : undefined}
          onStarted={handleStarted}
          resizeMode="cover"
          // Por defecto VisionCamera usa `device`, que lee el sensor físico y
          // gira la salida aunque el teléfono tenga la rotación bloqueada: la
          // app acaba ignorando un ajuste del sistema que no le corresponde
          // tocar. Con `interface` la orientación sigue a la de la pantalla,
          // así que el bloqueo del usuario manda —y de paso no se registra el
          // listener de orientación del sensor.
          orientationSource="interface"
          onError={handleError}
        />
        {focusTap != null ? (
          <FocusReticle
            key={focusTap.key}
            x={focusTap.x}
            y={focusTap.y}
            onFinished={clearFocusTap}
          />
        ) : null}
      </View>
    </GestureDetector>
  );
});

/** Mientras el módulo nativo termina de enumerar las cámaras. */
function ViewportLoading() {
  const styles = useStyles();

  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Text variant="caption" style={styles.fallbackHint} align="center">
        Preparando la cámara…
      </Text>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  fallback: {
    backgroundColor: theme.hud.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  fallbackHint: {
    color: theme.hud.textDim,
  },
}));

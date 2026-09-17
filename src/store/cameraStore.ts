import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AspectKind,
  FlashKind,
  GuideKind,
  GuideMode,
  HdrKind,
  TimerKind,
} from '@/features/camera/constants/guides';
import type { WhiteBalanceGains } from '@/features/camera/constants/manualControls';
import type { CameraMode } from '@/features/camera/constants/modes';
import type { VideoQualityKind } from '@/features/camera/constants/videoQuality';
import { StorageKeys } from '@/services/storage';

/**
 * Estado de la cámara.
 *
 * Se divide en dos bloques: preferencias (guía elegida, formato, flash…) que
 * se persisten para que la cámara arranque como la dejaste, y estado de
 * sesión (zoom, EV, fantasma, última foto) que muere con la app:
 * `partialize` sólo guarda lo primero.
 */

type CameraPrefs = {
  /** La guía elegida a mano; en modo automático la propone el asistente. */
  guide: GuideKind;
  /**
   * Quién decide la guía.
   *
   * `manual` respeta lo que elijas. `auto` deja que el asistente de
   * composición la proponga a partir de lo que ve la cámara, y en ese modo
   * `guide` deja de mandar (pero se conserva para cuando vuelvas a manual).
   */
  guideMode: GuideMode;
  /**
   * Modo de disparo elegido en la tira inferior.
   *
   * Manda sobre qué controles se ven: `pro` es el único que despliega el
   * panel de guías y ajustes finos.
   */
  mode: CameraMode;
  aspect: AspectKind;
  flash: FlashKind;
  hdr: HdrKind;
  timer: TimerKind;
  /**
   * Calidad de grabación elegida (720p/1080p/4K).
   *
   * Es la preferencia, no necesariamente la que se usa: si el sensor del
   * teléfono no llega a ella, `useVideoRecording` la degrada sola a la mejor
   * que sí admite (ver `utils/videoCapabilities.ts`), sin tocar esta
   * preferencia — así que al cambiar a un teléfono mejor, vuelve a pedirla.
   */
  videoQuality: VideoQualityKind;
  /** Nivel de horizonte visible. */
  levelOn: boolean;
  /** Disparo automático al nivelar. */
  autoShutter: boolean;
  /**
   * Fundir el fantasma dentro de la foto al disparar.
   *
   * Apagado, el fantasma es sólo una guía para repetir un encuadre y la foto
   * sale limpia. Encendido, la captura se compone con la superposición
   * (doble exposición) y es la versión fundida la que se guarda.
   */
  ghostBurn: boolean;
};

type CameraSession = {
  /**
   * Guía que propone el asistente en este momento, o `null`.
   *
   * Vive en la sesión y no en las preferencias: depende de lo que la cámara
   * esté viendo ahora, así que no tiene sentido recordarla entre arranques.
   */
  suggestedGuide: GuideKind | null;
  facing: 'back' | 'front';
  /**
   * Factor de zoom real (1 = angular normal), el mismo número que espera
   * `<Camera zoom>` de VisionCamera y el que se enseña en pantalla («1×»,
   * «2,3×»…). No es un valor normalizado: sus límites dependen del sensor
   * (`device.minZoom`/`maxZoom`), así que los aplica quien conoce el
   * dispositivo — el gesto de pellizco y el selector rápido — no el store.
   */
  zoom: number;
  /**
   * Compensación de exposición (EV) tal como la ve el usuario: siempre
   * -4..+4, igual en cualquier teléfono (`FRIENDLY_EV_RANGE` en
   * `constants/manualControls.ts`). `CameraViewport` la traduce al índice
   * crudo que de verdad espera el sensor antes de aplicarla — ver el
   * porqué en ese archivo. `0` es el neutro, siempre el valor de partida:
   * a diferencia del zoom, no tiene sentido recordarlo entre arranques,
   * cada escena pide el suyo.
   */
  ev: number;
  /**
   * ISO y velocidad de obturación manuales, o `null` en automático.
   *
   * Van juntos y no por separado: Camera2 los liga al mismo
   * `CONTROL_AE_MODE_OFF` (ver `manualControls.ts`), así que no existe un
   * estado «ISO manual, velocidad automática» en Android.
   */
  manualExposure: { iso: number; shutterSeconds: number } | null;
  /**
   * Balance de blancos manual, o `null` en automático.
   *
   * No es un Kelvin absoluto: `shift` es un ajuste cálido/frío -4..+4
   * relativo a `baseGains`, las ganancias reales que el automático tenía en
   * el instante de activar manual — ver el porqué en `manualControls.ts`
   * (`applyWhiteBalanceShift`). Con `shift = 0` el resultado es exactamente
   * `baseGains`, así que activar manual nunca cambia la imagen por sí solo.
   */
  manualWhiteBalance: { shift: number; baseGains: WhiteBalanceGains } | null;
  /** Foto usada como superposición fantasma, o null. */
  ghostUri: string | null;
  ghostOpacity: number;
  /** Última captura de la sesión, para la miniatura de galería. */
  lastPhotoUri: string | null;
};

type CameraActions = {
  setGuide: (guide: GuideKind) => void;
  setGuideMode: (mode: GuideMode) => void;
  toggleGuideMode: () => void;
  setSuggestedGuide: (guide: GuideKind | null) => void;
  setMode: (mode: CameraMode) => void;
  setAspect: (aspect: AspectKind) => void;
  setFlash: (flash: FlashKind) => void;
  setHdr: (hdr: HdrKind) => void;
  setTimer: (timer: TimerKind) => void;
  setVideoQuality: (quality: VideoQualityKind) => void;
  toggleLevel: () => void;
  toggleAutoShutter: () => void;
  toggleGhostBurn: () => void;
  toggleFacing: () => void;
  setZoom: (zoom: number) => void;
  setEv: (ev: number) => void;
  setManualExposure: (iso: number, shutterSeconds: number) => void;
  disableManualExposure: () => void;
  /** Activa manual capturando `baseGains` — ver `CameraSession.manualWhiteBalance`. */
  enableManualWhiteBalance: (baseGains: WhiteBalanceGains) => void;
  setManualWhiteBalanceShift: (shift: number) => void;
  disableManualWhiteBalance: () => void;
  setGhost: (uri: string | null) => void;
  setGhostOpacity: (opacity: number) => void;
  setLastPhoto: (uri: string) => void;
};

const initialPrefs: CameraPrefs = {
  guide: 'tercios',
  guideMode: 'manual',
  mode: 'foto',
  aspect: 'sensor',
  flash: 'off',
  hdr: 'off',
  timer: 0,
  videoQuality: '1080p',
  levelOn: false,
  autoShutter: false,
  ghostBurn: false,
};

const initialSession: CameraSession = {
  suggestedGuide: null,
  facing: 'back',
  zoom: 1,
  ev: 0,
  manualExposure: null,
  manualWhiteBalance: null,
  ghostUri: null,
  ghostOpacity: 0.4,
  lastPhotoUri: null,
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
/** Suelo de cordura: un factor de zoom nunca puede ser cero ni negativo. */
const clampZoom = (value: number): number => Math.max(0.1, value);

export const useCameraStore = create<
  CameraPrefs & CameraSession & CameraActions
>()(
  persist(
    set => ({
      ...initialPrefs,
      ...initialSession,

      // Elegir una guía a mano implica querer mandar tú: sale de automático.
      setGuide: guide => set({ guide, guideMode: 'manual' }),
      setGuideMode: mode => set({ guideMode: mode }),
      toggleGuideMode: () =>
        set(state => ({
          guideMode: state.guideMode === 'auto' ? 'manual' : 'auto',
        })),
      setSuggestedGuide: guide => set({ suggestedGuide: guide }),
      setMode: mode => set({ mode }),
      setAspect: aspect => set({ aspect }),
      setFlash: flash => set({ flash }),
      setHdr: hdr => set({ hdr }),
      setTimer: timer => set({ timer }),
      setVideoQuality: videoQuality => set({ videoQuality }),
      toggleLevel: () => set(state => ({ levelOn: !state.levelOn })),
      // El disparo automático se apoya en el nivel para saber cuándo disparar,
      // así que encenderlo enciende también el nivel: activarlo por su cuenta
      // no hacía absolutamente nada y parecía un botón roto.
      toggleAutoShutter: () =>
        set(state =>
          state.autoShutter
            ? { autoShutter: false }
            : { autoShutter: true, levelOn: true },
        ),
      toggleGhostBurn: () => set(state => ({ ghostBurn: !state.ghostBurn })),
      // El rango de zoom (y de EV) del sensor frontal no es el del trasero;
      // volver a los neutros evita pedirle a la cámara nueva un valor que
      // quizá no admite.
      toggleFacing: () =>
        set(state => ({
          facing: state.facing === 'back' ? 'front' : 'back',
          zoom: 1,
          ev: 0,
          // El rango de ISO/velocidad/WB de la cámara nueva no es el de la
          // anterior: un valor manual que allí tenía sentido aquí podría
          // caer fuera de rango.
          manualExposure: null,
          manualWhiteBalance: null,
        })),
      setZoom: zoom => set({ zoom: clampZoom(zoom) }),
      // Redondeado aquí también, no sólo en el control: el EV siempre va en
      // pasos enteros de -4 a +4.
      setEv: ev => set({ ev: Math.round(ev) }),
      setManualExposure: (iso, shutterSeconds) =>
        set({ manualExposure: { iso, shutterSeconds } }),
      disableManualExposure: () => set({ manualExposure: null }),
      enableManualWhiteBalance: baseGains =>
        set({ manualWhiteBalance: { shift: 0, baseGains } }),
      setManualWhiteBalanceShift: shift =>
        set(state =>
          state.manualWhiteBalance == null
            ? {}
            : { manualWhiteBalance: { ...state.manualWhiteBalance, shift } },
        ),
      disableManualWhiteBalance: () => set({ manualWhiteBalance: null }),
      setGhost: uri => set({ ghostUri: uri }),
      setGhostOpacity: opacity => set({ ghostOpacity: clamp01(opacity) }),
      setLastPhoto: uri => set({ lastPhotoUri: uri }),
    }),
    {
      name: StorageKeys.cameraPrefs,
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      /**
       * v1 → v2: el interruptor `proMode` pasó a ser un modo de disparo más
       * de la tira inferior. Sin esta migración, zustand descartaría las
       * preferencias guardadas y la cámara arrancaría de cero tras actualizar.
       */
      migrate: (persisted: unknown, version: number) => {
        if (
          version >= 2 ||
          persisted === null ||
          typeof persisted !== 'object'
        ) {
          return persisted as CameraPrefs;
        }

        const { proMode, ...rest } = persisted as Partial<CameraPrefs> & {
          proMode?: boolean;
        };

        return {
          ...initialPrefs,
          ...rest,
          mode: proMode === true ? 'pro' : initialPrefs.mode,
        } satisfies CameraPrefs;
      },
      partialize: state => ({
        guide: state.guide,
        guideMode: state.guideMode,
        mode: state.mode,
        aspect: state.aspect,
        flash: state.flash,
        hdr: state.hdr,
        timer: state.timer,
        videoQuality: state.videoQuality,
        levelOn: state.levelOn,
        autoShutter: state.autoShutter,
        ghostBurn: state.ghostBurn,
      }),
    },
  ),
);

/**
 * La guía que hay que dibujar ahora mismo.
 *
 * En manual manda la elegida. En automático manda la que propone el
 * asistente, y si todavía no propone ninguna no se dibuja nada: es preferible
 * un visor limpio a dejar puesta una guía que ya no viene a cuento.
 */
export const selectActiveGuide = (
  state: CameraPrefs & CameraSession,
): GuideKind =>
  state.guideMode === 'auto' ? state.suggestedGuide ?? 'ninguna' : state.guide;

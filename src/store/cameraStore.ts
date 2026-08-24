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
import type { CameraMode } from '@/features/camera/constants/modes';
import { StorageKeys } from '@/services/storage';

/**
 * Estado de la cámara.
 *
 * Se divide en dos bloques: preferencias (guía elegida, formato, flash…) que
 * se persisten para que la cámara arranque como la dejaste, y estado de
 * sesión (zoom, fantasma, última foto) que muere con la app: `partialize`
 * sólo guarda lo primero.
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
  /** Zoom normalizado 0..1, como lo espera expo-camera. */
  zoom: number;
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
  toggleLevel: () => void;
  toggleAutoShutter: () => void;
  toggleGhostBurn: () => void;
  toggleFacing: () => void;
  setZoom: (zoom: number) => void;
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
  levelOn: false,
  autoShutter: false,
  ghostBurn: false,
};

const initialSession: CameraSession = {
  suggestedGuide: null,
  facing: 'back',
  zoom: 0,
  ghostUri: null,
  ghostOpacity: 0.4,
  lastPhotoUri: null,
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

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
      toggleFacing: () =>
        set(state => ({ facing: state.facing === 'back' ? 'front' : 'back' })),
      setZoom: zoom => set({ zoom: clamp01(zoom) }),
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

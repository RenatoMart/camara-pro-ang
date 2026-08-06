import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AspectKind,
  FlashKind,
  GuideKind,
  TimerKind,
} from '@/features/camera/constants/guides';
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
  guide: GuideKind;
  aspect: AspectKind;
  flash: FlashKind;
  timer: TimerKind;
  /** Nivel de horizonte visible. */
  levelOn: boolean;
  /** Disparo automático al nivelar. */
  autoShutter: boolean;
  /** Panel PRO desplegado. */
  proMode: boolean;
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
  setAspect: (aspect: AspectKind) => void;
  setFlash: (flash: FlashKind) => void;
  setTimer: (timer: TimerKind) => void;
  toggleLevel: () => void;
  toggleAutoShutter: () => void;
  toggleProMode: () => void;
  toggleGhostBurn: () => void;
  toggleFacing: () => void;
  setZoom: (zoom: number) => void;
  setGhost: (uri: string | null) => void;
  setGhostOpacity: (opacity: number) => void;
  setLastPhoto: (uri: string) => void;
};

const initialPrefs: CameraPrefs = {
  guide: 'tercios',
  aspect: 'sensor',
  flash: 'off',
  timer: 0,
  levelOn: false,
  autoShutter: false,
  proMode: false,
  ghostBurn: false,
};

const initialSession: CameraSession = {
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

      setGuide: guide => set({ guide }),
      setAspect: aspect => set({ aspect }),
      setFlash: flash => set({ flash }),
      setTimer: timer => set({ timer }),
      toggleLevel: () => set(state => ({ levelOn: !state.levelOn })),
      toggleAutoShutter: () =>
        set(state => ({ autoShutter: !state.autoShutter })),
      toggleProMode: () => set(state => ({ proMode: !state.proMode })),
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
      version: 1,
      partialize: state => ({
        guide: state.guide,
        aspect: state.aspect,
        flash: state.flash,
        timer: state.timer,
        levelOn: state.levelOn,
        autoShutter: state.autoShutter,
        proMode: state.proMode,
        ghostBurn: state.ghostBurn,
      }),
    },
  ),
);

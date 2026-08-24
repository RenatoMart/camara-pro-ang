import { useCallback, useEffect, useRef } from 'react';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import {
  CommonResolutions,
  useFrameOutput,
  type CameraFrameOutput,
  type Frame,
} from 'react-native-vision-camera';

import { useCameraStore } from '@/store/cameraStore';
import { logger } from '@/utils/logger';

import thresholds from '../assets/thresholds.json';
import {
  ensureCompositionModelLoaded,
  getCompositionEngine,
} from '../services/compositionEngine';
import { frameToModelInput } from '../utils/frameToTensor';
import { guidesFromScores } from '../utils/mapModelToGuides';
import {
  INITIAL_SUGGESTION_STATE,
  stabilizeSuggestion,
} from '../utils/stabilizeSuggestion';

/**
 * Analiza 1 de cada N frames del visor.
 *
 * A ~30 fps eso son ~5 análisis por segundo: de sobra para una sugerencia
 * estable, y una fracción del gasto de correr el modelo en cada frame. La
 * inferencia en sí (`CompositionEngine.analyze`) corre en C++ vía JSI, sin
 * bridge, dentro del propio hilo del frame processor.
 */
const INFERENCE_FRAME_STRIDE = 6;

/** A este ritmo, confirma una guía nueva en ~1 s sin parpadear. */
const FRAMES_TO_CONFIRM_THROTTLED = 5;

/**
 * Motor del modo automático: enchufa el asistente de composición al visor.
 *
 * Sólo analiza cuando `enabled` es `true` (modo automático activo). En manual
 * devuelve `null` y el output de frames no se añade a la cámara, así que la
 * sesión no transmite un solo fotograma al analizador: no se copia, ni se
 * convierte, ni se infiere nada. Lo único que sigue existiendo es el objeto
 * del output y su hilo, porque `useFrameOutput` es un hook y no se puede
 * llamar condicionalmente; está parado y no consume CPU.
 */
export function useCompositionAnalysis(
  enabled: boolean,
): CameraFrameOutput | null {
  const setSuggestedGuide = useCameraStore(state => state.setSuggestedGuide);
  const stateRef = useRef(INITIAL_SUGGESTION_STATE);
  const frameCounter = useSharedValue(0);
  const modelReady = useSharedValue(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    ensureCompositionModelLoaded()
      .then(() => {
        if (!cancelled) {
          modelReady.value = true;
        }
      })
      .catch(error => {
        logger.error('No se pudo cargar el modelo de composición', error);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, modelReady]);

  useEffect(() => {
    if (!enabled) {
      setSuggestedGuide(null);
      stateRef.current = INITIAL_SUGGESTION_STATE;
    }
  }, [enabled, setSuggestedGuide]);

  const handleScores = useCallback(
    (scores: number[]) => {
      const suggestion = guidesFromScores(scores, thresholds)[0]?.guide ?? null;
      stateRef.current = stabilizeSuggestion(
        stateRef.current,
        suggestion,
        FRAMES_TO_CONFIRM_THROTTLED,
      );
      setSuggestedGuide(stateRef.current.shown);
    },
    [setSuggestedGuide],
  );

  const engine = getCompositionEngine();

  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      if (!modelReady.value) {
        frame.dispose();
        return;
      }

      frameCounter.value += 1;
      if (frameCounter.value % INFERENCE_FRAME_STRIDE !== 0) {
        frame.dispose();
        return;
      }

      const input = frameToModelInput(frame);
      frame.dispose();

      const output = engine.analyze(input);
      if (output.byteLength === 0) {
        // El motor nativo todavía no terminó de cargar el modelo.
        return;
      }
      runOnJS(handleScores)(Array.from(new Float32Array(output)));
    },
    [engine, modelReady, frameCounter, handleScores],
  );

  const frameOutput = useFrameOutput({
    targetResolution: CommonResolutions.VGA_16_9,
    pixelFormat: 'rgb',
    enablePreviewSizedOutputBuffers: true,
    onFrame,
  });

  return enabled ? frameOutput : null;
}

import type { GuideKind } from '../../constants/guides';

/**
 * Estabiliza la guía sugerida a lo largo del tiempo.
 *
 * El modelo se evalúa por frame y sus salidas bailan: en el límite del umbral
 * una clase se enciende y se apaga varias veces por segundo, y una guía que
 * parpadea es peor que no tener asistente. Además `rule_of_thirds` acierta
 * sólo el 58% de las veces que se activa, así que exigir permanencia filtra
 * buena parte de los falsos positivos sin tocar el modelo.
 *
 * Es la misma idea que la histéresis del nivel giroscópico, pero contando
 * frames en vez de grados: una guía nueva tiene que repetirse varios frames
 * seguidos antes de sustituir a la que se está mostrando.
 */

export type SuggestionState = {
  /** La que se está dibujando ahora. */
  shown: GuideKind | null;
  /** La que aspira a sustituirla. */
  candidate: GuideKind | null;
  /** Frames consecutivos que lleva la candidata repitiéndose. */
  streak: number;
};

export const INITIAL_SUGGESTION_STATE: SuggestionState = {
  shown: null,
  candidate: null,
  streak: 0,
};

/**
 * Frames que una guía debe mantenerse antes de mostrarse.
 *
 * A ~30 fps son algo menos de medio segundo: suficiente para descartar
 * parpadeos sin que el asistente se sienta lento.
 */
export const FRAMES_TO_CONFIRM = 12;

/**
 * Avanza un frame.
 *
 * `incoming` es la guía que propone el modelo en este frame, o `null` si no
 * propone ninguna. Apagar la guía también exige confirmación, para que no
 * desaparezca en cuanto un frame salga borroso.
 */
export function stabilizeSuggestion(
  state: SuggestionState,
  incoming: GuideKind | null,
  framesToConfirm: number = FRAMES_TO_CONFIRM,
): SuggestionState {
  // Lo que llega ya es lo que se ve: no hay nada que confirmar.
  if (incoming === state.shown) {
    return { shown: state.shown, candidate: null, streak: 0 };
  }

  // Cambió la candidata: la racha empieza de nuevo.
  if (incoming !== state.candidate) {
    return { shown: state.shown, candidate: incoming, streak: 1 };
  }

  const streak = state.streak + 1;
  if (streak >= framesToConfirm) {
    return { shown: incoming, candidate: null, streak: 0 };
  }

  return { shown: state.shown, candidate: incoming, streak };
}

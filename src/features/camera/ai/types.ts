import type { GuideKind } from '../constants/guides';

import type { CompositionClass } from './constants/compositionClasses';

/**
 * Tipos del asistente de composición.
 *
 * La cadena completa es: frame → modelo → 14 probabilidades → clases activas
 * → guía sugerida. Cada paso tiene su tipo para que no se mezclen entre sí.
 */

/**
 * Salida cruda del modelo: 14 probabilidades entre 0 y 1, en el orden de
 * `COMPOSITION_CLASSES`.
 *
 * Son **sigmoides independientes, no un softmax**: no suman 1 y varias pueden
 * estar activas a la vez (el 28% de las fotos cumple más de una regla). Nunca
 * aplicar `argmax` sobre esto.
 */
export type CompositionScores = readonly number[];

/** Una clase que ha superado su umbral, con la probabilidad que dio. */
export type ActiveClass = {
  kind: CompositionClass;
  score: number;
};

/** Lo que el asistente propone dibujar. */
export type GuideSuggestion = {
  guide: GuideKind;
  /** Clase del modelo que la motivó, para poder explicarla en la UI. */
  from: CompositionClass;
  score: number;
};

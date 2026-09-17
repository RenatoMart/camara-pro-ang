import type { GuideKind } from '../../constants/guides';
import {
  CLASS_PRECISION,
  COMPOSITION_CLASSES,
  type CompositionClass,
} from '../constants/compositionClasses';
import type { ActiveClass, CompositionScores, GuideSuggestion } from '../types';

/**
 * De las salidas del modelo a la guía que se dibuja.
 *
 * Las clases del modelo y las guías del panel PRO no son la misma lista, así
 * que hay que traducir. Todo lo de aquí es cálculo puro y sin React: se puede
 * probar sin cámara ni modelo.
 */

/**
 * Qué guía dibujar para cada clase, o `null` si no hay ninguna que la
 * represente.
 *
 * - `rule_of_thirds` → `tercios`: Phi es la *misma* detección con otra
 *   retícula, así que es una preferencia de dibujo del usuario y no otra
 *   clase; el asistente propone la retícula clásica.
 * - `center` sí tiene guía propia (el marco central), y además sirve para
 *   *no* sugerir tercios: son composiciones opuestas.
 * - `shallow_dof`, `color_blocking` y `tonal_contrast` no son geometría: no
 *   hay líneas que dibujar para ellas, así que no mapean a nada.
 */
const CLASS_TO_GUIDE: Readonly<Record<CompositionClass, GuideKind | null>> = {
  rule_of_thirds: 'tercios',
  vertical: 'vertical',
  horizontal: 'horizontal',
  diagonal: 'diagonal',
  curved: 'curva',
  triangle: 'triangulos',
  center: 'centro',
  symmetric: 'cruz',
  pattern: 'patron',
  vanishing_point: 'fuga',
  negative_space: 'aire',
  shallow_dof: null,
  color_blocking: null,
  tonal_contrast: null,
};

/** Cuántas sugerencias se muestran como mucho a la vez. */
export const MAX_SUGGESTIONS = 2;

/** Clases cuyo valor supera su umbral. */
export function activeClasses(
  scores: CompositionScores,
  thresholds: Readonly<Record<string, number>>,
): ActiveClass[] {
  const active: ActiveClass[] = [];

  COMPOSITION_CLASSES.forEach((kind, index) => {
    const score = scores[index];
    const threshold = thresholds[kind];
    if (score === undefined || threshold === undefined) {
      return;
    }
    if (score >= threshold) {
      active.push({ kind, score });
    }
  });

  return active;
}

/**
 * Ordena las clases activas y las convierte en guías dibujables.
 *
 * El criterio no es la probabilidad a secas: se pondera por la precisión
 * medida de cada clase, porque el modelo no es igual de fiable en todas.
 * `rule_of_thirds` se activa mucho y acierta poco (0,577), así que sin esta
 * corrección se llevaría casi siempre la sugerencia.
 *
 * Se limita a `MAX_SUGGESTIONS`: en escenas ricas se encienden varias
 * sigmoides a la vez y llenar el visor de retículas no ayuda a nadie.
 */
export function suggestGuides(active: ActiveClass[]): GuideSuggestion[] {
  return active
    .map(item => ({
      item,
      weight: item.score * CLASS_PRECISION[item.kind],
      guide: CLASS_TO_GUIDE[item.kind],
    }))
    .filter(
      (entry): entry is typeof entry & { guide: GuideKind } =>
        entry.guide !== null,
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_SUGGESTIONS)
    .map(entry => ({
      guide: entry.guide,
      from: entry.item.kind,
      score: entry.item.score,
    }));
}

/**
 * Atajo de la cadena completa: probabilidades → guías sugeridas.
 */
export function guidesFromScores(
  scores: CompositionScores,
  thresholds: Readonly<Record<string, number>>,
): GuideSuggestion[] {
  return suggestGuides(activeClasses(scores, thresholds));
}

/**
 * Las 14 salidas del modelo de composición, en su orden exacto.
 *
 * Es la transcripción de `ai/assets/labels.txt`. Se copia aquí a mano y no se
 * lee el `.txt` en runtime: parsear texto daría `string[]` y perderíamos el
 * tipado estricto del resto del proyecto. Si algún día cambia el modelo, hay
 * que actualizar esta tupla **y** comprobar que sigue coincidiendo con el
 * archivo, porque el orden es lo que da sentido al vector de salida.
 */
export const COMPOSITION_CLASSES = [
  'rule_of_thirds',
  'vertical',
  'horizontal',
  'diagonal',
  'curved',
  'triangle',
  'center',
  'symmetric',
  'pattern',
  'vanishing_point',
  'shallow_dof',
  'color_blocking',
  'tonal_contrast',
  'negative_space',
] as const;

export type CompositionClass = (typeof COMPOSITION_CLASSES)[number];

/**
 * Precisión (o su mejor sustituto) por clase, del modelo reentrenado el
 * 2026-09-15 con KU-PCP + el subconjunto *style* de AVA — ver `MODELO.md` del
 * repo de entrenamiento (`entrenamiento-camara-proang`).
 *
 * «De las veces que la guía se enciende, cuántas acierta». Se usa para
 * ordenar las sugerencias: ante un empate de confianza, gana la clase en la
 * que el modelo es más de fiar. `rule_of_thirds` es la menos fiable pese a
 * ser la más común, así que sin esto se llevaría siempre la sugerencia.
 *
 * Las 9 primeras son precisión real medida sobre las 1.082 fotos de test
 * (KU-PCP). Las 5 últimas (`vanishing_point`, `shallow_dof`,
 * `color_blocking`, `tonal_contrast`, `negative_space`) no tienen ni un
 * positivo en ese test —viene sólo de KU-PCP, que nunca las anotó—, así que
 * se usa en su lugar el F1 medido en validación (que sí incluye AVA): no es
 * la misma métrica, pero es la mejor señal real disponible de cuánto fiarse
 * de cada una, y sigue cumpliendo el mismo papel de desempate.
 */
export const CLASS_PRECISION: Readonly<Record<CompositionClass, number>> = {
  symmetric: 0.986,
  pattern: 0.98,
  triangle: 0.804,
  center: 0.792,
  horizontal: 0.76,
  vertical: 0.697,
  diagonal: 0.651,
  curved: 0.545,
  rule_of_thirds: 0.329,
  // F1 en validación (sin positivos de AVA en test), no precisión de test.
  negative_space: 0.839,
  tonal_contrast: 0.795,
  shallow_dof: 0.728,
  vanishing_point: 0.661,
  color_blocking: 0.651,
};

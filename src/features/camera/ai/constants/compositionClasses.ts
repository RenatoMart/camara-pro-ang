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
 * Cuántas clases entrenó de verdad el modelo.
 *
 * Las 5 últimas (`vanishing_point`, `shallow_dof`, `color_blocking`,
 * `tonal_contrast`, `negative_space`) salen siempre ~0: su dataset nunca se
 * descargó, así que no tienen ni un ejemplo positivo. **No es un fallo**;
 * están en el espacio de salida para no reentrenar cuando lleguen esas
 * imágenes. La app las ignora al sugerir, pero sus guías siguen disponibles
 * a mano en el panel PRO.
 */
export const TRAINED_CLASS_COUNT = 9;

/** ¿Puede el modelo reconocer de verdad esta clase? */
export function isTrainedClass(kind: CompositionClass): boolean {
  return COMPOSITION_CLASSES.indexOf(kind) < TRAINED_CLASS_COUNT;
}

/**
 * Precisión medida por clase sobre las 1.082 fotos de test (KU-PCP).
 *
 * «De las veces que la guía se enciende, cuántas acierta». Se usa para
 * ordenar las sugerencias: ante un empate de confianza, gana la clase en la
 * que el modelo es más de fiar. `rule_of_thirds` es la menos fiable pese a
 * ser la más común, así que sin esto se llevaría siempre la sugerencia.
 */
export const CLASS_PRECISION: Readonly<Record<CompositionClass, number>> = {
  pattern: 0.91,
  symmetric: 0.88,
  horizontal: 0.792,
  center: 0.834,
  triangle: 0.806,
  vertical: 0.632,
  diagonal: 0.64,
  curved: 0.616,
  rule_of_thirds: 0.577,
  // Sin entrenar: nunca se activan, la precisión es informativa.
  vanishing_point: 0,
  shallow_dof: 0,
  color_blocking: 0,
  tonal_contrast: 0,
  negative_space: 0,
};

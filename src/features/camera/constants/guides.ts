/**
 * Catálogo de guías de composición y formatos del visor.
 *
 * Todo lo que el usuario puede elegir en el HUD se declara aquí, con su
 * etiqueta visible. Las pantallas nunca escriben estos literales sueltos.
 */

/** Proporción áurea. */
export const PHI = 1.618033988749895;

export type GuideKind =
  | 'ninguna'
  | 'tercios'
  | 'phi'
  | 'cuadricula'
  | 'espiral'
  | 'triangulos'
  | 'cruz';

export const GUIDES: ReadonlyArray<{ kind: GuideKind; label: string }> = [
  { kind: 'ninguna', label: 'Sin guía' },
  { kind: 'tercios', label: '3×3' },
  { kind: 'phi', label: 'Phi' },
  { kind: 'cuadricula', label: '4×4' },
  { kind: 'espiral', label: 'Espiral' },
  { kind: 'triangulos', label: 'Triángulos' },
  { kind: 'cruz', label: 'Simetría' },
];

export type AspectKind = 'sensor' | '1:1' | '4:5' | '9:16' | '16:9' | 'cine';

/**
 * `ratio` es ancho/alto de la foto final con el teléfono en vertical.
 * `null` significa "sin máscara": se usa el encuadre completo del sensor.
 */
export const ASPECTS: ReadonlyArray<{
  kind: AspectKind;
  label: string;
  ratio: number | null;
}> = [
  { kind: 'sensor', label: 'Completo', ratio: null },
  { kind: '1:1', label: '1:1', ratio: 1 },
  { kind: '4:5', label: '4:5', ratio: 4 / 5 },
  { kind: '9:16', label: '9:16', ratio: 9 / 16 },
  { kind: '16:9', label: '16:9', ratio: 16 / 9 },
  { kind: 'cine', label: '2.39:1', ratio: 2.39 },
];

export type FlashKind = 'off' | 'auto' | 'on';

export const FLASH_MODES: ReadonlyArray<{ kind: FlashKind; label: string }> = [
  { kind: 'off', label: 'Off' },
  { kind: 'auto', label: 'Auto' },
  { kind: 'on', label: 'On' },
];

export type TimerKind = 0 | 3 | 10;

export const TIMERS: ReadonlyArray<{ kind: TimerKind; label: string }> = [
  { kind: 0, label: 'Sin' },
  { kind: 3, label: '3 s' },
  { kind: 10, label: '10 s' },
];

/** Tolerancia (en grados) para considerar el horizonte nivelado. */
export const LEVEL_TOLERANCE_DEG = 1.5;

/**
 * Histéresis de salida: una vez nivelado, no se pierde el estado hasta
 * superar este ángulo. Evita el parpadeo verde/blanco en el límite.
 */
export const LEVEL_EXIT_DEG = 2.5;

/** Tiempo (ms) que hay que mantener el nivel para el disparo automático. */
export const AUTO_SHUTTER_HOLD_MS = 700;

/** Pausa (ms) tras un disparo automático antes de poder rearmarse. */
export const AUTO_SHUTTER_COOLDOWN_MS = 2000;

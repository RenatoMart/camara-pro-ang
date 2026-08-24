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
  | 'cruz'
  | 'vertical'
  | 'horizontal'
  | 'diagonal'
  | 'curva'
  | 'centro'
  | 'patron'
  | 'fuga'
  | 'aire';

/**
 * Una guía del panel PRO.
 *
 * `sugerible` marca si el asistente puede proponerla solo. Las guías que el
 * modelo no sabe reconocer (porque su clase no llegó a entrenarse, ver
 * `ai/constants/compositionClasses.ts`) siguen estando disponibles a mano:
 * simplemente nunca se encienden en automático.
 */
export type Guide = {
  kind: GuideKind;
  label: string;
  sugerible: boolean;
};

export const GUIDES: ReadonlyArray<Guide> = [
  { kind: 'ninguna', label: 'Sin guía', sugerible: false },
  { kind: 'tercios', label: '3×3', sugerible: true },
  { kind: 'phi', label: 'Phi', sugerible: true },
  { kind: 'cuadricula', label: '4×4', sugerible: false },
  { kind: 'espiral', label: 'Espiral', sugerible: true },
  { kind: 'triangulos', label: 'Triángulos', sugerible: true },
  { kind: 'cruz', label: 'Simetría', sugerible: true },
  { kind: 'vertical', label: 'Vertical', sugerible: true },
  { kind: 'horizontal', label: 'Horizontal', sugerible: true },
  { kind: 'diagonal', label: 'Diagonal', sugerible: true },
  { kind: 'curva', label: 'Curva en S', sugerible: true },
  { kind: 'centro', label: 'Centro', sugerible: true },
  { kind: 'patron', label: 'Patrón', sugerible: true },
  // Sin entrenar: su clase no tiene ejemplos, así que sólo se elige a mano.
  { kind: 'fuga', label: 'Punto de fuga', sugerible: false },
  { kind: 'aire', label: 'Aire', sugerible: false },
];

/** Cómo se decide la guía que se dibuja. */
export type GuideMode = 'manual' | 'auto';

export type AspectKind = 'sensor' | '1:1' | '4:5' | '9:16' | '16:9' | 'cine';

/**
 * `ratio` es ancho/alto de la foto final con el teléfono en vertical.
 * `null` significa "sin máscara": se usa el encuadre completo del sensor.
 *
 * `short` es la etiqueta para la barra superior, donde cinco controles
 * comparten una sola línea y no cabe el nombre entero.
 */
export const ASPECTS: ReadonlyArray<{
  kind: AspectKind;
  label: string;
  short: string;
  ratio: number | null;
}> = [
  { kind: 'sensor', label: 'Completo', short: 'Todo', ratio: null },
  { kind: '1:1', label: '1:1', short: '1:1', ratio: 1 },
  { kind: '4:5', label: '4:5', short: '4:5', ratio: 4 / 5 },
  { kind: '9:16', label: '9:16', short: '9:16', ratio: 9 / 16 },
  { kind: '16:9', label: '16:9', short: '16:9', ratio: 16 / 9 },
  { kind: 'cine', label: '2.39:1', short: '2.39', ratio: 2.39 },
];

export type FlashKind = 'off' | 'auto' | 'on';

export const FLASH_MODES: ReadonlyArray<{ kind: FlashKind; label: string }> = [
  { kind: 'off', label: 'Off' },
  { kind: 'auto', label: 'Auto' },
  { kind: 'on', label: 'On' },
];

/**
 * Rango dinámico alto.
 *
 * Se guarda como preferencia y se muestra en la barra superior como en
 * cualquier cámara. Todavía no llega al motor de captura: de momento sólo
 * recuerda tu elección.
 */
export type HdrKind = 'off' | 'auto' | 'on';

export const HDR_MODES: ReadonlyArray<{ kind: HdrKind; label: string }> = [
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

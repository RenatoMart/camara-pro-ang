/**
 * Controles manuales de exposición del modo PRO: EV, velocidad, ISO, balance
 * de blancos y apertura — la fila clásica de cualquier cámara con modo
 * profesional.
 *
 * Sólo `ev` mueve algo de verdad. VisionCamera 5 en Android no implementa
 * bloquear velocidad/ISO ni balance de blancos manual: su propio código
 * nativo (`HybridCameraController.kt`) lo dice sin rodeos —
 * `"Locking Exposure to manual duration/ISO values is not yet supported on
 * Android!"`— y `whiteBalanceMode` está fijo en automático. La apertura ni
 * siquiera es un control: en un teléfono es física, no hay diafragma que
 * mover. Los otros cuatro se muestran igual, en modo «A» fijo, para que el
 * panel se vea como el de cualquier cámara profesional — es decoración
 * honesta, no una función a medias: no se puede tocar y lo dice.
 */

export type ManualControlKind = 'ev' | 's' | 'iso' | 'wb' | 'f';

export type ManualControl = {
  kind: ManualControlKind;
  /** Iniciales de la fila de chips, tal cual las usa cualquier cámara. */
  label: string;
  /** Sólo `ev` cambia algo real en la captura. */
  functional: boolean;
  /** Por qué no se puede tocar, cuando `functional` es `false`. */
  aviso?: string;
};

export const MANUAL_CONTROLS: ReadonlyArray<ManualControl> = [
  { kind: 'ev', label: 'EV', functional: true },
  {
    kind: 's',
    label: 'S',
    functional: false,
    aviso:
      'La velocidad de obturación manual no está disponible en Android todavía.',
  },
  {
    kind: 'iso',
    label: 'ISO',
    functional: false,
    aviso: 'El ISO manual no está disponible en Android todavía.',
  },
  {
    kind: 'wb',
    label: 'WB',
    functional: false,
    aviso:
      'El balance de blancos manual no está disponible en Android todavía.',
  },
  {
    kind: 'f',
    label: 'F',
    functional: false,
    aviso: 'La apertura es fija en este teléfono: no hay diafragma que mover.',
  },
];

/**
 * Rango de EV tal como lo ve el usuario: -4..+4, fijo, el mismo en
 * cualquier teléfono — no depende del sensor.
 *
 * VisionCamera documenta `CameraDevice.minExposureBias`/`maxExposureBias`
 * como «en unidades EV», pero en Android su propia implementación
 * (`HybridCameraDevice.kt`) las saca directas de
 * `exposureCompensationRange`, que es el **índice crudo** del sensor, sin
 * convertir por su paso real (`exposureCompensationStep`, que la librería
 * tampoco expone a JS). Pasarle ese índice a un control que promete «EV»
 * confunde: según el paso del sensor, mover el control de punta a punta
 * puede terminar siendo un cambio de exposición apenas perceptible.
 *
 * La solución no es adivinar el paso real (no hay de dónde sacarlo sin
 * tocar nativo): es no prometer unidades físicas que la librería no puede
 * darnos. El usuario ve y arrastra siempre -4..+4; por debajo,
 * `mapFriendlyEvToDeviceIndex` lo estira proporcionalmente al rango de
 * índice real del sensor, así que los extremos del control sí llegan a los
 * extremos de lo que el sensor admite, y el 0 sigue siendo el neutro.
 */
export const FRIENDLY_EV_RANGE = { min: -4, max: 4 };

/**
 * Traduce el EV -4..+4 que ve el usuario al índice crudo que de verdad
 * espera `CameraController.setExposureBias` en Android — ver
 * `FRIENDLY_EV_RANGE` para el porqué.
 */
export function mapFriendlyEvToDeviceIndex(
  friendlyEv: number,
  deviceRange: { min: number; max: number },
): number {
  if (deviceRange.min >= deviceRange.max) {
    return 0;
  }
  const { min: fMin, max: fMax } = FRIENDLY_EV_RANGE;
  const fraction = (friendlyEv - fMin) / (fMax - fMin);
  const raw = deviceRange.min + fraction * (deviceRange.max - deviceRange.min);
  return Math.round(raw);
}

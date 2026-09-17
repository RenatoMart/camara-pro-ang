/**
 * Controles manuales de exposición del modo PRO: EV, velocidad, ISO, balance
 * de blancos y apertura — la fila clásica de cualquier cámara con modo
 * profesional.
 *
 * `ev`, `s`, `iso` y `wb` mueven algo real. VisionCamera 5 no implementa esto
 * en Android por su API pública — su propio código nativo
 * (`HybridCameraController.kt`) lo decía sin rodeos: `"not yet supported on
 * Android"`—, así que la app trae su propio parche
 * (`patches/react-native-vision-camera+*.patch`) que baja a Camera2Interop
 * (`Camera2CameraControl.setCaptureRequestOptions`) para los cuatro. `f` es
 * la excepción real: en un teléfono la apertura es física, no hay diafragma
 * que mover, así que se queda en modo «A» fijo — decoración honesta, no una
 * función a medias.
 *
 * `s` e `iso` comparten un único interruptor de manual/automático (no dos):
 * Camera2 los liga con el mismo `CONTROL_AE_MODE_OFF`, así que no hay forma
 * de fijar uno sin fijar también el otro. `wb` es independiente (su propio
 * `CONTROL_AWB_MODE_OFF`).
 */

export type ManualControlKind = 'ev' | 's' | 'iso' | 'wb' | 'f';

export type ManualControl = {
  kind: ManualControlKind;
  /** Iniciales de la fila de chips, tal cual las usa cualquier cámara. */
  label: string;
  /** Sólo `f` no cambia nada real en la captura. */
  functional: boolean;
  /** Por qué no se puede tocar, cuando `functional` es `false`. */
  aviso?: string;
};

export const MANUAL_CONTROLS: ReadonlyArray<ManualControl> = [
  { kind: 'ev', label: 'EV', functional: true },
  { kind: 's', label: 'S', functional: true },
  { kind: 'iso', label: 'ISO', functional: true },
  { kind: 'wb', label: 'WB', functional: true },
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

/** Rango real de ISO/velocidad del sensor — sale de `CameraController`. */
export type ExposureRange = {
  minIso: number;
  maxIso: number;
  minShutterSeconds: number;
  maxShutterSeconds: number;
};

/**
 * ISO y velocidad de obturación se sienten naturales en escala logarítmica —
 * cada paso dobla o parte a la mitad el valor anterior, como los diafragmas
 * de un objetivo —, no lineal: repartir 1/4000s...30s en línea recta
 * dejaría prácticamente todo el rango útil aplastado contra un extremo,
 * dominado por los segundos enteros. `TickSlider` sólo sabe moverse en línea
 * recta, así que el editor lo mueve en «pasos» (stops, log₂ del valor real
 * respecto a una referencia) y estas dos funciones traducen en cada
 * dirección. Es la misma idea que `mapFriendlyEvToDeviceIndex`, adaptada a
 * un rango que sí varía por sensor.
 */
export function valueToStops(value: number, reference: number): number {
  return Math.log2(value / reference);
}

export function stopsToValue(stops: number, reference: number): number {
  return reference * 2 ** stops;
}

/** ISO 100 como referencia habitual de "0 pasos" en cualquier cámara. */
export const ISO_REFERENCE = 100;
/** 1 segundo como referencia de "0 pasos" para la velocidad de obturación. */
export const SHUTTER_REFERENCE_SECONDS = 1;
/** Un tercio de paso: el mismo grano que usan los diafragmas de las cámaras. */
export const STOP_STEP = 1 / 3;

/** ISO 400, o el valor admitido más cercano si el sensor no llega. */
export function defaultIso(range: ExposureRange): number {
  return Math.min(Math.max(400, range.minIso), range.maxIso);
}

/** 1/125s, o el valor admitido más cercano si el sensor no llega. */
export function defaultShutterSeconds(range: ExposureRange): number {
  return Math.min(
    Math.max(1 / 125, range.minShutterSeconds),
    range.maxShutterSeconds,
  );
}

/** "400", el número de ISO redondeado. */
export function formatIso(iso: number): string {
  return String(Math.round(iso));
}

/**
 * "1/125" por debajo de 1 segundo, `2"` a partir de ahí — la notación de
 * cualquier cámara para distinguir fracciones de segundos enteros.
 */
export function formatShutterSpeed(seconds: number): string {
  if (seconds >= 1) {
    const rounded = Math.round(seconds * 10) / 10;
    return `${rounded}"`;
  }
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}`;
}

/** Las tres ganancias de balance de blancos que de verdad aplica Camera2. */
export type WhiteBalanceGains = {
  redGain: number;
  blueGain: number;
  greenGain: number;
};

/**
 * El control manual de WB **no** es un dial de Kelvin absoluto — lo fue en
 * una primera versión, y salía mal: convertir Kelvin↔ganancias exige la
 * aproximación de cuerpo negro del lado nativo
 * (`HybridCameraController.convertWhiteBalanceTemperatureAndTintValues`),
 * que es genérica y no está calibrada contra la matriz de color real de
 * este sensor (eso viviría en `SENSOR_COLOR_TRANSFORM*`/
 * `SENSOR_FORWARD_MATRIX*` de Camera2, un pipeline colorimétrico completo
 * que no vale la pena para un ajuste manual). Resultado: "10000K" en mi
 * control y "10000K" en el automático del teléfono no eran el mismo blanco,
 * así que pasar a manual daba un salto de color en vez de partir de donde
 * ya estaba la imagen.
 *
 * La solución, la misma que usan los diales de "corrección de WB" de
 * cualquier cámara de verdad (Canon/Nikon/Fuji lo llaman así): no prometer
 * un Kelvin absoluto, ajustar **en relativo** desde las ganancias reales
 * que el automático tenía en el instante de pasar a manual
 * (`baseGains`, capturadas una sola vez al activar). Con `shift = 0` el
 * resultado es exactamente `baseGains` — coincide con el automático por
 * construcción, no por aproximación —, y moverlo templa (+) o enfría (-) la
 * imagen desde ahí. Mismo rango amigable -4..+4 que `FRIENDLY_EV_RANGE`,
 * por consistencia con el resto de controles.
 */
export const WHITE_BALANCE_SHIFT_RANGE = { min: -4, max: 4 };

/**
 * Grano del control: quinto de punto, para afinar más que un simple
 * entero (41 posiciones de punta a punta en vez de 9) — el mismo espíritu
 * que `STOP_STEP` para ISO/velocidad, pero en unidades propias de WB, no en
 * pasos fotográficos.
 */
export const WHITE_BALANCE_SHIFT_STEP = 0.2;

/**
 * Cuánto se mueve la ganancia roja/azul en el extremo del control: el doble
 * o la mitad de `baseGains` (1 paso, log₂) — un correctivo generoso pero no
 * absurdo, del mismo orden que el "WB shift" de una cámara real.
 */
const WHITE_BALANCE_SHIFT_STOPS_AT_MAX = 1;

/**
 * Aplica el ajuste relativo sobre las ganancias base — ver
 * `WHITE_BALANCE_SHIFT_RANGE` para el porqué del diseño. El verde no se
 * toca: sólo se corrige el eje cálido/frío (rojo-azul), que es lo que un
 * "WB shift" ajusta en cualquier cámara.
 */
export function applyWhiteBalanceShift(
  baseGains: WhiteBalanceGains,
  shift: number,
  maxGain: number,
): WhiteBalanceGains {
  const factor =
    2 **
    ((shift / WHITE_BALANCE_SHIFT_RANGE.max) *
      WHITE_BALANCE_SHIFT_STOPS_AT_MAX);
  return {
    redGain: Math.min(Math.max(baseGains.redGain * factor, 1), maxGain),
    blueGain: Math.min(Math.max(baseGains.blueGain / factor, 1), maxGain),
    greenGain: baseGains.greenGain,
  };
}

/**
 * Formato del ajuste de WB: siempre con signo, incluido el cero, con un
 * decimal — el grano es más fino que un entero (`WHITE_BALANCE_SHIFT_STEP`),
 * así que redondear a entero para mostrarlo escondería el ajuste.
 */
export function formatWhiteBalanceShift(shift: number): string {
  const rounded = Math.round(shift * 10) / 10;
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1);
}

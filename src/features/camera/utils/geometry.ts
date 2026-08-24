import { LEVEL_EXIT_DEG, LEVEL_TOLERANCE_DEG, PHI } from '../constants/guides';

/**
 * Geometría pura de las guías de composición y del nivel.
 *
 * Nada de React aquí: funciones deterministas que reciben tamaños y devuelven
 * coordenadas, para poder probarlas sin montar componentes.
 */

export type Size = { width: number; height: number };

export type LineSegment = { x1: number; y1: number; x2: number; y2: number };

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Path SVG de la espiral áurea, estirada para llenar `width`×`height`.
 *
 * Se construye la sucesión clásica de cuadrados dentro de un rectángulo
 * áureo (cortando por izquierda → arriba → derecha → abajo) y se dibuja un
 * cuarto de arco en cada cuadrado. Al escalar el rectángulo áureo al tamaño
 * del visor, los arcos circulares pasan a ser elípticos: por eso cada `A`
 * lleva radios distintos en x e y.
 */
export function goldenSpiralPath(width: number, height: number): string {
  if (width <= 0 || height <= 0) {
    return '';
  }

  // Se trabaja en "unidades áureas" (PHI × 1) y se escala al final.
  const scaleX = width / PHI;
  const scaleY = height / 1;

  let rect = { x: 0, y: 0, w: PHI, h: 1 };
  const parts: string[] = [`M ${round(0)} ${round(scaleY)}`];

  const ITERATIONS = 9;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const phase = i % 4;
    let side: number;
    let end: { x: number; y: number };

    if (phase === 0) {
      // Cuadrado a la izquierda; el arco sube del vértice inferior al superior.
      side = rect.h;
      end = { x: rect.x + side, y: rect.y };
      rect = { x: rect.x + side, y: rect.y, w: rect.w - side, h: rect.h };
    } else if (phase === 1) {
      // Cuadrado arriba.
      side = rect.w;
      end = { x: rect.x + side, y: rect.y + side };
      rect = { x: rect.x, y: rect.y + side, w: rect.w, h: rect.h - side };
    } else if (phase === 2) {
      // Cuadrado a la derecha.
      side = rect.h;
      end = { x: rect.x + rect.w - side, y: rect.y + side };
      rect = { x: rect.x, y: rect.y, w: rect.w - side, h: rect.h };
    } else {
      // Cuadrado abajo.
      side = rect.w;
      end = { x: rect.x, y: rect.y + rect.h - side };
      rect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h - side };
    }

    const rx = round(side * scaleX);
    const ry = round(side * scaleY);
    parts.push(
      `A ${rx} ${ry} 0 0 1 ${round(end.x * scaleX)} ${round(end.y * scaleY)}`,
    );
  }

  return parts.join(' ');
}

/**
 * Triángulos dorados: la diagonal principal más las perpendiculares que
 * salen de las otras dos esquinas hacia ella.
 */
export function goldenTriangleLines(
  width: number,
  height: number,
): LineSegment[] {
  // Diagonal de abajo-izquierda a arriba-derecha.
  const a = { x: 0, y: height };
  const b = { x: width, y: 0 };

  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const lengthSq = abX * abX + abY * abY;
  if (lengthSq === 0) {
    return [];
  }

  /** Pie de la perpendicular desde `p` hasta la diagonal. */
  const foot = (p: { x: number; y: number }) => {
    const t = ((p.x - a.x) * abX + (p.y - a.y) * abY) / lengthSq;
    return { x: a.x + t * abX, y: a.y + t * abY };
  };

  const topLeft = { x: 0, y: 0 };
  const bottomRight = { x: width, y: height };
  const footTL = foot(topLeft);
  const footBR = foot(bottomRight);

  return [
    { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
    {
      x1: topLeft.x,
      y1: topLeft.y,
      x2: round(footTL.x),
      y2: round(footTL.y),
    },
    {
      x1: bottomRight.x,
      y1: bottomRight.y,
      x2: round(footBR.x),
      y2: round(footBR.y),
    },
  ];
}

/**
 * Posiciones (0..1) de las líneas de una cuadrícula.
 *
 * - `tercios`: 1/3 y 2/3.
 * - `phi`: 0.382 y 0.618 (proporción áurea).
 * - `cuadricula`: cuartos, para precisión geométrica.
 */
export function gridFractions(
  kind: 'tercios' | 'phi' | 'cuadricula' | 'patron',
): number[] {
  if (kind === 'tercios') {
    return [1 / 3, 2 / 3];
  }
  if (kind === 'phi') {
    return [1 - 1 / PHI, 1 / PHI];
  }
  if (kind === 'patron') {
    // Retícula densa: ayuda a alinear repeticiones (ventanas, baldosas…).
    return [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
  }
  return [0.25, 0.5, 0.75];
}

/**
 * Franjas de "aire": los márgenes que conviene dejar vacíos alrededor del
 * sujeto para que respire (espacio negativo).
 */
export function negativeSpaceInsets(width: number, height: number): CropInsets {
  return {
    top: round(height / 4),
    bottom: round(height / 4),
    left: round(width / 4),
    right: round(width / 4),
  };
}

/**
 * Las dos diagonales del encuadre.
 *
 * El modelo sabe *si* la composición es diagonal, pero no en qué sentido: el
 * volteo horizontal del entrenamiento lo dejó ciego a la dirección. Mientras
 * no exista el cálculo geométrico que la determine, se dibujan las dos y es el
 * ojo quien elige.
 */
export function diagonalLines(width: number, height: number): LineSegment[] {
  return [
    { x1: 0, y1: 0, x2: width, y2: height },
    { x1: 0, y1: height, x2: width, y2: 0 },
  ];
}

/**
 * Curva en S: el recorrido serpenteante clásico de caminos, ríos y costas.
 *
 * Se traza con dos curvas cúbicas simétricas respecto al centro, de abajo a
 * arriba, porque es como se recorre una escena en profundidad.
 */
export function sCurvePath(width: number, height: number): string {
  if (width <= 0 || height <= 0) {
    return '';
  }

  const x = (f: number) => round(width * f);
  const y = (f: number) => round(height * f);

  return [
    `M ${x(0.3)} ${y(1)}`,
    `C ${x(0.3)} ${y(0.75)} ${x(0.7)} ${y(0.68)} ${x(0.7)} ${y(0.5)}`,
    `C ${x(0.7)} ${y(0.32)} ${x(0.3)} ${y(0.25)} ${x(0.3)} ${y(0)}`,
  ].join(' ');
}

/**
 * Marco central para composiciones centradas.
 *
 * Es el rectángulo del tercio medio: encuadra el sujeto sin taparlo, que es
 * justo lo contrario de la retícula de tercios.
 */
export function centerFrame(
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: round(width / 3),
    y: round(height / 3),
    width: round(width / 3),
    height: round(height / 3),
  };
}

/**
 * Líneas radiales que convergen en un punto de fuga.
 *
 * `point` va en fracciones 0..1 del encuadre. Por defecto el centro: cuando
 * exista el cálculo geométrico podrá moverse a donde converjan de verdad las
 * líneas de la escena.
 */
export function vanishingLines(
  width: number,
  height: number,
  point: { x: number; y: number } = { x: 0.5, y: 0.5 },
  rays = 12,
): LineSegment[] {
  if (width <= 0 || height <= 0 || rays <= 0) {
    return [];
  }

  const cx = width * point.x;
  const cy = height * point.y;
  // Suficiente para salirse del encuadre desde cualquier punto interior.
  const reach = Math.hypot(width, height);

  return Array.from({ length: rays }, (_, i) => {
    const angle = (i * 2 * Math.PI) / rays;
    return {
      x1: round(cx),
      y1: round(cy),
      x2: round(cx + Math.cos(angle) * reach),
      y2: round(cy + Math.sin(angle) * reach),
    };
  });
}

export type CropInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

/**
 * Franjas a sombrear para previsualizar una relación de aspecto `ratio`
 * (ancho/alto) dentro de un visor `width`×`height`, centrada.
 */
export function aspectCropInsets(
  width: number,
  height: number,
  ratio: number,
): CropInsets {
  if (width <= 0 || height <= 0 || ratio <= 0) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const visibleWidth = Math.min(width, height * ratio);
  const visibleHeight = visibleWidth / ratio;

  const horizontal = round((width - visibleWidth) / 2);
  const vertical = round((height - visibleHeight) / 2);

  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  };
}

/** Cómo se está sosteniendo el teléfono, en cuartos de vuelta. */
export type DeviceOrientation =
  | 'vertical'
  | 'vertical-invertido'
  | 'horizontal-izquierda'
  | 'horizontal-derecha';

export type Tilt = {
  /**
   * Desviación del horizonte respecto a la forma en que sostienes el
   * teléfono, en grados y siempre dentro de ±45.
   */
  roll: number;
  /** Inclinación adelante/atrás, en grados. 0 = teléfono vertical. */
  pitch: number;
  /** Cuarto de vuelta al que está más cerca el teléfono. */
  orientation: DeviceOrientation;
};

/** El cuarto de vuelta (en grados) al que corresponde cada orientación. */
function orientationFromQuarter(quarter: number): DeviceOrientation {
  // `quarter` viene ya redondeado a -180, -90, 0, 90 o 180.
  if (quarter === 90) {
    return 'horizontal-derecha';
  }
  if (quarter === -90) {
    return 'horizontal-izquierda';
  }
  if (quarter === 0) {
    return 'vertical';
  }
  return 'vertical-invertido';
}

/**
 * Convierte una lectura del acelerómetro (gravedad, en g) a inclinación.
 *
 * El `roll` se mide **respecto al cuarto de vuelta más cercano**, no respecto
 * a la vertical absoluta. Esto es lo que hace que el nivel sirva también con
 * el teléfono en horizontal: antes se comparaba siempre contra la vertical,
 * así que al girar el móvil 90° el nivel leía 90° de desvío y no se ponía
 * verde nunca por muy recto que estuviera el horizonte.
 *
 * Con la corrección, `roll` es siempre cuánto falta para que el borde del
 * teléfono quede paralelo al horizonte, sostengas el móvil como lo sostengas,
 * y por eso nunca sale de ±45°.
 *
 * `pitch` no cambia: ±90° con el teléfono tumbado (cenital). Ahí el `roll`
 * pierde sentido porque no hay horizonte contra el que compararse.
 */
export function tiltFromGravity(reading: {
  x: number;
  y: number;
  z: number;
}): Tilt {
  const { x, y, z } = reading;
  const toDegrees = 180 / Math.PI;

  // Giro completo en el plano de la pantalla: 0 = vertical, ±90 = horizontal,
  // ±180 = boca abajo.
  const screenAngle = Math.atan2(x, -y) * toDegrees;
  const quarter = Math.round(screenAngle / 90) * 90;

  const roll = screenAngle - quarter;
  const pitch = Math.atan2(z, Math.hypot(x, y)) * toDegrees;

  return {
    roll: round(roll),
    pitch: round(pitch),
    orientation: orientationFromQuarter(quarter),
  };
}

/**
 * ¿Está nivelado el `roll`? Con histéresis: entra en "nivelado" por debajo de
 * la tolerancia y sólo sale al superar el umbral de salida, para que el
 * indicador no parpadee justo en el límite.
 */
export function isRollLevel(roll: number, wasLevel: boolean): boolean {
  const limit = wasLevel ? LEVEL_EXIT_DEG : LEVEL_TOLERANCE_DEG;
  return Math.abs(roll) <= limit;
}

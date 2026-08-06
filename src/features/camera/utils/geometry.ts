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
  kind: 'tercios' | 'phi' | 'cuadricula',
): number[] {
  if (kind === 'tercios') {
    return [1 / 3, 2 / 3];
  }
  if (kind === 'phi') {
    return [1 - 1 / PHI, 1 / PHI];
  }
  return [0.25, 0.5, 0.75];
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

export type Tilt = {
  /** Rotación en el plano de la pantalla (horizonte torcido), en grados. */
  roll: number;
  /** Inclinación adelante/atrás, en grados. 0 = teléfono vertical. */
  pitch: number;
};

/**
 * Convierte una lectura del acelerómetro (gravedad, en g) a inclinación.
 *
 * Con el teléfono en vertical: `roll` ≈ 0 si el horizonte está recto y crece
 * al girar el teléfono en el plano de la pantalla; `pitch` ≈ 0 en vertical y
 * ±90° con el teléfono tumbado (cenital).
 */
export function tiltFromGravity(reading: {
  x: number;
  y: number;
  z: number;
}): Tilt {
  const { x, y, z } = reading;
  const toDegrees = 180 / Math.PI;

  // |y| desacopla el cálculo del convenio de signos de cada plataforma.
  const roll = Math.atan2(x, Math.abs(y)) * toDegrees;
  const pitch = Math.atan2(z, Math.hypot(x, y)) * toDegrees;

  return { roll: round(roll), pitch: round(pitch) };
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

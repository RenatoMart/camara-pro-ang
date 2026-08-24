import { PHI } from '../constants/guides';

import {
  aspectCropInsets,
  goldenSpiralPath,
  goldenTriangleLines,
  gridFractions,
  isRollLevel,
  tiltFromGravity,
} from './geometry';

describe('goldenSpiralPath', () => {
  it('devuelve cadena vacía si el tamaño es inválido', () => {
    expect(goldenSpiralPath(0, 100)).toBe('');
    expect(goldenSpiralPath(100, -1)).toBe('');
  });

  it('empieza en la esquina inferior izquierda', () => {
    const path = goldenSpiralPath(PHI * 100, 100);
    expect(path.startsWith('M 0 100')).toBe(true);
  });

  it('dibuja nueve arcos elípticos', () => {
    const path = goldenSpiralPath(300, 400);
    expect(path.match(/A /g)).toHaveLength(9);
  });

  it('el primer arco termina arriba, al final del primer cuadrado', () => {
    // Con ancho = PHI·100 y alto = 100, el primer cuadrado mide 100.
    const path = goldenSpiralPath(PHI * 100, 100);
    expect(path).toContain('A 100 100 0 0 1 100 0');
  });
});

describe('goldenTriangleLines', () => {
  it('en un cuadrado, las perpendiculares caen en el centro', () => {
    const lines = goldenTriangleLines(100, 100);

    expect(lines).toHaveLength(3);
    // Diagonal principal.
    expect(lines[0]).toEqual({ x1: 0, y1: 100, x2: 100, y2: 0 });
    // Perpendiculares desde las otras esquinas hasta el centro.
    expect(lines[1]).toEqual({ x1: 0, y1: 0, x2: 50, y2: 50 });
    expect(lines[2]).toEqual({ x1: 100, y1: 100, x2: 50, y2: 50 });
  });

  it('devuelve vacío si el tamaño es nulo', () => {
    expect(goldenTriangleLines(0, 0)).toEqual([]);
  });
});

describe('gridFractions', () => {
  it('tercios divide en 1/3 y 2/3', () => {
    expect(gridFractions('tercios')).toEqual([1 / 3, 2 / 3]);
  });

  it('phi divide según la proporción áurea', () => {
    const [first, second] = gridFractions('phi');
    expect(first).toBeCloseTo(0.382, 3);
    expect(second).toBeCloseTo(0.618, 3);
  });

  it('cuadrícula divide en cuartos', () => {
    expect(gridFractions('cuadricula')).toEqual([0.25, 0.5, 0.75]);
  });
});

describe('aspectCropInsets', () => {
  it('1:1 en visor vertical deja franjas arriba y abajo', () => {
    const insets = aspectCropInsets(100, 200, 1);
    expect(insets).toEqual({ top: 50, bottom: 50, left: 0, right: 0 });
  });

  it('16:9 (apaisado) deja franjas grandes en vertical', () => {
    const insets = aspectCropInsets(100, 200, 16 / 9);
    expect(insets.top).toBeCloseTo(71.88, 1);
    expect(insets.left).toBe(0);
  });

  it('9:16 casi llena un visor típico', () => {
    const insets = aspectCropInsets(100, 200, 9 / 16);
    expect(insets.left).toBe(0);
    expect(insets.top).toBeCloseTo(11.11, 1);
  });

  it('tamaños inválidos devuelven cero', () => {
    expect(aspectCropInsets(0, 100, 1)).toEqual({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    });
  });
});

/** Gravedad de un teléfono girado `deg` grados en el plano de la pantalla. */
function gravityAtAngle(deg: number): { x: number; y: number; z: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: Math.sin(rad), y: -Math.cos(rad), z: 0 };
}

describe('tiltFromGravity', () => {
  it('teléfono vertical y recto: roll y pitch cero', () => {
    const tilt = tiltFromGravity({ x: 0, y: -1, z: 0 });

    expect(tilt.roll).toBe(0);
    expect(tilt.pitch).toBe(0);
    expect(tilt.orientation).toBe('vertical');
  });

  it('boca abajo también cuenta como recto', () => {
    const tilt = tiltFromGravity({ x: 0, y: 1, z: 0 });

    expect(tilt.roll).toBe(0);
    expect(tilt.orientation).toBe('vertical-invertido');
  });

  /**
   * El fallo que motivó el cambio: midiendo contra la vertical absoluta, un
   * teléfono en horizontal daba 90° de desvío y el nivel no se ponía verde
   * nunca, por muy recto que estuviera el horizonte.
   */
  it('en horizontal, recto es recto (no 90° de desvío)', () => {
    const derecha = tiltFromGravity(gravityAtAngle(90));
    const izquierda = tiltFromGravity(gravityAtAngle(-90));

    expect(derecha.roll).toBeCloseTo(0, 5);
    expect(derecha.orientation).toBe('horizontal-derecha');
    expect(izquierda.roll).toBeCloseTo(0, 5);
    expect(izquierda.orientation).toBe('horizontal-izquierda');
  });

  it('detecta el mismo desvío en cualquier orientación', () => {
    // Tres grados torcido, se sostenga como se sostenga el teléfono.
    for (const base of [0, 90, 180, -90]) {
      const tilt = tiltFromGravity(gravityAtAngle(base + 3));

      expect(tilt.roll).toBeCloseTo(3, 1);
    }
  });

  it('el roll nunca se sale de ±45°', () => {
    for (let deg = -180; deg <= 180; deg += 7) {
      const { roll } = tiltFromGravity(gravityAtAngle(deg));

      expect(Math.abs(roll)).toBeLessThanOrEqual(45.001);
    }
  });

  it('a 45° está justo entre dos orientaciones', () => {
    expect(Math.abs(tiltFromGravity(gravityAtAngle(45)).roll)).toBeCloseTo(
      45,
      0,
    );
  });

  it('teléfono tumbado (cenital): pitch ±90°', () => {
    expect(tiltFromGravity({ x: 0, y: 0, z: 1 }).pitch).toBeCloseTo(90, 0);
    expect(tiltFromGravity({ x: 0, y: 0, z: -1 }).pitch).toBeCloseTo(-90, 0);
  });
});

describe('isRollLevel (histéresis)', () => {
  it('entra en nivelado por debajo de la tolerancia', () => {
    expect(isRollLevel(1.0, false)).toBe(true);
    expect(isRollLevel(2.0, false)).toBe(false);
  });

  it('una vez nivelado, aguanta hasta el umbral de salida', () => {
    expect(isRollLevel(2.0, true)).toBe(true);
    expect(isRollLevel(3.0, true)).toBe(false);
  });
});

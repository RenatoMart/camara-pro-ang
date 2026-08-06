import { coverRect } from './ghostCompose';

/**
 * El fantasma se dibuja sobre la foto igual que en el visor
 * (`resizeMode="cover"`): cubre todo el lienzo, se centra y recorta lo que
 * sobra, sin deformar la imagen. Si esto se rompe, las fotos fundidas salen
 * estiradas y dejan de servir para comparar encuadres.
 */
describe('coverRect', () => {
  it('deja la imagen igual cuando las proporciones coinciden', () => {
    const rect = coverRect(1000, 500, 2000, 1000);

    expect(rect).toEqual({ x: 0, y: 0, width: 2000, height: 1000 });
  });

  it('desborda a los lados cuando el fantasma es más ancho que la base', () => {
    // Fantasma 2:1 sobre una base cuadrada: se escala por altura y sobra ancho.
    const rect = coverRect(1000, 500, 1000, 1000);

    expect(rect.height).toBe(1000);
    expect(rect.width).toBe(2000);
    expect(rect.y).toBe(0);
    // El exceso de ancho se reparte a ambos lados para quedar centrado.
    expect(rect.x).toBe(-500);
  });

  it('desborda arriba y abajo cuando el fantasma es más alto', () => {
    const rect = coverRect(500, 1000, 1000, 1000);

    expect(rect.width).toBe(1000);
    expect(rect.height).toBe(2000);
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(-500);
  });

  it('nunca deja hueco sin cubrir', () => {
    const casos: [number, number, number, number][] = [
      [4000, 3000, 1080, 1920],
      [1080, 1920, 4000, 3000],
      [1234, 567, 890, 890],
    ];

    for (const [gw, gh, bw, bh] of casos) {
      const rect = coverRect(gw, gh, bw, bh);

      expect(rect.width).toBeGreaterThanOrEqual(bw);
      expect(rect.height).toBeGreaterThanOrEqual(bh);
      expect(rect.x).toBeLessThanOrEqual(0);
      expect(rect.y).toBeLessThanOrEqual(0);
    }
  });

  it('conserva la proporción original del fantasma', () => {
    const rect = coverRect(1600, 900, 1080, 1920);

    expect(rect.width / rect.height).toBeCloseTo(1600 / 900, 5);
  });
});

import { truncate } from './format';

describe('truncate', () => {
  it('deja intacto un texto más corto que el límite', () => {
    expect(truncate('hola', 10)).toBe('hola');
  });

  it('recorta y añade puntos suspensivos', () => {
    expect(truncate('publicación larga', 8)).toBe('publica…');
  });
});

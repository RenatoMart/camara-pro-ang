import thresholds from '../assets/thresholds.json';
import { COMPOSITION_CLASSES } from '../constants/compositionClasses';

import {
  MAX_SUGGESTIONS,
  activeClasses,
  guidesFromScores,
  suggestGuides,
} from './mapModelToGuides';

/** Vector de 14 ceros con los índices indicados puestos a `value`. */
function scoresWith(indices: number[], value = 0.99): number[] {
  const scores = new Array<number>(COMPOSITION_CLASSES.length).fill(0);
  for (const index of indices) {
    scores[index] = value;
  }
  return scores;
}

describe('activeClasses', () => {
  it('activa sólo lo que supera su propio umbral', () => {
    // `rule_of_thirds` tiene umbral 0.45 y `curved` 0.75: el mismo 0.5
    // enciende una y no la otra.
    const scores = scoresWith([], 0);
    scores[0] = 0.5;
    scores[4] = 0.5;

    const active = activeClasses(scores, thresholds);

    expect(active.map(a => a.kind)).toEqual(['rule_of_thirds']);
  });

  it('permite varias clases a la vez (son sigmoides, no un softmax)', () => {
    const active = activeClasses(scoresWith([0, 7, 8]), thresholds);

    expect(active.map(a => a.kind).sort()).toEqual([
      'pattern',
      'rule_of_thirds',
      'symmetric',
    ]);
  });

  it('ignora las clases sin entrenar aunque vengan al máximo', () => {
    // Índices 9-13: su dataset nunca se descargó y valen siempre ~0. Si por
    // ruido subieran, no deben proponerse.
    const active = activeClasses(scoresWith([9, 10, 11, 12, 13]), thresholds);

    expect(active).toEqual([]);
  });
});

describe('suggestGuides', () => {
  it('traduce cada clase a la guía que la app dibuja', () => {
    const suggestions = suggestGuides([{ kind: 'symmetric', score: 0.9 }]);

    expect(suggestions).toEqual([
      { guide: 'cruz', from: 'symmetric', score: 0.9 },
    ]);
  });

  it('pondera por la fiabilidad de cada clase, no sólo por la probabilidad', () => {
    // `rule_of_thirds` llega más alta, pero acierta el 57,7% de las veces
    // frente al 91% de `pattern`: debe ganar `pattern`.
    const suggestions = suggestGuides([
      { kind: 'rule_of_thirds', score: 0.95 },
      { kind: 'pattern', score: 0.8 },
    ]);

    expect(suggestions[0]?.guide).toBe('patron');
  });

  it('nunca propone más de dos guías a la vez', () => {
    const suggestions = suggestGuides([
      { kind: 'rule_of_thirds', score: 0.9 },
      { kind: 'symmetric', score: 0.9 },
      { kind: 'pattern', score: 0.9 },
      { kind: 'triangle', score: 0.9 },
    ]);

    expect(suggestions).toHaveLength(MAX_SUGGESTIONS);
  });

  it('descarta las clases que no son geometría dibujable', () => {
    // `shallow_dof` es una propiedad de la imagen, no una retícula.
    const suggestions = suggestGuides([{ kind: 'shallow_dof', score: 0.99 }]);

    expect(suggestions).toEqual([]);
  });
});

describe('guidesFromScores', () => {
  it('no propone nada cuando el modelo no ve ninguna composición clara', () => {
    expect(guidesFromScores(scoresWith([], 0.1), thresholds)).toEqual([]);
  });

  it('encadena umbrales y traducción', () => {
    const suggestions = guidesFromScores(scoresWith([8]), thresholds);

    expect(suggestions.map(s => s.guide)).toEqual(['patron']);
  });
});

import type { GuideKind } from '../../constants/guides';

import {
  INITIAL_SUGGESTION_STATE,
  stabilizeSuggestion,
  type SuggestionState,
} from './stabilizeSuggestion';

/** Alimenta `n` frames seguidos con la misma propuesta. */
function feed(
  state: SuggestionState,
  incoming: GuideKind | null,
  frames: number,
  framesToConfirm = 3,
): SuggestionState {
  let current = state;
  for (let i = 0; i < frames; i += 1) {
    current = stabilizeSuggestion(current, incoming, framesToConfirm);
  }
  return current;
}

describe('stabilizeSuggestion', () => {
  it('no muestra una guía hasta que se repite los frames exigidos', () => {
    const dos = feed(INITIAL_SUGGESTION_STATE, 'tercios', 2);

    expect(dos.shown).toBeNull();

    const tres = stabilizeSuggestion(dos, 'tercios', 3);

    expect(tres.shown).toBe('tercios');
  });

  it('ignora un parpadeo suelto sin cambiar lo que se ve', () => {
    const estable = feed(INITIAL_SUGGESTION_STATE, 'tercios', 3);
    // Un frame raro propone otra cosa y al siguiente vuelve la buena.
    const parpadeo = stabilizeSuggestion(estable, 'diagonal', 3);
    const vuelta = stabilizeSuggestion(parpadeo, 'tercios', 3);

    expect(parpadeo.shown).toBe('tercios');
    expect(vuelta.shown).toBe('tercios');
    expect(vuelta.candidate).toBeNull();
  });

  it('reinicia la cuenta si la candidata cambia a mitad', () => {
    let state = feed(INITIAL_SUGGESTION_STATE, 'tercios', 3);
    state = stabilizeSuggestion(state, 'diagonal', 3);
    state = stabilizeSuggestion(state, 'curva', 3);

    expect(state.streak).toBe(1);
    expect(state.shown).toBe('tercios');
  });

  it('cambia de guía cuando la nueva se sostiene', () => {
    let state = feed(INITIAL_SUGGESTION_STATE, 'tercios', 3);
    state = feed(state, 'patron', 3);

    expect(state.shown).toBe('patron');
  });

  it('apagar también exige confirmación', () => {
    let state = feed(INITIAL_SUGGESTION_STATE, 'tercios', 3);

    state = stabilizeSuggestion(state, null, 3);
    expect(state.shown).toBe('tercios');

    state = feed(state, null, 2);
    expect(state.shown).toBeNull();
  });

  it('mantenerse estable no acumula racha', () => {
    const state = feed(INITIAL_SUGGESTION_STATE, 'tercios', 10);

    expect(state.shown).toBe('tercios');
    expect(state.streak).toBe(0);
    expect(state.candidate).toBeNull();
  });
});

import React from 'react';

import {
  fireEvent,
  renderWithProviders,
  screen,
} from '../../../../../jest/testUtils';

import { HudChip } from './HudChip';

describe('HudChip', () => {
  it('muestra la etiqueta en mayúsculas', async () => {
    await renderWithProviders(<HudChip label="Espiral" onPress={jest.fn()} />);

    expect(screen.getByText('ESPIRAL')).toBeOnTheScreen();
  });

  it('dispara onPress al pulsarlo', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<HudChip label="Nivel" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('expone el estado activo por accesibilidad', async () => {
    await renderWithProviders(
      <HudChip label="Phi" active onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { selected: true })).toBeOnTheScreen();
  });

  it('no responde cuando está deshabilitado', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <HudChip label="Fantasma" disabled onPress={onPress} />,
    );

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
  });
});

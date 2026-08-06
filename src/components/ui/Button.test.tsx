import React from 'react';

import {
  fireEvent,
  renderWithProviders,
  screen,
} from '../../../jest/testUtils';

import { Button } from './Button';

describe('Button', () => {
  it('llama a onPress cuando se toca', async () => {
    const onPress = jest.fn();
    await renderWithProviders(<Button label="Guardar" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('no responde mientras está cargando', async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <Button label="Guardar" loading onPress={onPress} />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('queda deshabilitado para lectores de pantalla cuando disabled', async () => {
    await renderWithProviders(
      <Button label="Guardar" disabled onPress={jest.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});

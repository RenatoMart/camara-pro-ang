import * as Keychain from 'react-native-keychain';

import { secureStorage } from './secureStorage';

describe('secureStorage', () => {
  it('guarda y recupera un valor', async () => {
    await secureStorage.setItem('token', 'abc123');

    await expect(secureStorage.getItem('token')).resolves.toBe('abc123');
  });

  it('devuelve null cuando la clave no existe', async () => {
    await expect(secureStorage.getItem('no-existe')).resolves.toBeNull();
  });

  it('borra un valor', async () => {
    await secureStorage.setItem('temporal', 'x');
    await secureStorage.removeItem('temporal');

    await expect(secureStorage.getItem('temporal')).resolves.toBeNull();
  });

  it('aísla cada clave en su propia entrada del Keychain', async () => {
    await secureStorage.setItem('a', '1');
    await secureStorage.setItem('b', '2');

    await expect(secureStorage.getItem('a')).resolves.toBe('1');
    await expect(secureStorage.getItem('b')).resolves.toBe('2');
  });

  it('ata la credencial al dispositivo y la excluye de backups', async () => {
    await secureStorage.setItem('token', 'abc123');

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'token',
      'abc123',
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        service: 'token',
      }),
    );
  });
});

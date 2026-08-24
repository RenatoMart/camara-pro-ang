import * as Keychain from 'react-native-keychain';

import { logger } from '@/utils/logger';

/**
 * Almacenamiento cifrado para datos sensibles (tokens, credenciales).
 *
 * Usa el almacén seguro del sistema operativo:
 * - iOS → Keychain,
 * - Android → Keystore / EncryptedSharedPreferences.
 *
 * A diferencia de AsyncStorage, el contenido va cifrado por el sistema y no se
 * puede leer con un simple volcado de archivos en un dispositivo con root o
 * jailbreak. Aquí va el token de sesión; las preferencias normales siguen en
 * `storage.ts`.
 *
 * No hay ningún camino alternativo a propósito: si el almacén seguro falla, se
 * registra el error y no se guarda nada, en lugar de dejar una credencial en
 * texto plano.
 */

/**
 * Opciones de seguridad.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` evita que el token viaje en las copias de
 * seguridad de iCloud y lo ata a este dispositivo.
 */
const KEYCHAIN_OPTIONS: Keychain.SetOptions = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureStorage = {
  /**
   * Guarda un valor cifrado.
   *
   * `key` se usa como `service` del Keychain, así que cada clave vive en su
   * propia entrada y se puede borrar de forma independiente.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await Keychain.setGenericPassword(key, value, {
        ...KEYCHAIN_OPTIONS,
        service: key,
      });
    } catch (error) {
      logger.error('secureStorage.setItem falló', error, { key });
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({ service: key });
      return credentials ? credentials.password : null;
    } catch (error) {
      logger.error('secureStorage.getItem falló', error, { key });
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: key });
    } catch (error) {
      logger.error('secureStorage.removeItem falló', error, { key });
    }
  },
};

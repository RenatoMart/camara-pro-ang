import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * ## Sobre Expo Go
 *
 * `react-native-keychain` es un módulo nativo que Expo Go no trae compilado.
 * Para que `npm run go` siga sirviendo como vista previa, se detecta esa
 * situación en tiempo de ejecución y se cae a AsyncStorage.
 *
 * **Ese fallback NO cifra nada.** Sólo se activa en desarrollo dentro de Expo
 * Go; en cualquier build nativa (`npm run android` / `npm run ios`) se usa
 * siempre el almacén seguro real.
 */

/** Prefijo de las claves del fallback, para no chocar con `storage.ts`. */
const FALLBACK_PREFIX = '@insecure-fallback/';

/**
 * Opciones de seguridad.
 *
 * `WHEN_UNLOCKED_THIS_DEVICE_ONLY` evita que el token viaje en las copias de
 * seguridad de iCloud y lo ata a este dispositivo.
 */
const KEYCHAIN_OPTIONS: Keychain.SetOptions = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * `true` si el módulo nativo está enlazado.
 *
 * En Expo Go los métodos existen pero el módulo nativo no responde, así que se
 * comprueba con una llamada real la primera vez y se cachea el resultado.
 */
let isKeychainAvailable: boolean | null = null;

async function keychainAvailable(): Promise<boolean> {
  if (isKeychainAvailable !== null) {
    return isKeychainAvailable;
  }

  try {
    await Keychain.getSupportedBiometryType();
    isKeychainAvailable = true;
  } catch {
    isKeychainAvailable = false;
    logger.warn(
      'react-native-keychain no está disponible (¿Expo Go?). ' +
        'Se usará AsyncStorage SIN CIFRAR. No uses esto para datos reales.',
    );
  }

  return isKeychainAvailable;
}

export const secureStorage = {
  /**
   * Guarda un valor cifrado.
   *
   * `key` se usa como `service` del Keychain, así que cada clave vive en su
   * propia entrada y se puede borrar de forma independiente.
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (await keychainAvailable()) {
        await Keychain.setGenericPassword(key, value, {
          ...KEYCHAIN_OPTIONS,
          service: key,
        });
        return;
      }

      await AsyncStorage.setItem(`${FALLBACK_PREFIX}${key}`, value);
    } catch (error) {
      logger.error('secureStorage.setItem falló', error, { key });
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (await keychainAvailable()) {
        const credentials = await Keychain.getGenericPassword({ service: key });
        return credentials ? credentials.password : null;
      }

      return await AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
    } catch (error) {
      logger.error('secureStorage.getItem falló', error, { key });
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (await keychainAvailable()) {
        await Keychain.resetGenericPassword({ service: key });
        return;
      }

      await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
    } catch (error) {
      logger.error('secureStorage.removeItem falló', error, { key });
    }
  },
};

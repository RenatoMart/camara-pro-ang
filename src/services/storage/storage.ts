import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/utils/logger';

/**
 * Envoltura tipada sobre AsyncStorage, para datos **no sensibles**.
 *
 * Ventajas sobre usar AsyncStorage directo:
 * - serializa/deserializa JSON por ti,
 * - nunca lanza: devuelve `null` y registra el error,
 * - centraliza las claves en `StorageKey` para evitar strings mágicos.
 *
 * AsyncStorage guarda en texto plano dentro del sandbox de la app. Para
 * tokens, contraseñas o cualquier credencial usa `secureStorage`.
 */

export const StorageKeys = {
  /** Vive en `secureStorage` (Keychain/Keystore), no en AsyncStorage. */
  authToken: '@app/auth-token',
  settings: '@app/settings',
  onboardingSeen: '@app/onboarding-seen',
  cameraPrefs: '@app/camera-prefs',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

export const storage = {
  async get<T>(key: StorageKey): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      logger.error('storage.get falló', error, { key });
      return null;
    }
  },

  async set<T>(key: StorageKey, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      logger.error('storage.set falló', error, { key });
    }
  },

  async remove(key: StorageKey): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('storage.remove falló', error, { key });
    }
  },

  /**
   * Borra todo lo guardado en AsyncStorage. Útil al cerrar sesión.
   *
   * Ojo: no toca el almacén seguro. El token se borra solo cuando el store de
   * auth persiste el estado vacío tras `signOut()`.
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(StorageKeys));
    } catch (error) {
      logger.error('storage.clear falló', error);
    }
  },
};

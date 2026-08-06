import { API_TIMEOUT_MS, API_URL, APP_ENV } from '@env';

/**
 * Punto único de acceso a la configuración de entorno.
 *
 * El resto de la app importa `env` desde aquí y nunca `@env` directamente:
 * así los valores se validan y se convierten de tipo en un solo lugar.
 */

function requireString(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `[config] Falta la variable de entorno "${name}". Revisa tu archivo .env`,
    );
  }
  return value;
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  appEnv: APP_ENV,
  apiUrl: requireString(API_URL, 'API_URL'),
  apiTimeoutMs: toNumber(API_TIMEOUT_MS, 15_000),

  isDevelopment: APP_ENV === 'development',
  isProduction: APP_ENV === 'production',
} as const;

export type Env = typeof env;

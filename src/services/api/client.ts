import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import { env } from '@/config/env';
import { logger } from '@/utils/logger';

import { toApiError } from './errors';

/**
 * Cliente HTTP único de la app.
 *
 * Los `features/` no crean instancias de axios: definen sus funciones de
 * request usando `api` y así heredan baseURL, timeout, auth y manejo de
 * errores.
 */

/** Se inyecta desde el store de auth para evitar una dependencia circular. */
let getAuthToken: () => string | null = () => null;
let onUnauthorized: () => void = () => {};

export function configureApiAuth(options: {
  getToken: () => string | null;
  onUnauthorized: () => void;
}): void {
  getAuthToken = options.getToken;
  onUnauthorized = options.onUnauthorized;
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (env.isDevelopment) {
    logger.debug(`→ ${config.method?.toUpperCase()} ${config.url}`);
  }

  return config;
});

api.interceptors.response.use(
  response => {
    if (env.isDevelopment) {
      logger.debug(`← ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error: unknown) => {
    const apiError = toApiError(error);

    if (apiError.kind === 'unauthorized') {
      onUnauthorized();
    }

    logger.error('Request falló', apiError, {
      kind: apiError.kind,
      status: apiError.status,
    });

    // Rechazamos con ApiError para que hooks y pantallas nunca vean AxiosError.
    return Promise.reject(apiError);
  },
);

/** Helpers tipados: devuelven directamente el `data` de la respuesta. */
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then(res => res.data),

  post: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    api.post<T>(url, body, config).then(res => res.data),

  put: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    api.put<T>(url, body, config).then(res => res.data),

  patch: <T, B = unknown>(url: string, body?: B, config?: AxiosRequestConfig) =>
    api.patch<T>(url, body, config).then(res => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then(res => res.data),
};

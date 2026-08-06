import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './errors';

/**
 * Configuración global de React Query.
 *
 * React Query es la fuente de verdad del *estado del servidor* (caché,
 * loading, revalidación). Zustand sólo guarda estado *del cliente*
 * (sesión, preferencias, UI). No mezclar los dos.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // En móvil la red es cara: no revalidamos al enfocar cada pantalla.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Fábrica de claves de caché.
 *
 * Centralizar las keys evita invalidaciones que no coinciden por un typo.
 * Cada feature extiende este objeto con su propio namespace.
 */
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.posts.all, 'detail', id] as const,
  },
} as const;

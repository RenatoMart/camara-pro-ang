import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import React, { type PropsWithChildren, type ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme';

/**
 * `render` con todos los providers ya montados.
 *
 * Importa `renderWithProviders` en los tests en lugar del `render` de la
 * librería: así ningún test falla por un provider olvidado.
 *
 * Ojo: desde la v14 de @testing-library/react-native tanto `render` como
 * `fireEvent` son asíncronos, así que hay que usar `await`.
 */

const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Sin reintentos: un test que falla debe fallar rápido.
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export async function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient },
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <NavigationContainer>{children}</NavigationContainer>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const result = await render(ui, { wrapper: Wrapper, ...options });

  return { queryClient, ...result };
}

export * from '@testing-library/react-native';

import { QueryClientProvider } from '@tanstack/react-query';
import React, { type PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient } from '@/services/api/queryClient';
import { ThemeProvider } from '@/theme';

/**
 * Composición de providers globales.
 *
 * El orden importa:
 * 1. `GestureHandlerRootView` debe ser la raíz absoluta.
 * 2. `SafeAreaProvider` antes que cualquier cosa que lea insets.
 * 3. `ErrorBoundary` por dentro, para poder renderizar su fallback con tema.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

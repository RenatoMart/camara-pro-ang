import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';

import { Loader } from '@/components/ui/Loader';
import { PostDetailScreen } from '@/features/posts/screens/PostDetailScreen';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { AuthNavigator } from './AuthNavigator';
import { linking } from './linking';
import { MainTabNavigator } from './MainTabNavigator';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Navegador raíz.
 *
 * Patrón "protected routes": en lugar de navegar imperativamente al hacer
 * login/logout, se monta un árbol distinto según el estado de sesión. Esto
 * elimina pantallas huérfanas en el historial y evita condiciones de carrera.
 */
export function RootNavigator() {
  const theme = useTheme();
  const status = useAuthStore(state => state.status);
  const isHydrated = useAuthStore(state => state.isHydrated);

  const navigationTheme = useMemo<NavTheme>(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.textPrimary,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  // Evita el parpadeo de la pantalla de login mientras se lee el token.
  if (!isHydrated) {
    return <Loader fullscreen message="Cargando…" />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      linking={linking}
      fallback={<Loader fullscreen />}
      onUnhandledAction={action =>
        logger.warn('Acción de navegación no manejada', { type: action.type })
      }
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {status === 'authenticated' ? (
          <Stack.Group>
            <Stack.Screen
              name="Main"
              component={MainTabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={({ route }) => ({
                title: route.params.title ?? 'Publicación',
              })}
            />
          </Stack.Group>
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

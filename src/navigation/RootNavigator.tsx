import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';

import { Loader } from '@/components/ui/Loader';
import { CameraScreen } from '@/features/camera/screens/CameraScreen';
import { GalleryScreen } from '@/features/camera/screens/GalleryScreen';
import { PhotoViewerScreen } from '@/features/camera/screens/PhotoViewerScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';

import { linking } from './linking';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Navegador raíz de la app de cámara.
 *
 * La cámara es la pantalla inicial, sin login: galería, visor de foto y
 * ajustes se apilan encima. El flujo de auth del ejemplo de plantilla sigue
 * en `AuthNavigator`/`MainTabNavigator` por si un proyecto futuro lo
 * necesita, pero aquí no se monta.
 */
export function RootNavigator() {
  const theme = useTheme();

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
        <Stack.Screen
          name="Camara"
          component={CameraScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Galeria"
          component={GalleryScreen}
          options={{ title: 'Galería' }}
        />
        <Stack.Screen
          name="FotoDetalle"
          component={PhotoViewerScreen}
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="Ajustes"
          component={SettingsScreen}
          options={{ title: 'Ajustes' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

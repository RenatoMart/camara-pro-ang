import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { FeedScreen } from '@/features/posts/screens/FeedScreen';
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen';
import { useTheme } from '@/theme';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Iconos como emoji para no arrastrar dependencias nativas en la plantilla.
 * Al empezar un proyecto real, sustitúyelos por `react-native-vector-icons`
 * o SVGs propios.
 */
const icons: Record<keyof MainTabParamList, string> = {
  Feed: '📰',
  Settings: '⚙️',
};

type TabIconProps = {
  routeName: keyof MainTabParamList;
  focused: boolean;
};

/**
 * Definido fuera del navegador a propósito: declarar componentes dentro del
 * render hace que React los trate como un tipo nuevo en cada pase y
 * desmonte el subárbol.
 */
function TabIcon({ routeName, focused }: TabIconProps) {
  return (
    <Text style={focused ? styles.iconActive : styles.iconInactive}>
      {icons[routeName]}
    </Text>
  );
}

export function MainTabNavigator() {
  const theme = useTheme();

  const screenOptions = useCallback(
    ({ route }: { route: { name: keyof MainTabParamList } }) => ({
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTitleStyle: { color: theme.colors.textPrimary },
      headerShadowVisible: false,
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
      tabBarStyle: {
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
      },
      tabBarIcon: ({ focused }: { focused: boolean }) => (
        <TabIcon routeName={route.name} focused={focused} />
      ),
    }),
    [theme],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: 'Publicaciones', tabBarLabel: 'Feed' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Ajustes', tabBarLabel: 'Ajustes' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconActive: { opacity: 1 },
  iconInactive: { opacity: 0.5 },
});

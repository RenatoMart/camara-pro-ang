import React from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { makeStyles } from '@/theme';

const THEME_OPTIONS: ReadonlyArray<{
  value: ThemePreference;
  label: string;
}> = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

export function SettingsScreen() {
  const styles = useStyles();

  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);
  const themePreference = useSettingsStore(state => state.themePreference);
  const setThemePreference = useSettingsStore(
    state => state.setThemePreference,
  );

  const confirmSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen scrollable>
      <Card>
        <Text variant="overline" color="textSecondary">
          Cuenta
        </Text>
        <Text variant="subtitle">{user?.name ?? 'Invitado'}</Text>
        <Text variant="caption" color="textSecondary">
          {user?.email ?? 'Sin sesión'}
        </Text>
      </Card>

      <Card>
        <Text variant="overline" color="textSecondary">
          Apariencia
        </Text>
        <View style={styles.options}>
          {THEME_OPTIONS.map(option => (
            <Button
              key={option.value}
              label={option.label}
              size="sm"
              variant={
                themePreference === option.value ? 'primary' : 'secondary'
              }
              onPress={() => setThemePreference(option.value)}
              style={styles.option}
            />
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="overline" color="textSecondary">
          Entorno
        </Text>
        <Text variant="caption" color="textSecondary">
          {env.appEnv} · {env.apiUrl}
        </Text>
      </Card>

      <Button label="Cerrar sesión" variant="danger" onPress={confirmSignOut} />
    </Screen>
  );
}

const useStyles = makeStyles(theme => ({
  options: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  option: {
    flex: 1,
  },
}));

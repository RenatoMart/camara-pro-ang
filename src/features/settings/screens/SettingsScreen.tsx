import { useIsFocused } from '@react-navigation/native';
import React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { useSettingsStore, type ThemePreference } from '@/store/settingsStore';
import { makeStyles } from '@/theme';

import { GuideTutorial } from '../components/GuideTutorial';

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
  const isFocused = useIsFocused();

  const themePreference = useSettingsStore(state => state.themePreference);
  const setThemePreference = useSettingsStore(
    state => state.setThemePreference,
  );

  return (
    <Screen scrollable>
      <Card>
        <Text variant="overline" color="textSecondary">
          Apariencia
        </Text>
        <Text variant="caption" color="textSecondary">
          Afecta a la galería y a los ajustes. El visor de la cámara es siempre
          oscuro, como en cualquier cámara profesional.
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
          Guía
        </Text>
        <Text variant="caption" color="textSecondary">
          Las líneas guía del modo PRO ayudan a encuadrar antes de disparar.
          Esto es lo que dibuja cada una y para qué escena sirve.
        </Text>
        <GuideTutorial active={isFocused} />
      </Card>

      <Card>
        <Text variant="overline" color="textSecondary">
          Entorno
        </Text>
        <Text variant="caption" color="textSecondary">
          {env.appEnv} · {env.apiUrl}
        </Text>
      </Card>
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

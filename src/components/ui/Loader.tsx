import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

export type LoaderProps = {
  message?: string;
  /** Ocupa toda la pantalla y centra el indicador. */
  fullscreen?: boolean;
};

export function Loader({ message, fullscreen = false }: LoaderProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message ?? 'Cargando'}
      style={[styles.container, fullscreen && styles.fullscreen]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? (
        <Text variant="caption" color="textSecondary">
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
}));

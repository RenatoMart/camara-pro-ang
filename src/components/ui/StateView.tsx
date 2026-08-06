import React from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

import { Button } from './Button';
import { Text } from './Text';

export type StateViewProps = {
  title: string;
  description?: string;
  /** Etiqueta del botón de acción. Si falta, no se muestra botón. */
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'error';
};

/**
 * Vista para estados vacíos y de error.
 *
 * Toda lista o pantalla que carga datos debe manejar los cuatro estados:
 * cargando, error, vacío y con datos. Este componente cubre los dos del medio.
 */
export function StateView({
  title,
  description,
  actionLabel,
  onAction,
  tone = 'neutral',
}: StateViewProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text
        variant="subtitle"
        align="center"
        color={tone === 'error' ? 'danger' : 'textPrimary'}
      >
        {title}
      </Text>

      {description ? (
        <Text variant="body" color="textSecondary" align="center">
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  action: {
    marginTop: theme.spacing.md,
  },
}));

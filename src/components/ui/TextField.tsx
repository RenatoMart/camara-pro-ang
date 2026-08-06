import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  /** Mensaje de error; si está presente el campo se marca como inválido. */
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Campo de texto con label, estado de foco y error.
 *
 * Pensado para integrarse con react-hook-form mediante `<Controller>`;
 * mantiene la referencia expuesta para poder encadenar el foco entre campos
 * con `onSubmitEditing`.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(
  function TextFieldWithRef(
    { label, error, hint, containerStyle, onFocus, onBlur, ...rest },
    ref,
  ) {
    const theme = useTheme();
    const styles = useStyles();
    const [isFocused, setIsFocused] = useState(false);

    const borderColor = error
      ? theme.colors.danger
      : isFocused
      ? theme.colors.primary
      : theme.colors.border;

    return (
      <View style={[styles.container, containerStyle]}>
        {label ? (
          <Text variant="caption" color="textSecondary" style={styles.label}>
            {label}
          </Text>
        ) : null}

        <TextInput
          ref={ref}
          style={[styles.input, { borderColor }]}
          placeholderTextColor={theme.colors.textDisabled}
          selectionColor={theme.colors.primary}
          accessibilityLabel={label}
          accessibilityHint={hint}
          aria-invalid={Boolean(error)}
          onFocus={event => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />

        {error ? (
          <Text variant="caption" color="danger" style={styles.helper}>
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" color="textSecondary" style={styles.helper}>
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

const useStyles = makeStyles(theme => ({
  container: {
    gap: theme.spacing.xs,
  },
  label: {
    marginLeft: theme.spacing.xxs,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: theme.radius.md,
    ...theme.roundedCorner,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
  },
  helper: {
    marginLeft: theme.spacing.xxs,
  },
}));

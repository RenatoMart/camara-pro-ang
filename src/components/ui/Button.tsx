import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { HIT_SLOP, MIN_TOUCH_SIZE, makeStyles, useTheme } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón base de la app.
 *
 * Notas de buenas prácticas incluidas aquí:
 * - `Pressable` en vez de `TouchableOpacity` (API actual, feedback por estado).
 * - área táctil mínima de 44pt y `hitSlop`.
 * - props de accesibilidad (`role`, `accessibilityState`) siempre presentes.
 * - `loading` bloquea el press para evitar dobles envíos.
 */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  leftIcon,
  rightIcon,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const styles = useStyles();

  const isDisabled = Boolean(disabled) || loading;

  const backgroundFor = useCallback(
    (pressed: boolean): string => {
      if (isDisabled && variant !== 'ghost') {
        return theme.colors.border;
      }
      switch (variant) {
        case 'primary':
          return pressed ? theme.colors.primaryPressed : theme.colors.primary;
        case 'danger':
          return pressed ? theme.colors.dangerPressed : theme.colors.danger;
        case 'secondary':
          return pressed ? theme.colors.primarySoft : theme.colors.surface;
        case 'ghost':
          return pressed ? theme.colors.primarySoft : theme.colors.transparent;
      }
    },
    [isDisabled, theme, variant],
  );

  const labelColor =
    variant === 'primary' || variant === 'danger' ? 'onPrimary' : 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      hitSlop={HIT_SLOP}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        variant === 'secondary' && styles.bordered,
        fullWidth && styles.fullWidth,
        { backgroundColor: backgroundFor(pressed) },
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={theme.colors[labelColor]}
          accessibilityLabel="Cargando"
        />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text
            variant="bodyStrong"
            color={isDisabled ? 'textDisabled' : labelColor}
          >
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  base: {
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    ...theme.roundedCorner,
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  bordered: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: theme.colors.border,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    ...theme.roundedCorner,
  },
  md: {},
  lg: {
    minHeight: 52,
    paddingHorizontal: theme.spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.7,
  },
}));

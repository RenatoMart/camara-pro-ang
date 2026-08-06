import React, { type PropsWithChildren } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

export type CardProps = PropsWithChildren<{
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}>;

/** Contenedor con superficie, borde y sombra. Pulsable si recibe `onPress`. */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const theme = useTheme();
  const styles = useStyles();

  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { backgroundColor: theme.colors.primarySoft },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles(theme => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    ...theme.roundedCorner,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.xs,
    ...theme.elevation.sm,
  },
}));

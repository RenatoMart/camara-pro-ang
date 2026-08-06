import React, { memo } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text';
import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

import { Glyph, type GlyphName } from '../Glyph';

export type HudChipProps = {
  label: string;
  onPress: () => void;
  /** Activo = fondo amarillo con texto oscuro, como herramienta "en uso". */
  active?: boolean;
  icon?: GlyphName;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Chip de herramienta del HUD.
 *
 * Es el control básico del visor: rectángulo de cristal con texto mono en
 * mayúsculas. Inactivo apenas se ve; activo se enciende en amarillo.
 */
export const HudChip = memo(function HudChipBase({
  label,
  onPress,
  active = false,
  icon,
  disabled = false,
  accessibilityLabel,
}: HudChipProps) {
  const theme = useTheme();
  const styles = useStyles();

  const contentColor = active ? theme.hud.onAccent : theme.hud.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        active ? styles.chipActive : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon ? <Glyph name={icon} size={14} color={contentColor} /> : null}
      <Text
        variant="monoXs"
        style={[styles.label, { color: contentColor }]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
});

const useStyles = makeStyles(theme => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    ...theme.roundedCorner,
    backgroundColor: theme.hud.chip,
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
  },
  chipActive: {
    backgroundColor: theme.hud.accent,
    borderColor: theme.hud.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    letterSpacing: 0.8,
  },
}));

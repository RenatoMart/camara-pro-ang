import React, { memo } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text';
import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

import { Glyph, type GlyphName } from '../Glyph';

export type HudChipProps = {
  label: string;
  onPress: () => void;
  /** Activo = resaltado en amarillo, como herramienta "en uso". */
  active?: boolean;
  icon?: GlyphName;
  disabled?: boolean;
  accessibilityLabel?: string;
  /**
   * `chip` (por defecto) = píldora de cristal, para toggles sueltos.
   * `plain` = sólo texto, sin fondo ni borde: la tira de "modos" de una
   * cámara de toda la vida (FOTO / VIDEO / RETRATO…), donde lo activo se
   * distingue por color y peso, no por una caja.
   */
  variant?: 'chip' | 'plain';
};

/**
 * Chip de herramienta del HUD.
 *
 * En `chip` es un rectángulo de cristal con texto mono en mayúsculas. En
 * `plain` es sólo texto suelto, mayor y sin caja: para tiras de modo.
 * Inactivo apenas se ve; activo se enciende en amarillo.
 */
export const HudChip = memo(function HudChipBase({
  label,
  onPress,
  active = false,
  icon,
  disabled = false,
  accessibilityLabel,
  variant = 'chip',
}: HudChipProps) {
  const theme = useTheme();
  const styles = useStyles();

  const contentColor =
    variant === 'plain'
      ? active
        ? theme.hud.accent
        : theme.hud.textDim
      : active
      ? theme.hud.onAccent
      : theme.hud.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        variant === 'chip' ? styles.chip : styles.plain,
        variant === 'chip' && active ? styles.chipActive : null,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon ? <Glyph name={icon} size={14} color={contentColor} /> : null}
      <Text
        variant={variant === 'plain' ? 'bodyStrong' : 'monoXs'}
        style={[
          variant === 'chip' ? styles.label : styles.plainLabel,
          { color: contentColor },
        ]}
        numberOfLines={1}
      >
        {variant === 'plain' ? label : label.toUpperCase()}
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
  plain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
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
  plainLabel: {
    letterSpacing: 0.2,
  },
}));

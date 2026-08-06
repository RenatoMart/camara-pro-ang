import React, { memo } from 'react';
import { Pressable } from 'react-native';

import { MIN_TOUCH_SIZE, makeStyles, useTheme } from '@/theme';

import { Glyph, type GlyphName } from '../Glyph';

export type HudIconButtonProps = {
  icon: GlyphName;
  onPress: () => void;
  accessibilityLabel: string;
  /** Enciende el icono en amarillo (herramienta activa). */
  active?: boolean;
  disabled?: boolean;
};

/**
 * Botón redondo de icono del HUD, con área táctil mínima de 44 px.
 */
export const HudIconButton = memo(function HudIconButtonBase({
  icon,
  onPress,
  accessibilityLabel,
  active = false,
  disabled = false,
}: HudIconButtonProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Glyph
        name={icon}
        size={20}
        color={active ? theme.hud.accent : theme.hud.text}
      />
    </Pressable>
  );
});

const useStyles = makeStyles(theme => ({
  button: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    borderRadius: theme.radius.full,
    ...theme.roundedCorner,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.hud.glass,
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
}));

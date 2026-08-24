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
 *
 * Sin píldora de cristal detrás: el glifo va suelto sobre el visor, como en
 * cualquier cámara de toda la vida. La legibilidad sobre escenas claras la
 * da la trama oscura que ya cubre las barras superior e inferior, no un
 * fondo propio del botón.
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

const useStyles = makeStyles(() => ({
  button: {
    width: MIN_TOUCH_SIZE,
    height: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
}));

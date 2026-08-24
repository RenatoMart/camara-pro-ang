import React, { memo } from 'react';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/Text';
import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

import { Glyph, type GlyphName } from '../Glyph';

export type HudLabeledButtonProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  icon: GlyphName;
  /** Encendido en amarillo: el ajuste está en un valor distinto del neutro. */
  active?: boolean;
  /**
   * El botón despliega un menú de opciones (aspecto, temporizador). Marca el
   * estado abierto para que se vea cuál de ellos tiene el menú desplegado.
   */
  expanded?: boolean;
  disabled?: boolean;
};

/**
 * Botón de icono con etiqueta debajo.
 *
 * Lo usan la barra superior y las herramientas del panel PRO. La etiqueta no
 * es decoración: un icono suelto no dice lo que hace, y el del disparo
 * automático llegó a disparar solo sin que se supiera de dónde salían las
 * fotos. Es más compacto que `HudChip` porque aquí conviven varios controles
 * en una línea, y la legibilidad la da la trama oscura de la barra, no un
 * fondo propio.
 */
export const HudLabeledButton = memo(function HudLabeledButtonBase({
  label,
  onPress,
  accessibilityLabel,
  icon,
  active = false,
  expanded = false,
  disabled = false,
}: HudLabeledButtonProps) {
  const theme = useTheme();
  const styles = useStyles();

  const color = active || expanded ? theme.hud.accent : theme.hud.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, expanded, disabled }}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <Glyph name={icon} size={18} color={color} />
      <Text
        variant="monoXs"
        style={[styles.label, { color }]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
});

const useStyles = makeStyles(theme => ({
  button: {
    minWidth: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  label: {
    letterSpacing: 0.6,
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.4,
  },
}));

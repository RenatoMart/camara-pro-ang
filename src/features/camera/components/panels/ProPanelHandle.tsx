import React, { memo } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

import { HUD_PILL_SIZE } from '../controls/ZoomIndicator';
import { Glyph } from '../Glyph';

export type ProPanelHandleProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Botón que sustituye a `<ProPanel>` cuando el usuario la ha ocultado tocando
 * el visor.
 *
 * Sin esto, cerrar el panel de un toque no tendría vuelta atrás salvo salir
 * del modo PRO y volver a entrar. Es una píldora suelta sobre el visor, igual
 * que el indicador de zoom — sin texto, sólo la flecha: no hace falta
 * explicar lo que ya se ve.
 */
export const ProPanelHandle = memo(function ProPanelHandleBase({
  onPress,
  style,
}: ProPanelHandleProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel="Mostrar las herramientas PRO"
      style={({ pressed }) => [
        styles.chip,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Glyph name="chevronArriba" size={16} color={theme.hud.textDim} />
    </Pressable>
  );
});

const useStyles = makeStyles(theme => ({
  chip: {
    width: HUD_PILL_SIZE,
    height: HUD_PILL_SIZE,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.hud.glass,
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
  },
  pressed: {
    opacity: 0.7,
  },
}));

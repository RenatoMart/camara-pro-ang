import React, { memo } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

export type ZoomIndicatorProps = {
  /** Factor de zoom vigente (1 = angular normal). */
  value: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Lado de la píldora circular. La manija del panel PRO se apila sobre ésta con el mismo tamaño. */
export const HUD_PILL_SIZE = 40;

/** Un valor casi exacto se enseña sin decimales: «2×», no «2,0×». */
const NEAR_INTEGER = 0.05;

function formatZoom(value: number): string {
  const rounded = Math.round(value);
  const label =
    Math.abs(value - rounded) < NEAR_INTEGER
      ? String(rounded)
      : value.toFixed(1);
  return `${label}×`;
}

/**
 * Botoncito redondo de zoom, como en cualquier cámara de teléfono.
 *
 * Sólo enseña el valor; quien lo mueve es el pellizco sobre el visor
 * (`CameraViewport`). Tocarlo salta al siguiente factor "redondo" de la
 * lista que le pasan (0.5×, 1×, 2×…), el mismo atajo que ofrecen las cámaras
 * de fábrica para no depender siempre del gesto de dos dedos.
 */
export const ZoomIndicator = memo(function ZoomIndicatorBase({
  value,
  onPress,
  style,
}: ZoomIndicatorProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`Zoom ${formatZoom(value)}. Toca para cambiar`}
      style={({ pressed }) => [
        styles.chip,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Text variant="mono" style={{ color: theme.hud.text }}>
        {formatZoom(value)}
      </Text>
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

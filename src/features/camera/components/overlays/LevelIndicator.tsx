import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { makeStyles, useTheme } from '@/theme';

export type LevelIndicatorProps = {
  roll: SharedValue<number>;
  pitch: SharedValue<number>;
  isLevel: boolean;
};

const LINE_WIDTH = 130;
const TICK_WIDTH = 24;
const PITCH_RANGE = 45;
const PITCH_TRAVEL = 56;

/**
 * Nivel de horizonte de dos ejes.
 *
 * La línea central rota en sentido contrario al teléfono (horizonte
 * artificial) y el punto se desplaza con la inclinación adelante/atrás.
 * Cuando el roll queda dentro de la tolerancia, todo se enciende en verde.
 * Las transformaciones se calculan en el hilo de UI con Reanimated: el
 * sensor emite ~12 veces por segundo y no debe provocar re-renders.
 */
export const LevelIndicator = memo(function LevelIndicatorBase({
  roll,
  pitch,
  isLevel,
}: LevelIndicatorProps) {
  const theme = useTheme();
  const styles = useStyles();

  // El horizonte compensa el giro del teléfono: rota -roll.
  const horizonStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-roll.value}deg` }],
  }));

  const pitchStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          pitch.value,
          [-PITCH_RANGE, PITCH_RANGE],
          [PITCH_TRAVEL, -PITCH_TRAVEL],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const activeColor = isLevel ? theme.hud.level : theme.hud.gridLineStrong;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {/* Marcas fijas de referencia a los lados. */}
      <View style={[styles.tick, styles.tickLeft]} />
      <View style={[styles.tick, styles.tickRight]} />

      {/* Horizonte artificial. */}
      <Animated.View
        style={[styles.horizon, { backgroundColor: activeColor }, horizonStyle]}
      />

      {/* Inclinación adelante/atrás. */}
      <Animated.View
        style={[styles.pitchDot, { borderColor: activeColor }, pitchStyle]}
      />
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: TICK_WIDTH,
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: theme.hud.gridLine,
  },
  tickLeft: {
    left: '50%',
    marginLeft: -(LINE_WIDTH / 2 + TICK_WIDTH + theme.spacing.sm),
  },
  tickRight: {
    right: '50%',
    marginRight: -(LINE_WIDTH / 2 + TICK_WIDTH + theme.spacing.sm),
  },
  horizon: {
    width: LINE_WIDTH,
    height: 2,
    borderRadius: theme.radius.full,
  },
  pitchDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: theme.radius.full,
    borderWidth: 2,
    backgroundColor: theme.hud.glass,
  },
}));

import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

export type ViewfinderFrameProps = {
  width: number;
  height: number;
};

const LEG = 22;
const THICKNESS = 2;
const INSET = 14;

/**
 * Las cuatro escuadras de esquina del visor clásico.
 *
 * Decoración pura, siempre visible sobre el área encuadrada: es la marca de
 * cualquier cámara de toda la vida, esté o no activa una guía de
 * composición. No captura toques ni cambia según el estado de la app.
 */
export const ViewfinderFrame = memo(function ViewfinderFrameBase({
  width,
  height,
}: ViewfinderFrameProps) {
  const styles = useStyles();

  if (width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Corner style={[styles.corner, { top: INSET, left: INSET }]} />
      <Corner
        style={[styles.corner, styles.flipH, { top: INSET, right: INSET }]}
      />
      <Corner
        style={[styles.corner, styles.flipV, { bottom: INSET, left: INSET }]}
      />
      <Corner
        style={[
          styles.corner,
          styles.flipH,
          styles.flipV,
          { bottom: INSET, right: INSET },
        ]}
      />
    </View>
  );
});

function Corner({ style }: { style: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return (
    <View style={style}>
      <View style={styles.legHorizontal} />
      <View style={styles.legVertical} />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  corner: {
    position: 'absolute',
    width: LEG,
    height: LEG,
  },
  flipH: {
    transform: [{ scaleX: -1 }],
  },
  flipV: {
    transform: [{ scaleY: -1 }],
  },
  legHorizontal: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: LEG,
    height: THICKNESS,
    backgroundColor: theme.hud.gridLineStrong,
  },
  legVertical: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: THICKNESS,
    height: LEG,
    backgroundColor: theme.hud.gridLineStrong,
  },
}));

import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

export type CaptureFrameCornersProps = {
  width: number;
  height: number;
};

const LEG = 22;
const THICKNESS = 2;
const INSET = 14;

/**
 * Escuadras de esquina sobre el área que de verdad se captura.
 *
 * A diferencia de una decoración fija de pantalla completa, `width`/`height`
 * son los del rectángulo recortado por el formato elegido (`AspectMask`):
 * si el formato es `1:1` o `9:16`, las escuadras se cierran sobre ese
 * recuadro en vez de las esquinas de la pantalla, para que sirvan de
 * referencia real del tamaño de la foto (o del vídeo, donde no hay recorte y
 * el rectángulo es la pantalla completa).
 */
export const CaptureFrameCorners = memo(function CaptureFrameCornersBase({
  width,
  height,
}: CaptureFrameCornersProps) {
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
          styles.flipBoth,
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
  // No se puede lograr con `[flipH, flipV]` a la vez: al mezclar estilos,
  // `transform` no se combina como el resto de propiedades — el segundo
  // array reemplaza entero al primero en vez de sumarse — así que la esquina
  // que necesita los dos volteos lleva su propio estilo con ambos juntos.
  flipBoth: {
    transform: [{ scaleX: -1 }, { scaleY: -1 }],
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

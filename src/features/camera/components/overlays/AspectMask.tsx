import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles } from '@/theme';

import { ASPECTS, type AspectKind } from '../../constants/guides';
import { aspectCropInsets, type CropInsets } from '../../utils/geometry';

export type AspectMaskProps = {
  aspect: AspectKind;
  width: number;
  height: number;
};

const NO_CROP: CropInsets = { top: 0, bottom: 0, left: 0, right: 0 };

/** Franjas del recorte de aspecto actual; cero si no hay máscara. */
export function useAspectInsets(
  aspect: AspectKind,
  width: number,
  height: number,
): CropInsets {
  return useMemo(() => {
    const ratio = ASPECTS.find(option => option.kind === aspect)?.ratio;
    if (!ratio || width <= 0 || height <= 0) {
      return NO_CROP;
    }
    return aspectCropInsets(width, height, ratio);
  }, [aspect, width, height]);
}

/**
 * Máscara de relación de aspecto: sombrea lo que quedaría fuera del formato
 * elegido (1:1, 9:16, cine…) sin ocultarlo del todo, para encuadrar la foto
 * final sin perder de vista la escena completa.
 */
export const AspectMask = memo(function AspectMaskBase({
  aspect,
  width,
  height,
}: AspectMaskProps) {
  const styles = useStyles();
  const insets = useAspectInsets(aspect, width, height);

  if (insets.top === 0 && insets.left === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {insets.top > 0 ? (
        <>
          <View style={[styles.shadeTop, { height: insets.top }]} />
          <View style={[styles.shadeBottom, { height: insets.bottom }]} />
        </>
      ) : null}
      {insets.left > 0 ? (
        <>
          <View style={[styles.shadeLeft, { width: insets.left }]} />
          <View style={[styles.shadeRight, { width: insets.right }]} />
        </>
      ) : null}
      <View
        style={[
          styles.frame,
          {
            top: insets.top,
            bottom: insets.bottom,
            left: insets.left,
            right: insets.right,
          },
        ]}
      />
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  shadeTop: {
    position: 'absolute',
    backgroundColor: theme.hud.mask,
    top: 0,
    left: 0,
    right: 0,
  },
  shadeBottom: {
    position: 'absolute',
    backgroundColor: theme.hud.mask,
    bottom: 0,
    left: 0,
    right: 0,
  },
  shadeLeft: {
    position: 'absolute',
    backgroundColor: theme.hud.mask,
    top: 0,
    bottom: 0,
    left: 0,
  },
  shadeRight: {
    position: 'absolute',
    backgroundColor: theme.hud.mask,
    top: 0,
    bottom: 0,
    right: 0,
  },
  frame: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.hud.glassBorder,
  },
}));

import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export type GhostOverlayProps = {
  uri: string;
  opacity: number;
};

/**
 * Superposición fantasma: una foto anterior semitransparente sobre el visor.
 *
 * Sirve para repetir un encuadre exacto (antes/después, timelapses manuales,
 * la misma escena en otra época). La opacidad la controla el usuario desde
 * el panel PRO.
 */
export const GhostOverlay = memo(function GhostOverlayBase({
  uri,
  opacity,
}: GhostOverlayProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
});

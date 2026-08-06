import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { makeStyles, useTheme } from '@/theme';

import type { GuideKind } from '../../constants/guides';
import {
  goldenSpiralPath,
  goldenTriangleLines,
  gridFractions,
} from '../../utils/geometry';

export type GuideOverlayProps = {
  kind: GuideKind;
  width: number;
  height: number;
};

const HAIRLINE = StyleSheet.hairlineWidth;

/**
 * Superposición de guías de composición sobre el área visible del visor.
 *
 * Es puro dibujo: no captura toques (`pointerEvents="none"`) y sólo se
 * re-renderiza si cambian la guía o el tamaño. Las rejillas se trazan con
 * Views (líneas rectas baratas); espiral y triángulos, con SVG.
 */
export const GuideOverlay = memo(function GuideOverlayBase({
  kind,
  width,
  height,
}: GuideOverlayProps) {
  if (kind === 'ninguna' || width <= 0 || height <= 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {kind === 'tercios' || kind === 'phi' || kind === 'cuadricula' ? (
        <GridGuide kind={kind} width={width} height={height} />
      ) : null}
      {kind === 'espiral' ? (
        <SpiralGuide width={width} height={height} />
      ) : null}
      {kind === 'triangulos' ? (
        <TrianglesGuide width={width} height={height} />
      ) : null}
      {kind === 'cruz' ? <CrossGuide width={width} height={height} /> : null}
    </View>
  );
});

type GuideSize = { width: number; height: number };

function GridGuide({
  kind,
  width,
  height,
}: GuideSize & { kind: 'tercios' | 'phi' | 'cuadricula' }) {
  const styles = useStyles();
  const fractions = useMemo(() => gridFractions(kind), [kind]);

  return (
    <>
      {fractions.map(fraction => (
        <React.Fragment key={fraction}>
          <View
            style={[
              styles.line,
              { left: fraction * width, width: HAIRLINE, height },
            ]}
          />
          <View
            style={[
              styles.line,
              { top: fraction * height, height: HAIRLINE, width },
            ]}
          />
        </React.Fragment>
      ))}
    </>
  );
}

function SpiralGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const path = useMemo(() => goldenSpiralPath(width, height), [width, height]);

  return (
    <Svg width={width} height={height}>
      <Path
        d={path}
        stroke={theme.hud.gridLineStrong}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

function TrianglesGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const lines = useMemo(
    () => goldenTriangleLines(width, height),
    [width, height],
  );

  return (
    <Svg width={width} height={height}>
      {lines.map(line => (
        <Line
          key={`${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={theme.hud.gridLine}
          strokeWidth={1}
        />
      ))}
    </Svg>
  );
}

/** Cruz central con círculo de alineación: simetrías, cenital, retrato frontal. */
function CrossGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const radius = Math.min(width, height) / 7;

  return (
    <Svg width={width} height={height}>
      <Line
        x1={width / 2}
        y1={0}
        x2={width / 2}
        y2={height}
        stroke={theme.hud.gridLine}
        strokeWidth={1}
      />
      <Line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke={theme.hud.gridLine}
        strokeWidth={1}
      />
      <Circle
        cx={width / 2}
        cy={height / 2}
        r={radius}
        stroke={theme.hud.gridLineStrong}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

const useStyles = makeStyles(theme => ({
  line: {
    position: 'absolute',
    backgroundColor: theme.hud.gridLine,
  },
}));

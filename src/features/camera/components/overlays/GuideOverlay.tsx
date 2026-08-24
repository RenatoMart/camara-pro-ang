import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { makeStyles, useTheme } from '@/theme';

import type { GuideKind } from '../../constants/guides';
import {
  centerFrame,
  diagonalLines,
  goldenSpiralPath,
  goldenTriangleLines,
  gridFractions,
  negativeSpaceInsets,
  sCurvePath,
  vanishingLines,
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
      {kind === 'tercios' ||
      kind === 'phi' ||
      kind === 'cuadricula' ||
      kind === 'patron' ? (
        <GridGuide kind={kind} width={width} height={height} />
      ) : null}
      {kind === 'espiral' ? (
        <SpiralGuide width={width} height={height} />
      ) : null}
      {kind === 'triangulos' ? (
        <TrianglesGuide width={width} height={height} />
      ) : null}
      {kind === 'cruz' ? <CrossGuide width={width} height={height} /> : null}
      {kind === 'vertical' || kind === 'horizontal' ? (
        <AxisGuide kind={kind} width={width} height={height} />
      ) : null}
      {kind === 'diagonal' ? (
        <DiagonalGuide width={width} height={height} />
      ) : null}
      {kind === 'curva' ? <CurveGuide width={width} height={height} /> : null}
      {kind === 'centro' ? <CenterGuide width={width} height={height} /> : null}
      {kind === 'fuga' ? (
        <VanishingGuide width={width} height={height} />
      ) : null}
      {kind === 'aire' ? <AirGuide width={width} height={height} /> : null}
    </View>
  );
});

type GuideSize = { width: number; height: number };

function GridGuide({
  kind,
  width,
  height,
}: GuideSize & { kind: 'tercios' | 'phi' | 'cuadricula' | 'patron' }) {
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

/**
 * Un solo eje repetido: verticales para sujetos erguidos (árboles, torres,
 * personas de pie), horizontales para horizontes y estratos.
 */
function AxisGuide({
  kind,
  width,
  height,
}: GuideSize & { kind: 'vertical' | 'horizontal' }) {
  const styles = useStyles();
  const fractions = [1 / 3, 2 / 3];

  return (
    <>
      {fractions.map(fraction =>
        kind === 'vertical' ? (
          <View
            key={fraction}
            style={[
              styles.line,
              { left: fraction * width, width: HAIRLINE, height },
            ]}
          />
        ) : (
          <View
            key={fraction}
            style={[
              styles.line,
              { top: fraction * height, height: HAIRLINE, width },
            ]}
          />
        ),
      )}
    </>
  );
}

/** Las dos diagonales: el modelo no distingue el sentido, así que van ambas. */
function DiagonalGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const lines = useMemo(() => diagonalLines(width, height), [width, height]);

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

/** Curva en S: caminos, ríos, costas. */
function CurveGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const path = useMemo(() => sCurvePath(width, height), [width, height]);

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

/** Marco del tercio central, para composiciones deliberadamente centradas. */
function CenterGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const frame = useMemo(() => centerFrame(width, height), [width, height]);

  return (
    <Svg width={width} height={height}>
      <Rect
        x={frame.x}
        y={frame.y}
        width={frame.width}
        height={frame.height}
        stroke={theme.hud.gridLineStrong}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

/** Radiales que convergen: pasillos, carreteras, vías. */
function VanishingGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const lines = useMemo(() => vanishingLines(width, height), [width, height]);

  return (
    <Svg width={width} height={height}>
      {lines.map(line => (
        <Line
          key={`${line.x2}-${line.y2}`}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={theme.hud.gridLine}
          strokeWidth={1}
        />
      ))}
      <Circle
        cx={width / 2}
        cy={height / 2}
        r={Math.min(width, height) / 22}
        stroke={theme.hud.gridLineStrong}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

/** Espacio negativo: el margen que conviene dejar vacío alrededor del sujeto. */
function AirGuide({ width, height }: GuideSize) {
  const theme = useTheme();
  const insets = useMemo(
    () => negativeSpaceInsets(width, height),
    [width, height],
  );

  return (
    <Svg width={width} height={height}>
      <Rect
        x={insets.left}
        y={insets.top}
        width={width - insets.left - insets.right}
        height={height - insets.top - insets.bottom}
        stroke={theme.hud.gridLineStrong}
        strokeWidth={1}
        strokeDasharray="6 6"
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

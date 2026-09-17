import React, { memo, useEffect, useMemo } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { GuideKind } from '@/features/camera/constants/guides';
import {
  centerFrame,
  gridFractions,
  negativeSpaceInsets,
} from '@/features/camera/utils/geometry';
import { useTheme } from '@/theme';

export type GuideSubjectHintProps = {
  kind: GuideKind;
  width: number;
  height: number;
  /**
   * Si está en pantalla. Los tabs de React Navigation no desmontan las
   * pestañas inactivas — sin esto, las animaciones de las 14 tarjetas
   * seguían corriendo en segundo plano aunque el usuario estuviera en la
   * Cámara, compitiendo por el hilo de UI con el visor. `false` congela
   * todo donde esté, no lo oculta ni lo reinicia.
   */
  active: boolean;
};

/** Un punto (fracción 0..1 del tile) donde puede ir el sujeto, con su tamaño. */
type SubjectPoint = { xf: number; yf: number; scale?: number };

/**
 * Cómo se muestra el sujeto de cada guía:
 * - `cycle`: un sujeto que se desliza en bucle por 2+ puntos — varios
 *   encuadres igual de válidos, no uno solo.
 * - `pulse`: un único punto correcto; en vez de moverlo (sugeriría que hay
 *   más de uno), respira suavemente de tamaño para que la tarjeta no se
 *   sienta muerta.
 * - `static`: varias marcas fijas a la vez (sólo `patron`: son elementos
 *   repetidos coexistiendo, no alternativas de un mismo sujeto).
 */
type SubjectConfig =
  | { mode: 'cycle'; points: SubjectPoint[] }
  | { mode: 'pulse'; point: SubjectPoint }
  | { mode: 'static'; points: SubjectPoint[] }
  | { mode: 'none' };

/**
 * Punto(s) de ejemplo por guía, en fracciones del tile.
 *
 * La mayoría reutiliza exactamente los mismos cálculos que ya dibuja
 * `GuideOverlay` (`gridFractions`, `centerFrame`, `negativeSpaceInsets`):
 * son los mismos números, no una aproximación aparte.
 *
 * `espiral` y `triangulos` antes tenían puntos puestos a ojo, y el de la
 * espiral caía fuera del trazo — se corrigieron corriendo el propio
 * algoritmo de `goldenSpiralPath`/`goldenTriangleLines` para sacar
 * vértices reales del dibujo. `curva` usa los tres puntos que sí están
 * sobre el trazo de `sCurvePath` (inicio, el que comparten las dos curvas
 * cúbicas, y final), movidos un poco hacia adentro sólo para que el icono
 * no se recorte contra el borde del tile.
 */
function subjectConfig(kind: GuideKind): SubjectConfig {
  switch (kind) {
    case 'tercios': {
      const [a, b] = gridFractions('tercios');
      return {
        mode: 'cycle',
        points: [
          { xf: b, yf: a },
          { xf: a, yf: b },
        ],
      };
    }
    case 'phi': {
      const [a, b] = gridFractions('phi');
      return {
        mode: 'cycle',
        points: [
          { xf: b, yf: a },
          { xf: a, yf: b },
        ],
      };
    }
    case 'cuadricula': {
      const [a, , c] = gridFractions('cuadricula'); // [0.25, 0.5, 0.75]
      return {
        mode: 'cycle',
        points: [
          { xf: a, yf: a },
          { xf: c, yf: c },
        ],
      };
    }
    case 'patron': {
      const [, b, , d] = gridFractions('patron');
      return {
        mode: 'static',
        points: [
          { xf: b, yf: b, scale: 0.65 },
          { xf: d, yf: b, scale: 0.65 },
          { xf: (b + d) / 2, yf: d, scale: 0.65 },
        ],
      };
    }
    case 'espiral':
      // Vértices reales de `goldenSpiralPath` (mismas 9 iteraciones, mismo
      // tile 84×112): del segundo vértice del trazo hasta el último, que es
      // donde la espiral converge de verdad — antes el punto ni tocaba la
      // curva.
      return {
        mode: 'cycle',
        points: [
          { xf: 0.62, yf: 0.03 },
          { xf: 0.72, yf: 0.71 },
        ],
      };
    case 'triangulos':
      // Los dos pies de perpendicular reales de `goldenTriangleLines`, no
      // un punto inventado sobre la diagonal.
      return {
        mode: 'cycle',
        points: [
          { xf: 0.64, yf: 0.36 },
          { xf: 0.36, yf: 0.64 },
        ],
      };
    case 'cruz':
      return { mode: 'pulse', point: { xf: 0.5, yf: 0.5 } };
    case 'centro':
      return { mode: 'pulse', point: { xf: 0.5, yf: 0.5 } };
    case 'vertical': {
      const [a, b] = gridFractions('tercios');
      return {
        mode: 'cycle',
        points: [
          { xf: a, yf: 0.72 },
          { xf: b, yf: 0.72 },
        ],
      };
    }
    case 'diagonal':
      return {
        mode: 'cycle',
        points: [
          { xf: 0.2, yf: 0.2 },
          { xf: 0.8, yf: 0.8 },
        ],
      };
    case 'curva':
      return {
        mode: 'cycle',
        points: [
          { xf: 0.3, yf: 0.94 },
          { xf: 0.7, yf: 0.5 },
          { xf: 0.3, yf: 0.06 },
        ],
      };
    case 'fuga':
      return {
        mode: 'cycle',
        points: [
          { xf: 0.5, yf: 0.88 },
          { xf: 0.5, yf: 0.6, scale: 0.7 },
        ],
      };
    case 'aire':
      return { mode: 'pulse', point: { xf: 0.38, yf: 0.62, scale: 0.7 } };
    case 'horizontal':
    case 'ninguna':
      return { mode: 'none' };
  }
}

const AnimatedG = Animated.createAnimatedComponent(G);

/** Cuánto tarda en desplazarse de un punto al siguiente. */
const MOVE_MS = 700;
/** Cuánto se queda quieto en cada punto antes de moverse otra vez. */
const HOLD_MS = 950;

/**
 * Construye un bucle infinito por una lista de valores, con una pausa en
 * cada uno. El último paso vuelve animado al primer valor antes de repetir
 * — sin eso, `withRepeat` reinicia la secuencia con un salto instantáneo de
 * vuelta al principio en vez de un movimiento, y se nota como un tirón.
 */
function loopThrough(values: number[]) {
  const first = values[0]!;
  const rest = values.slice(1);

  const steps = [
    withDelay(HOLD_MS, withTiming(first, { duration: 0 })),
    ...rest.flatMap(value => [
      withTiming(value, {
        duration: MOVE_MS,
        easing: Easing.inOut(Easing.quad),
      }),
      withDelay(HOLD_MS, withTiming(value, { duration: 0 })),
    ]),
    // Vuelta animada al primer punto, para que el bucle no dé un salto seco.
    withTiming(first, { duration: MOVE_MS, easing: Easing.inOut(Easing.quad) }),
  ];
  return withRepeat(withSequence(...steps), -1, false);
}

/**
 * Sujeto genérico (cabeza + hombros), animado por transformación en vez de
 * por geometría: la cabeza y el cuerpo se dibujan una sola vez en
 * coordenadas locales fijas dentro de un `<G>`, y lo único que cambia por
 * fotograma es la matriz de transformación de ese grupo (traslación +
 * escala). Recalcular `cx`/`cy`/`r` de dos formas por fotograma (como en la
 * primera versión) es más caro que mover una transformación ya hecha — con
 * 14 tarjetas a la vez se notaba.
 */
function AnimatedPersonMark({
  cx,
  cy,
  scale,
  color,
}: {
  cx: SharedValue<number>;
  cy: SharedValue<number>;
  scale: SharedValue<number>;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    transform: [
      { translateX: cx.value },
      { translateY: cy.value },
      { scale: scale.value },
    ],
  }));

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle cx={0} cy={-6} r={3} fill={color} />
      <Ellipse cx={0} cy={0} rx={5} ry={4.5} fill={color} />
    </AnimatedG>
  );
}

/** Versión sin animar, para las marcas fijas de `patron`. */
function PersonMark({
  cx,
  cy,
  scale = 1,
  color,
}: {
  cx: number;
  cy: number;
  scale?: number;
  color: string;
}) {
  return (
    <G transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <Circle cx={0} cy={-6} r={3} fill={color} />
      <Ellipse cx={0} cy={0} rx={5} ry={4.5} fill={color} />
    </G>
  );
}

/** El sujeto que se desliza por `points` en bucle (modo `cycle`). */
function CyclingSubject({
  points,
  width,
  height,
  color,
  active,
}: {
  points: SubjectPoint[];
  width: number;
  height: number;
  color: string;
  active: boolean;
}) {
  const cx = useSharedValue(width * points[0]!.xf);
  const cy = useSharedValue(height * points[0]!.yf);
  const scale = useSharedValue(points[0]!.scale ?? 1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(cx);
      cancelAnimation(cy);
      cancelAnimation(scale);
      return;
    }
    cx.value = loopThrough(points.map(p => width * p.xf));
    cy.value = loopThrough(points.map(p => height * p.yf));
    scale.value = loopThrough(points.map(p => p.scale ?? 1));
    return () => {
      cancelAnimation(cx);
      cancelAnimation(cy);
      cancelAnimation(scale);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, height, active]);

  return <AnimatedPersonMark cx={cx} cy={cy} scale={scale} color={color} />;
}

/** El sujeto quieto que sólo respira de tamaño (modo `pulse`). */
function PulsingSubject({
  point,
  width,
  height,
  color,
  active,
}: {
  point: SubjectPoint;
  width: number;
  height: number;
  color: string;
  active: boolean;
}) {
  const cx = useSharedValue(width * point.xf);
  const cy = useSharedValue(height * point.yf);
  const scale = useSharedValue(point.scale ?? 1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      return;
    }
    const base = point.scale ?? 1;
    scale.value = withRepeat(
      withSequence(
        withTiming(base * 1.12, {
          duration: 850,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(base, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point, width, height, active]);

  return <AnimatedPersonMark cx={cx} cy={cy} scale={scale} color={color} />;
}

/** El sol de la guía horizontal: un círculo que respira de tamaño, por transformación. */
function PulsingSun({
  cx,
  cy,
  radius,
  color,
  active,
}: {
  cx: number;
  cy: number;
  radius: number;
  color: string;
  active: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!active) {
      cancelAnimation(scale);
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const animatedProps = useAnimatedProps(() => ({
    transform: [{ translateX: cx }, { translateY: cy }, { scale: scale.value }],
  }));

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle cx={0} cy={0} r={radius} fill={color} />
    </AnimatedG>
  );
}

/**
 * Silueta de sujeto sobre el diagrama de una guía, para que el tutorial de
 * Ajustes no sólo muestre las líneas sino dónde iría lo que fotografías.
 * Cuando una guía admite más de un encuadre válido, el sujeto se desliza
 * entre ellos en bucle en vez de quedarse fijo en uno solo.
 *
 * Sólo dibujo, sin interacción — encaja encima de `GuideOverlay` en el
 * mismo tile.
 */
export const GuideSubjectHint = memo(function GuideSubjectHintBase({
  kind,
  width,
  height,
  active,
}: GuideSubjectHintProps) {
  const theme = useTheme();
  // Memoizado a propósito: `config.points`/`config.point` van como
  // dependencia del `useEffect` que arranca la animación en los hijos — sin
  // esto, cada objeto/array nuevo en cada render (aunque el contenido fuera
  // igual) reiniciaba la animación desde el principio, y con eso
  // reiniciándose todo el rato nunca se sentía fluida.
  const config = useMemo(() => subjectConfig(kind), [kind]);
  const insets = useMemo(
    () => negativeSpaceInsets(width, height),
    [width, height],
  );
  const frame = useMemo(() => centerFrame(width, height), [width, height]);

  if (width <= 0 || height <= 0) {
    return null;
  }

  if (kind === 'horizontal') {
    // Una franja de suelo con un par de picos apoyados justo sobre la línea
    // inferior de tercios — deja claro que esa línea es "donde va el
    // horizonte" — y un sol en el cielo que respira de tamaño.
    const [, horizon] = gridFractions('tercios');
    const horizonY = height * horizon;
    const path = [
      `M 0 ${horizonY}`,
      `L ${width * 0.2} ${horizonY - height * 0.18}`,
      `L ${width * 0.38} ${horizonY}`,
      `L ${width * 0.58} ${horizonY - height * 0.25}`,
      `L ${width * 0.78} ${horizonY}`,
      `L ${width} ${horizonY - height * 0.1}`,
      `L ${width} ${height}`,
      `L 0 ${height}`,
      'Z',
    ].join(' ');

    return (
      <Svg width={width} height={height}>
        <Path d={path} fill={theme.hud.accent} opacity={0.22} />
        <PulsingSun
          cx={width * 0.74}
          cy={horizonY - height * 0.32}
          radius={Math.min(width, height) * 0.07}
          color={theme.hud.accent}
          active={active}
        />
      </Svg>
    );
  }

  if (config.mode === 'none') {
    return null;
  }

  return (
    <Svg width={width} height={height}>
      {kind === 'aire' ? (
        <Rect
          x={insets.left}
          y={insets.top}
          width={width - insets.left * 2}
          height={height - insets.top * 2}
          fill={theme.hud.accent}
          opacity={0.06}
        />
      ) : null}
      {kind === 'centro' ? (
        <Rect
          x={frame.x}
          y={frame.y}
          width={frame.width}
          height={frame.height}
          fill={theme.hud.accent}
          opacity={0.1}
        />
      ) : null}

      {config.mode === 'static'
        ? config.points.map(point => (
            <PersonMark
              key={`${point.xf}-${point.yf}`}
              cx={width * point.xf}
              cy={height * point.yf}
              scale={point.scale}
              color={theme.hud.accent}
            />
          ))
        : null}
      {config.mode === 'cycle' ? (
        <CyclingSubject
          points={config.points}
          width={width}
          height={height}
          color={theme.hud.accent}
          active={active}
        />
      ) : null}
      {config.mode === 'pulse' ? (
        <PulsingSubject
          point={config.point}
          width={width}
          height={height}
          color={theme.hud.accent}
          active={active}
        />
      ) : null}
    </Svg>
  );
});

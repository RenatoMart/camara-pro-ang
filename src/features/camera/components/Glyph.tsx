import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

export type GlyphName =
  | 'ajustes'
  | 'rayo'
  | 'rayoOff'
  | 'temporizador'
  | 'voltear'
  | 'fantasma'
  | 'nivel'
  | 'galeria'
  | 'cerrar'
  | 'check';

export type GlyphProps = {
  name: GlyphName;
  /** Color ya resuelto desde el tema (nunca un hex escrito a mano). */
  color: string;
  size?: number;
};

const STROKE = 1.8;

/**
 * Glifos del HUD dibujados a mano con react-native-svg.
 *
 * Trazo geométrico de 1.8px sin rellenos, acorde con la estética de
 * instrumento de precisión del visor. Añade aquí antes que instalar una
 * librería de iconos completa.
 */
export function Glyph({ name, color, size = 20 }: GlyphProps) {
  const common = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'ajustes' ? (
        <>
          <Line x1={4} y1={8} x2={20} y2={8} {...common} />
          <Line x1={4} y1={16} x2={20} y2={16} {...common} />
          <Circle cx={9} cy={8} r={2.4} {...common} fill={color} />
          <Circle cx={15} cy={16} r={2.4} {...common} fill={color} />
        </>
      ) : null}

      {name === 'rayo' ? (
        <Path d="M13 2 L5 14 H11 L9 22 L19 9 H12 Z" {...common} />
      ) : null}

      {name === 'rayoOff' ? (
        <>
          <Path d="M13 2 L5 14 H11 L9 22 L19 9 H12 Z" {...common} />
          <Line x1={4} y1={4} x2={20} y2={20} {...common} />
        </>
      ) : null}

      {name === 'temporizador' ? (
        <>
          <Circle cx={12} cy={13} r={8} {...common} />
          <Line x1={12} y1={13} x2={12} y2={8} {...common} />
          <Line x1={9} y1={2} x2={15} y2={2} {...common} />
        </>
      ) : null}

      {name === 'voltear' ? (
        <>
          <Path d="M20 12 A 8 8 0 1 1 17.7 6.3" {...common} />
          <Path d="M21 3 L21 8 L16 8" {...common} />
        </>
      ) : null}

      {name === 'fantasma' ? (
        <>
          <Path
            d="M5 21 V11 a7 7 0 0 1 14 0 V21 l-2.3-2 -2.4 2 -2.3-2 -2.3 2 -2.4-2 Z"
            {...common}
          />
          <Circle cx={9.5} cy={11} r={1} fill={color} stroke="none" />
          <Circle cx={14.5} cy={11} r={1} fill={color} stroke="none" />
        </>
      ) : null}

      {name === 'nivel' ? (
        <>
          <Line x1={2} y1={12} x2={8} y2={12} {...common} />
          <Line x1={16} y1={12} x2={22} y2={12} {...common} />
          <Circle cx={12} cy={12} r={3.2} {...common} />
        </>
      ) : null}

      {name === 'galeria' ? (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={2} {...common} />
          <Circle cx={9} cy={9.5} r={1.4} fill={color} stroke="none" />
          <Path d="M4 18 l5-5 4 4 3-3 4 4" {...common} />
        </>
      ) : null}

      {name === 'cerrar' ? (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...common} />
          <Line x1={18} y1={6} x2={6} y2={18} {...common} />
        </>
      ) : null}

      {name === 'check' ? <Path d="M5 13 l4 4 L19 7" {...common} /> : null}
    </Svg>
  );
}

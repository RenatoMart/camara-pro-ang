import React, { memo, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { GuideOverlay } from '@/features/camera/components/overlays/GuideOverlay';
import { GUIDES, type GuideKind } from '@/features/camera/constants/guides';
import { makeStyles, useTheme } from '@/theme';

import { GuideSubjectHint } from './GuideSubjectHint';

/** Tamaño del diagrama: proporción de visor en vertical, pequeño a propósito. */
const TILE_WIDTH = 84;
const TILE_HEIGHT = 112;

/**
 * Una frase por guía: qué forma dibuja y para qué escena sirve. `ninguna`
 * no aparece en la lista (no hay nada que explicar), pero se tipa completa
 * para que el mapa no dependa de mantenerlo sincronizado a mano con
 * `GUIDES`.
 */
const DESCRIPTIONS: Record<GuideKind, string> = {
  ninguna: 'Visor limpio, sin ninguna guía dibujada.',
  tercios:
    'La composición clásica: el sujeto va sobre las líneas o sus cruces, no en el centro.',
  phi: 'Como los tercios, pero con la proporción áurea — las líneas quedan un poco más cerca del centro.',
  cuadricula: 'Rejilla más densa, útil para alinear varios elementos a la vez.',
  espiral:
    'Lleva la mirada en espiral hacia el sujeto — va bien con formas que ya giran: escaleras, conchas, remolinos.',
  triangulos:
    'Reparte el encuadre en triángulos desde una esquina — para diagonales fuertes.',
  cruz: 'Centra el sujeto en la cruz — simetrías, retratos de frente, tomas cenitales.',
  vertical:
    'Dos líneas verticales, para alinear elementos de pie: árboles, columnas, personas.',
  horizontal:
    'Dos líneas horizontales, para alinear el horizonte o capas: cielo, tierra, agua.',
  diagonal:
    'Las dos diagonales del encuadre — para líneas que atraviesan la imagen en ángulo.',
  curva:
    'Una curva en S — caminos, ríos o costas que serpentean por la imagen.',
  centro: 'Marco del tercio central, para composiciones centradas a propósito.',
  patron: 'Rejilla fina, para encuadrar patrones o texturas repetidas.',
  fuga: 'Líneas que convergen al centro — pasillos, carreteras o vías que se alejan.',
  aire: 'El margen que conviene dejar vacío alrededor del sujeto, para que "respire" en el encuadre.',
};

/**
 * Mini tutorial de las guías de composición: una tira oscura (como el
 * visor) por guía, con el mismo dibujo que se ve en la cámara más una
 * silueta de dónde iría el sujeto (`GuideSubjectHint`), y una frase de qué
 * es y cuándo usarla.
 *
 * El sujeto se queda quieto en su primer punto por defecto; sólo se anima
 * al tocar esa tarjeta, y nunca hay más de una animando a la vez (tocar
 * otra apaga la anterior). Antes las 14 corrían siempre en bucle — con
 * tantas a la vez, aunque cada una es barata, se sentía lento en conjunto.
 *
 * Reutiliza `GuideOverlay` tal cual — nada de imágenes ni capturas de
 * pantalla que mantener: el diagrama es el mismo trazo vectorial que ya se
 * dibuja en el visor, así que nunca se desincroniza si una guía cambia.
 */
export type GuideTutorialProps = {
  /**
   * Si la pantalla de Ajustes está en foco — los tabs no la desmontan al
   * cambiar de pestaña, así que sin esto la tarjeta tocada seguía animando
   * en segundo plano incluso con la Cámara en pantalla.
   */
  active: boolean;
};

export const GuideTutorial = memo(function GuideTutorialBase({
  active,
}: GuideTutorialProps) {
  const styles = useStyles();
  const theme = useTheme();
  const guides = GUIDES.filter(guide => guide.kind !== 'ninguna');

  // Sólo una tarjeta anima a la vez: tocar otra apaga la anterior en vez de
  // sumarse a ella.
  const [selectedKind, setSelectedKind] = useState<GuideKind | null>(null);
  const onSelect = useCallback((kind: GuideKind) => {
    setSelectedKind(current => (current === kind ? null : kind));
  }, []);

  return (
    <View style={styles.list}>
      <Text variant="caption" color="textSecondary">
        Toca una tarjeta para ver el ejemplo en movimiento.
      </Text>
      {guides.map(guide => {
        const isSelected = guide.kind === selectedKind;
        return (
          <Pressable
            key={guide.kind}
            style={styles.row}
            onPress={() => onSelect(guide.kind)}
            accessibilityRole="button"
            accessibilityLabel={`Ver ejemplo animado de ${guide.label}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View
              style={[
                styles.tile,
                { backgroundColor: theme.hud.background },
                isSelected ? { borderColor: theme.hud.accent } : null,
              ]}
            >
              <GuideOverlay
                kind={guide.kind}
                width={TILE_WIDTH}
                height={TILE_HEIGHT}
              />
              <View style={StyleSheet.absoluteFill}>
                <GuideSubjectHint
                  kind={guide.kind}
                  width={TILE_WIDTH}
                  height={TILE_HEIGHT}
                  active={active ? isSelected : false}
                />
              </View>
            </View>
            <View style={styles.text}>
              <Text variant="bodyStrong">{guide.label}</Text>
              <Text variant="caption" color="textSecondary">
                {DESCRIPTIONS[guide.kind]}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  list: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  tile: {
    width: TILE_WIDTH,
    height: TILE_HEIGHT,
    borderRadius: theme.radius.md,
    ...theme.roundedCorner,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  text: {
    flex: 1,
    gap: theme.spacing.xxs,
  },
}));

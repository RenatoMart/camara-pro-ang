import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import React, { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useCameraStore } from '@/store/cameraStore';
import { makeStyles, useTheme } from '@/theme';

import { GUIDES } from '../../constants/guides';
import { useGhost } from '../../hooks/useGhost';
import { HudChip } from '../controls/HudChip';
import { HudLabeledButton } from '../controls/HudLabeledButton';

/**
 * Bandeja de herramientas del modo PRO.
 *
 * Se despliega sobre la tira de modos al elegir «Pro» y reúne lo que
 * distingue a esta cámara: las guías de composición (con su modo automático),
 * el nivel, el disparo al nivelar, el fantasma y el zoom fino.
 *
 * El formato y el temporizador no están aquí: viven en la barra superior,
 * donde se esperan en cualquier cámara y siguen a mano fuera del modo PRO.
 */
export const ProPanel = memo(function ProPanelBase() {
  const theme = useTheme();
  const styles = useStyles();

  const guide = useCameraStore(state => state.guide);
  const setGuide = useCameraStore(state => state.setGuide);
  const guideMode = useCameraStore(state => state.guideMode);
  const toggleGuideMode = useCameraStore(state => state.toggleGuideMode);
  const suggestedGuide = useCameraStore(state => state.suggestedGuide);
  const levelOn = useCameraStore(state => state.levelOn);
  const toggleLevel = useCameraStore(state => state.toggleLevel);
  const autoShutter = useCameraStore(state => state.autoShutter);
  const toggleAutoShutter = useCameraStore(state => state.toggleAutoShutter);
  const zoom = useCameraStore(state => state.zoom);
  const setZoom = useCameraStore(state => state.setZoom);
  const ghostUri = useCameraStore(state => state.ghostUri);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const setGhostOpacity = useCameraStore(state => state.setGhostOpacity);
  const ghostBurn = useCameraStore(state => state.ghostBurn);
  const toggleGhostBurn = useCameraStore(state => state.toggleGhostBurn);

  const ghost = useGhost();
  const navigation = useNavigation();

  // Elegir a mano qué foto se superpone: la galería se abre en modo
  // selección y vuelve sola al tocar una.
  const elegirFantasma = useCallback(() => {
    navigation.navigate('Galeria', { modo: 'fantasma' });
  }, [navigation]);

  return (
    <View style={styles.panel}>
      {/* Tira de guías: la fila principal del modo PRO — texto suelto, sin
          caja, igual que la tira de modos de abajo. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.guideRow}
      >
        <HudChip
          variant="plain"
          label="Auto"
          active={guideMode === 'auto'}
          onPress={toggleGuideMode}
          accessibilityLabel="Que el asistente elija la guía según la escena"
        />
        {GUIDES.map(option => (
          <HudChip
            key={option.kind}
            variant="plain"
            label={option.label}
            // En automático se resalta la que propone el asistente, no la
            // guardada: así se ve qué está haciendo sin perder tu elección.
            active={
              guideMode === 'auto'
                ? suggestedGuide === option.kind
                : guide === option.kind
            }
            onPress={() => setGuide(option.kind)}
          />
        ))}
      </ScrollView>

      <Text variant="monoXs" style={styles.hint}>
        {guideMode === 'auto'
          ? 'El asistente elige la guía; toca una para volver a manual.'
          : 'Tú eliges la guía.'}
      </Text>

      {/* Cada herramienta lleva su nombre: un icono suelto no dice lo que
          hace, y el del disparo automático llegaba a disparar solo sin que se
          supiera de dónde salían las fotos. */}
      <View style={styles.toolsRow}>
        <HudLabeledButton
          icon="nivel"
          label="Nivel"
          active={levelOn}
          onPress={toggleLevel}
          accessibilityLabel="Nivel de horizonte"
        />
        <HudLabeledButton
          icon="check"
          label="Auto"
          active={autoShutter}
          onPress={toggleAutoShutter}
          accessibilityLabel="Disparo automático al nivelar el horizonte"
        />
        <HudLabeledButton
          icon="fantasma"
          label="Fantasma"
          active={ghost.active}
          disabled={ghost.busy}
          onPress={ghost.toggle}
          accessibilityLabel="Superponer una foto anterior sobre el visor"
        />
        <HudLabeledButton
          icon="galeria"
          label="Elegir"
          onPress={elegirFantasma}
          accessibilityLabel="Elegir de la galería qué foto se superpone"
        />
      </View>

      {autoShutter ? (
        <Text variant="monoXs" style={styles.aviso}>
          Disparo automático: la cámara tomará una foto sola cada vez que
          niveles el horizonte.
        </Text>
      ) : null}

      {ghost.aviso !== null ? (
        <Text variant="monoXs" style={styles.aviso}>
          {ghost.aviso}
        </Text>
      ) : null}

      {ghostUri !== null ? (
        <>
          <View style={styles.sliderRow}>
            <Text variant="monoXs" style={styles.sliderLabel}>
              OPACIDAD
            </Text>
            <Slider
              style={styles.slider}
              value={ghostOpacity}
              onValueChange={setGhostOpacity}
              minimumValue={0.1}
              maximumValue={0.9}
              minimumTrackTintColor={theme.hud.accent}
              maximumTrackTintColor={theme.hud.chip}
              thumbTintColor={theme.hud.accent}
            />
            <HudChip
              variant="plain"
              label="Fundir"
              icon="fantasma"
              active={ghostBurn}
              onPress={toggleGhostBurn}
              accessibilityLabel={
                ghostBurn
                  ? 'La foto se guardará con el fantasma fundido'
                  : 'El fantasma es sólo guía: la foto se guardará limpia'
              }
            />
          </View>

          <Text variant="monoXs" style={styles.hint}>
            {ghostBurn
              ? 'La foto se guardará con el fantasma fundido encima.'
              : 'El fantasma sólo sirve de guía; la foto sale limpia.'}
          </Text>
        </>
      ) : null}

      <View style={styles.sliderRow}>
        <Text variant="monoXs" style={styles.sliderLabel}>
          ZOOM
        </Text>
        <Slider
          style={styles.slider}
          value={zoom}
          onValueChange={setZoom}
          minimumValue={0}
          maximumValue={1}
          minimumTrackTintColor={theme.hud.accent}
          maximumTrackTintColor={theme.hud.chip}
          thumbTintColor={theme.hud.accent}
        />
      </View>

      <View style={styles.divider} />
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  panel: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  guideRow: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  sliderLabel: {
    color: theme.hud.textDim,
    letterSpacing: 1.2,
    width: 64,
  },
  hint: {
    color: theme.hud.textDim,
    paddingHorizontal: theme.spacing.lg,
  },
  // Los avisos van en ámbar: no son un fallo, pero conviene leerlos.
  aviso: {
    color: theme.hud.accent,
    paddingHorizontal: theme.spacing.lg,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  // Separa las herramientas PRO de la tira de modos que queda debajo.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.hud.glassBorder,
  },
}));

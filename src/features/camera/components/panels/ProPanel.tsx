import Slider from '@react-native-community/slider';
import React, { memo, useCallback } from 'react';
import { ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useCameraStore } from '@/store/cameraStore';
import { makeStyles, useTheme } from '@/theme';

import { ASPECTS, GUIDES, TIMERS } from '../../constants/guides';
import { HudChip } from '../controls/HudChip';

/**
 * Bandeja de herramientas PRO.
 *
 * Se despliega sobre la barra inferior cuando el modo PRO está activo:
 * guías de composición, formato, temporizador, nivel, disparo automático,
 * fantasma y zoom. Cada fila scrollea en horizontal para no comprimir chips.
 */
export const ProPanel = memo(function ProPanelBase() {
  const theme = useTheme();
  const styles = useStyles();

  const guide = useCameraStore(state => state.guide);
  const setGuide = useCameraStore(state => state.setGuide);
  const aspect = useCameraStore(state => state.aspect);
  const setAspect = useCameraStore(state => state.setAspect);
  const timer = useCameraStore(state => state.timer);
  const setTimer = useCameraStore(state => state.setTimer);
  const levelOn = useCameraStore(state => state.levelOn);
  const toggleLevel = useCameraStore(state => state.toggleLevel);
  const autoShutter = useCameraStore(state => state.autoShutter);
  const toggleAutoShutter = useCameraStore(state => state.toggleAutoShutter);
  const zoom = useCameraStore(state => state.zoom);
  const setZoom = useCameraStore(state => state.setZoom);
  const ghostUri = useCameraStore(state => state.ghostUri);
  const setGhost = useCameraStore(state => state.setGhost);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const setGhostOpacity = useCameraStore(state => state.setGhostOpacity);
  const ghostBurn = useCameraStore(state => state.ghostBurn);
  const toggleGhostBurn = useCameraStore(state => state.toggleGhostBurn);
  const lastPhotoUri = useCameraStore(state => state.lastPhotoUri);

  // Sin foto que superponer, el chip fantasma no tiene nada que activar.
  const ghostDisabled = ghostUri === null && lastPhotoUri === null;

  const toggleGhost = useCallback(() => {
    if (ghostUri) {
      setGhost(null);
      return;
    }
    if (lastPhotoUri) {
      setGhost(lastPhotoUri);
    }
  }, [ghostUri, lastPhotoUri, setGhost]);

  return (
    <View style={styles.panel}>
      <Text variant="monoXs" style={styles.sectionLabel}>
        GUÍA
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {GUIDES.map(option => (
          <HudChip
            key={option.kind}
            label={option.label}
            active={guide === option.kind}
            onPress={() => setGuide(option.kind)}
          />
        ))}
      </ScrollView>

      <Text variant="monoXs" style={styles.sectionLabel}>
        FORMATO
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {ASPECTS.map(option => (
          <HudChip
            key={option.kind}
            label={option.label}
            active={aspect === option.kind}
            onPress={() => setAspect(option.kind)}
          />
        ))}
      </ScrollView>

      <Text variant="monoXs" style={styles.sectionLabel}>
        HERRAMIENTAS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <HudChip
          label="Nivel"
          icon="nivel"
          active={levelOn}
          onPress={toggleLevel}
        />
        <HudChip
          label="Auto-disparo"
          icon="check"
          active={autoShutter}
          onPress={toggleAutoShutter}
          accessibilityLabel="Disparo automático al nivelar"
        />
        <HudChip
          label="Fantasma"
          icon="fantasma"
          active={ghostUri !== null}
          disabled={ghostDisabled}
          onPress={toggleGhost}
          accessibilityLabel="Superposición fantasma de la última foto"
        />
        {TIMERS.map(option => (
          <HudChip
            key={option.kind}
            label={option.label}
            icon="temporizador"
            active={timer === option.kind}
            onPress={() => setTimer(option.kind)}
            accessibilityLabel={`Temporizador ${option.label}`}
          />
        ))}
      </ScrollView>

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
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            <HudChip
              label="Fundir en la foto"
              icon="fantasma"
              active={ghostBurn}
              onPress={toggleGhostBurn}
              accessibilityLabel={
                ghostBurn
                  ? 'La foto se guardará con el fantasma fundido'
                  : 'El fantasma es sólo guía: la foto se guardará limpia'
              }
            />
          </ScrollView>

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
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  panel: {
    backgroundColor: theme.hud.glass,
    borderTopWidth: 1,
    borderColor: theme.hud.glassBorder,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    color: theme.hud.textDim,
    letterSpacing: 1.2,
    paddingHorizontal: theme.spacing.lg,
  },
  row: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
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
  slider: {
    flex: 1,
    height: 32,
  },
}));

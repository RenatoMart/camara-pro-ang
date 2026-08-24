import React, { memo, useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useCameraStore } from '@/store/cameraStore';
import { makeStyles } from '@/theme';

import {
  ASPECTS,
  FLASH_MODES,
  HDR_MODES,
  TIMERS,
  type AspectKind,
  type FlashKind,
  type HdrKind,
  type TimerKind,
} from '../../constants/guides';

import { HudLabeledButton } from './HudLabeledButton';
import { HudMenu } from './HudMenu';

/** Qué desplegable está abierto, si es que hay alguno. */
type OpenMenu = 'aspecto' | 'temporizador' | null;

const NEXT_FLASH: Record<FlashKind, FlashKind> = {
  off: 'auto',
  auto: 'on',
  on: 'off',
};

const NEXT_HDR: Record<HdrKind, HdrKind> = {
  off: 'auto',
  auto: 'on',
  on: 'off',
};

export type CameraTopBarProps = {
  onOpenSettings: () => void;
};

/**
 * Barra de ajustes rápidos sobre el visor.
 *
 * La fila de toda la vida de una cámara de teléfono: flash, HDR, relación de
 * aspecto, temporizador y configuración. Los ajustes de dos o tres estados
 * (flash, HDR) rotan al tocarlos; los que tienen más opciones despliegan un
 * menú pequeño justo debajo, y sólo uno puede estar abierto a la vez.
 */
export const CameraTopBar = memo(function CameraTopBarBase({
  onOpenSettings,
}: CameraTopBarProps) {
  const styles = useStyles();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  const flash = useCameraStore(state => state.flash);
  const setFlash = useCameraStore(state => state.setFlash);
  const hdr = useCameraStore(state => state.hdr);
  const setHdr = useCameraStore(state => state.setHdr);
  const aspect = useCameraStore(state => state.aspect);
  const setAspect = useCameraStore(state => state.setAspect);
  const timer = useCameraStore(state => state.timer);
  const setTimer = useCameraStore(state => state.setTimer);

  const flashLabel =
    FLASH_MODES.find(option => option.kind === flash)?.label ?? 'Off';
  const hdrLabel =
    HDR_MODES.find(option => option.kind === hdr)?.label ?? 'Off';
  const aspectOption = ASPECTS.find(option => option.kind === aspect);
  const timerLabel =
    TIMERS.find(option => option.kind === timer)?.label ?? 'Sin';

  const aspectOptions = useMemo(
    () => ASPECTS.map(option => ({ value: option.kind, label: option.label })),
    [],
  );
  const timerOptions = useMemo(
    () => TIMERS.map(option => ({ value: option.kind, label: option.label })),
    [],
  );

  const cycleFlash = useCallback(() => {
    setFlash(NEXT_FLASH[flash]);
  }, [flash, setFlash]);

  const cycleHdr = useCallback(() => {
    setHdr(NEXT_HDR[hdr]);
  }, [hdr, setHdr]);

  const toggleAspectMenu = useCallback(() => {
    setOpenMenu(current => (current === 'aspecto' ? null : 'aspecto'));
  }, []);

  const toggleTimerMenu = useCallback(() => {
    setOpenMenu(current =>
      current === 'temporizador' ? null : 'temporizador',
    );
  }, []);

  // Elegir cierra el menú: un desplegable que se queda abierto tapa el visor.
  const chooseAspect = useCallback(
    (value: AspectKind) => {
      setAspect(value);
      setOpenMenu(null);
    },
    [setAspect],
  );

  const chooseTimer = useCallback(
    (value: TimerKind) => {
      setTimer(value);
      setOpenMenu(null);
    },
    [setTimer],
  );

  const openSettings = useCallback(() => {
    setOpenMenu(null);
    onOpenSettings();
  }, [onOpenSettings]);

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <HudLabeledButton
          icon={flash === 'off' ? 'rayoOff' : 'rayo'}
          label={flashLabel}
          active={flash !== 'off'}
          onPress={cycleFlash}
          accessibilityLabel={`Flash: ${flashLabel}`}
        />
        <HudLabeledButton
          icon="hdr"
          label={hdrLabel}
          active={hdr !== 'off'}
          onPress={cycleHdr}
          accessibilityLabel={`HDR: ${hdrLabel}`}
        />
        <HudLabeledButton
          icon="aspecto"
          label={aspectOption?.short ?? 'Todo'}
          active={aspect !== 'sensor'}
          expanded={openMenu === 'aspecto'}
          onPress={toggleAspectMenu}
          accessibilityLabel={`Relación de aspecto: ${
            aspectOption?.label ?? 'Completo'
          }`}
        />
        <HudLabeledButton
          icon="temporizador"
          label={timerLabel}
          active={timer > 0}
          expanded={openMenu === 'temporizador'}
          onPress={toggleTimerMenu}
          accessibilityLabel={`Temporizador: ${timerLabel}`}
        />
        <HudLabeledButton
          icon="engranaje"
          label="Ajustes"
          onPress={openSettings}
          accessibilityLabel="Abrir la configuración"
        />
      </View>

      {openMenu === 'aspecto' ? (
        <HudMenu
          options={aspectOptions}
          value={aspect}
          onSelect={chooseAspect}
          accessibilityLabel="Relación de aspecto"
        />
      ) : null}

      {openMenu === 'temporizador' ? (
        <HudMenu
          options={timerOptions}
          value={timer}
          onSelect={chooseTimer}
          accessibilityLabel="Temporizador"
        />
      ) : null}
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  container: {
    gap: theme.spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
}));

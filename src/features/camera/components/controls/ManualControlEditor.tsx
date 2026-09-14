import React, { memo, useMemo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme';

import {
  FRIENDLY_EV_RANGE,
  MANUAL_CONTROLS,
  type ManualControlKind,
} from '../../constants/manualControls';

import { TickSlider } from './TickSlider';

export type ManualControlEditorProps = {
  kind: ManualControlKind;
  /** Siempre -4..+4: ver `FRIENDLY_EV_RANGE` para el porqué. */
  ev: number;
  onEvChange: (value: number) => void;
  /** ƒ fija del sensor, para el rótulo de `f`; `null` si aún no se sabe. */
  lensAperture: number | null;
};

/** Formato del EV: siempre con signo, incluido el cero. */
function formatEv(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/**
 * Sustituye a la tira de modos mientras se ajusta un control manual: la
 * regla de rayitas para moverlo, y el círculo «A» cuando el control tiene un
 * estado automático (todos menos EV, que no lo tiene — es un desplazamiento,
 * no un modo).
 */
export const ManualControlEditor = memo(function ManualControlEditorBase({
  kind,
  ev,
  onEvChange,
  lensAperture,
}: ManualControlEditorProps) {
  const theme = useTheme();
  const styles = useStyles();

  const control = MANUAL_CONTROLS.find(option => option.kind === kind);

  const decorativeLabel = useMemo(() => {
    if (kind === 'f') {
      return lensAperture != null ? `ƒ/${lensAperture.toFixed(1)}` : 'ƒ/—';
    }
    return 'AUTO';
  }, [kind, lensAperture]);

  return (
    <View style={styles.row}>
      {kind !== 'ev' ? (
        // Sin `onPress`: ya está siempre en automático y no hay a qué
        // cambiar — un círculo interactivo que no hace nada sería peor que
        // no ponerlo.
        <View
          style={[styles.autoCircle, styles.autoCircleActive]}
          accessibilityRole="text"
          accessibilityLabel={`${control?.label ?? kind}: automático`}
        >
          <Text variant="monoXs" style={{ color: theme.hud.onAccent }}>
            A
          </Text>
        </View>
      ) : null}

      <View style={styles.sliderArea}>
        {kind === 'ev' ? (
          <TickSlider
            min={FRIENDLY_EV_RANGE.min}
            max={FRIENDLY_EV_RANGE.max}
            step={1}
            value={ev}
            onChange={onEvChange}
            formatValue={formatEv}
          />
        ) : (
          <TickSlider
            min={0}
            max={1}
            step={1}
            value={0.5}
            disabled
            formatValue={() => decorativeLabel}
          />
        )}

        {control?.aviso !== undefined ? (
          <Text variant="monoXs" style={styles.aviso} align="center">
            {control.aviso}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  autoCircle: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
  },
  autoCircleActive: {
    backgroundColor: theme.hud.accent,
    borderColor: theme.hud.accent,
  },
  sliderArea: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  aviso: {
    color: theme.hud.textDim,
  },
}));

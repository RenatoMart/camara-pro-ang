import React, { memo, useCallback } from 'react';
import { ScrollView } from 'react-native';

import { makeStyles } from '@/theme';

import {
  MANUAL_CONTROLS,
  type ManualControlKind,
} from '../../constants/manualControls';
import type { GlyphName } from '../Glyph';

import { HudIconButton } from './HudIconButton';

export type ManualControlChipsProps = {
  /** Cuál está desplegado ahora mismo, o `null` si ninguno. */
  active: ManualControlKind | null;
  onSelect: (kind: ManualControlKind) => void;
};

/** Cada control se reconoce por su placa (EV/S/ISO/WB/ƒ), no por texto suelto. */
const ICONS: Record<ManualControlKind, GlyphName> = {
  ev: 'ev',
  s: 's',
  iso: 'iso',
  wb: 'wb',
  f: 'f',
};

/**
 * Fila de exposición manual: EV, velocidad, ISO, balance de blancos,
 * apertura — como en cualquier cámara con modo PRO. Sólo el icono, sin
 * valor al lado: el valor vivo se lee en la regla de ajuste, no aquí.
 *
 * Tocar uno despliega su regla en el sitio de la tira de modos
 * (`ManualControlEditor`); tocarlo de nuevo la cierra.
 */
export const ManualControlChips = memo(function ManualControlChipsBase({
  active,
  onSelect,
}: ManualControlChipsProps) {
  const styles = useStyles();

  const onPressChip = useCallback(
    (kind: ManualControlKind) => {
      onSelect(kind);
    },
    [onSelect],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {MANUAL_CONTROLS.map(control => (
        <HudIconButton
          key={control.kind}
          icon={ICONS[control.kind]}
          active={active === control.kind}
          onPress={() => onPressChip(control.kind)}
          accessibilityLabel={
            control.functional
              ? `Ajustar ${control.label}`
              : `${control.label}: ${control.aviso ?? 'no ajustable'}`
          }
        />
      ))}
    </ScrollView>
  );
});

const useStyles = makeStyles(theme => ({
  row: {
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
}));

import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme';

import {
  defaultIso,
  defaultShutterSeconds,
  formatIso,
  formatShutterSpeed,
  formatWhiteBalanceShift,
  FRIENDLY_EV_RANGE,
  ISO_REFERENCE,
  MANUAL_CONTROLS,
  SHUTTER_REFERENCE_SECONDS,
  STOP_STEP,
  stopsToValue,
  valueToStops,
  WHITE_BALANCE_SHIFT_RANGE,
  WHITE_BALANCE_SHIFT_STEP,
  type ExposureRange,
  type ManualControlKind,
  type WhiteBalanceGains,
} from '../../constants/manualControls';

import { TickSlider } from './TickSlider';

export type ManualControlEditorProps = {
  kind: ManualControlKind;
  /** Siempre -4..+4: ver `FRIENDLY_EV_RANGE` para el porqué. */
  ev: number;
  onEvChange: (value: number) => void;
  /** ƒ fija del sensor, para el rótulo de `f`; `null` si aún no se sabe. */
  lensAperture: number | null;
  /**
   * Rango real de ISO/velocidad del sensor, o `null` mientras no se conoce
   * o el sensor no admite exposición manual — en ese caso `s`/`iso` se ven
   * pero no hacen nada, como `f`.
   */
  exposureRange: ExposureRange | null;
  /** `null` mientras `s`/`iso` están en automático. */
  manualExposure: { iso: number; shutterSeconds: number } | null;
  /**
   * Lo que el automático está aplicando ahora mismo, leído al abrir la
   * pestaña — sólo se usa como punto de partida mientras `manualExposure`
   * es `null`, para que la regla no arranque en un valor inventado.
   */
  liveExposurePreview: { iso: number; shutterSeconds: number } | null;
  /** Alterna `s`/`iso` entre automático y manual (van juntos, ver el tipo). */
  onToggleManualExposure: () => void;
  onIsoChange: (iso: number) => void;
  onShutterChange: (shutterSeconds: number) => void;
  /** Si el sensor admite balance de blancos manual. */
  whiteBalanceSupported: boolean;
  /**
   * `null` mientras `wb` está en automático. `shift` es un ajuste
   * cálido/frío -4..+4 relativo a `baseGains` — no un Kelvin absoluto, ver
   * el porqué en `manualControls.ts`.
   */
  manualWhiteBalance: { shift: number; baseGains: WhiteBalanceGains } | null;
  onToggleManualWhiteBalance: () => void;
  onWhiteBalanceShiftChange: (shift: number) => void;
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
 *
 * `s`/`iso` comparten un solo círculo «A»: Camera2 los liga al mismo
 * `CONTROL_AE_MODE_OFF`, así que no existe un estado intermedio donde uno
 * esté en manual y el otro en automático.
 */
export const ManualControlEditor = memo(function ManualControlEditorBase({
  kind,
  ev,
  onEvChange,
  lensAperture,
  exposureRange,
  manualExposure,
  liveExposurePreview,
  onToggleManualExposure,
  onIsoChange,
  onShutterChange,
  whiteBalanceSupported,
  manualWhiteBalance,
  onToggleManualWhiteBalance,
  onWhiteBalanceShiftChange,
}: ManualControlEditorProps) {
  const theme = useTheme();
  const styles = useStyles();

  const control = MANUAL_CONTROLS.find(option => option.kind === kind);

  const isExposureKind = kind === 's' || kind === 'iso';
  const exposureSupported = exposureRange != null;
  const isExposureManual = manualExposure != null;
  const isWhiteBalanceManual = manualWhiteBalance != null;

  const onPressAuto = useCallback(() => {
    if (isExposureKind) {
      onToggleManualExposure();
    } else if (kind === 'wb') {
      onToggleManualWhiteBalance();
    }
  }, [
    isExposureKind,
    kind,
    onToggleManualExposure,
    onToggleManualWhiteBalance,
  ]);

  // Pasos (stops) en vez del valor real: `TickSlider` sólo sabe moverse en
  // línea recta, y sobre 1/4000s...30s o 50...6400 ISO eso dejaría casi todo
  // el rango útil aplastado contra un extremo — ver el porqué en
  // `manualControls.ts`.
  const isoStopsRange = useMemo(() => {
    if (exposureRange == null) {
      return null;
    }
    return {
      min: valueToStops(exposureRange.minIso, ISO_REFERENCE),
      max: valueToStops(exposureRange.maxIso, ISO_REFERENCE),
    };
  }, [exposureRange]);

  const shutterStopsRange = useMemo(() => {
    if (exposureRange == null) {
      return null;
    }
    return {
      min: valueToStops(
        exposureRange.minShutterSeconds,
        SHUTTER_REFERENCE_SECONDS,
      ),
      max: valueToStops(
        exposureRange.maxShutterSeconds,
        SHUTTER_REFERENCE_SECONDS,
      ),
    };
  }, [exposureRange]);

  // Manual > lectura en vivo del automático > valor por defecto: sólo se cae
  // al defecto si ni siquiera hay lectura todavía (sesión recién abierta).
  const currentIso =
    manualExposure?.iso ??
    liveExposurePreview?.iso ??
    (exposureRange != null ? defaultIso(exposureRange) : ISO_REFERENCE);
  const currentShutterSeconds =
    manualExposure?.shutterSeconds ??
    liveExposurePreview?.shutterSeconds ??
    (exposureRange != null
      ? defaultShutterSeconds(exposureRange)
      : SHUTTER_REFERENCE_SECONDS);
  // `0` es siempre el reposo correcto, en manual o en automático: es un
  // ajuste relativo a lo que hubiera en ese momento, no un valor absoluto
  // que necesite una lectura en vivo para no arrancar "mal".
  const currentWhiteBalanceShift = manualWhiteBalance?.shift ?? 0;

  const onIsoStopsChange = useCallback(
    (stops: number) => {
      onIsoChange(stopsToValue(stops, ISO_REFERENCE));
    },
    [onIsoChange],
  );
  const onShutterStopsChange = useCallback(
    (stops: number) => {
      onShutterChange(stopsToValue(stops, SHUTTER_REFERENCE_SECONDS));
    },
    [onShutterChange],
  );

  const decorativeLabel = useMemo(() => {
    if (kind === 'f') {
      return lensAperture != null ? `ƒ/${lensAperture.toFixed(1)}` : 'ƒ/—';
    }
    return 'AUTO';
  }, [kind, lensAperture]);

  const isAuto =
    kind === 'f' ||
    (isExposureKind && !isExposureManual) ||
    (kind === 'wb' && !isWhiteBalanceManual);
  const autoInteractive =
    (isExposureKind && exposureSupported) ||
    (kind === 'wb' && whiteBalanceSupported);

  return (
    <View style={styles.row}>
      {kind !== 'ev' ? (
        <Pressable
          disabled={!autoInteractive}
          onPress={onPressAuto}
          style={[styles.autoCircle, isAuto ? styles.autoCircleActive : null]}
          accessibilityRole={autoInteractive ? 'button' : 'text'}
          accessibilityLabel={
            autoInteractive
              ? `${control?.label ?? kind}: ${
                  isAuto
                    ? 'automático, toca para ajustar a mano'
                    : 'manual, toca para volver a automático'
                }`
              : `${control?.label ?? kind}: automático`
          }
        >
          <Text
            variant="monoXs"
            style={{ color: isAuto ? theme.hud.onAccent : theme.hud.text }}
          >
            A
          </Text>
        </Pressable>
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
        ) : kind === 'iso' && isoStopsRange != null ? (
          // Sin `disabled`/`onChange` atados a `isExposureManual`: tocar la
          // regla es lo que activa el manual (ver `onIsoChange`), no hace
          // falta pasar antes por el círculo «A».
          <TickSlider
            min={isoStopsRange.min}
            max={isoStopsRange.max}
            step={STOP_STEP}
            value={valueToStops(currentIso, ISO_REFERENCE)}
            onChange={onIsoStopsChange}
            formatValue={stops => formatIso(stopsToValue(stops, ISO_REFERENCE))}
          />
        ) : kind === 's' && shutterStopsRange != null ? (
          <TickSlider
            min={shutterStopsRange.min}
            max={shutterStopsRange.max}
            step={STOP_STEP}
            value={valueToStops(
              currentShutterSeconds,
              SHUTTER_REFERENCE_SECONDS,
            )}
            onChange={onShutterStopsChange}
            formatValue={stops =>
              formatShutterSpeed(stopsToValue(stops, SHUTTER_REFERENCE_SECONDS))
            }
          />
        ) : kind === 'wb' ? (
          <TickSlider
            min={WHITE_BALANCE_SHIFT_RANGE.min}
            max={WHITE_BALANCE_SHIFT_RANGE.max}
            step={WHITE_BALANCE_SHIFT_STEP}
            value={currentWhiteBalanceShift}
            onChange={
              whiteBalanceSupported ? onWhiteBalanceShiftChange : undefined
            }
            disabled={!whiteBalanceSupported}
            formatValue={formatWhiteBalanceShift}
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
        ) : isExposureKind && !exposureSupported ? (
          <Text variant="monoXs" style={styles.aviso} align="center">
            Este sensor no admite ISO/velocidad manuales.
          </Text>
        ) : kind === 'wb' && !whiteBalanceSupported ? (
          <Text variant="monoXs" style={styles.aviso} align="center">
            Este sensor no admite balance de blancos manual.
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

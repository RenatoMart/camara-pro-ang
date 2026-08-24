import React, { memo, useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useCameraStore } from '@/store/cameraStore';
import { HIT_SLOP, makeStyles, useTheme } from '@/theme';

import { CAMERA_MODES, type CameraMode } from '../../constants/modes';

/**
 * Tira de modos de disparo.
 *
 * Va justo encima del disparador, como en cualquier cámara de teléfono: los
 * nombres en fila, el activo en amarillo con un punto debajo, y el resto
 * apagados. Desliza horizontalmente cuando no caben todos.
 */
export const ModeSelector = memo(function ModeSelectorBase() {
  const styles = useStyles();
  const mode = useCameraStore(state => state.mode);
  const setMode = useCameraStore(state => state.setMode);

  const activeMode = CAMERA_MODES.find(option => option.kind === mode);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CAMERA_MODES.map(option => (
          <ModeItem
            key={option.kind}
            kind={option.kind}
            label={option.label}
            active={option.kind === mode}
            onSelect={setMode}
          />
        ))}
      </ScrollView>

      {/* Los modos aún sin implementar se pueden elegir, pero lo dicen. */}
      {activeMode !== undefined && activeMode.aviso !== undefined ? (
        <Text variant="monoXs" style={styles.aviso} align="center">
          {activeMode.aviso}
        </Text>
      ) : null}
    </View>
  );
});

type ModeItemProps = {
  kind: CameraMode;
  label: string;
  active: boolean;
  onSelect: (mode: CameraMode) => void;
};

/** Un nombre de la tira. Aparte para que el callback no se cree en el map. */
const ModeItem = memo(function ModeItemBase({
  kind,
  label,
  active,
  onSelect,
}: ModeItemProps) {
  const theme = useTheme();
  const styles = useStyles();

  const onPress = useCallback(() => {
    onSelect(kind);
  }, [kind, onSelect]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Modo ${label}`}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
    >
      <Text
        variant="monoXs"
        style={[
          styles.itemLabel,
          { color: active ? theme.hud.accent : theme.hud.textDim },
        ]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
      <View style={[styles.dot, active ? styles.dotActive : null]} />
    </Pressable>
  );
});

const useStyles = makeStyles(theme => ({
  row: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  item: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  itemLabel: {
    letterSpacing: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: theme.radius.full,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: theme.hud.accent,
  },
  pressed: {
    opacity: 0.6,
  },
  aviso: {
    color: theme.hud.textDim,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
  },
}));

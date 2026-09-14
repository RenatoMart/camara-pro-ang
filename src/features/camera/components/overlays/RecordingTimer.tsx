import React, { memo } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { makeStyles, useTheme } from '@/theme';

export type RecordingTimerProps = {
  seconds: number;
};

/** `95` → `"01:35"`; a partir de la hora, `"1:01:35"`. */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Cronómetro de grabación: punto rojo + tiempo transcurrido.
 *
 * Sólo se monta mientras se graba (lo decide `CameraScreen`), así que no
 * hace falta un `isRecording` propio: existir ya significa "grabando".
 */
export const RecordingTimer = memo(function RecordingTimerBase({
  seconds,
}: RecordingTimerProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.pill} accessibilityLabel="Grabando vídeo">
      <View style={styles.dot} />
      <Text variant="mono" style={{ color: theme.hud.text }}>
        {formatDuration(seconds)}
      </Text>
    </View>
  );
});

const useStyles = makeStyles(theme => ({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.hud.glass,
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.hud.recording,
  },
}));

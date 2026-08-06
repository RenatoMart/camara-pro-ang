import React, { useCallback } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import type { RootScreenProps } from '@/navigation/types';
import { useCameraStore } from '@/store/cameraStore';
import { makeStyles, useTheme } from '@/theme';

import { HudIconButton } from '../components/controls/HudIconButton';

/**
 * Visor de una foto a pantalla completa.
 *
 * Además de mirar, desde aquí se activa el modo fantasma: la foto queda
 * superpuesta al visor de la cámara para repetir su encuadre.
 */
export function PhotoViewerScreen({
  navigation,
  route,
}: RootScreenProps<'FotoDetalle'>) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const setGhost = useCameraStore(state => state.setGhost);

  const { uri } = route.params;

  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const useAsGhost = useCallback(() => {
    setGhost(uri);
    // Vuelve directo a la cámara para ver el fantasma en acción.
    navigation.navigate('Camara');
  }, [navigation, setGhost, uri]);

  return (
    <View style={styles.root}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />

      <View style={[styles.topBar, { top: insets.top + theme.spacing.sm }]}>
        <HudIconButton
          icon="cerrar"
          onPress={close}
          accessibilityLabel="Cerrar foto"
        />
      </View>

      <View
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + theme.spacing.lg },
        ]}
      >
        <Button label="Usar como fantasma" onPress={useAsGhost} />
      </View>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    backgroundColor: theme.hud.background,
  },
  topBar: {
    position: 'absolute',
    right: theme.spacing.lg,
  },
  actions: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: 0,
  },
}));

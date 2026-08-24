import { useIsFocused } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  usePhotoOutput,
  type CameraFrameOutput,
} from 'react-native-vision-camera';

import { Text } from '@/components/ui/Text';
import { useAppState } from '@/hooks/useAppState';
import { makeStyles } from '@/theme';
import { logger } from '@/utils/logger';

import type { FlashKind } from '../constants/guides';
import type { CameraHandle } from '../hooks/useCapture';

export type CameraViewportProps = {
  facing: 'back' | 'front';
  flash: FlashKind;
  /** Zoom normalizado 0..1. */
  zoom: number;
  cameraRef: React.MutableRefObject<CameraHandle | null>;
  /**
   * Output de frames del asistente de composición, o `null` en modo manual.
   *
   * Sólo se añade a la cámara cuando no es `null`: en manual la sesión ni
   * siquiera transmite frames al analizador, así que no hay coste alguno.
   */
  compositionFrameOutput?: CameraFrameOutput | null;
};

/** Zoom máximo aplicado al mapear el slider 0..1 a factor real. */
const MAX_ZOOM_FACTOR = 4;

/**
 * ¿El fallo viene de ajustar la cámara antes de que su sesión esté corriendo?
 *
 * VisionCamera aplica zoom, exposición y linterna en cuanto existe el
 * controlador, sin esperar a que la sesión abra, así que al montar el visor y
 * al volver de segundo plano esos ajustes se rechazan. El propio ajuste se
 * reintenta cuando la sesión abre, de modo que no hay nada que corregir: sólo
 * conviene no tratarlo como un error de verdad.
 */
function isSessionNotReadyError(error: Error): boolean {
  return /Camera is not active|OperationCanceled/i.test(error.message);
}

/**
 * El visor de cámara.
 *
 * Mientras el módulo nativo enumera las cámaras muestra un aviso en lugar de
 * montar `<Camera>`, que lanzaría si la lista aún está vacía.
 */
export const CameraViewport = memo(function CameraViewportBase({
  facing,
  flash,
  zoom,
  cameraRef,
  compositionFrameOutput,
}: CameraViewportProps) {
  // El sistema retira el acceso a la cámara cuando la app deja de estar en
  // primer plano; mantener la sesión abierta hace que Android la rechace con
  // «Camera is disabled, probably due to a device policy!» y que cualquier
  // ajuste posterior (zoom, flash) falle con «Camera is not active».
  // Por eso la sesión sigue al ciclo de vida de la app y al foco de la
  // pantalla: al volver, el visor se reengancha solo.
  const appState = useAppState();
  const isFocused = useIsFocused();
  const isActive = appState === 'active' && isFocused;

  // La lista de cámaras la publica un módulo nativo que tarda un instante en
  // estar lista, así que en los primeros renders todavía no hay ninguna.
  // Pasarle `device={facing}` a <Camera> lanzaría ahí mismo un
  // «This device does not have any "back" Cameras!»; `useCameraDevice`
  // devuelve `undefined` mientras tanto y se vuelve a renderizar al llegar.
  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput();
  const outputs = useMemo(
    () =>
      compositionFrameOutput != null
        ? [photoOutput, compositionFrameOutput]
        : [photoOutput],
    [photoOutput, compositionFrameOutput],
  );

  // Sin esto VisionCamera usa su manejador por defecto, que hace
  // `console.error` en lugar de pasar por el `logger` de la app.
  const handleError = useCallback((error: Error) => {
    if (isSessionNotReadyError(error)) {
      logger.debug('Ajuste de cámara descartado: la sesión aún no está lista');
      return;
    }
    logger.error('Fallo en la sesión de cámara', error);
  }, []);

  // El flash se decide en el momento del disparo (API de VisionCamera):
  // se guarda en un ref para que el adaptador lea siempre el valor vigente.
  const flashRef = useRef(flash);
  flashRef.current = flash;

  useEffect(() => {
    cameraRef.current = {
      takePictureAsync: async () => {
        const file = await photoOutput.capturePhotoToFile(
          { flashMode: flashRef.current },
          {},
        );
        return { uri: `file://${file.filePath}` };
      },
    };
    return () => {
      cameraRef.current = null;
    };
  }, [cameraRef, photoOutput]);

  if (device == null) {
    return <ViewportLoading />;
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      outputs={outputs}
      isActive={isActive}
      zoom={1 + zoom * (MAX_ZOOM_FACTOR - 1)}
      resizeMode="cover"
      // Por defecto VisionCamera usa `device`, que lee el sensor físico y
      // gira la salida aunque el teléfono tenga la rotación bloqueada: la app
      // acaba ignorando un ajuste del sistema que no le corresponde tocar.
      // Con `interface` la orientación sigue a la de la pantalla, así que el
      // bloqueo del usuario manda —y de paso no se registra el listener de
      // orientación del sensor.
      orientationSource="interface"
      onError={handleError}
    />
  );
});

/** Mientras el módulo nativo termina de enumerar las cámaras. */
function ViewportLoading() {
  const styles = useStyles();

  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Text variant="caption" style={styles.fallbackHint} align="center">
        Preparando la cámara…
      </Text>
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  fallback: {
    backgroundColor: theme.hud.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.xl,
  },
  fallbackHint: {
    color: theme.hud.textDim,
  },
}));

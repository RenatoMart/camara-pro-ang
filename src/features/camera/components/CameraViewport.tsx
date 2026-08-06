import { useIsFocused } from '@react-navigation/native';
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useAppState } from '@/hooks/useAppState';
import { makeStyles } from '@/theme';
import { logger } from '@/utils/logger';

import type { FlashKind } from '../constants/guides';
import type { CameraHandle } from '../hooks/useCapture';
import {
  getCameraModule,
  getVisionCameraModule,
} from '../services/nativeModules';

export type CameraViewportProps = {
  facing: 'back' | 'front';
  flash: FlashKind;
  /** Zoom normalizado 0..1. */
  zoom: number;
  cameraRef: React.MutableRefObject<CameraHandle | null>;
};

/** Props internas de cada backend: las públicas más el estado de la sesión. */
type ViewportProps = CameraViewportProps & { isActive: boolean };

// Carga única y protegida según el runtime (ver nativeModules.ts).
const expoCamera = getCameraModule();
const visionCamera = getVisionCameraModule();

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
 * El visor, con dos implementaciones intercambiables tras el mismo contrato:
 *
 * - `ExpoViewport` (expo-camera) cuando la app corre en Expo Go.
 * - `VisionViewport` (react-native-vision-camera) en la build nativa.
 *
 * Si ninguna cámara existe (p. ej. un simulador sin cámara), muestra un
 * aviso en lugar de crashear.
 */
export const CameraViewport = memo(function CameraViewportBase(
  props: CameraViewportProps,
) {
  // El sistema retira el acceso a la cámara cuando la app deja de estar en
  // primer plano; mantener la sesión abierta hace que Android la rechace con
  // «Camera is disabled, probably due to a device policy!» y que cualquier
  // ajuste posterior (zoom, flash) falle con «Camera is not active».
  // Por eso la sesión sigue al ciclo de vida de la app y al foco de la
  // pantalla: al volver, el visor se reengancha solo.
  const appState = useAppState();
  const isFocused = useIsFocused();
  const isActive = appState === 'active' && isFocused;

  if (expoCamera) {
    return <ExpoViewport {...props} isActive={isActive} />;
  }
  if (visionCamera) {
    return <VisionViewport {...props} isActive={isActive} />;
  }
  return <ViewportFallback />;
});

function ExpoViewport({
  facing,
  flash,
  zoom,
  cameraRef,
  isActive,
}: ViewportProps) {
  const { CameraView } = expoCamera!;

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing={facing}
      flash={flash}
      zoom={zoom}
      active={isActive}
      animateShutter={false}
      ref={instance => {
        cameraRef.current = instance;
      }}
    />
  );
}

function VisionViewport({
  facing,
  flash,
  zoom,
  cameraRef,
  isActive,
}: ViewportProps) {
  const { Camera, usePhotoOutput, useCameraDevice } = visionCamera!;

  // La lista de cámaras la publica un módulo nativo que tarda un instante en
  // estar lista, así que en los primeros renders todavía no hay ninguna.
  // Pasarle `device={facing}` a <Camera> lanzaría ahí mismo un
  // «This device does not have any "back" Cameras!»; `useCameraDevice`
  // devuelve `undefined` mientras tanto y se vuelve a renderizar al llegar.
  const device = useCameraDevice(facing);
  const photoOutput = usePhotoOutput();

  // Sin esto VisionCamera usa su manejador por defecto, que hace `console.error`
  // y acaba reventando la simbolización de LogBox en la build nativa.
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
      outputs={[photoOutput]}
      isActive={isActive}
      zoom={1 + zoom * (MAX_ZOOM_FACTOR - 1)}
      resizeMode="cover"
      onError={handleError}
    />
  );
}

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

function ViewportFallback() {
  const styles = useStyles();

  return (
    <View style={[StyleSheet.absoluteFill, styles.fallback]}>
      <Text variant="subtitle" style={styles.fallbackText} align="center">
        Visor no disponible en esta build
      </Text>
      <Text variant="caption" style={styles.fallbackHint} align="center">
        No se encontró ningún módulo de cámara (¿emulador sin cámara?).
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
  fallbackText: {
    color: theme.hud.text,
  },
  fallbackHint: {
    color: theme.hud.textDim,
  },
}));

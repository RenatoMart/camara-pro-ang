import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { RootScreenProps } from '@/navigation/types';
import { selectActiveGuide, useCameraStore } from '@/store/cameraStore';
import { makeStyles, useTheme } from '@/theme';

import { useCompositionAnalysis } from '../ai/hooks/useCompositionAnalysis';
import { CameraViewport } from '../components/CameraViewport';
import { CameraTopBar } from '../components/controls/CameraTopBar';
import { HudIconButton } from '../components/controls/HudIconButton';
import { ModeSelector } from '../components/controls/ModeSelector';
import { ShutterButton } from '../components/controls/ShutterButton';
import { Glyph } from '../components/Glyph';
import { AspectMask, useAspectInsets } from '../components/overlays/AspectMask';
import { GhostOverlay } from '../components/overlays/GhostOverlay';
import { GuideOverlay } from '../components/overlays/GuideOverlay';
import { LevelIndicator } from '../components/overlays/LevelIndicator';
import { ViewfinderFrame } from '../components/overlays/ViewfinderFrame';
import { ProPanel } from '../components/panels/ProPanel';
import { useAutoShutter } from '../hooks/useAutoShutter';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { useCapture } from '../hooks/useCapture';
import { useCountdown } from '../hooks/useCountdown';
import { useDeviceTilt } from '../hooks/useDeviceTilt';

/**
 * Pantalla del visor.
 *
 * Sigue el modelo HUD: la cámara ocupa todo, los controles viven en los
 * bordes y las superposiciones (guías, máscara, nivel, fantasma) se apilan
 * en orden sobre el visor sin capturar toques.
 */
export function CameraScreen({ navigation }: RootScreenProps<'Camara'>) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  // En automático manda la sugerencia del asistente; en manual, tu elección.
  const guide = useCameraStore(selectActiveGuide);
  const guideMode = useCameraStore(state => state.guideMode);
  const aspect = useCameraStore(state => state.aspect);
  const flash = useCameraStore(state => state.flash);
  const timer = useCameraStore(state => state.timer);
  const facing = useCameraStore(state => state.facing);
  const toggleFacing = useCameraStore(state => state.toggleFacing);
  const zoom = useCameraStore(state => state.zoom);
  const mode = useCameraStore(state => state.mode);
  const levelOn = useCameraStore(state => state.levelOn);
  const autoShutter = useCameraStore(state => state.autoShutter);
  const ghostUri = useCameraStore(state => state.ghostUri);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const lastPhotoUri = useCameraStore(state => state.lastPhotoUri);

  const permission = useCameraPermission();
  const { cameraRef, isCapturing, capture } = useCapture();
  const countdown = useCountdown();
  const tilt = useDeviceTilt(levelOn);
  const compositionFrameOutput = useCompositionAnalysis(guideMode === 'auto');

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const aspectInsets = useAspectInsets(aspect, viewport.width, viewport.height);
  const visibleWidth = viewport.width - aspectInsets.left - aspectInsets.right;
  const visibleHeight =
    viewport.height - aspectInsets.top - aspectInsets.bottom;

  // Fogonazo blanco breve al capturar, como confirmación visual.
  const flashPulse = useRef(new Animated.Value(0)).current;

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  }, []);

  const runCapture = useCallback(async () => {
    const uri = await capture();
    if (uri) {
      Animated.sequence([
        Animated.timing(flashPulse, {
          toValue: 0.8,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(flashPulse, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [capture, flashPulse]);

  const onShutterPress = useCallback(() => {
    if (countdown.isRunning) {
      countdown.cancel();
      return;
    }
    if (timer > 0) {
      void countdown.start(timer).then(result => {
        if (result === 'completada') {
          void runCapture();
        }
      });
      return;
    }
    void runCapture();
  }, [countdown, runCapture, timer]);

  useAutoShutter({
    enabled: autoShutter && levelOn && !countdown.isRunning && !isCapturing,
    isLevel: tilt.isLevel,
    onTrigger: () => {
      void runCapture();
    },
  });

  const openGallery = useCallback(() => {
    navigation.navigate('Galeria');
  }, [navigation]);

  const openSettings = useCallback(() => {
    navigation.navigate('Ajustes');
  }, [navigation]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ——— Visor y superposiciones ——— */}
      <View style={styles.viewport} onLayout={onViewportLayout}>
        {permission.status === 'concedido' ? (
          <CameraViewport
            facing={facing}
            flash={flash}
            zoom={zoom}
            cameraRef={cameraRef}
            compositionFrameOutput={compositionFrameOutput}
          />
        ) : null}

        {permission.status === 'denegado' ? (
          <View style={styles.permission}>
            <Text
              variant="subtitle"
              style={styles.permissionText}
              align="center"
            >
              La cámara necesita tu permiso
            </Text>
            <Text
              variant="caption"
              style={styles.permissionHint}
              align="center"
            >
              Sin él no hay visor. Si lo negaste antes, actívalo en los ajustes
              del sistema.
            </Text>
            <Button
              label="Permitir cámara"
              onPress={() => {
                void permission.request();
              }}
            />
          </View>
        ) : null}

        {ghostUri !== null ? (
          <GhostOverlay uri={ghostUri} opacity={ghostOpacity} />
        ) : null}

        <AspectMask
          aspect={aspect}
          width={viewport.width}
          height={viewport.height}
        />

        {/* Las guías se dibujan dentro del área visible del formato elegido. */}
        <View
          pointerEvents="none"
          style={[
            styles.guideArea,
            {
              top: aspectInsets.top,
              bottom: aspectInsets.bottom,
              left: aspectInsets.left,
              right: aspectInsets.right,
            },
          ]}
        >
          <ViewfinderFrame width={visibleWidth} height={visibleHeight} />
          <GuideOverlay
            kind={guide}
            width={visibleWidth}
            height={visibleHeight}
          />
        </View>

        {levelOn && tilt.isAvailable ? (
          <LevelIndicator
            roll={tilt.roll}
            pitch={tilt.pitch}
            isLevel={tilt.isLevel}
          />
        ) : null}

        {countdown.secondsLeft !== null ? (
          <View pointerEvents="none" style={styles.countdown}>
            <Text variant="monoLg" style={styles.countdownText}>
              {String(countdown.secondsLeft)}
            </Text>
          </View>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[styles.capturePulse, { opacity: flashPulse }]}
        />
      </View>

      {/* ——— Barra superior: flash, HDR, formato, temporizador, ajustes ——— */}
      <View style={[styles.topScrim, { height: insets.top + 76 }]} />
      <View style={[styles.topBar, { top: insets.top + theme.spacing.xs }]}>
        <CameraTopBar onOpenSettings={openSettings} />
      </View>

      {/* ——— Zona inferior ——— */}
      <View
        style={[
          styles.bottomArea,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        {mode === 'pro' ? <ProPanel /> : null}

        <ModeSelector />

        <View style={styles.mainBar}>
          <Pressable
            onPress={openGallery}
            accessibilityRole="button"
            accessibilityLabel="Abrir galería"
            style={({ pressed }) => [
              styles.galleryThumb,
              pressed ? styles.pressed : null,
            ]}
          >
            {lastPhotoUri !== null ? (
              <Image
                source={{ uri: lastPhotoUri }}
                style={styles.galleryImage}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <GalleryPlaceholder />
            )}
          </Pressable>

          <ShutterButton onPress={onShutterPress} busy={isCapturing} />

          <HudIconButton
            icon="voltear"
            onPress={toggleFacing}
            accessibilityLabel="Cambiar de cámara"
          />
        </View>
      </View>
    </View>
  );
}

/** Icono de galería cuando aún no hay ninguna foto en la sesión. */
function GalleryPlaceholder() {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.galleryPlaceholder}>
      <Glyph name="galeria" size={20} color={theme.hud.textDim} />
    </View>
  );
}

const useStyles = makeStyles(theme => ({
  root: {
    flex: 1,
    backgroundColor: theme.hud.background,
  },
  viewport: {
    ...StyleSheet.absoluteFill,
  },
  guideArea: {
    position: 'absolute',
  },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.hud.background,
  },
  permissionText: {
    color: theme.hud.text,
  },
  permissionHint: {
    color: theme.hud.textDim,
  },
  countdown: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: theme.hud.text,
    fontSize: 88,
    lineHeight: 96,
  },
  capturePulse: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.hud.shutterInner,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.hud.mask,
  },
  topBar: {
    position: 'absolute',
    left: theme.spacing.xs,
    right: theme.spacing.xs,
  },
  // La trama oscura cubre todo el bloque inferior (panel PRO incluido), para
  // que los controles se lean igual sobre una escena clara.
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: theme.hud.mask,
  },
  mainBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
  },
  galleryThumb: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    ...theme.roundedCorner,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.hud.glassBorder,
    backgroundColor: theme.hud.glass,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
}));

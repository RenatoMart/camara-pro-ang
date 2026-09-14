import { useIsFocused } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
import { CommonResolutions, useCameraDevice } from 'react-native-vision-camera';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { RootScreenProps } from '@/navigation/types';
import { selectActiveGuide, useCameraStore } from '@/store/cameraStore';
import { makeStyles, useTheme } from '@/theme';

import { useCompositionAnalysis } from '../ai/hooks/useCompositionAnalysis';
import { CameraViewport, MAX_USEFUL_ZOOM } from '../components/CameraViewport';
import { CameraTopBar } from '../components/controls/CameraTopBar';
import { HudIconButton } from '../components/controls/HudIconButton';
import { ManualControlChips } from '../components/controls/ManualControlChips';
import { ManualControlEditor } from '../components/controls/ManualControlEditor';
import { ModeSelector } from '../components/controls/ModeSelector';
import { ShutterButton } from '../components/controls/ShutterButton';
import {
  HUD_PILL_SIZE,
  ZoomIndicator,
} from '../components/controls/ZoomIndicator';
import { Glyph } from '../components/Glyph';
import { AspectMask, useAspectInsets } from '../components/overlays/AspectMask';
import { GhostOverlay } from '../components/overlays/GhostOverlay';
import { GuideOverlay } from '../components/overlays/GuideOverlay';
import { LevelIndicator } from '../components/overlays/LevelIndicator';
import { RecordingTimer } from '../components/overlays/RecordingTimer';
import { ProPanel } from '../components/panels/ProPanel';
import { ProPanelHandle } from '../components/panels/ProPanelHandle';
import type { ManualControlKind } from '../constants/manualControls';
import { VIDEO_QUALITIES } from '../constants/videoQuality';
import { useAutoShutter } from '../hooks/useAutoShutter';
import { useCameraPermission } from '../hooks/useCameraPermission';
import { useCapture } from '../hooks/useCapture';
import { useCountdown } from '../hooks/useCountdown';
import { useDeviceTilt } from '../hooks/useDeviceTilt';
import { useMicrophonePermission } from '../hooks/useMicrophonePermission';
import { useVideoRecording } from '../hooks/useVideoRecording';
import {
  bestSupportedVideoQuality,
  supportedVideoQualities,
} from '../utils/videoCapabilities';

/**
 * Pantalla del visor.
 *
 * Sigue el modelo HUD: la cámara ocupa todo, los controles viven en los
 * bordes y las superposiciones (guías, máscara, nivel, fantasma) se apilan
 * en orden sobre el visor sin capturar toques. Las excepciones son el propio
 * visor —que sí responde a pellizco (zoom) y toque (ocultar el panel PRO)—
 * y el indicador de zoom flotante.
 *
 * Las herramientas de PRO (guía, nivel, disparo automático, fantasma) sólo
 * están activas en `mode === 'pro'`: cambiar de modo no sólo cambia lo que
 * se ve, también apaga lo que no se ve, para que un ajuste dejado encendido
 * en PRO no siga actuando en Foto sin que se note.
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
  const setZoom = useCameraStore(state => state.setZoom);
  const ev = useCameraStore(state => state.ev);
  const setEv = useCameraStore(state => state.setEv);
  const mode = useCameraStore(state => state.mode);
  const videoQualityPref = useCameraStore(state => state.videoQuality);
  const setVideoQuality = useCameraStore(state => state.setVideoQuality);
  const levelOn = useCameraStore(state => state.levelOn);
  const autoShutter = useCameraStore(state => state.autoShutter);
  const ghostUri = useCameraStore(state => state.ghostUri);
  const ghostOpacity = useCameraStore(state => state.ghostOpacity);
  const lastPhotoUri = useCameraStore(state => state.lastPhotoUri);

  // La lista de cámaras la publica un módulo nativo que tarda un instante en
  // estar lista; `useCameraDevice` devuelve `undefined` mientras tanto. Vive
  // aquí y no dentro de `CameraViewport` porque sus límites de zoom
  // (`minZoom`/`maxZoom`) también hacen falta arriba, para el indicador.
  const device = useCameraDevice(facing);

  const isProMode = mode === 'pro';
  const isVideoMode = mode === 'video';
  const isFocused = useIsFocused();

  // Qué calidades admite de verdad el sensor: 720p/1080p/4K, las que traiga
  // el teléfono. Si la preferencia guardada no está entre ellas (el sensor
  // no llega, o se cambió de teléfono), se degrada sola a la mejor que sí
  // admite — nunca se le pide al sensor una resolución que rechaza.
  const detectedVideoQualities = useMemo(
    () => supportedVideoQualities(device),
    [device],
  );
  useEffect(() => {
    if (detectedVideoQualities.length === 0) {
      return;
    }
    const best = bestSupportedVideoQuality(
      detectedVideoQualities,
      videoQualityPref,
    );
    if (best !== videoQualityPref) {
      setVideoQuality(best);
    }
  }, [detectedVideoQualities, videoQualityPref, setVideoQuality]);
  const videoResolution =
    VIDEO_QUALITIES.find(option => option.kind === videoQualityPref)
      ?.resolution ?? CommonResolutions.FHD_16_9;

  const permission = useCameraPermission();
  const micPermission = useMicrophonePermission();
  // El micrófono sólo se pide al entrar a vídeo, no al arrancar la app: quien
  // nunca graba no debería ver ese permiso. Pedirlo de nuevo en entradas
  // siguientes no vuelve a molestar — una vez decidido, el sistema responde
  // sin diálogo — así que no hace falta recordar si ya se pidió.
  useEffect(() => {
    if (isVideoMode) {
      void micPermission.request();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sólo debe repetirse al entrar a vídeo, no en cada respuesta del permiso.
  }, [isVideoMode]);
  const recording = useVideoRecording();
  // Cambiar de modo, o salir de la pantalla, mientras se graba dejaría un
  // `Recorder` huérfano: la salida de vídeo se desengancha de la cámara justo
  // cuando `isVideoMode` pasa a `false`, así que hay que pedirle que pare
  // antes de que eso ocurra.
  useEffect(() => {
    if ((!isVideoMode || !isFocused) && recording.isRecording) {
      void recording.stop();
    }
  }, [isVideoMode, isFocused, recording]);

  const { cameraRef, isCapturing, capture } = useCapture();
  const countdown = useCountdown();
  // El sensor de inclinación y el análisis de composición son herramientas
  // del modo PRO: fuera de él no hay nada que las muestre, así que tampoco
  // tiene sentido dejarlas corriendo en segundo plano gastando batería.
  const tilt = useDeviceTilt(isProMode && levelOn);
  const compositionFrameOutput = useCompositionAnalysis(
    isProMode && guideMode === 'auto',
  );

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  // El recorte de aspecto no existe en vídeo (no se implementa el recorte
  // del archivo grabado, a diferencia de la foto): se le pasa `'sensor'`
  // para que no quede una máscara sugiriendo un recorte que no va a pasar.
  const aspectInsets = useAspectInsets(
    isVideoMode ? 'sensor' : aspect,
    viewport.width,
    viewport.height,
  );
  const visibleWidth = viewport.width - aspectInsets.left - aspectInsets.right;
  const visibleHeight =
    viewport.height - aspectInsets.top - aspectInsets.bottom;

  // Bandeja del modo PRO: se despliega siempre que se entra en el modo, y se
  // oculta al tocar el visor o su propia manija sin salir de PRO.
  const [proPanelOpen, setProPanelOpen] = useState(true);
  useEffect(() => {
    if (isProMode) {
      setProPanelOpen(true);
    }
  }, [isProMode]);
  const collapseProPanel = useCallback(() => setProPanelOpen(false), []);
  const expandProPanel = useCallback(() => setProPanelOpen(true), []);
  // Sólo tiene efecto tocar el visor mientras hay algo que ocultar; el resto
  // del tiempo el toque no hace nada (deja sitio a un futuro tap-to-focus).
  const onViewportTap =
    isProMode && proPanelOpen ? collapseProPanel : undefined;

  // EV/S/ISO/WB/F: cuál está desplegado, si es que hay alguno. Sustituye a
  // la tira de modos mientras dura, igual que se oculta el resto al salir de
  // PRO.
  const [activeManualControl, setActiveManualControl] =
    useState<ManualControlKind | null>(null);
  useEffect(() => {
    if (!isProMode) {
      setActiveManualControl(null);
    }
  }, [isProMode]);
  const onSelectManualControl = useCallback((kind: ManualControlKind) => {
    setActiveManualControl(current => (current === kind ? null : kind));
  }, []);

  const onEvChange = useCallback(
    (next: number) => {
      setEv(next);
    },
    [setEv],
  );

  // Altura real de la bandeja inferior (guías/modos/disparador), para que el
  // indicador de zoom flote justo encima sin importar si el panel PRO está
  // desplegado o no.
  const [bottomAreaHeight, setBottomAreaHeight] = useState(0);
  const onBottomAreaLayout = useCallback((event: LayoutChangeEvent) => {
    setBottomAreaHeight(event.nativeEvent.layout.height);
  }, []);

  const onZoomChange = useCallback(
    (next: number) => {
      setZoom(next);
    },
    [setZoom],
  );

  // Salto rápido al siguiente factor "redondo" del sensor (0.5×, 1×, 2×…),
  // el mismo atajo que ofrece cualquier cámara de fábrica junto al pellizco.
  const cycleZoom = useCallback(() => {
    const min = device?.minZoom ?? 1;
    const max = Math.min(device?.maxZoom ?? 1, MAX_USEFUL_ZOOM);
    const presets = Array.from(
      new Set([min, 1, ...(device?.zoomLensSwitchFactors ?? []), max]),
    )
      .filter(value => value >= min && value <= max)
      .sort((a, b) => a - b);

    const next = presets.find(preset => preset > zoom + 0.05) ?? presets[0];
    setZoom(next ?? 1);
  }, [device, zoom, setZoom]);

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

  // En vídeo, parar es inmediato (no tiene sentido meterle temporizador a
  // frenar una grabación en marcha); empezar sí respeta el temporizador,
  // igual que la foto.
  const onShutterPress = useCallback(() => {
    if (countdown.isRunning) {
      countdown.cancel();
      return;
    }
    if (isVideoMode && recording.isRecording) {
      void recording.stop();
      return;
    }
    if (timer > 0) {
      void countdown.start(timer).then(result => {
        if (result === 'completada') {
          void (isVideoMode ? recording.start() : runCapture());
        }
      });
      return;
    }
    void (isVideoMode ? recording.start() : runCapture());
  }, [countdown, isVideoMode, recording, runCapture, timer]);

  useAutoShutter({
    enabled:
      isProMode &&
      autoShutter &&
      levelOn &&
      !countdown.isRunning &&
      !isCapturing,
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
            device={device}
            flash={flash}
            zoom={zoom}
            onZoomChange={onZoomChange}
            ev={ev}
            onTap={onViewportTap}
            cameraRef={cameraRef}
            compositionFrameOutput={compositionFrameOutput}
            isVideoMode={isVideoMode}
            videoResolution={videoResolution}
            enableAudio={micPermission.status === 'concedido'}
            videoRef={recording.videoRef}
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

        {isProMode && ghostUri !== null ? (
          <GhostOverlay uri={ghostUri} opacity={ghostOpacity} />
        ) : null}

        <AspectMask
          aspect={isVideoMode ? 'sensor' : aspect}
          width={viewport.width}
          height={viewport.height}
        />

        {/* Las guías se dibujan dentro del área visible del formato elegido;
            es herramienta de PRO. */}
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
          {isProMode ? (
            <GuideOverlay
              kind={guide}
              width={visibleWidth}
              height={visibleHeight}
            />
          ) : null}
        </View>

        {isProMode && levelOn && tilt.isAvailable ? (
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

        {permission.status === 'concedido' ? (
          <ZoomIndicator
            value={zoom}
            onPress={cycleZoom}
            style={[
              styles.zoomIndicator,
              { bottom: bottomAreaHeight + theme.spacing.md },
            ]}
          />
        ) : null}

        {/* Manija para volver a abrir el panel PRO: flota sobre el visor,
            apilada justo encima del indicador de zoom, igual de discreta. */}
        {isProMode && !proPanelOpen ? (
          <ProPanelHandle
            onPress={expandProPanel}
            style={[
              styles.zoomIndicator,
              {
                bottom:
                  bottomAreaHeight +
                  theme.spacing.md +
                  HUD_PILL_SIZE +
                  theme.spacing.sm,
              },
            ]}
          />
        ) : null}

        {isVideoMode && recording.isRecording ? (
          <View
            pointerEvents="none"
            style={[styles.recordingTimer, { top: insets.top + 84 }]}
          >
            <RecordingTimer seconds={recording.seconds} />
          </View>
        ) : null}
      </View>

      {/* ——— Barra superior: flash, HDR, formato/calidad, temporizador, ajustes ——— */}
      <View style={[styles.topScrim, { height: insets.top + 76 }]} />
      <View style={[styles.topBar, { top: insets.top + theme.spacing.xs }]}>
        <CameraTopBar
          onOpenSettings={openSettings}
          isVideoMode={isVideoMode}
          supportedVideoQualities={detectedVideoQualities}
        />
      </View>

      {/* ——— Zona inferior ——— */}
      <View
        onLayout={onBottomAreaLayout}
        style={[
          styles.bottomArea,
          { paddingBottom: insets.bottom + theme.spacing.md },
        ]}
      >
        {isProMode && proPanelOpen ? (
          <ProPanel onCollapse={collapseProPanel} />
        ) : null}

        {isProMode ? (
          <ManualControlChips
            active={activeManualControl}
            onSelect={onSelectManualControl}
          />
        ) : null}

        {activeManualControl !== null ? (
          <ManualControlEditor
            kind={activeManualControl}
            ev={ev}
            onEvChange={onEvChange}
            lensAperture={device?.lensAperture ?? null}
          />
        ) : (
          <ModeSelector />
        )}

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

          <ShutterButton
            onPress={onShutterPress}
            busy={isVideoMode ? false : isCapturing}
            variant={isVideoMode ? 'video' : 'foto'}
            recording={recording.isRecording}
          />

          {/* Cambiar de cámara en mitad de una grabación no está soportado
              (el grabador no sigue al sensor nuevo): se bloquea mientras
              dure, en vez de dejar que rompa la captura en marcha. */}
          <HudIconButton
            icon="voltear"
            onPress={toggleFacing}
            disabled={recording.isRecording}
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
  zoomIndicator: {
    position: 'absolute',
    alignSelf: 'center',
  },
  recordingTimer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
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

/**
 * Setup global de Jest.
 *
 * Aquí se registran los mocks de módulos nativos: en el entorno de test no
 * existe el puente nativo, así que cualquier librería con código nativo debe
 * mockearse una sola vez, aquí, y no en cada archivo de test.
 *
 * Los matchers de @testing-library/react-native (`toBeDisabled`,
 * `toBeVisible`, …) vienen incluidos desde la v13: no hace falta importarlos.
 */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Keychain en tests: almacén en memoria, sin puente nativo.
jest.mock('react-native-keychain', () => {
  const store = new Map<string, string>();

  return {
    ACCESSIBLE: {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
    },
    getSupportedBiometryType: jest.fn(async () => null),
    setGenericPassword: jest.fn(
      async (
        _username: string,
        password: string,
        options?: { service?: string },
      ) => {
        store.set(options?.service ?? 'default', password);
        return { service: options?.service ?? 'default', storage: 'mock' };
      },
    ),
    getGenericPassword: jest.fn(async (options?: { service?: string }) => {
      const key = options?.service ?? 'default';
      const password = store.get(key);
      return password ? { username: key, password, service: key } : false;
    }),
    resetGenericPassword: jest.fn(async (options?: { service?: string }) => {
      store.delete(options?.service ?? 'default');
      return true;
    }),
  };
});

// Cámara nativa: stubs mínimos, sin puente nativo.
jest.mock('react-native-vision-camera', () => ({
  Camera: require('react-native').View,
  VisionCamera: {
    cameraPermissionStatus: 'authorized',
    requestCameraPermission: jest.fn(async () => true),
  },
  useCameraDevice: jest.fn(() => ({ id: 'back-0', position: 'back' })),
  usePhotoOutput: jest.fn(() => ({
    capturePhotoToFile: jest.fn(async () => ({ filePath: '/tmp/foto.jpg' })),
  })),
  // El asistente de composición no tiene frames que analizar en tests: el
  // output es un objeto opaco y `onFrame` nunca se llama.
  useFrameOutput: jest.fn(() => ({ thread: 'mock-thread' })),
  HybridFrameConverter: {
    convertFrameToImage: jest.fn(),
  },
  CommonResolutions: { VGA_16_9: { width: 480, height: 854 } },
}));

// Motor de composición: HybridObject de Nitro implementado en C++ propio
// (android/app/src/main/jni/composition/), sin puente nativo en tests.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => ({
      loadModelFromAsset: jest.fn(async () => undefined),
      analyze: jest.fn(() => new ArrayBuffer(0)),
    })),
  },
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    saveAsset: jest.fn(async () => undefined),
    getPhotos: jest.fn(async () => ({ edges: [] })),
  },
}));

jest.mock('react-native-nitro-image', () => ({
  loadImage: jest.fn(async () => ({
    saveToTemporaryFileAsync: jest.fn(async () => '/tmp/compuesta.jpg'),
  })),
}));

// Skia: sólo se ejercita la geometría del fundido, no el dibujo real.
jest.mock('@shopify/react-native-skia', () => ({
  ImageFormat: { JPEG: 3, PNG: 4 },
  Skia: {
    Data: { fromURI: jest.fn(async () => ({})) },
    Image: { MakeImageFromEncoded: jest.fn(() => null) },
    Surface: { MakeOffscreen: jest.fn(() => null) },
    Paint: jest.fn(() => ({ setAlphaf: jest.fn() })),
    XYWHRect: jest.fn((x: number, y: number, w: number, h: number) => ({
      x,
      y,
      width: w,
      height: h,
    })),
  },
}));

// Reanimated: mock oficial + stub del sensor de gravedad.
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    SensorType: { GRAVITY: 3 },
    useAnimatedSensor: jest.fn(() => ({
      sensor: { value: { x: 0, y: -1, z: 0 } },
      isAvailable: false,
      unregister: jest.fn(),
    })),
    useAnimatedReaction: jest.fn(),
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

// SVG y slider como Views: los tests comprueban comportamiento, no dibujo.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const make = (name: string) => {
    const Component = (props: Record<string, unknown>) =>
      React.createElement(View, props);
    Component.displayName = name;
    return Component;
  };
  return {
    __esModule: true,
    default: make('Svg'),
    Svg: make('Svg'),
    Circle: make('Circle'),
    Line: make('Line'),
    Path: make('Path'),
    Rect: make('Rect'),
  };
});

jest.mock('@react-native-community/slider', () => require('react-native').View);

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    Directions: {},
    State: {},
    gestureHandlerRootHOC: jest.fn((component: unknown) => component),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
});

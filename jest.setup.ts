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

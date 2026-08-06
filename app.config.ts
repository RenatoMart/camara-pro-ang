import type { ExpoConfig } from 'expo/config';

import appJson from './app.json';

/**
 * Configuración de Expo, usada por `npm run go` (Expo Go).
 *
 * Se mantiene separada de `app.json` a propósito:
 * - `app.json` guarda el nombre que registra el código nativo de Android/iOS
 *   en una build normal,
 * - este archivo describe la app para Expo.
 *
 * El nombre se lee de `app.json` para que nunca se desincronicen.
 */
const config: ExpoConfig = {
  name: appJson.displayName,
  slug: 'camaraproang',
  scheme: 'camaraproang',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.camaraproang',
    supportsTablet: true,
  },
  android: {
    package: 'com.camaraproang',
  },
};

export default config;

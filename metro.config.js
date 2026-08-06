const {
  getDefaultConfig: getReactNativeDefaults,
} = require('@react-native/metro-config');
const { getDefaultConfig: getExpoDefaults } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');

/**
 * Configuración de Metro.
 *
 * El proyecto se puede servir de dos formas y ambas leen este archivo:
 * - build nativa normal (`npm start` + `npm run android` / `npm run ios`),
 * - Expo Go (`npm run go`), que exige una config derivada de `expo/metro-config`.
 *
 * Por eso se parte de la config de React Native y se fusiona encima la de
 * Expo, que es un superconjunto. Cargar la de React Native además evita el
 * aviso "your project's Metro config should extend '@react-native/metro-config'"
 * que imprime el CLI de React Native.
 *
 * https://docs.expo.dev/guides/customizing-metro/
 */
const config = mergeConfig(
  getReactNativeDefaults(__dirname),
  getExpoDefaults(__dirname),
);

// Prioriza TypeScript al resolver módulos sin extensión.
config.resolver.sourceExts = [
  'ts',
  'tsx',
  ...config.resolver.sourceExts.filter(ext => ext !== 'ts' && ext !== 'tsx'),
];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;

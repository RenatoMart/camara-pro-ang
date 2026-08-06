const {
  getDefaultConfig: getReactNativeDefaults,
} = require('@react-native/metro-config');
const { getDefaultConfig: getExpoDefaults } = require('expo/metro-config');
const { mergeConfig } = require('metro-config');
// El módulo se publica como ESM transpilado: la función viene en `.default`.
const exclusionList =
  require('metro-config/private/defaults/exclusionList').default;

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

/**
 * Carpetas que Metro no debe vigilar.
 *
 * Gradle crea y borra directorios temporales dentro de `android/.cxx/` y
 * `android/build/` mientras compila el código nativo (CMake). El watcher de
 * Metro revienta con `ENOENT: watch ...` si un directorio que vigila
 * desaparece a mitad de camino, y el proceso se cae entero: la app se queda
 * sin bundle y muestra "Unable to load script".
 *
 * No son código fuente, así que se excluyen tanto en el proyecto como dentro
 * de `node_modules` (nitro-modules, reanimated y VisionCamera compilan C++).
 */
config.resolver.blockList = exclusionList([
  /.*\/android\/\.cxx\/.*/,
  /.*\/android\/build\/.*/,
  /.*\/android\/app\/build\/.*/,
  /.*\/ios\/(build|Pods)\/.*/,
]);

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

const { getDefaultConfig } = require('@react-native/metro-config');
// El módulo se publica como ESM transpilado: la función viene en `.default`.
const exclusionList =
  require('metro-config/private/defaults/exclusionList').default;

/**
 * Configuración de Metro.
 *
 * El proyecto se sirve de una sola forma: `npm start` con la build nativa
 * (`npm run android` / `npm run ios`).
 */
const config = getDefaultConfig(__dirname);

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

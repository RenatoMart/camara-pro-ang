/**
 * Configuración de Babel.
 *
 * Se usa `babel-preset-expo` en lugar de `@react-native/babel-preset` porque
 * es un superconjunto: incluye todo lo del preset de React Native y además
 * permite que el proyecto corra en Expo Go. Las builds nativas normales
 * (`npm run android` / `npm run ios`) siguen funcionando igual.
 *
 * Nota: los archivos de tooling (babel/metro/jest/eslint) deben permanecer en
 * JavaScript CommonJS porque Metro, Babel y ESLint los cargan con `require()`
 * antes de que exista cualquier transpilación de TypeScript.
 * Todo el código de la aplicación (`src/`) es TypeScript estricto.
 */
// Deja el `fetch` de React Native en lugar del de Expo (`expo/fetch`).
//
// El "winter runtime" de Expo reemplaza `globalThis.fetch` por una versión que
// importa `expo-modules-core`, y ese módulo lee `globalThis.expo.EventEmitter`
// nada más evaluarse. En la build nativa `globalThis.expo` no existe (es
// justo lo que `isExpoRuntime()` usa para distinguir los dos mundos), así que
// cualquier `fetch` revienta con «Cannot read property 'EventEmitter' of
// undefined» — incluido el que usa LogBox para simbolizar errores, que además
// enmascaraba el error original.
//
// `runtime.native.ts` de Expo consulta esta bandera para no instalar el suyo.
// El `fetch` de React Native funciona en los dos runtimes y la app no usa las
// extensiones de `expo/fetch` (las llamadas HTTP van por axios).
process.env.EXPO_PUBLIC_USE_RN_FETCH ??= '1';

module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Requerido por Zod 4 (usa `export * as ns from …`).
    '@babel/plugin-transform-export-namespace-from',
    [
      'module:react-native-dotenv',
      {
        envName: 'APP_ENV',
        moduleName: '@env',
        path: '.env',
        safe: true,
        allowUndefined: false,
        verbose: false,
      },
    ],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
        },
      },
    ],
    // Requerido por react-native-reanimated. SIEMPRE el último plugin.
    'react-native-worklets/plugin',
  ],
};

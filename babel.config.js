/**
 * Configuración de Babel.
 *
 * Se usa el preset de React Native. El proyecto no pasa por Expo: se compila
 * y se depura siempre como build nativa (`npm run android` / `npm run ios`).
 *
 * Nota: los archivos de tooling (babel/metro/jest/eslint) deben permanecer en
 * JavaScript CommonJS porque Metro, Babel y ESLint los cargan con `require()`
 * antes de que exista cualquier transpilación de TypeScript.
 * Todo el código de la aplicación (`src/`) es TypeScript estricto.
 */
module.exports = {
  presets: ['module:@react-native/babel-preset'],
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

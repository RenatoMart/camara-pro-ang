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
  ],
};

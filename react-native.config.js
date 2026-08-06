/**
 * Configuración del CLI de React Native (tooling: se mantiene en .js).
 *
 * Los paquetes de Expo sólo existen dentro de Expo Go: no pueden compilarse
 * en la build nativa porque `install-expo-modules` aún no soporta RN 0.86 y
 * su plugin de Gradle (`expo-module-gradle-plugin`) no está configurado.
 * Se excluyen del autolinking nativo; en runtime, la app los carga de forma
 * protegida vía `src/features/camera/services/nativeModules.ts`.
 */
const expoOnlyPackages = [
  'expo',
  'expo-camera',
  'expo-media-library',
  'expo-haptics',
  'expo-file-system',
];

module.exports = {
  dependencies: Object.fromEntries(
    expoOnlyPackages.map(name => [
      name,
      { platforms: { android: null, ios: null } },
    ]),
  ),
};

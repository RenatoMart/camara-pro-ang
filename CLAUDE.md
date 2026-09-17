# Guía para agentes

App de cámara PRO (guías de composición, nivel, fantasma…) sobre React Native
0.86 (New Architecture) + TypeScript estricto. **Se compila y se depura
siempre como build nativa por USB**: Expo y Expo Go se retiraron del proyecto
a propósito. La feature principal es `src/features/camera/`. Lee `README.md`
para el detalle; esto es el resumen operativo.

> Para reglas de rendimiento y patrones de React Native, usa la skill
> `/vercel-react-native-skills` (versionada en `.agents/skills/` de este repo).

## Comandos

```bash
npm run verify      # typecheck + lint + test — antes de dar algo por terminado
npm run typecheck
npm run lint        # --max-warnings=0: los warnings rompen el build
npm test
npx jest src/features/camera/utils/geometry.test.ts   # un solo archivo de test
npx jest -t "nombre del test"                         # un solo caso por nombre
npm start           # Metro
npm run android     # compila e instala en el dispositivo conectado
```

## APK de release (uso propio)

El APK de debug **no lleva el JS dentro**: lo pide a Metro por el cable, así
que sólo arranca con el PC delante y la depuración activa. Para una app que
funcione sola en el teléfono hay que generar el release, que empaqueta el
bundle en `assets/index.android.bundle`.

```bash
./android/gradlew -p android assembleRelease -PreactNativeArchitectures=arm64-v8a
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

- `-PreactNativeArchitectures=arm64-v8a` compila sólo la arquitectura del
  teléfono. Sin esa bandera Gradle construye las cuatro de
  `gradle.properties`, y con el C++ de VisionCamera/Skia eso cuadruplica un
  build que ya tarda ~9 minutos en frío (los siguientes son mucho más rápidos
  mientras no cambien las dependencias nativas).
- **Debug y release conviven en el teléfono**: `debug` lleva
  `applicationIdSuffix ".debug"` y se llama «CamaraPro dev» (vía
  `android/app/src/debug/res/values/strings.xml`); el release conserva
  `com.camaraproang` y el nombre «CamaraProAng». No unifiques los ids: se
  pisarían al instalar.
- **El release se firma con `debug.keystore` a propósito.** Es distribución
  personal, no Play Store; el keystore de debug basta para que reinstalar
  actualice encima. Si algún día se publica, hay que generar uno propio y
  guardar sus credenciales fuera del repo (`*.keystore` ya está en
  `.gitignore`).
- El release **no** tiene fast refresh, menú de desarrollo ni logs: `logger`
  se apaga (`__DEV__`) y el `ErrorBoundary` oculta el mensaje técnico. Para
  desarrollar se sigue usando `npm run android`.
- `versionCode` sigue en 1. Da igual para reinstalar (la firma coincide), pero
  conviene subirlo al distinguir versiones.

## Reglas no negociables

- **Todo en español**: comentarios, mensajes de UI y documentación.
- **TypeScript en todo el código de la app.** Los únicos `.js` permitidos son
  los archivos de tooling (`babel.config.js`, `metro.config.js`,
  `jest.config.js`, `.eslintrc.js`, `.prettierrc.js`), porque Metro/Babel/ESLint
  los cargan con `require()` antes de que exista transpilación.
- **Nada de `any`.** Si un tipo no cuadra, arregla el tipo.
- **Imports absolutos con `@/`**, nunca `../../..`.
- **Colores y medidas sólo desde `useTheme()` / `makeStyles`.** Ningún hex ni
  número mágico en un componente.
- **`console.*` está prohibido**; usa `logger` de `@/utils/logger`.
- **Feature-first**: el código nuevo va en `src/features/<feature>/`. Sube algo
  a `src/components/` o `src/hooks/` sólo cuando lo usen dos o más features.
- **Dependencias en una sola dirección**: `features/` importa de `components/`,
  `hooks/`, `services/`, `store/`, `theme/` y `utils/`; nunca al revés.
  `components/` no conoce `features/` y `services/` no sabe que existe React.

## Dónde va cada cosa

| Necesito…                         | Va en                                                   |
| --------------------------------- | ------------------------------------------------------- |
| Datos que vienen de una API       | React Query, en `features/*/hooks/`                     |
| Sesión / preferencias / UI global | Zustand, en `src/store/`                                |
| Token o credencial                | `secureStorage` (Keychain/Keystore), nunca AsyncStorage |
| Llamada HTTP nueva                | `features/*/api/`, usando el helper `http`              |
| Componente de diseño reutilizable | `src/components/ui/`                                    |
| Ruta nueva                        | declararla primero en `src/navigation/types.ts`         |
| Variable de entorno               | `.env.example` + `types/env.d.ts` + `src/config/env.ts` |
| Color/medida del HUD de cámara    | `theme.hud` (siempre oscuro, no depende del esquema)    |
| Librería nativa de cámara         | vía `features/camera/services/nativeModules.ts`         |

Nunca copies datos de la API a `useState` o a Zustand: React Query ya es la
fuente de verdad del estado del servidor.

## Al escribir una pantalla

Envuélvela en `<Screen>` y maneja los cuatro estados: cargando (`<Loader />`),
error (`<StateView tone="error" />` con reintento), vacío y con datos.
`src/features/posts/screens/FeedScreen.tsx` es el ejemplo canónico.

Para listas usa `FlashList`, nunca `ScrollView` con `.map()`. El item va en
`memo()` y los callbacks en `useCallback`; nada de objetos inline en
`renderItem`.

Junto a cada `borderRadius` pon `...theme.roundedCorner`. Para sombras usa
`theme.elevation.*` (sintaxis `boxShadow`), no `shadowColor` ni `elevation`.

## Al escribir tests

- Van junto al archivo probado (`Button.tsx` → `Button.test.tsx`).
- Usa `renderWithProviders` de `jest/testUtils.tsx`, no el `render` crudo.
- `render` y `fireEvent` son **async** en RTL v14: usa `await`.
- Los mocks de módulos nativos van en `jest.setup.ts`, no en cada test.

## Trampas del entorno (compilar y servir)

- **Gradle necesita JDK 17 o 21, nunca uno más nuevo.** Con JDK 22+ la build
  muere en `JdkImageTransform` porque el `jlink` de esa versión no sabe
  transformar `core-for-system-modules.jar`. El JDK se fija en
  `~/.gradle/gradle.properties` con `org.gradle.java.home`, fuera del repo
  para no commitear una ruta local.
- **`android/app/build.gradle` fija `entryFile = file("../../index.ts")`.** El
  plugin de React Native asume `index.js`; como aquí todo es TypeScript, la
  build de release moría con «entryFile ... index.js which doesn't exist». En
  debug no se nota, porque el bundle lo resuelve Metro y no Gradle.
- **`metro.config.js` excluye `android/.cxx` y las carpetas `build/`.** Gradle
  crea y borra temporales de CMake mientras compila el C++; si Metro los
  vigila, muere con `ENOENT: watch ...` y la app se queda sin bundle
  («Unable to load script»). No quites ese `blockList`.
- **Depuración por USB**: hace falta `adb reverse tcp:8081 tcp:8081` cada vez
  que se reconecta el cable, y `ANDROID_HOME` apuntando al SDK.
- **No reintroduzcas Expo.** Se retiró entero (paquetes, `babel-preset-expo`,
  `expo/metro-config`, `app.config.ts`, `react-native.config.js`). Entre otras
  cosas, su "winter runtime" sustituía `globalThis.fetch` por `expo/fetch`,
  que importa `expo-modules-core`, y ese módulo lee `globalThis.expo` al
  evaluarse: en una build nativa reventaba con `Cannot read property
'EventEmitter' of undefined` y, como LogBox simboliza los stacks con
  `fetch`, enmascaraba cualquier error de desarrollo.
- El aviso del CLI sobre extender `@react-native/metro-config` ya no aplica:
  `metro.config.js` parte directamente de esa config.

## Trampas conocidas de este proyecto

- **No añadas paquetes `expo-*`.** No hay `expo-modules-core` enlazado, así
  que revientan al arrancar. Para cualquier necesidad hay equivalente nativo
  (imágenes → `react-native-nitro-image`, dibujo → Skia, ficheros → el propio
  `nitro-image`).
- **Las 14 clases del asistente de composición están entrenadas** (desde el
  reentreno del 2026-09-15 con KU-PCP + subconjunto _style_ de AVA; antes
  sólo 9 tenían dataset). El detalle y las métricas por clase viven en
  `MODELO.md` del repo `entrenamiento-camara-proang`. Las 5 que vinieron de
  AVA (`vanishing_point`, `shallow_dof`, `color_blocking`, `tonal_contrast`,
  `negative_space`) no tienen precisión de test real —su `test.csv` sigue
  siendo sólo KU-PCP, a propósito, para mantener comparables las 9
  originales—, así que `CLASS_PRECISION` en `ai/constants/compositionClasses.ts`
  usa ahí el F1 de validación como mejor sustituto disponible.
- **Las salidas del modelo son 14 sigmoides independientes, no un softmax.** No
  suman 1 y varias están activas a la vez. Aplicar `argmax` sería el bug
  clásico y silencioso aquí.
- **Al preparar el frame para el modelo, estirar y no recortar.** Recortar no
  sólo aleja la imagen del entrenamiento: **cambia la respuesta correcta**, ya
  que la composición _es_ dónde está el sujeto dentro del encuadre. Tampoco
  normalizar: `preprocess_input` va dentro del grafo del `.tflite`.
- **El nivel mide respecto al cuarto de vuelta más cercano, no a la
  vertical.** `tiltFromGravity` calcula el giro completo con
  `atan2(x, -y)` y le resta el múltiplo de 90° más próximo, así que `roll`
  nunca sale de ±45° y el nivel funciona igual en vertical que en horizontal.
  Midiendo contra la vertical absoluta (como antes), un teléfono apaisado leía
  90° de desvío y no se ponía verde jamás. La fórmula está **duplicada** en el
  worklet de `useDeviceTilt`, porque un worklet no puede llamar a funciones
  normales de JS: si se toca una, hay que tocar la otra.
- **`useFrameOutput` necesita `react-native-vision-camera-worklets`.** Es un
  paquete aparte que VisionCamera 5 no declara como peer: sin él, el hook
  lanza «Cannot use Frame Processors» al montar el visor —y como el hook del
  asistente se llama siempre, se cae también en modo manual—. Los tests no lo
  detectan porque `jest.setup.ts` mockea `useFrameOutput`.
- **El modelo se lee desde C++, no desde JS.** `loadModelFromAsset` del motor
  lo abre con `AAssetManager`; `build.gradle` empaqueta
  `src/features/camera/ai/assets/` como assets del módulo. No vuelvas a
  cargarlo con `require()` + `fetch`: en debug funciona porque lo sirve Metro,
  pero en release `Image.resolveAssetSource` devuelve un identificador de
  recurso Android (no una URL) y `fetch` falla en silencio, con el `logger`
  apagado.
- **`libcomposition_engine` es una biblioteca aparte y no hereda nada del
  target de la app**: necesita declarar por su cuenta C++20
  (`target_compile_features`), `ReactAndroid::jsi` (los headers de Nitro
  incluyen `<jsi/jsi.h>` y su prefab no lo arrastra) y las dos rutas de
  headers de LiteRT (`lib/litert/headers` y
  `lib/litert/headers/external/org_tensorflow`).
- **`HybridObject` es base virtual**: para obtener el `shared_ptr` del motor
  hace falta `dynamic_pointer_cast`, `static_pointer_cast` no compila.
- **La sesión de cámara debe seguir al ciclo de vida.** `isActive` sale de
  `useAppState() === 'active' && useIsFocused()`. Si se deja fijo en `true`,
  Android retira la cámara al pasar a segundo plano y la app insiste,
  fallando con «Camera is disabled, probably due to a device policy!».
- **No le pases `device="back"` a `<Camera>`**: la lista de cámaras llega de
  forma asíncrona y VisionCamera lanza si aún está vacía. Usa
  `useCameraDevice(facing)`, que devuelve `undefined` mientras carga.
- **Nada sensible en AsyncStorage.** Tokens y credenciales van por
  `secureStorage` (`src/services/storage/secureStorage.ts`), que usa Keychain
  / Keystore. No tiene camino alternativo a propósito: si el almacén seguro
  falla, no guarda nada en lugar de dejar la credencial en texto plano.
- Añadir una variable a `.env` sin añadirla a `.env.example` rompe el bundle
  (`safe: true`). Una variable vacía también lo rompe (`allowUndefined: false`).
- Zod 4 necesita `@babel/plugin-transform-export-namespace-from`, ya declarado
  en `babel.config.js`. No lo quites.
- El plugin `react-native-worklets/plugin` debe ser el **último** de
  `babel.config.js`.
- Instalar una librería con código nativo obliga a recompilar
  (`npm run android` / `npm run pods && npm run ios`); recargar Metro no basta.
- **Las librerías de cámara se reexportan desde
  `features/camera/services/nativeModules.ts`**, no se importan sueltas por
  ahí: así cambiar de paquete se hace en un solo sitio. Los sensores del nivel
  van por Reanimated (`useAnimatedSensor`).
- El flujo de auth y el feed de posts son **ejemplo de plantilla**: compilan
  pero no están montados en la navegación. No los borres sin preguntar.

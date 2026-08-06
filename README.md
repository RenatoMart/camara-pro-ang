# Cámara PRO (sobre plantilla React Native + TypeScript)

App de cámara con guías de composición avanzadas y asistentes en tiempo
real, construida sobre esta plantilla de React Native 0.86 (New
Architecture) y TypeScript estricto.

---

## La app: Cámara PRO

La cámara abre directo al visor, sin login. El modo normal es mínimo
(disparador, flash, voltear, galería); el chip **PRO** despliega las
herramientas avanzadas:

| Herramienta                  | Qué hace                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| **Guías de composición**     | 3×3 (tercios), Phi (proporción áurea), 4×4, espiral de Fibonacci, triángulos dorados, simetría |
| **Máscaras de formato**      | 1:1, 4:5, 9:16, 16:9 y 2.39:1 (cine): sombrean lo que queda fuera sin ocultar la escena        |
| **Nivel giroscópico 2 ejes** | Horizonte artificial con acelerómetro; se pone verde al nivelar (con histéresis anti-parpadeo) |
| **Disparo automático**       | Dispara solo cuando mantienes el horizonte nivelado ~0.7 s                                     |
| **Modo fantasma**            | Superpone una foto anterior semitransparente; opcionalmente la funde en la captura             |
| **Temporizador y zoom**      | 3 s / 10 s con cuenta atrás, zoom continuo                                                     |

Además: galería en cuadrícula de 3 columnas (últimas fotos del carrete),
visor de foto a pantalla completa con "Usar como fantasma", y guardado
automático en la galería del sistema.

### Las dos caras del modo fantasma

El fantasma nace como **guía de encuadre** (_onion skinning_): ves la foto
anterior translúcida sobre el visor para volver a colocar la cámara en el
mismo sitio, y la foto que disparas sale **limpia**. Es lo que quieres para un
antes/después: dos tomas idénticas de encuadre, ninguna con la otra encima.

Con el chip **«Fundir en la foto»** del panel PRO, la captura se compone con
la superposición a la misma opacidad que ves en pantalla, y lo que se guarda
es la mezcla (doble exposición). El interruptor sólo aparece con el fantasma
activo y se recuerda entre sesiones.

La mezcla la hace `features/camera/utils/ghostCompose.ts` con Skia, que se
eligió por ser la única librería de dibujo presente **en los dos runtimes**
(viene en Expo Go SDK 57 y compila en la build nativa). Se compone sobre los
píxeles reales de la foto, no sobre lo que se ve en pantalla, así que no se
pierde resolución. Si la composición falla, se guarda la toma original: nunca
se pierde la foto.

### Cómo funciona en cada mundo

La app corre **completa** en los dos flujos, con librerías de cámara
distintas detrás del mismo contrato (`CameraViewport` + `nativeModules.ts`):

| Capacidad          | Expo Go (`npm run go`)     | Build nativa (`npm run android`) |
| ------------------ | -------------------------- | -------------------------------- |
| Visor y captura    | expo-camera                | **react-native-vision-camera** 5 |
| Galería y guardado | expo-media-library         | @react-native-camera-roll        |
| Nivel (sensores)   | Reanimated (sensor nativo) | Reanimated (sensor nativo)       |
| Vibración          | expo-haptics               | `Vibration` de React Native      |
| Fundir el fantasma | Skia + expo-file-system    | Skia + react-native-nitro-image  |

En tiempo de ejecución, `nativeModules.ts` detecta el runtime con
`global.expo` (sólo existe dentro de Expo Go) y carga el módulo correcto;
nunca importes paquetes `expo-*`, VisionCamera o CameraRoll directamente.
En el lado nativo, `react-native.config.js` excluye los paquetes de Expo del
autolinking de Gradle/CocoaPods.

### Hoja de ruta

Focus peaking, patrón zebra e histograma en tiempo real necesitan acceso a
los fotogramas del preview (frame processors de VisionCamera). Con la
migración a VisionCamera ya hecha, son el siguiente paso natural; no se
simulan con datos falsos.

---

## Puesta en marcha

```bash
npm install          # instala dependencias y prepara los git hooks
cp .env.example .env # variables de entorno (ver sección Entornos)
```

Y a partir de ahí tienes **dos formas de trabajar**:

### 1. Ver la app en tu celular sin compilar nada (Expo Go)

La más rápida para empezar y para enseñar avances.

```bash
npm run go
```

1. Instala **Expo Go** en tu celular (Play Store / App Store).
2. Asegúrate de que el celular y la computadora estén **en la misma red WiFi**.
3. Escanea el QR que aparece en la terminal.

Si tu red bloquea la conexión (WiFi de oficina, universidad, etc.):

```bash
npm run go:tunnel   # más lento, pero funciona desde cualquier red
```

Y si algo se queda pegado con caché vieja:

```bash
npm run go:clear
```

> **Importante — la letra pequeña de Expo Go**
>
> Expo Go es una app ya compilada que trae dentro un conjunto **fijo** de
> librerías nativas. Sirve para ver la app al instante, pero:
>
> - Sólo funcionan las librerías nativas que Expo Go ya incluye. Las de esta
>   plantilla (navegación, gestos, almacenamiento, FlashList) están todas
>   incluidas, por eso funciona.
> - Si añades una librería nativa que Expo Go no trae, **dejará de funcionar
>   ahí** y tendrás que usar la build nativa.
> - Funciona porque Expo SDK 57 apunta a React Native 0.86.2, exactamente la
>   versión de esta plantilla. Si actualizas React Native por tu cuenta, esta
>   compatibilidad se rompe.

### 2. Build nativa completa

La que usarás para publicar y la que no tiene ninguna limitación.

> **Antes de compilar: hace falta JDK 17 o 21, y ninguno más nuevo.**
>
> Con JDK 22 o superior la build muere en `JdkImageTransform`, porque el
> `jlink` de esas versiones no sabe transformar `core-for-system-modules.jar`
> del SDK de Android. El mensaje no dice nada del JDK, así que es fácil
> perder una tarde con él.
>
> Comprueba cuál tienes con `java -version`. Si es más nuevo, instala un
> JDK 21 y apunta Gradle a él **sin tocar el resto del sistema**, en
> `~/.gradle/gradle.properties` (fuera del repo, porque es una ruta local):
>
> ```properties
> org.gradle.java.home=/ruta/a/tu/jdk-21
> ```
>
> También necesitas `ANDROID_HOME` apuntando al SDK y `platform-tools` en el
> `PATH`; si depuras por cable, `adb reverse tcp:8081 tcp:8081` cada vez que
> lo reconectas.

```bash
npm start            # arranca Metro
npm run android      # compila y lanza en Android
npm run ios          # compila y lanza en iOS (sólo macOS)
```

En iOS, la primera vez y cada vez que añadas una librería con código nativo:

```bash
bundle install   # sólo la primera vez
npm run pods
```

En Android basta con volver a ejecutar `npm run android`; el autolinking se
encarga del resto.

---

## Estructura

```
src/
├── App.tsx              Raíz de la app
├── providers/           Providers globales (tema, React Query, errores…)
├── components/
│   ├── ui/              Componentes de diseño reutilizables (Button, Text…)
│   └── ErrorBoundary    Captura de errores de render
├── config/              Lectura y validación de variables de entorno
├── features/            ⭐ El código de negocio vive aquí
│   ├── camera/          ⭐⭐ La app de cámara
│   │   ├── api/         Lectura del carrete (media library)
│   │   ├── components/  Visor, HUD, guías, máscaras, nivel, panel PRO
│   │   ├── constants/   Catálogo de guías, formatos, tolerancias
│   │   ├── hooks/       Permiso, captura, inclinación, temporizador…
│   │   ├── screens/     Cámara, Galería, Visor de foto
│   │   ├── services/    Carga protegida de módulos de Expo
│   │   └── utils/       Geometría pura (espiral áurea, máscaras, nivel)
│   ├── auth/            Ejemplo de la plantilla (no montado en la app)
│   ├── posts/           Ejemplo de la plantilla (no montado en la app)
│   └── settings/
├── hooks/               Hooks genéricos reutilizables
├── navigation/          Navegadores, tipos de rutas y deep links
├── services/
│   ├── api/             Cliente HTTP, errores normalizados, React Query
│   └── storage/         AsyncStorage (normal) y Keychain (seguro)
├── store/               Estado global de cliente (Zustand)
├── theme/               Colores, espaciado, tipografía, modo oscuro
└── utils/               Funciones puras (logger, formato)
```

> La carpeta se llama `src/providers/` y no `src/app/` a propósito: Expo
> interpreta cualquier `app/` como directorio de rutas de Expo Router y
> intentaría usarlo para navegar.

### La regla más importante: _feature-first_

El código se agrupa **por funcionalidad, no por tipo de archivo**. Una pantalla
nueva de "pedidos" crea `src/features/orders/` con sus `api/`, `hooks/`,
`components/` y `screens/` dentro. Así:

- todo lo relacionado se lee junto,
- borrar una funcionalidad es borrar una carpeta,
- dos personas trabajando en features distintas casi nunca chocan.

Sólo sube a `src/components/` o `src/hooks/` lo que **realmente** usen dos o
más features.

### Dirección de las dependencias

```
features/  →  components/, hooks/, services/, store/, theme/, utils/
services/  →  config/, utils/
```

Nunca al revés: `components/` no importa de `features/`, y `services/` no sabe
que existe React. Si necesitas romper esto, casi siempre significa que algo
está en la carpeta equivocada.

---

## Imports absolutos

Configurados en `babel.config.js` y `tsconfig.json`:

```ts
import { Button } from '@/components/ui'; // ✅
import { Button } from '../../../components/ui'; // ❌
```

---

## Entornos

Las variables viven en `.env` (ignorado por git) y se documentan en
`.env.example` (sí commiteado).

> ⚠️ **No son secretos.** `react-native-dotenv` las inyecta en el bundle en
> tiempo de compilación: cualquiera puede leerlas descompilando el APK/IPA.
> Ahí sólo van URLs y flags. Claves de API reales van en tu backend.

Para añadir una variable hay que tocar **tres** sitios:

1. `.env.example` (y tu `.env`) — el plugin corre en modo `safe` y valida
   contra el ejemplo; ninguna puede quedar vacía,
2. `types/env.d.ts` — para que TypeScript la conozca,
3. `src/config/env.ts` — para validarla y convertirla de tipo.

El resto de la app importa siempre `env` desde `@/config/env`, nunca `@env`.

---

## Los dos tipos de estado

Es el error más común al empezar. No los mezcles:

|             | Estado del **servidor**     | Estado del **cliente**   |
| ----------- | --------------------------- | ------------------------ |
| Herramienta | React Query                 | Zustand                  |
| Qué guarda  | Datos que vienen de una API | Sesión, preferencias, UI |
| Dónde       | `features/*/hooks/`         | `src/store/`             |
| Ejemplo     | La lista de publicaciones   | El tema claro/oscuro     |

React Query ya te da caché, `loading`, `error`, revalidación y reintentos:
**no copies datos de la API dentro de un `useState` o de Zustand.**

Regla relacionada: usa el **mínimo** de variables de estado. Si un valor se
puede calcular a partir de otros, calcúlalo durante el render en vez de
guardarlo — el estado duplicado se desincroniza y provoca renders de más.

Las claves de caché se centralizan en `queryKeys`
(`src/services/api/queryClient.ts`) para que una invalidación nunca falle por
un typo.

---

## Almacenamiento: dos cajones, no uno

|            | `storage`                     | `secureStorage`                     |
| ---------- | ----------------------------- | ----------------------------------- |
| Respaldo   | AsyncStorage                  | Keychain (iOS) / Keystore (Android) |
| Cifrado    | ❌ texto plano                | ✅ por el sistema operativo         |
| Qué guarda | Preferencias, flags, caché    | Tokens y credenciales               |
| Archivo    | `services/storage/storage.ts` | `services/storage/secureStorage.ts` |

El token de sesión vive en `secureStorage`, no en AsyncStorage: AsyncStorage
deja el contenido en texto plano dentro del sandbox de la app, y en un
dispositivo con root o jailbreak se lee con un volcado de archivos.

Se conecta al store de auth por la opción `storage` de `persist`:

```ts
storage: createJSONStorage(() => secureStorage);
```

Cada clave se guarda como una entrada independiente del Keychain
(`service: key`) con `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, así que la credencial no
viaja en las copias de seguridad de iCloud y queda atada al dispositivo.

> **Expo Go y el fallback**
>
> `react-native-keychain` es un módulo nativo que Expo Go no trae compilado.
> Para que `npm run go` siga funcionando como vista previa, `secureStorage`
> detecta esa situación en tiempo de ejecución y cae a AsyncStorage,
> registrando un aviso en consola.
>
> **Ese fallback no cifra nada.** Sólo se activa dentro de Expo Go. En
> cualquier build nativa (`npm run android` / `npm run ios`) se usa siempre el
> almacén seguro real, que es lo que llega a producción. No inicies sesión con
> credenciales reales desde Expo Go.

---

## Red y errores

`src/services/api/client.ts` expone un único cliente con `baseURL`, timeout,
inyección del token e interceptores. Los features usan el helper `http`:

```ts
export const ordersApi = {
  list: (signal?: AbortSignal) => http.get<Order[]>('/orders', { signal }),
};
```

Cualquier fallo llega a la UI como un `ApiError` con un `kind`
(`network`, `unauthorized`, `server`…) y un mensaje ya presentable. Las
pantallas nunca ven un `AxiosError`, así que cambiar de cliente HTTP no obliga
a tocar componentes.

Un 401 dispara automáticamente el cierre de sesión.

---

## Estilos y tema

Nunca escribas un color a mano. Todo sale de `useTheme()`:

```tsx
import { makeStyles } from '@/theme';

const useStyles = makeStyles(theme => ({
  box: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.radius.md,
    ...theme.roundedCorner,
    ...theme.elevation.sm,
  },
}));

function MiComponente() {
  const styles = useStyles();
  return <View style={styles.box} />;
}
```

`makeStyles` memoiza la hoja por tema, así que el modo oscuro funciona solo y
no se recrean objetos de estilo en cada render.

Convenciones de estilo aplicadas en la plantilla:

- **`...theme.roundedCorner` siempre junto a `borderRadius`** — aplica
  `borderCurve: 'continuous'`, que suaviza la esquina al estilo iOS.
- **Sombras con `boxShadow`** (sintaxis CSS) en vez de `shadowColor` /
  `elevation`: una sola declaración vale para iOS y Android.
- **`gap` para separar, `padding` para espacio interno.** Nada de `margin` en
  los hijos.
- **Pocos tamaños de fuente.** La jerarquía se hace con peso y color, no
  inventando un `fontSize` nuevo cada vez.

Toda pantalla debe envolverse en `<Screen>`: resuelve de una vez el safe area
(notch, barra de gestos), el color de la status bar y el teclado. Cuando es
scrollable usa `contentInsetAdjustmentBehavior="automatic"`, que deja el
cálculo de insets a la plataforma.

---

## Listas

Usa siempre **FlashList**, incluso para listas cortas: sólo monta los elementos
visibles, mientras que un `ScrollView` con `.map()` los monta todos.

`FeedScreen.tsx` es el ejemplo a copiar. Lo que hay que respetar:

- el componente de cada fila va envuelto en `memo()`,
- `renderItem`, `keyExtractor` y los handlers van en `useCallback`,
- **nada de objetos inline** en `renderItem` (`style={{…}}`, `user={{…}}`):
  crean una referencia nueva en cada render y anulan el `memo()`,
- pide las imágenes al tamaño en que se muestran (×2 para retina), nunca el
  original a resolución completa.

---

## Navegación

Rutas y parámetros se declaran en `src/navigation/types.ts`. A partir de ahí
TypeScript obliga a pasar los parámetros correctos:

```tsx
navigation.navigate('PostDetail', { postId: 42 }); // ✅
navigation.navigate('PostDetail'); // ❌ error de compilación
```

Se usa **native stack** (`@react-navigation/native-stack`), que delega en
`UINavigationController` en iOS y en Fragments en Android: transiciones y
gestos corren en el hilo de UI.

En la app de cámara `RootNavigator` monta el visor como pantalla inicial,
sin login. El flujo de auth del ejemplo (`AuthNavigator` +
`MainTabNavigator`) sigue en el código como referencia del patrón
"protected routes": montar un árbol distinto según el estado de sesión en
lugar de navegar imperativamente, para no dejar pantallas huérfanas en el
historial.

Para navegar desde fuera de React (interceptores, notificaciones push) usa los
helpers de `src/navigation/navigationRef.ts`.

> Los tabs usan `@react-navigation/bottom-tabs`, que es JS. La versión nativa
> (`react-native-bottom-tabs`) se siente mejor, pero no viene en Expo Go. Si
> renuncias a Expo Go, cambiarla es un buen upgrade.

---

## Pruebas

```bash
npm test              # una pasada
npm run test:watch    # en modo watch
npm run test:coverage # con reporte de cobertura
```

Los tests van **junto al archivo que prueban** (`Button.tsx` →
`Button.test.tsx`). Usa `renderWithProviders` de `jest/testUtils.tsx` en lugar
del `render` de la librería: ya monta tema, React Query, navegación y safe
area.

> Desde la v14 de `@testing-library/react-native`, `render` y `fireEvent` son
> **asíncronos**: hay que usar `await`.

Los mocks de módulos nativos se registran una sola vez en `jest.setup.ts`.

---

## Calidad de código

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint, 0 warnings permitidos
npm run lint:fix
npm run format      # Prettier
npm run verify      # typecheck + lint + test  ← ejecuta esto antes de un PR
```

Git hooks (husky), instalados solos con `npm install`:

- **pre-commit** → `lint-staged`: lint + formato sólo de lo que vas a commitear.
- **pre-push** → typecheck + tests afectados.

Reglas destacadas del linter:

- `react/jsx-no-leaked-render`: prohíbe `{count && <Text/>}`. Si `count` vale
  `0`, React Native intenta renderizar el `0` fuera de un `<Text>` y **la app
  crashea en producción**. Usa siempre ternario con `: null`.
- `no-console`: usa `logger` de `@/utils/logger`, que en producción no imprime
  y es donde conectarías Sentry o Crashlytics.
- `import/order`: imports agrupados y ordenados automáticamente.
- `consistent-type-imports`: los tipos se importan con `import type`.

---

## Convenciones

| Elemento      | Convención             | Ejemplo            |
| ------------- | ---------------------- | ------------------ |
| Componentes   | `PascalCase`           | `PostListItem.tsx` |
| Hooks         | `use` + camelCase      | `usePosts.ts`      |
| Stores        | camelCase + `Store`    | `authStore.ts`     |
| Tipos y props | `PascalCase`           | `type ButtonProps` |
| Constantes    | `SCREAMING_SNAKE_CASE` | `MIN_TOUCH_SIZE`   |
| Tests         | junto al archivo       | `Button.test.tsx`  |

Checklist para toda pantalla que cargue datos — maneja los **cuatro** estados:

1. cargando (`<Loader />`),
2. error (`<StateView tone="error" />` con reintento),
3. vacío (`ListEmptyComponent`),
4. con datos.

`FeedScreen.tsx` es el ejemplo a copiar.

Otras dos reglas que ahorran dolores de cabeza:

- **Los objetos `Intl` se crean una sola vez**, a nivel de módulo. Instanciarlos
  es caro (parsean datos de locale). Ver `src/utils/format.ts`.
- **Importa desde el design system, no desde el paquete.** Usa `Image` y `Text`
  de `@/components/ui`, no de `react-native`: cambiar la implementación de todas
  las imágenes de la app pasa a ser tocar un archivo.

---

## Comandos útiles

```bash
npm run go             # Expo Go
npm run go:tunnel      # Expo Go a través de túnel (redes restringidas)
npm run go:clear       # Expo Go limpiando caché
npm run doctor         # diagnostica versiones incompatibles

npm run start:reset    # Metro limpiando caché
npm run clean:metro    # borra caché de Metro y watchman
npm run clean:android  # gradlew clean
npm run android:release
npm run ios:release
```

---

## Para adaptar la plantilla a un proyecto nuevo

1. Renombra la app: `app.json`, `app.config.ts` y los identificadores nativos
   en `android/` e `ios/`.
2. Ajusta `linking.ts` y el `scheme` de `app.config.ts` con tus deep links.
3. Cambia la paleta en `src/theme/colors.ts`.
4. Borra las features de ejemplo (`posts/`) y apunta `API_URL` a tu backend.
5. Sustituye el login simulado de `features/auth/hooks/useSignIn.ts` por la
   llamada real.

### Cosas que querrás añadir en un proyecto real

Éstas rompen la compatibilidad con Expo Go y requieren build nativa:

- **Imágenes optimizadas**: `expo-image` (caché, blurhash, menos memoria).
  Requiere `npx expo prebuild`. El punto de cambio es
  `src/components/ui/Image.tsx`, un solo archivo.
- **Iconos**: `react-native-vector-icons` (los tabs usan emoji a propósito).
- **Tabs nativos**: `react-native-bottom-tabs`.

Éstas funcionan en los dos flujos:

- **Monitoreo**: Sentry o Crashlytics, conectados dentro de `logger.error`.
- **i18n**: `i18next` + `react-i18next` si necesitas más de un idioma.

Ya instaladas y en uso, no hace falta añadirlas: **Reanimated** (4.5.1, para
los sensores del nivel; anima sólo `transform` y `opacity`, que corren en la
GPU) y **Skia** (2.6.2, para fundir el fantasma en la foto). Ambas versiones
están fijadas a las que trae Expo Go SDK 57: no las subas sin cambiar de SDK.

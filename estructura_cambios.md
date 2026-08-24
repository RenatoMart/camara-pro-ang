# El motor de composición IA en Cámara PRO

Cómo está integrado el asistente de composición: qué pieza hace qué, qué
contratos no se pueden romper y qué queda por hacer.

Nació como documento de traspaso desde el repo de entrenamiento
(`entrenamiento-camara-proang`), escrito **antes** de implementar nada. Ya está
implementado, así que ahora describe lo que hay, no lo que se planeaba: varias
decisiones acabaron siendo la contraria de la que se propuso aquí, y en cada
caso se explica por qué.

Contexto del modelo (cómo se entrenó, cómo re-exportarlo): ver `MODELO.md`.
Aquí sólo va lo que afecta a la app.

---

## 1. Lo que llega del repo de entrenamiento

| archivo                          | tamaño  | qué es                                         |
| -------------------------------- | ------- | ---------------------------------------------- |
| `modelo_composicion_int8.tflite` | 2,75 MB | el modelo entrenado                            |
| `labels.txt`                     | 158 B   | nombre de cada una de las 14 salidas, en orden |
| `thresholds.json`                | 307 B   | umbral de activación por clase                 |

Un cuarto archivo, `modelo_pesado.keras` (24 MB), **no se copia**: es el
original del que se re-exporta el `.tflite` y se queda en el repo de
entrenamiento.

Los tres viven en `src/features/camera/ai/assets/`, junto a la feature que los
usa. `android/app/build.gradle` declara esa carpeta como carpeta de assets del
módulo, así que se empaquetan en el APK desde ahí, sin copiarlos a dos sitios.

`labels.txt` **no se lee en runtime**: parsear un `.txt` daría `string[]` y
tiraría el tipado estricto del proyecto. Se transcribe una vez a
`constants/compositionClasses.ts` como tupla `as const`; el `.txt` se conserva
como referencia de procedencia (y ahí lo tiene el C++ si algún día lo quiere).
`thresholds.json` sí se importa directamente desde TypeScript: cuando lleguen
umbrales recalibrados se sustituye el archivo y ya está.

---

## 2. Sólo Android, y sólo build nativa

El asistente vive en C++ compilado con la app, así que existe únicamente en la
build de Android (`npm run android` para depurar, `assembleRelease` para el APK
suelto). No hay fallback ni stub: Expo y Expo Go se retiraron del proyecto
entero hace tiempo, y iOS no tiene equivalente de este módulo.

Por eso el motor **no** pasa por `features/camera/services/nativeModules.ts`:
ese archivo existe para poder cambiar de librería de cámara en un solo sitio,
y aquí no hay librería que cambiar — el módulo es del proyecto.

---

## 3. Dónde vive cada pieza

Regla _feature-first_: el motor sólo tiene sentido dentro de la cámara, así que
es un submódulo de `features/camera/`, no una feature hermana. Borrar la
carpeta = borrar la funcionalidad.

```
src/features/camera/ai/
├── assets/
│   ├── modelo_composicion_int8.tflite   el modelo (lo lee el C++, no el JS)
│   ├── labels.txt                       referencia de procedencia
│   └── thresholds.json                  se importa desde TypeScript
├── constants/
│   └── compositionClasses.ts            las 14 clases tipadas + precisión medida
├── hooks/
│   └── useCompositionAnalysis.ts        engancha el análisis al visor
├── services/
│   └── compositionEngine.ts             contrato JSI con el motor C++
├── utils/
│   ├── frameToTensor.ts                 frame → 224×224×3 uint8 RGB
│   ├── mapModelToGuides.ts              14 probabilidades → guía a dibujar
│   └── stabilizeSuggestion.ts           histéresis por frames
└── types.ts
```

Y el back, C++ propio:

```
android/app/src/main/jni/
├── CMakeLists.txt                el del target de la app: es el que React
│                                 Native esconde en node_modules, copiado y
│                                 ampliado para construir lo de abajo
└── composition/
    ├── CMakeLists.txt
    ├── CompositionEngine.hpp/.cpp   carga del modelo + inferencia
    ├── OnLoad.cpp                   registra el HybridObject en Nitro
    └── lib/litert/                  headers y .so de TFLite (los deja Gradle)
```

No hay ni una línea de Java/Kotlin: el motor es un `HybridObject` de Nitro
escrito a mano (sin `nitrogen`, la interfaz es demasiado pequeña para que
compense generar el boilerplate).

---

## 4. La cadena completa, frame a frame

```
fotograma del visor  (CameraFrameOutput, VGA 16:9, pixelFormat 'rgb')
   │  1 de cada 6 — a ~30 fps son ~5 análisis por segundo
   ▼
worklet del frame processor          (hilo propio, ni JS ni UI)
   ├─ HybridFrameConverter           frame → Image, ya enderezada
   ├─ Image.resize(224, 224)         estira; NUNCA recorta
   └─ reordena canales a RGB         (Android entrega BGRA)
   ▼
CompositionEngine::analyze()         C++ por JSI, sin bridge
   ▼
14 sigmoides float32
   │  runOnJS
   ▼
guidesFromScores()                   umbral por clase → ordena por confianza × precisión
   ▼
stabilizeSuggestion()                5 análisis seguidos (~1 s) antes de cambiar
   ▼
cameraStore.suggestedGuide  →  selectActiveGuide()  →  <GuideOverlay />
```

Detalles que no se ven en el diagrama:

- **El modo automático es un interruptor real.** `useCompositionAnalysis(false)`
  devuelve `null` y el output de frames no se añade a la cámara, así que la
  sesión no transmite un solo fotograma al analizador. Lo único que sigue
  existiendo es el objeto del output y su hilo, parados, porque
  `useFrameOutput` es un hook y no se puede llamar condicionalmente.
- **La sugerencia va al store de Zustand, no a un shared value.** Se pensó lo
  segundo (como el nivel giroscópico), pero aquí el consumidor no es una
  animación: es la guía activa, que el panel PRO también muestra y que decide
  qué componente se dibuja. Cinco actualizaciones por segundo no justifican
  saltarse el estado normal de React.
- **El modelo lo carga el C++**, no JavaScript: `loadModelFromAsset` lo abre con
  `AAssetManager` en un hilo aparte y devuelve una promesa. La versión anterior
  lo pedía con `require()` + `fetch` a la URL que resuelve Metro; eso sólo
  funciona en depuración — en release `resolveAssetSource` devuelve un
  identificador de recurso Android, no una URL, y la carga fallaba en silencio.
  Por eso `metro.config.js` ya **no** necesita `assetExts.push('tflite')`.

---

## 5. Contrato de la inferencia — lo innegociable

### Entrada

|                |                                       |
| -------------- | ------------------------------------- |
| forma          | `(1, 224, 224, 3)`                    |
| tipo           | `uint8`, 0-255                        |
| color          | RGB                                   |
| redimensionado | **frame COMPLETO estirado a 224×224** |

**No hacer center-crop del frame.** Es el error que más caro sale aquí y no es
obvio: recortar no sólo aleja la imagen de lo que vio el entrenamiento, sino
que **cambia la respuesta correcta**. La composición _es_ dónde está el sujeto
dentro del encuadre; si recortas los lados de un frame 16:9 para hacerlo
cuadrado, un sujeto en el tercio izquierdo aparece centrado y el modelo
responderá `center` con toda la razón. El entrenamiento usa `tf.image.resize`
sin `preserve_aspect_ratio`, o sea deforma; hay que deformar igual.

**No normalizar.** Nada de restar medias ni escalar a `[-1,1]`:
`preprocess_input` está _dentro_ del grafo del `.tflite`. El bitmap se pasa tal
cual.

**Orientación.** El frame llega en orientación de sensor —apaisado con el móvil
en vertical— porque rotar los buffers en la canalización de la cámara es caro
(`enablePhysicalBufferRotation` está en `false`). Quien lo endereza es
`HybridFrameConverter.convertFrameToImage`, que aplica `frame.orientation` y
`frame.isMirrored` al construir el bitmap. Si algún día se sustituye ese
converter hay que rotar a mano: una imagen girada 90° intercambia las clases
`vertical` y `horizontal`.

### Salida

14 `float32` entre 0 y 1, en este orden exacto:

```
 0 rule_of_thirds     5 triangle          10 shallow_dof
 1 vertical           6 center            11 color_blocking
 2 horizontal         7 symmetric         12 tonal_contrast
 3 diagonal           8 pattern           13 negative_space
 4 curved             9 vanishing_point
```

Son **14 sigmoides independientes, no un softmax**: no suman 1 y varias están
activas a la vez (el 28% de las fotos cumple más de una regla). No aplicar
`argmax` — sería el bug clásico y silencioso aquí. Una clase está activa si
`salida[i] >= thresholds[clase[i]]`.

El `.tflite` es int8, pero **la salida sigue siendo float32**: la cuantización
es interna al grafo, no hay que descuantizar nada al leer el tensor.

### ⚠️ Las clases 9-13 siempre valen ~0

`vanishing_point`, `shallow_dof`, `color_blocking`, `tonal_contrast` y
`negative_space` **no están entrenadas** (su dataset no se llegó a descargar).
No es un bug, no hay nada que depurar. `activeClasses()` las descarta al
sugerir; el modelo predice de verdad 9 clases, las de índice 0-8. Sus guías
siguen eligiéndose a mano en el panel PRO, marcadas con `sugerible: false`.

---

## 6. De las clases a las guías

Las guías del panel PRO y las clases del modelo no son la misma lista, así que
hay una traducción explícita en `mapModelToGuides.ts`:

| clase del modelo                                  | guía          | notas                                                                               |
| ------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------- |
| `rule_of_thirds`                                  | 3×3           | Phi es la _misma_ detección con otra retícula: preferencia de dibujo, no otra clase |
| `vertical`                                        | Vertical      | directo                                                                             |
| `horizontal`                                      | Horizontal    | directo                                                                             |
| `diagonal`                                        | Diagonal      | la red dice _que_ hay diagonal, no hacia dónde — ver §8                             |
| `curved`                                          | Curva en S    | directo                                                                             |
| `triangle`                                        | Triángulos    | directo                                                                             |
| `center`                                          | Centro        | además sirve para _no_ sugerir tercios: son opuestas                                |
| `symmetric`                                       | Simetría      | directo                                                                             |
| `pattern`                                         | Patrón        | directo                                                                             |
| `vanishing_point`                                 | Punto de fuga | sin entrenar: nunca se sugiere, sólo a mano                                         |
| `negative_space`                                  | Aire          | sin entrenar: nunca se sugiere, sólo a mano                                         |
| `shallow_dof`, `color_blocking`, `tonal_contrast` | —             | no son geometría: no hay líneas que dibujar                                         |
| —                                                 | Espiral, 4×4  | no vienen del modelo; la espiral necesita orientación, ver §8                       |

**El orden no es la probabilidad a secas.** Se pondera por la precisión medida
de cada clase (`CLASS_PRECISION`), porque el modelo no es igual de fiable en
todas: `rule_of_thirds` se activa mucho y acierta poco (0,577), así que sin esa
corrección se llevaría casi siempre la sugerencia. El mapeo devuelve como mucho
dos guías (`MAX_SUGGESTIONS`) aunque se enciendan cinco sigmoides, y el visor
dibuja la primera: llenar el encuadre de retículas no ayuda a nadie.

---

## 7. Por qué el back es C++ propio

Este documento decía originalmente lo contrario: que para la inferencia no hacía
falta escribir C++, porque `react-native-fast-tflite` ya lo resuelve. Es cierto
para una app que sólo quiera correr un `.tflite`, y falso para ésta.

La razón es a dónde va esto. El asistente no termina en la red: lo que viene
después —ángulo del horizonte, dirección de la diagonal, cuadrante del sujeto,
nitidez fondo/sujeto— es **visión por computador**, no clasificación, y ninguna
librería de inferencia lo cubre. Con un wrapper de TFLite habría que sacar el
frame otra vez para el segundo procesado; con motor propio, el fotograma entra
una vez y sale ya con todo calculado.

El reparto es:

- **Propio**: la carga del modelo, el pre/post-procesado, la gestión de memoria,
  la geometría que viene, y el contrato JSI con el que habla la app.
- **De Google**: el intérprete que multiplica matrices
  (`com.google.ai.edge.litert`). Reimplementarlo no aporta nada, igual que nadie
  reimplementa OpenCV.

Y es una pieza reemplazable: `analyze()` es el único punto que toca TFLite, así
que cambiar de inferencia —o rodearla de pasos propios— no toca ni el contrato
JSI ni una línea de TypeScript.

---

## 8. Cómo se compila esto

Lo que hace Gradle y CMake por su cuenta, para que no sorprenda:

- **El runtime de TFLite se extrae de un AAR.** Las tareas
  `extractLitertHeaders` / `extractLitertSO` sacan los `.h` y el
  `libtensorflowlite_jni.so` de `com.google.ai.edge.litert` y los dejan en
  `jni/composition/lib/litert/`. No están en el repo: aparecen al compilar.
- **`libcomposition_engine.so` no la carga la JVM.** La arrastra
  `libappmodules.so` como dependencia de enlazado, así que un `JNI_OnLoad`
  propio nunca se llamaría: el registro en Nitro va en el constructor de un
  objeto estático (`OnLoad.cpp`), que el cargador dinámico sí garantiza.
- **La biblioteca no hereda nada del target de la app.** Tiene que declarar por
  su cuenta C++20 (lo exigen los headers de Nitro), `ReactAndroid::jsi` (los
  incluyen y su prefab no lo arrastra), `fbjni` (para pedirle el `AssetManager`
  a la JVM) y **las dos** rutas de headers de LiteRT: `lib/litert/headers` y
  `lib/litert/headers/external/org_tensorflow`, porque los headers de LiteRT se
  incluyen entre sí por su ruta original del repo de TensorFlow.
- **El `.tflite` va sin comprimir** (`noCompress`): se lee de un tirón al abrir
  el asistente, el ahorro de comprimir un modelo int8 es mínimo y así queda la
  puerta abierta a mapearlo con `mmap`.
- **Los fotogramas necesitan `react-native-vision-camera-worklets`**, un paquete
  aparte que VisionCamera 5 no declara como peer. Sin él `useFrameOutput` lanza
  «Cannot use Frame Processors» al montar el visor.

---

## 9. Lo que queda

### Geometría en C++ (fase 2)

`geometry.py`, en el repo de entrenamiento, calcula con OpenCV y sin red:

- ángulo de inclinación de la escena (ángulo holandés),
- posición del horizonte,
- cuadrante del centroide de saliencia → **orientación de la espiral**,
- dirección de la diagonal dominante (barroca, sube de izquierda a derecha;
  siniestra, baja),
- ratio de nitidez fondo/sujeto (bokeh).

Es lo que le falta a la app para dos cosas que hoy quedan a medias: la espiral
de Fibonacci tiene cuatro orientaciones y el modelo no las distingue (el volteo
horizontal del entrenamiento lo hizo ciego a la dirección **a propósito**), y la
diagonal se dibuja sin comprometerse con un sentido.

Corre por frame, así que va en `jni/composition/`, junto al motor. `geometry.py`
es Python: **no se copia, se reimplementa**. Sus umbrales están calibrados
contra datos reales y dos son contraintuitivos —con la versión "obvia" el ángulo
holandés disparaba en el 20% de las fotos y el bokeh en el 70%—, así que al
portarlos hay que **copiar los valores tal cual**; están documentados con su
porqué en el `CLAUDE.md` del repo de entrenamiento.

### Desfases conocidos

- **Lo que ve el modelo no es exactamente lo que encuadras.** El análisis usa el
  fotograma 16:9 completo, mientras el visor dibuja con `resizeMode="cover"` y,
  si eliges 1:1 o 4:5, la máscara recorta encima. Como la composición _es_ dónde
  cae el sujeto, en formatos recortados el asistente está juzgando una imagen
  que no es la tuya. Arreglarlo es recortar el frame al área visible antes de
  estirar.
- **Apaisado.** `outputOrientation` se queda en `UP` porque nadie lo actualiza,
  así que con el móvil de lado el modelo ve la escena girada 90°.

### Lo que no está verificado

Todas las cifras de abajo salen de fotos de KU-PCP: curadas, bien expuestas,
composición intencionada. **El modelo nunca ha visto un frame de visor** —con
movimiento, luz mala y encuadres a medio hacer—. Es el hueco principal y sólo se
cierra probándolo en el móvil.

Si las predicciones salen raras, el orden de sospecha es:

1. **el preprocesado del frame** (¿recorta en vez de estirar? ¿BGR en vez de
   RGB? ¿girado?) — de lejos lo más probable;
2. la cuantización int8: existe `modelo_composicion.tflite` (float16, 4,55 MB)
   como alternativa, es cambiar un archivo;
3. el modelo en sí, que es lo último a tocar y lo más caro.

---

## 10. Qué esperar del modelo (para calibrar la UX)

Medido sobre 1.082 fotos de test. **Precisión** = de las veces que la guía se
enciende, cuántas acierta.

| clase            | precisión | recall |
| ---------------- | --------- | ------ |
| `pattern`        | 0,910     | 0,968  |
| `symmetric`      | 0,880     | 0,889  |
| `horizontal`     | 0,792     | 0,886  |
| `center`         | 0,834     | 0,810  |
| `triangle`       | 0,806     | 0,778  |
| `vertical`       | 0,632     | 0,833  |
| `diagonal`       | 0,640     | 0,725  |
| `curved`         | 0,616     | 0,750  |
| `rule_of_thirds` | 0,577     | 0,808  |

`rule_of_thirds` en 0,577 significa que **casi 4 de cada 10 veces que se
enciende, se equivoca**. Los umbrales del repo de entrenamiento maximizan F1,
que pondera igual un falso positivo y un falso negativo — y en un asistente de
cámara no lo son: sugerir una guía equivocada molesta más que no sugerir
ninguna.

De las dos mitigaciones posibles, la app ya aplica la primera:

- **Histéresis temporal** (`stabilizeSuggestion`): una guía nueva tiene que
  repetirse 5 análisis seguidos, ~1 segundo, antes de sustituir a la que se está
  mostrando. Apagarla también exige confirmación, para que no desaparezca porque
  un frame salga borroso. Es la medida más efectiva y no toca el modelo.
- **Subir los umbrales**: se recalibran en el repo de entrenamiento y llega un
  `thresholds.json` nuevo, sin reexportar el `.tflite`.

# El modelo entrenado: qué es cada archivo y cómo usarlo

Documento para quien vaya a integrar este modelo en la app de cámara — persona o
agente. Describe **solo los artefactos de salida y su contrato de uso**. El
diseño del sistema está en `README.md`; las reglas para modificar este repo, en
`CLAUDE.md`.

## Los tres archivos que van a la app

Están en `output/`. En la app de cámara van a
`src/features/camera/ai/assets/`, que su `build.gradle` declara como carpeta de
assets del módulo: se empaquetan en el APK desde ahí y el motor C++ los lee con
`AAssetManager`.

| archivo                          | tamaño  | qué es                                                      |
| -------------------------------- | ------- | ----------------------------------------------------------- |
| `modelo_composicion_int8.tflite` | 2,75 MB | el modelo. Todo lo aprendido, en un archivo                 |
| `labels.txt`                     | 158 B   | qué significa cada una de las 14 salidas, en orden          |
| `thresholds.json`                | 307 B   | a partir de qué valor se considera que una guía está activa |

**`modelo_pesado.keras` (24 MB) NO se copia.** Es el modelo original en formato
Keras, del que se re-exporta el `.tflite`. Se queda en el repo de entrenamiento.

Existe también `modelo_composicion.tflite` (float16, 4,55 MB), alternativa al
int8. Ver "Qué variante usar".

## De dónde salen

```
KU-PCP (4.251 fotos anotadas)
   │
   ├─ scripts/prepare_kupcp.py ──> data/processed/{train,val,test}.csv
   │                                (2.694 / 475 / 1.082)
   │
   └─ train.py ──> output/modelo_pesado.keras      (MobileNetV2 + cabeza)
                   output/thresholds.json          (calibrado sobre val)
                   output/labels.txt
                        │
                        └─ export.py --int8 ──> output/*.tflite
```

Transfer learning sobre MobileNetV2 preentrenado en ImageNet: 10 épocas con el
backbone congelado + 15 de fine-tuning. ~26 min en CPU. Reproducible con
`python train.py && python export.py --int8`.

## Contrato de entrada — esto es lo que hay que respetar sí o sí

|                |                                                               |
| -------------- | ------------------------------------------------------------- |
| forma          | `(1, 224, 224, 3)`                                            |
| tipo           | `uint8`, valores 0-255 (el int8; el float16 espera `float32`) |
| color          | RGB, en ese orden                                             |
| redimensionado | **el frame COMPLETO estirado a 224×224**                      |

**No hacer center-crop.** El entrenamiento usa `tf.image.resize` sin
`preserve_aspect_ratio` (`src/motor_ia/dataset.py:45`), es decir, deforma la
imagen hasta el cuadrado. La app debe hacer exactamente lo mismo.

Recortar rompe dos cosas a la vez: las imágenes dejan de parecerse a las de
entrenamiento, y —más grave— **el recorte cambia la respuesta correcta**. La
composición _es_ la posición del sujeto dentro del encuadre; si cortas los
lados, un sujeto que estaba en el tercio izquierdo aparece centrado. Por este
mismo motivo el recorte está prohibido como aumento de datos en este proyecto.

**No normalizar.** Nada de restar medias ni escalar a [-1,1]: `preprocess_input`
está _dentro_ del grafo del `.tflite`. Se le pasa el bitmap tal cual.

## Contrato de salida

Vector de **14 `float32`** entre 0 y 1, en el orden exacto de `labels.txt`:

```
 0 rule_of_thirds     5 triangle          10 shallow_dof
 1 vertical           6 center            11 color_blocking
 2 horizontal         7 symmetric         12 tonal_contrast
 3 diagonal           8 pattern           13 negative_space
 4 curved             9 vanishing_point
```

Son **14 sigmoides independientes, no un softmax**: no suman 1 y varias pueden
estar activas a la vez. Es lo correcto — el 28% de las fotos de KU-PCP cumple
más de una regla de composición simultáneamente.

Una guía está activa si `salida[i] >= thresholds[labels[i]]`. Los umbrales son
distintos por clase a propósito: con 0.5 fijo, las clases raras casi nunca
disparan aunque el modelo las esté ordenando bien.

## ⚠️ Las 5 últimas clases SIEMPRE dan ~0

`vanishing_point`, `shallow_dof`, `color_blocking`, `tonal_contrast` y
`negative_space` (índices 9-13) **no están entrenadas**. Vienen del dataset AVA,
cuyas imágenes no se han descargado, así que no tienen ni un solo ejemplo
positivo y el modelo las deja pegadas a cero.

**No es un bug. No hay nada que depurar ahí.** Están en el espacio de salida
para no tener que reentrenar ni reexportar cuando lleguen esas imágenes.

Para la app: **el modelo predice de verdad 9 guías**, las de índice 0-8. Las
otras 5 no deben mostrarse. Dos de ellas (`shallow_dof` y `negative_space`) las
cubre mientras tanto `src/motor_ia/geometry.py` por cálculo directo.

## Qué esperar de cada guía

Medido sobre las 1.082 imágenes de test de KU-PCP, con los umbrales de
`thresholds.json`. AUC macro sobre las 9 clases reales: **0,962**. F1 macro:
**0,78**.

| clase            | umbral | precisión | recall | F1    |
| ---------------- | ------ | --------- | ------ | ----- |
| `pattern`        | 0,55   | 0,910     | 0,968  | 0,938 |
| `symmetric`      | 0,55   | 0,880     | 0,889  | 0,884 |
| `horizontal`     | 0,60   | 0,792     | 0,886  | 0,837 |
| `center`         | 0,60   | 0,834     | 0,810  | 0,822 |
| `triangle`       | 0,75   | 0,806     | 0,778  | 0,792 |
| `vertical`       | 0,65   | 0,632     | 0,833  | 0,719 |
| `diagonal`       | 0,65   | 0,640     | 0,725  | 0,680 |
| `curved`         | 0,75   | 0,616     | 0,750  | 0,676 |
| `rule_of_thirds` | 0,45   | 0,577     | 0,808  | 0,673 |

Lectura práctica: **precisión** = de las veces que la guía se enciende, cuántas
acierta. `rule_of_thirds` en 0,577 significa que casi 4 de cada 10 veces que se
activa, se equivoca.

Estos umbrales maximizan **F1**, que pondera igual un falso positivo y un falso
negativo. Para un asistente de cámara puede que no sea lo que quieres: dibujar
una guía equivocada molesta más que no dibujar ninguna. Subir los umbrales
cambia menos detecciones por más fiables. Se recalibra con
`train.calibrate_thresholds` cambiando el criterio de F1 a precisión.

## Qué variante usar: int8 o float16

**Recomendado: int8.** Medido sobre test, ambas dan el mismo F1 macro (0,7791
int8 vs 0,7786 fp16) y AUC dentro de ±0,008 por clase. El int8 pesa 1,8 MB
menos, corre 2-3× más rápido en CPU y su entrada `uint8` es el bitmap de la
cámara sin conversión a float.

**No hace falta recalibrar los umbrales para el int8.** Parece que sí —
cuantizar desvía predicciones individuales hasta 0,45— pero está medido: el F1
se mueve +0,0008, ruido. El motivo es que el F1 es plano alrededor del óptimo.
El mismo `thresholds.json` sirve para las dos variantes.

Si en el móvil aparecen detecciones raras, cambiar al float16 es lo primero que
descartar: la cuantización es lo que peor encaja cuando las imágenes reales se
parecen poco a las de entrenamiento, y todo esto está medido sobre fotos de
KU-PCP, **no sobre frames de visor**.

## La otra mitad del sistema: `geometry.py`

La CNN no es todo el motor. `src/motor_ia/geometry.py` calcula con OpenCV, sin
entrenamiento, lo que es medible de forma determinista: ángulo de inclinación,
posición del horizonte, cuadrante del sujeto, ratio de nitidez fondo/sujeto.
`classes.TIER_GEO` lista las 17 guías que salen de ahí.

El reparto más importante: **la red decide _si_ la composición es diagonal, la
geometría decide _hacia dónde_** (barroca o siniestra). La red no puede dar la
dirección porque el volteo horizontal del entrenamiento la vuelve ciega a la
orientación. Se conecta pasando las predicciones:
`analyze(frame, cnn_labels={"diagonal", ...})`.

**Ojo con la integración:** `geometry.py` es Python con OpenCV. No se copia a la
app como archivo — hay que reimplementar esa lógica en Kotlin/Java con el SDK de
OpenCV para Android. Es trabajo de programación en el lado del móvil, no un
asset que se arrastra.

## Cómo mejorar esto de verdad

Ni recalibrar umbrales ni portar `geometry.py` cambian el modelo: sus pesos son
los que son. Lo único que sube el techo son más datos.

La vía concreta es el subconjunto _style_ de AVA, que activaría las 5 clases
muertas (9 guías → 14). Los IDs ya están en
`data/raw/ava_meta/style_image_lists/*.jpgl`. Contra lo que dice el README, **el
disco no es el obstáculo**: AVA entera son 255.530 imágenes en ~32 GB, pero solo
hacen falta las 14.079 del subconjunto style (~1,8 GB) o incluso las 6.858
útiles (<1 GB). El obstáculo real es que AVA se distribuye como un torrent
monolítico, así que hace falta una fuente que sirva las imágenes por ID.

Cuando lleguen: `python scripts/prepare_ava_style.py && python train.py &&
python export.py --int8`. El espacio de salida no cambia, así que la app sigue
leyendo `labels.txt` igual.

## Lo que no está verificado

Todas las cifras de este documento salen de fotos de KU-PCP: curadas, bien
expuestas, composición intencionada. **El modelo nunca ha visto un frame de
visor real** — con movimiento, luz mala y encuadres a medio hacer. Es el hueco
principal, y solo se cierra probándolo en el móvil.

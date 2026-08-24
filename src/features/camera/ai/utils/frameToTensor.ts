import type { Image } from 'react-native-nitro-image';
import { HybridFrameConverter, type Frame } from 'react-native-vision-camera';

// nitro-image no exporta `PixelFormat` en su índice público; se deriva del
// tipo de retorno real de `toRawPixelData()` para no depender de una ruta
// interna del paquete.
type PixelFormat = ReturnType<Image['toRawPixelData']>['pixelFormat'];

/**
 * Convierte un frame de cámara al tensor de entrada que espera el modelo:
 * 224×224 RGB `uint8`, con el frame completo **estirado**, nunca recortado.
 *
 * El trabajo pesado corre en C++ nativo, no en JS:
 * - `HybridFrameConverter` (VisionCamera, C++/Nitro) copia el frame a una
 *   `Image` de nitro-image **ya enderezada**: aplica `frame.orientation` y
 *   `frame.isMirrored` al construir el bitmap. Esto es lo que permite dejar
 *   `enablePhysicalBufferRotation` en `false` (rotar el buffer en la
 *   canalización de la cámara es caro): el frame llega en orientación de
 *   sensor —apaisado con el móvil en vertical— y sale derecho de aquí. Si
 *   algún día se sustituye el converter, hay que rotar a mano: el modelo
 *   juzga la composición y una imagen girada 90° intercambia las clases
 *   `vertical` y `horizontal`.
 * - `Image.resize()` (nitro-image, C++/Skia) estira al tamaño pedido; nunca
 *   recorta, que es justo lo que exige el contrato del modelo (recortar
 *   cambia la respuesta correcta: la composición *es* dónde cae el sujeto
 *   dentro del encuadre).
 * - `Image.toRawPixelData()` (C++) entrega el buffer ya en memoria nativa.
 *
 * Lo único que hace JS es reordenar canales si hace falta, sobre un buffer
 * de 224×224×{3,4} bytes: barato incluso en el hilo del frame processor.
 */

export const MODEL_INPUT_SIZE = 224;

/**
 * Desplazamiento de R, G y B dentro de cada píxel, según el orden de bytes
 * en memoria que reporta nitro-image. En Android (little-endian) un bitmap
 * `ARGB_8888` se lee como `BGRA`; se cubren también el resto de variantes
 * por si el dispositivo o la superficie de origen difieren.
 */
const RGB_OFFSETS: Partial<
  Record<PixelFormat, readonly [number, number, number]>
> = {
  RGB: [0, 1, 2],
  RGBA: [0, 1, 2],
  RGBX: [0, 1, 2],
  BGR: [2, 1, 0],
  BGRA: [2, 1, 0],
  BGRX: [2, 1, 0],
  ARGB: [1, 2, 3],
  XRGB: [1, 2, 3],
  ABGR: [3, 2, 1],
  XBGR: [3, 2, 1],
};

/**
 * Deja el buffer en RGB puro de 3 bytes/píxel, sin alfa, tal como espera el
 * modelo.
 *
 * Va declarada **antes** de `frameToModelInput` y como `const`, no como
 * `function`: el plugin de worklets captura en el closure las variables que
 * el worklet referencia, y una declaración de función suelta del módulo no
 * llega al runtime del frame processor —allí valía `undefined` y la
 * conversión moría con «undefined is not a function» en cada frame—.
 */
const toRgbUint8 = (
  buffer: ArrayBuffer,
  pixelFormat: PixelFormat,
): ArrayBuffer => {
  'worklet';

  const pixelCount = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE;
  const src = new Uint8Array(buffer);
  const channels = src.length / pixelCount;

  // Ya viene en RGB de 3 canales: nada que reordenar.
  if (channels === 3 && pixelFormat === 'RGB') {
    return buffer;
  }

  // Formato desconocido: se asume que los 3 primeros bytes de cada píxel ya
  // son RGB antes que arriesgar una excepción en el hilo de la cámara.
  const offsets = RGB_OFFSETS[pixelFormat] ?? [0, 1, 2];

  const out = new Uint8Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i += 1) {
    const base = i * channels;
    const dst = i * 3;
    out[dst] = src[base + offsets[0]]!;
    out[dst + 1] = src[base + offsets[1]]!;
    out[dst + 2] = src[base + offsets[2]]!;
  }
  return out.buffer;
};

export function frameToModelInput(frame: Frame): ArrayBuffer {
  'worklet';

  const image = HybridFrameConverter.convertFrameToImage(frame);
  // Estira el frame completo al cuadrado del modelo; no es un center-crop.
  const resized = image.resize(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);
  const raw = resized.toRawPixelData();

  return toRgbUint8(raw.buffer, raw.pixelFormat);
}

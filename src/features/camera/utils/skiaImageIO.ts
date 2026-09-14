import { Skia, ImageFormat, type SkImage } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

import { ContentUriReader, loadImage } from '../services/nativeModules';

/**
 * Lectura y escritura de imágenes con Skia, compartida por todo lo que
 * manipula píxeles de una foto ya capturada (fundir el fantasma, recortar al
 * formato elegido…): decodificar un archivo y volver a escribirlo es siempre
 * el mismo par de pasos, sólo cambia el dibujo de en medio.
 */

/** Calidad JPEG por defecto al reescribir una foto (0..100). */
export const JPEG_QUALITY = 92;

/**
 * Carga un archivo de imagen en memoria como imagen de Skia.
 *
 * `Skia.Data.fromURI` no resuelve `content://` de forma fiable en Android
 * (es como llega un fantasma elegido de la galería, a diferencia de una foto
 * de la propia sesión, que es `file://`): se quedaba colgada varios segundos
 * y terminaba fallando en silencio, así que la fusión con el fantasma nunca
 * se guardaba. Para cualquier URI que no sea `file://`, los bytes se leen
 * con `ContentUriReader` (Kotlin puro, `ContentResolver.openInputStream`) y
 * se decodifican en memoria con `Skia.Data.fromBase64`, sin pasar por el
 * resolutor de URIs de Skia en absoluto.
 */
export async function decodeImage(uri: string): Promise<SkImage | null> {
  if (Platform.OS === 'android' && !uri.startsWith('file://')) {
    const base64 = await ContentUriReader.readAsBase64(uri);
    const data = Skia.Data.fromBase64(base64);
    return Skia.Image.MakeImageFromEncoded(data);
  }
  const data = await Skia.Data.fromURI(uri);
  return Skia.Image.MakeImageFromEncoded(data);
}

/**
 * Saca el `ArrayBuffer` que corresponde exactamente a estos bytes.
 *
 * Un `Uint8Array` puede ser una ventana sobre un buffer mayor, así que pasar
 * `.buffer` a ciegas entregaría bytes de más y el JPEG saldría corrupto. Sólo
 * se copia cuando la vista no cubre el buffer entero.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const cubreTodo =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;

  return cubreTodo
    ? (bytes.buffer as ArrayBuffer)
    : (bytes.slice().buffer as ArrayBuffer);
}

/** Codifica una imagen de Skia a JPEG y la escribe en un archivo temporal. */
export async function encodeToJpegFile(
  image: SkImage,
  quality: number = JPEG_QUALITY,
): Promise<string> {
  const bytes = image.encodeToBytes(ImageFormat.JPEG, quality);
  const saved = await loadImage({
    encodedImageData: {
      buffer: toArrayBuffer(bytes),
      width: image.width(),
      height: image.height(),
      imageFormat: 'jpg',
    },
  });
  const path = await saved.saveToTemporaryFileAsync('jpg', quality);
  return `file://${path}`;
}

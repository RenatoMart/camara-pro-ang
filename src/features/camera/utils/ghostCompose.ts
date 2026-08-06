import { Skia, ImageFormat, type SkImage } from '@shopify/react-native-skia';

import { logger } from '@/utils/logger';

import {
  getFileSystemModule,
  getNitroImageModule,
} from '../services/nativeModules';

/**
 * Funde la superposición fantasma dentro de la foto recién capturada.
 *
 * El visor sólo pinta el fantasma por encima como ayuda para encuadrar, así
 * que la foto que devuelve la cámara sale limpia. Cuando el usuario activa
 * «fundir en la foto», hay que repetir esa mezcla sobre los píxeles reales:
 * Skia abre las dos imágenes, dibuja la escena a tamaño completo y encima el
 * fantasma con la misma opacidad que se veía en pantalla.
 *
 * Se usa Skia porque es la única librería de dibujo que existe **en los dos
 * runtimes** (viene en Expo Go SDK 57 y se compila en la build nativa), de
 * modo que la feature no queda coja en `npm run go`. Escribir el archivo
 * resultante sí necesita un módulo distinto en cada mundo, y eso se resuelve
 * en `nativeModules.ts` como el resto de la cámara.
 */

/** Calidad JPEG del archivo compuesto (0..100). */
const JPEG_QUALITY = 92;

/** Carga un archivo de imagen en memoria como imagen de Skia. */
async function decode(uri: string): Promise<SkImage | null> {
  const data = await Skia.Data.fromURI(uri);
  return Skia.Image.MakeImageFromEncoded(data);
}

/**
 * Dibuja `ghost` cubriendo por completo el lienzo de `base`, recortando lo que
 * sobre en vez de deformarlo.
 *
 * Es el equivalente exacto del `resizeMode="cover"` con el que se pinta el
 * fantasma en el visor: sin esto, una foto vertical mezclada con un fantasma
 * horizontal saldría estirada y dejaría de servir para comparar encuadres.
 */
export function coverRect(
  ghostWidth: number,
  ghostHeight: number,
  baseWidth: number,
  baseHeight: number,
): { x: number; y: number; width: number; height: number } {
  const scale = Math.max(baseWidth / ghostWidth, baseHeight / ghostHeight);
  const width = ghostWidth * scale;
  const height = ghostHeight * scale;

  return {
    x: (baseWidth - width) / 2,
    y: (baseHeight - height) / 2,
    width,
    height,
  };
}

/** Guarda los bytes JPEG con el módulo que exista en este runtime. */
async function writeJpeg(image: SkImage): Promise<string | null> {
  const fileSystem = getFileSystemModule();
  if (fileSystem) {
    const base64 = image.encodeToBase64(ImageFormat.JPEG, JPEG_QUALITY);
    const uri = `${fileSystem.cacheDirectory}fantasma-${Date.now()}.jpg`;
    await fileSystem.writeAsStringAsync(uri, base64, {
      encoding: fileSystem.EncodingType.Base64,
    });
    return uri;
  }

  const nitroImage = getNitroImageModule();
  if (nitroImage) {
    const bytes = image.encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
    const saved = await nitroImage.loadImage({
      encodedImageData: {
        buffer: toArrayBuffer(bytes),
        width: image.width(),
        height: image.height(),
        imageFormat: 'jpg',
      },
    });
    const path = await saved.saveToTemporaryFileAsync('jpg', JPEG_QUALITY);
    return `file://${path}`;
  }

  return null;
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

/**
 * Devuelve la uri de una copia de `photoUri` con `ghostUri` fundido encima, o
 * `null` si no se pudo componer.
 *
 * Nunca lanza: si algo falla, quien llama se queda con la foto original en vez
 * de perder la captura.
 */
export async function composeGhost(
  photoUri: string,
  ghostUri: string,
  opacity: number,
): Promise<string | null> {
  try {
    const [base, ghost] = await Promise.all([
      decode(photoUri),
      decode(ghostUri),
    ]);

    if (base == null || ghost == null) {
      logger.warn('No se pudo decodificar la foto o el fantasma');
      return null;
    }

    const width = base.width();
    const height = base.height();

    const surface = Skia.Surface.MakeOffscreen(width, height);
    if (surface == null) {
      logger.warn('No se pudo crear el lienzo para fundir el fantasma', {
        width,
        height,
      });
      return null;
    }

    const canvas = surface.getCanvas();
    canvas.drawImage(base, 0, 0);

    const paint = Skia.Paint();
    paint.setAlphaf(opacity);
    const target = coverRect(ghost.width(), ghost.height(), width, height);
    canvas.drawImageRect(
      ghost,
      Skia.XYWHRect(0, 0, ghost.width(), ghost.height()),
      Skia.XYWHRect(target.x, target.y, target.width, target.height),
      paint,
    );

    surface.flush();
    return await writeJpeg(surface.makeImageSnapshot());
  } catch (error) {
    logger.error('No se pudo fundir el fantasma en la foto', error);
    return null;
  }
}

import { Skia, ImageFormat, type SkImage } from '@shopify/react-native-skia';

import { logger } from '@/utils/logger';

import { loadImage } from '../services/nativeModules';

/**
 * Funde la superposición fantasma dentro de la foto recién capturada.
 *
 * El visor sólo pinta el fantasma por encima como ayuda para encuadrar, así
 * que la foto que devuelve la cámara sale limpia. Cuando el usuario activa
 * «fundir en la foto», hay que repetir esa mezcla sobre los píxeles reales:
 * Skia abre las dos imágenes, dibuja la escena a tamaño completo y encima el
 * fantasma con la misma opacidad que se veía en pantalla.
 *
 * La mezcla se hace sobre los píxeles reales de la foto, no sobre lo que se
 * ve en pantalla, así que no se pierde resolución. El archivo resultante lo
 * escribe `nitro-image` en la caché temporal.
 */

/** Calidad JPEG del archivo compuesto (0..100). */
const JPEG_QUALITY = 92;

/**
 * Tope de tiempo para fundir el fantasma.
 *
 * Decodificar la foto y el fantasma depende de dónde salgan sus archivos: una
 * imagen del carrete llega como `content://` y su lectura puede quedarse
 * esperando indefinidamente. Sin este tope, ese cuelgue se llevaba por
 * delante toda la captura —el disparador se quedaba girando para siempre y la
 * foto no se guardaba nunca—. Agotado el plazo se guarda la toma limpia, que
 * siempre es mejor que perderla.
 */
const COMPOSE_TIMEOUT_MS = 10_000;

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

/** Escribe los bytes JPEG a un archivo temporal y devuelve su uri. */
async function writeJpeg(image: SkImage): Promise<string> {
  const bytes = image.encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
  const saved = await loadImage({
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
  return Promise.race([
    compose(photoUri, ghostUri, opacity),
    new Promise<null>(resolve => {
      setTimeout(() => {
        logger.warn(
          'Fundir el fantasma tardó demasiado; se guarda la foto limpia',
        );
        resolve(null);
      }, COMPOSE_TIMEOUT_MS);
    }),
  ]);
}

async function compose(
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

import { Skia } from '@shopify/react-native-skia';

import { logger } from '@/utils/logger';

import { decodeImage, encodeToJpegFile } from './skiaImageIO';

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

/**
 * Tope de tiempo para fundir el fantasma.
 *
 * Red de seguridad, no la defensa principal: `decodeImage` (`skiaImageIO.ts`)
 * ya sabe leer tanto `file://` como `content://` (el fantasma elegido de la
 * galería) de forma fiable. Esto sigue aquí por si el archivo es enorme, sale
 * de un almacenamiento lento, o falla algo imprevisto: mejor guardar la toma
 * limpia a los pocos segundos que dejar el disparador esperando para siempre.
 */
const COMPOSE_TIMEOUT_MS = 10_000;

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
      decodeImage(photoUri),
      decodeImage(ghostUri),
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
    return await encodeToJpegFile(surface.makeImageSnapshot());
  } catch (error) {
    logger.error('No se pudo fundir el fantasma en la foto', error);
    return null;
  }
}

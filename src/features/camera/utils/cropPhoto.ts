import { Skia } from '@shopify/react-native-skia';

import { logger } from '@/utils/logger';

import { aspectCropInsets } from './geometry';
import { decodeImage, encodeToJpegFile } from './skiaImageIO';

/**
 * Recorta la foto ya capturada a la relación de aspecto elegida (1:1, 4:5,
 * 9:16…), centrada.
 *
 * `AspectMask` sólo sombrea en el visor lo que quedaría fuera del formato: la
 * cámara siempre entrega el fotograma completo del sensor, así que sin este
 * paso la máscara era pura decoración y la foto salía igual sin importar el
 * formato elegido.
 *
 * El recorte se calcula sobre las dimensiones propias de la foto (no las de
 * la pantalla): `ratio` ya es "ancho/alto con el teléfono en vertical" (ver
 * `ASPECTS` en `constants/guides.ts`), la misma cuenta que usa `AspectMask`
 * para dibujar la sombra, sólo que aquí se aplica a los píxeles reales.
 *
 * Nunca lanza: si algo falla se devuelve la `uri` original, porque vale más
 * una foto sin recortar que ninguna.
 */
export async function cropPhotoToAspect(
  uri: string,
  ratio: number | null,
): Promise<string> {
  if (ratio === null) {
    return uri;
  }

  try {
    const image = await decodeImage(uri);
    if (image == null) {
      logger.warn('No se pudo decodificar la foto para recortarla');
      return uri;
    }

    const insets = aspectCropInsets(image.width(), image.height(), ratio);
    const cropWidth = image.width() - insets.left - insets.right;
    const cropHeight = image.height() - insets.top - insets.bottom;

    // Insets a cero (la foto ya tiene ese aspecto, o el redondeo no deja
    // nada que recortar): no vale la pena repasar la imagen por un recorte
    // que no cambiaría un solo píxel.
    if (insets.left === 0 && insets.top === 0) {
      return uri;
    }

    const surface = Skia.Surface.MakeOffscreen(cropWidth, cropHeight);
    if (surface == null) {
      logger.warn('No se pudo crear el lienzo para recortar la foto', {
        cropWidth,
        cropHeight,
      });
      return uri;
    }

    const canvas = surface.getCanvas();
    canvas.drawImageRect(
      image,
      Skia.XYWHRect(insets.left, insets.top, cropWidth, cropHeight),
      Skia.XYWHRect(0, 0, cropWidth, cropHeight),
      Skia.Paint(),
    );

    surface.flush();
    return await encodeToJpegFile(surface.makeImageSnapshot());
  } catch (error) {
    logger.error('No se pudo recortar la foto al formato elegido', error);
    return uri;
  }
}

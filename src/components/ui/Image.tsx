import React from 'react';
import {
  Image as RNImage,
  type ImageProps as RNImageProps,
} from 'react-native';

export type ImageProps = RNImageProps;

/**
 * Imagen de la app. Sustituye siempre al `Image` de react-native.
 *
 * Este archivo es el ejemplo del patrón "design system": la app importa
 * `Image` desde `@/components/ui`, nunca desde el paquete. Así, cambiar la
 * implementación de todas las imágenes de la app es tocar un solo archivo.
 *
 * ## Si necesitas caché y placeholders
 *
 * El proyecto ya usa `react-native-nitro-image`, que aporta carga eficiente y
 * thumbhash. Si algún día hace falta más (caché en disco, carga progresiva),
 * el cambio se hace **sólo aquí**, sin tocar el resto de la app.
 *
 * ## Rendimiento en listas
 *
 * Pide siempre la imagen al tamaño en que se va a mostrar (×2 para pantallas
 * retina). Cargar el original a resolución completa para un thumbnail es la
 * causa más común de tirones al hacer scroll:
 *
 * ```tsx
 * <Image source={{ uri: `${url}?w=200&h=200&fit=cover` }} />
 * ```
 */
export function Image(props: ImageProps) {
  return <RNImage resizeMode="cover" {...props} />;
}

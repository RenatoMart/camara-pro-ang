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
 * ## Cómo migrar a expo-image (recomendado en producción)
 *
 * `expo-image` aporta caché en memoria y disco, placeholders con blurhash,
 * carga progresiva y bastante menos uso de memoria — importa sobre todo
 * dentro de listas. Aquí no viene por defecto porque es un módulo de Expo:
 * funciona en Expo Go, pero requiere `expo-modules-core` enlazado en
 * `android/` e `ios/` para las builds nativas, y `install-expo-modules`
 * todavía no soporta React Native 0.86.
 *
 * Cuando quieras dar el salto:
 *
 * ```bash
 * npx expo install expo-image
 * npx expo prebuild   # regenera android/ e ios/ con los módulos de Expo
 * ```
 *
 * y cambia sólo este archivo:
 *
 * ```tsx
 * import { Image as ExpoImage } from 'expo-image';
 *
 * export function Image(props: ImageProps) {
 *   return <ExpoImage contentFit="cover" transition={120} {...props} />;
 * }
 * ```
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

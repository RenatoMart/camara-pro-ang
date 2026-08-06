import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import React, { memo, useCallback } from 'react';
import { Image, Pressable, useWindowDimensions } from 'react-native';

import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { StateView } from '@/components/ui/StateView';
import type { RootScreenProps } from '@/navigation/types';
import { makeStyles } from '@/theme';

import {
  GalleryPermissionError,
  GalleryUnavailableError,
  fetchGalleryPhotos,
  type GalleryPhoto,
} from '../api/galleryPhotos';

const COLUMNS = 3;

type PhotoCellProps = {
  photo: GalleryPhoto;
  size: number;
  onPress: (photo: GalleryPhoto) => void;
};

const PhotoCell = memo(function PhotoCellBase({
  photo,
  size,
  onPress,
}: PhotoCellProps) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={() => onPress(photo)}
      accessibilityRole="imagebutton"
      accessibilityLabel="Abrir foto"
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Image
        source={{ uri: photo.uri }}
        style={[styles.cell, { width: size, height: size }]}
        accessibilityIgnoresInvertColors
      />
    </Pressable>
  );
});

/**
 * Galería: cuadrícula densa de 3 columnas con las últimas fotos del carrete.
 *
 * Los cuatro estados de siempre: cargando, error (permiso o build sin
 * módulo, con mensajes distintos), vacío y datos.
 */
export function GalleryScreen({ navigation }: RootScreenProps<'Galeria'>) {
  const { width } = useWindowDimensions();
  const cellSize = width / COLUMNS;

  const {
    data: photos,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['galeria', 'fotos'],
    queryFn: fetchGalleryPhotos,
    staleTime: 30_000,
  });

  const openPhoto = useCallback(
    (photo: GalleryPhoto) => {
      navigation.navigate('FotoDetalle', { uri: photo.uri });
    },
    [navigation],
  );

  const renderItem = useCallback<ListRenderItem<GalleryPhoto>>(
    ({ item }) => (
      <PhotoCell photo={item} size={cellSize} onPress={openPhoto} />
    ),
    [cellSize, openPhoto],
  );

  const keyExtractor = useCallback((item: GalleryPhoto) => item.id, []);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isPending) {
    return (
      <Screen>
        <Loader fullscreen message="Cargando galería…" />
      </Screen>
    );
  }

  if (isError) {
    const isPermission = error instanceof GalleryPermissionError;
    const isUnavailable = error instanceof GalleryUnavailableError;

    return (
      <Screen>
        <StateView
          tone="error"
          title={
            isUnavailable
              ? 'Galería no disponible en esta build'
              : isPermission
              ? 'Sin permiso para leer tus fotos'
              : 'No se pudo cargar la galería'
          }
          description={
            isUnavailable
              ? 'Abre la app con Expo Go (npm run go) para ver tus fotos.'
              : isPermission
              ? 'Concede el permiso de fotos para ver aquí tu carrete.'
              : 'Inténtalo de nuevo en unos segundos.'
          }
          actionLabel={isUnavailable ? undefined : 'Reintentar'}
          onAction={handleRefresh}
        />
      </Screen>
    );
  }

  if (photos.length === 0) {
    return (
      <Screen>
        <StateView
          title="Todavía no hay fotos"
          description="Las fotos que tomes con la cámara aparecerán aquí."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlashList
        data={photos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={COLUMNS}
        refreshing={isRefetching}
        onRefresh={handleRefresh}
      />
    </Screen>
  );
}

const useStyles = makeStyles(theme => ({
  cell: {
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
}));

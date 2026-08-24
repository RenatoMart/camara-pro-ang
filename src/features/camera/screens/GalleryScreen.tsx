import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import React, { memo, useCallback } from 'react';
import { Image, Pressable, useWindowDimensions } from 'react-native';

import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { StateView } from '@/components/ui/StateView';
import type { RootScreenProps } from '@/navigation/types';
import { useCameraStore } from '@/store/cameraStore';
import { makeStyles } from '@/theme';

import {
  GALLERY_PHOTOS_QUERY_KEY,
  GALLERY_STALE_TIME_MS,
  GalleryPermissionError,
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
export function GalleryScreen({
  navigation,
  route,
}: RootScreenProps<'Galeria'>) {
  const { width } = useWindowDimensions();
  const cellSize = width / COLUMNS;
  const eligiendoFantasma = route.params?.modo === 'fantasma';
  const setGhost = useCameraStore(state => state.setGhost);

  const {
    data: photos,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: GALLERY_PHOTOS_QUERY_KEY,
    queryFn: fetchGalleryPhotos,
    staleTime: GALLERY_STALE_TIME_MS,
  });

  const openPhoto = useCallback(
    (photo: GalleryPhoto) => {
      // Abierta desde el fantasma, tocar una foto es elegirla, no verla.
      if (eligiendoFantasma) {
        setGhost(photo.uri);
        navigation.goBack();
        return;
      }
      navigation.navigate('FotoDetalle', { uri: photo.uri });
    },
    [eligiendoFantasma, navigation, setGhost],
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

    return (
      <Screen>
        <StateView
          tone="error"
          title={
            isPermission
              ? 'Sin permiso para leer tus fotos'
              : 'No se pudo cargar la galería'
          }
          description={
            isPermission
              ? 'Concede el permiso de fotos para ver aquí tu carrete.'
              : 'Inténtalo de nuevo en unos segundos.'
          }
          actionLabel="Reintentar"
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
          description={
            eligiendoFantasma
              ? 'Toma una foto y podrás usarla como fantasma.'
              : 'Las fotos que tomes con la cámara aparecerán aquí.'
          }
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

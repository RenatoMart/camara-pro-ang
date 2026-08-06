import { useNavigation } from '@react-navigation/native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import React, { useCallback } from 'react';
import { RefreshControl, View } from 'react-native';

import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { StateView } from '@/components/ui/StateView';
import { ApiError } from '@/services/api/errors';
import { makeStyles, useTheme } from '@/theme';

import { PostListItem } from '../components/PostListItem';
import { usePostsQuery } from '../hooks/usePosts';
import type { Post } from '../types';

/**
 * Pantalla de lista.
 *
 * Modelo a copiar en cualquier pantalla que cargue datos:
 * - se manejan los cuatro estados posibles (cargando, error, vacío, con datos),
 * - se virtualiza con FlashList: sólo monta los elementos visibles, incluso en
 *   listas cortas,
 * - `renderItem`, `keyExtractor` y los handlers se estabilizan con
 *   `useCallback` para no romper el `memo()` de cada fila.
 */
export function FeedScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = useStyles();

  const { data, isPending, isError, error, refetch, isRefetching } =
    usePostsQuery();

  const handlePressPost = useCallback(
    (post: Post) => {
      navigation.navigate('PostDetail', {
        postId: post.id,
        title: post.title,
      });
    },
    [navigation],
  );

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  // Nada de objetos inline aquí: romperían la memoización de PostListItem.
  const renderItem = useCallback<ListRenderItem<Post>>(
    ({ item }) => <PostListItem post={item} onPress={handlePressPost} />,
    [handlePressPost],
  );

  const keyExtractor = useCallback((item: Post) => String(item.id), []);

  if (isPending) {
    return <Loader fullscreen message="Cargando publicaciones…" />;
  }

  if (isError) {
    return (
      <Screen>
        <StateView
          tone="error"
          title="No pudimos cargar el feed"
          description={
            error instanceof ApiError ? error.message : 'Intenta de nuevo.'
          }
          actionLabel="Reintentar"
          onAction={handleRefresh}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlashList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    </Screen>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

function ListEmpty() {
  return (
    <StateView
      title="Todavía no hay publicaciones"
      description="Cuando existan aparecerán aquí."
    />
  );
}

const useStyles = makeStyles(theme => ({
  list: {
    padding: theme.spacing.lg,
  },
  separator: {
    height: theme.spacing.md,
  },
}));

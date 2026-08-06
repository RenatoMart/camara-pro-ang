import React from 'react';

import { Loader } from '@/components/ui/Loader';
import { Screen } from '@/components/ui/Screen';
import { StateView } from '@/components/ui/StateView';
import { Text } from '@/components/ui/Text';
import type { RootScreenProps } from '@/navigation/types';
import { ApiError } from '@/services/api/errors';

import { usePostQuery } from '../hooks/usePosts';

/**
 * Los parámetros de ruta llegan tipados gracias a `RootScreenProps`:
 * `route.params.postId` es `number`, sin castings ni `any`.
 */
export function PostDetailScreen({ route }: RootScreenProps<'PostDetail'>) {
  const { postId } = route.params;
  const { data, isPending, isError, error, refetch } = usePostQuery(postId);

  if (isPending) {
    return <Loader fullscreen message="Cargando publicación…" />;
  }

  if (isError || !data) {
    return (
      <Screen>
        <StateView
          tone="error"
          title="No pudimos cargar la publicación"
          description={
            error instanceof ApiError ? error.message : 'Intenta de nuevo.'
          }
          actionLabel="Reintentar"
          onAction={() => {
            void refetch();
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <Text variant="title">{data.title}</Text>
      <Text variant="overline" color="textSecondary">
        Autor #{data.userId}
      </Text>
      <Text variant="body" color="textSecondary">
        {data.body}
      </Text>
    </Screen>
  );
}

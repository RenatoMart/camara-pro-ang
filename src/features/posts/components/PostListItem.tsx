import React, { memo, useCallback } from 'react';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

import type { Post } from '../types';

type Props = {
  post: Post;
  onPress: (post: Post) => void;
};

/**
 * Item de la lista.
 *
 * Va envuelto en `memo` y el handler se estabiliza con `useCallback`: en
 * listas largas, esto evita re-renderizar cada fila cuando cambia el padre.
 */
function PostListItemComponent({ post, onPress }: Props) {
  const handlePress = useCallback(() => onPress(post), [onPress, post]);

  return (
    <Card onPress={handlePress} accessibilityLabel={`Abrir: ${post.title}`}>
      <Text variant="bodyStrong" numberOfLines={2}>
        {post.title}
      </Text>
      <Text variant="caption" color="textSecondary" numberOfLines={2}>
        {post.body}
      </Text>
    </Card>
  );
}

export const PostListItem = memo(PostListItemComponent);

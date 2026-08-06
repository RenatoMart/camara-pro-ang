import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/services/api/queryClient';

import { postsApi } from '../api/postsApi';
import type { Post } from '../types';

/**
 * Hooks del feature: la única capa que conoce React Query.
 *
 * Las pantallas consumen estos hooks y nunca llaman a `postsApi` directamente;
 * así la caché, los reintentos y la invalidación quedan en un solo sitio.
 */

export function usePostsQuery() {
  return useQuery({
    queryKey: queryKeys.posts.lists(),
    // `signal` cancela la petición si el componente se desmonta.
    queryFn: ({ signal }) => postsApi.list(signal),
  });
}

export function usePostQuery(postId: number) {
  return useQuery({
    queryKey: queryKeys.posts.detail(postId),
    queryFn: ({ signal }) => postsApi.detail(postId, signal),
    enabled: Number.isFinite(postId),
  });
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: (created: Post) => {
      // Sembramos el detalle y refrescamos la lista.
      queryClient.setQueryData(queryKeys.posts.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() });
    },
  });
}

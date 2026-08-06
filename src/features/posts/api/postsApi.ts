import { http } from '@/services/api/client';

import type { Post } from '../types';

/**
 * Funciones de red del feature.
 *
 * Se mantienen "tontas": reciben parámetros, devuelven datos tipados y no
 * saben nada de React. Eso las hace triviales de testear y reusar.
 */
export const postsApi = {
  list: (signal?: AbortSignal) => http.get<Post[]>('/posts', { signal }),

  detail: (id: number, signal?: AbortSignal) =>
    http.get<Post>(`/posts/${id}`, { signal }),

  create: (input: Pick<Post, 'title' | 'body' | 'userId'>) =>
    http.post<Post, typeof input>('/posts', input),
};

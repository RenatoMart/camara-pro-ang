import { useMutation } from '@tanstack/react-query';

import { useAuthStore, type User } from '@/store/authStore';

import type { SignInForm } from '../schemas/signInSchema';

/**
 * Login simulado.
 *
 * En un proyecto real, sustituye `fakeSignIn` por
 * `http.post<AuthResponse>('/auth/login', credentials)`. Todo lo demás
 * (guardar el token, cambiar de árbol de navegación) ya funciona igual.
 */
async function fakeSignIn(credentials: SignInForm): Promise<{
  user: User;
  token: string;
}> {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), 600);
  });

  return {
    user: {
      id: '1',
      name: credentials.email.split('@')[0] ?? 'Usuario',
      email: credentials.email,
    },
    token: 'demo-token',
  };
}

export function useSignIn() {
  const signIn = useAuthStore(state => state.signIn);

  return useMutation({
    mutationFn: fakeSignIn,
    onSuccess: signIn,
  });
}

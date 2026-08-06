import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { configureApiAuth } from '@/services/api/client';
import { StorageKeys, secureStorage } from '@/services/storage';

export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  /** `false` hasta que termina de rehidratarse desde el disco. */
  isHydrated: boolean;
};

type AuthActions = {
  signIn: (payload: { user: User; token: string }) => void;
  signOut: () => void;
  setHydrated: () => void;
};

const initialState: AuthState = {
  status: 'idle',
  user: null,
  token: null,
  isHydrated: false,
};

/**
 * Sesión del usuario.
 *
 * A diferencia del resto de stores, éste **no** persiste en AsyncStorage: usa
 * `secureStorage`, que guarda en el Keychain de iOS y en el Keystore de
 * Android. El token de acceso es una credencial, y AsyncStorage la dejaría en
 * texto plano dentro del sandbox de la app.
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    set => ({
      ...initialState,

      signIn: ({ user, token }) =>
        set({ user, token, status: 'authenticated' }),

      signOut: () =>
        set({ user: null, token: null, status: 'unauthenticated' }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: StorageKeys.authToken,
      storage: createJSONStorage(() => secureStorage),
      version: 1,
      // No persistimos flags derivados de la sesión en memoria.
      partialize: state => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => state => {
        useAuthStore.setState({
          status: state?.token ? 'authenticated' : 'unauthenticated',
          isHydrated: true,
        });
      },
    },
  ),
);

/**
 * Conecta el cliente HTTP con el store.
 *
 * Se hace por inyección (y no importando el store dentro de `client.ts`) para
 * evitar un ciclo de imports entre red y estado.
 */
configureApiAuth({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().signOut(),
});

/** Selectores: úsalos en los componentes para no re-renderizar de más. */
export const selectIsAuthenticated = (state: AuthState) =>
  state.status === 'authenticated';
export const selectUser = (state: AuthState) => state.user;

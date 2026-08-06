import {
  CommonActions,
  createNavigationContainerRef,
} from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Referencia global al navegador.
 *
 * Permite navegar desde fuera de React (interceptores HTTP, notificaciones
 * push, deep links). Dentro de componentes usa siempre `useNavigation()`,
 * que además respeta el ciclo de vida de la pantalla.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navega si el contenedor ya está montado; si no, no hace nada. */
export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(CommonActions.navigate({ name, params }));
}

export function goBack(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}

/** Reemplaza toda la pila. Útil tras cerrar sesión o abrir un deep link. */
export function resetTo<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): void {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name, params }] }),
  );
}

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Mapa de rutas y parámetros.
 *
 * Ésta es la fuente de verdad de la navegación: si una pantalla espera un
 * parámetro, se declara aquí y TypeScript obliga a pasarlo en cada `navigate`.
 */

export type AuthStackParamList = {
  SignIn: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  PostDetail: { postId: number; title?: string };
};

/** Props tipadas de una pantalla del stack raíz. */
export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

/**
 * Hace que `useNavigation()` sepa de estas rutas sin tener que pasar
 * genéricos en cada llamada.
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

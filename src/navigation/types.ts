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
  // — App de cámara —
  Camara: undefined;
  /**
   * Sin parámetros es la galería de siempre. Con `modo: 'fantasma'` se abre
   * para elegir qué foto se superpone en el visor: al tocar una, la fija y
   * vuelve a la cámara en lugar de abrir el detalle.
   */
  Galeria: { modo?: 'fantasma' } | undefined;
  FotoDetalle: { uri: string };
  Ajustes: undefined;

  // — Ejemplo de la plantilla (auth + feed). No está montado en la app de
  //   cámara, pero se conservan las rutas para que el código de ejemplo
  //   compile y sirva de referencia. —
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

import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * Deep links.
 *
 * Para que funcionen hay que registrar el esquema en las plataformas nativas:
 * - Android: `<intent-filter>` en `android/app/src/main/AndroidManifest.xml`
 * - iOS: `CFBundleURLTypes` en `ios/<App>/Info.plist`
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['camaraproang://', 'https://camaraproang.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          SignIn: 'login',
        },
      },
      Main: {
        screens: {
          Feed: 'feed',
          Settings: 'ajustes',
        },
      },
      PostDetail: 'post/:postId',
    },
  },
};

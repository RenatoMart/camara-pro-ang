/**
 * Punto de entrada de la app.
 *
 * `react-native-gesture-handler` debe importarse en la primerísima línea,
 * antes que cualquier otro módulo.
 *
 * El componente raíz se registra con el nombre de `app.json`, que es el que
 * busca el código nativo de Android/iOS al arrancar.
 *
 * Ojo: `android/app/build.gradle` apunta `entryFile` a este archivo. El
 * plugin de React Native asume `index.js`, y sin esa línea la build de
 * release falla al generar el bundle.
 */
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import App from './src/App';

AppRegistry.registerComponent(appName, () => App);

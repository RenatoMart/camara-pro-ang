/**
 * Punto de entrada de la app.
 *
 * `react-native-gesture-handler` debe importarse en la primerísima línea,
 * antes que cualquier otro módulo.
 *
 * Se registra el componente raíz con dos nombres a propósito:
 * - `appName` (de app.json) es el que busca el código nativo en una build
 *   normal de Android/iOS,
 * - `'main'` es el que busca Expo Go.
 *
 * Registrar ambos permite usar el mismo proyecto en los dos flujos sin tocar
 * nada.
 */
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';

import { name as appName } from './app.json';
import App from './src/App';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('main', () => App);

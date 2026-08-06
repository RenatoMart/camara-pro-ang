import React from 'react';

import { RootNavigator } from '@/navigation/RootNavigator';
import { AppProviders } from '@/providers/AppProviders';
// Importar el store de auth aquí garantiza que el cliente HTTP quede
// conectado con la sesión antes del primer render.
import '@/store/authStore';

/**
 * Raíz de la aplicación.
 *
 * Se mantiene deliberadamente mínima: providers por un lado, navegación por
 * otro. Toda la lógica vive en `features/`.
 */
export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

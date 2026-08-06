import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/**
 * Estado del ciclo de vida de la app (activa / segundo plano / inactiva).
 *
 * Útil para pausar timers, refrescar datos al volver o bloquear la app con
 * biometría. `onForeground` sólo se dispara en la transición real a activo.
 */
export function useAppState(callbacks?: {
  onForeground?: () => void;
  onBackground?: () => void;
}): AppStateStatus {
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );

  // Guardamos los callbacks en una ref para no re-suscribir en cada render.
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setAppState(previous => {
        if (previous.match(/inactive|background/) && nextState === 'active') {
          callbacksRef.current?.onForeground?.();
        } else if (
          previous === 'active' &&
          nextState.match(/inactive|background/)
        ) {
          callbacksRef.current?.onBackground?.();
        }
        return nextState;
      });
    });

    return () => subscription.remove();
  }, []);

  return appState;
}

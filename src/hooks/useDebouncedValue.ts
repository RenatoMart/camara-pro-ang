import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor.
 *
 * Uso típico: buscadores, para no lanzar una petición por cada tecla.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

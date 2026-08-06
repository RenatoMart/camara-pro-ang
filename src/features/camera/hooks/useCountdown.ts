import { useCallback, useEffect, useRef, useState } from 'react';

export type Countdown = {
  /** Segundos restantes; null cuando no hay cuenta atrás en marcha. */
  secondsLeft: number | null;
  isRunning: boolean;
  /** Arranca una cuenta atrás y resuelve al llegar a cero (o al cancelar). */
  start: (seconds: number) => Promise<'completada' | 'cancelada'>;
  cancel: () => void;
};

/**
 * Cuenta atrás del temporizador de disparo.
 *
 * Devuelve una promesa para poder encadenarla con la captura:
 * `if ((await start(3)) === 'completada') { disparar(); }`.
 */
export function useCountdown(): Countdown {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<
    ((result: 'completada' | 'cancelada') => void) | null
  >(null);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsLeft(null);
  }, []);

  const cancel = useCallback(() => {
    clear();
    resolveRef.current?.('cancelada');
    resolveRef.current = null;
  }, [clear]);

  const start = useCallback(
    (seconds: number) => {
      cancel();

      return new Promise<'completada' | 'cancelada'>(resolve => {
        resolveRef.current = resolve;
        let remaining = seconds;
        setSecondsLeft(remaining);

        intervalRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            clear();
            resolveRef.current = null;
            resolve('completada');
            return;
          }
          setSecondsLeft(remaining);
        }, 1000);
      });
    },
    [cancel, clear],
  );

  // Al desmontar la pantalla no debe quedar ningún intervalo vivo.
  useEffect(() => cancel, [cancel]);

  return { secondsLeft, isRunning: secondsLeft !== null, start, cancel };
}

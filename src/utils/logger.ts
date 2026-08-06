/**
 * Logger centralizado.
 *
 * En producción no imprime nada por consola: aquí es donde conectarías Sentry,
 * Crashlytics o el servicio que uses. El resto de la app nunca llama a
 * `console.*` directamente (lo impide la regla `no-console` de ESLint).
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type Metadata = Record<string, unknown>;

const enabled = __DEV__;

function write(level: LogLevel, message: string, meta?: Metadata): void {
  if (!enabled) {
    return;
  }

  const prefix = `[${level.toUpperCase()}]`;

  switch (level) {
    case 'error':
      console.error(prefix, message, meta ?? '');
      break;
    case 'warn':
      console.warn(prefix, message, meta ?? '');
      break;
    default:
      console.log(prefix, message, meta ?? '');
  }
}

export const logger = {
  debug: (message: string, meta?: Metadata) => write('debug', message, meta),
  info: (message: string, meta?: Metadata) => write('info', message, meta),
  warn: (message: string, meta?: Metadata) => write('warn', message, meta),

  /**
   * Reporta un error. En producción reemplaza el cuerpo por el envío al
   * servicio de monitoreo (`Sentry.captureException(error, { extra: meta })`).
   */
  error: (message: string, error?: unknown, meta?: Metadata) => {
    write('error', message, { ...meta, error });
  },
};

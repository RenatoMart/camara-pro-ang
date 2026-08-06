import axios from 'axios';

/**
 * Error de dominio de la app.
 *
 * Toda la UI trabaja con `ApiError`, nunca con `AxiosError`: así cambiar de
 * cliente HTTP no obliga a tocar pantallas ni hooks.
 */
export type ApiErrorKind =
  | 'network' // sin conexión / DNS / timeout
  | 'timeout'
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'validation' // 422
  | 'server' // 5xx
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly data: unknown;

  constructor(
    kind: ApiErrorKind,
    message: string,
    status?: number,
    data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.data = data;
  }

  /** `true` si reintentar tiene sentido. */
  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'server'
    );
  }
}

function messageForStatus(status: number): [ApiErrorKind, string] {
  switch (status) {
    case 401:
      return ['unauthorized', 'Tu sesión expiró. Inicia sesión de nuevo.'];
    case 403:
      return ['forbidden', 'No tienes permiso para hacer esto.'];
    case 404:
      return ['notFound', 'No encontramos lo que buscabas.'];
    case 422:
      return ['validation', 'Revisa los datos enviados.'];
    default:
      if (status >= 500) {
        return ['server', 'El servidor tuvo un problema. Intenta más tarde.'];
      }
      return ['unknown', 'Ocurrió un error inesperado.'];
  }
}

/** Convierte cualquier excepción en un `ApiError` con mensaje presentable. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return new ApiError('timeout', 'La solicitud tardó demasiado.');
    }

    if (!error.response) {
      return new ApiError(
        'network',
        'Sin conexión. Verifica tu internet e intenta de nuevo.',
      );
    }

    const { status, data } = error.response;
    const [kind, fallbackMessage] = messageForStatus(status);
    const serverMessage =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : undefined;

    return new ApiError(kind, serverMessage ?? fallbackMessage, status, data);
  }

  return new ApiError(
    'unknown',
    error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
  );
}

import { AxiosError, AxiosHeaders } from 'axios';

import { ApiError, toApiError } from './errors';

function axiosErrorWithStatus(status: number, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const error = new AxiosError('request failed', 'ERR_BAD_RESPONSE', config);
  error.response = {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  } as AxiosError['response'];
  return error;
}

describe('toApiError', () => {
  it('mapea 401 a "unauthorized"', () => {
    expect(toApiError(axiosErrorWithStatus(401)).kind).toBe('unauthorized');
  });

  it('mapea 5xx a "server" y lo marca como reintentable', () => {
    const error = toApiError(axiosErrorWithStatus(503));

    expect(error.kind).toBe('server');
    expect(error.isRetryable).toBe(true);
  });

  it('prefiere el mensaje que envía el servidor', () => {
    const error = toApiError(
      axiosErrorWithStatus(422, { message: 'El correo ya existe' }),
    );

    expect(error.message).toBe('El correo ya existe');
  });

  it('detecta la falta de respuesta como error de red', () => {
    const error = new AxiosError('Network Error');

    expect(toApiError(error).kind).toBe('network');
  });

  it('deja pasar un ApiError sin envolverlo otra vez', () => {
    const original = new ApiError('notFound', 'no está');

    expect(toApiError(original)).toBe(original);
  });
});

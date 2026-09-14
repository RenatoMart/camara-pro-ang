import { useCallback, useEffect, useState } from 'react';
import { VisionCamera } from 'react-native-vision-camera';

import { logger } from '@/utils/logger';

export type MicrophonePermissionStatus =
  | 'comprobando'
  | 'concedido'
  | 'denegado';

export type MicrophonePermission = {
  status: MicrophonePermissionStatus;
  /** Vuelve a pedir el permiso al sistema. */
  request: () => Promise<void>;
};

/**
 * Permiso de micrófono, para el audio del vídeo.
 *
 * A diferencia de `useCameraPermission`, éste **no lo pide solo al montar**:
 * el micrófono sólo hace falta en modo vídeo, así que quien use el hook debe
 * llamar a `request()` cuando el usuario entre a ese modo. Pedirlo de
 * entrada, como la cámara, molestaría a quien nunca graba vídeo.
 *
 * Denegado no bloquea nada: `useVideoRecording` graba igual, sin pista de
 * audio — más vale un vídeo mudo que ningún vídeo.
 */
export function useMicrophonePermission(): MicrophonePermission {
  const [status, setStatus] =
    useState<MicrophonePermissionStatus>('comprobando');

  const request = useCallback(async () => {
    try {
      const granted = await VisionCamera.requestMicrophonePermission();
      setStatus(granted ? 'concedido' : 'denegado');
    } catch (error) {
      logger.error('No se pudo pedir el permiso de micrófono', error);
      setStatus('denegado');
    }
  }, []);

  useEffect(() => {
    setStatus(
      VisionCamera.microphonePermissionStatus === 'authorized'
        ? 'concedido'
        : 'denegado',
    );
  }, []);

  return { status, request };
}

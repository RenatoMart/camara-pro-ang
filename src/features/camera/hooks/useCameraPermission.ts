import { useCallback, useEffect, useState } from 'react';
import { VisionCamera } from 'react-native-vision-camera';

import { logger } from '@/utils/logger';

export type CameraPermissionStatus = 'comprobando' | 'concedido' | 'denegado';

export type CameraPermission = {
  status: CameraPermissionStatus;
  /** Vuelve a pedir el permiso al sistema. */
  request: () => Promise<void>;
};

/**
 * Permiso de cámara, sobre la API imperativa de VisionCamera.
 *
 * Se usa la API imperativa y no el hook del paquete para poder comprobar el
 * estado y pedirlo desde un efecto, sin acoplar el render al permiso.
 */
export function useCameraPermission(): CameraPermission {
  const [status, setStatus] = useState<CameraPermissionStatus>('comprobando');

  const request = useCallback(async () => {
    try {
      const granted = await VisionCamera.requestCameraPermission();
      setStatus(granted ? 'concedido' : 'denegado');
    } catch (error) {
      logger.error('No se pudo pedir el permiso de cámara', error);
      setStatus('denegado');
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const check = async () => {
      try {
        if (VisionCamera.cameraPermissionStatus === 'authorized') {
          if (isActive) {
            setStatus('concedido');
          }
          return;
        }
        // Primera vez (o permiso revocado): se pide directamente.
        await request();
      } catch (error) {
        logger.error('No se pudo comprobar el permiso de cámara', error);
        if (isActive) {
          setStatus('denegado');
        }
      }
    };

    void check();

    return () => {
      isActive = false;
    };
  }, [request]);

  return { status, request };
}

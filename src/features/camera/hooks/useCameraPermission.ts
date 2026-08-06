import { useCallback, useEffect, useState } from 'react';

import { logger } from '@/utils/logger';

import {
  getCameraModule,
  getVisionCameraModule,
} from '../services/nativeModules';

export type CameraPermissionStatus =
  | 'comprobando'
  | 'concedido'
  | 'denegado'
  | 'sin-modulo';

export type CameraPermission = {
  status: CameraPermissionStatus;
  /** Vuelve a pedir el permiso al sistema. */
  request: () => Promise<void>;
};

/**
 * Permiso de cámara, sobre la API imperativa del módulo que exista:
 * expo-camera en Expo Go, VisionCamera en la build nativa.
 *
 * No se usan los hooks de permisos de esos paquetes porque los módulos se
 * cargan dinámicamente y las reglas de hooks prohíben llamarlos condicionados
 * a que existan.
 */
export function useCameraPermission(): CameraPermission {
  const [status, setStatus] = useState<CameraPermissionStatus>('comprobando');

  const request = useCallback(async () => {
    try {
      const expoCamera = getCameraModule();
      if (expoCamera) {
        const response =
          await expoCamera.Camera.requestCameraPermissionsAsync();
        setStatus(response.granted ? 'concedido' : 'denegado');
        return;
      }

      const vision = getVisionCameraModule();
      if (vision) {
        const granted = await vision.VisionCamera.requestCameraPermission();
        setStatus(granted ? 'concedido' : 'denegado');
        return;
      }

      setStatus('sin-modulo');
    } catch (error) {
      logger.error('No se pudo pedir el permiso de cámara', error);
      setStatus('denegado');
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    const check = async () => {
      try {
        const expoCamera = getCameraModule();
        if (expoCamera) {
          const current = await expoCamera.Camera.getCameraPermissionsAsync();
          if (!isActive) {
            return;
          }
          if (current.granted) {
            setStatus('concedido');
          } else {
            // Primera vez (o permiso revocado): se pide directamente.
            await request();
          }
          return;
        }

        const vision = getVisionCameraModule();
        if (vision) {
          if (vision.VisionCamera.cameraPermissionStatus === 'authorized') {
            setStatus('concedido');
          } else {
            await request();
          }
          return;
        }

        setStatus('sin-modulo');
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

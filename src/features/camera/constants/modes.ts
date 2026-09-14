/**
 * Modos de disparo de la barra inferior.
 *
 * Es la tira clásica de cualquier cámara de teléfono (FOTO / VÍDEO / PRO…):
 * lo primero que se toca y lo que decide qué controles tienen sentido.
 *
 * `disponible` distingue lo que ya funciona de lo que todavía no: los modos
 * pendientes se ven y se pueden elegir —para que la tira no cambie de forma
 * cuando se implementen— pero el visor avisa de que aún no hacen nada en vez
 * de fingir que capturan.
 */

export type CameraMode = 'foto' | 'video' | 'pro' | 'retrato' | 'ultraHd';

export type Mode = {
  kind: CameraMode;
  label: string;
  disponible: boolean;
  /** Aviso mostrado bajo la tira mientras el modo no esté implementado. */
  aviso?: string;
};

export const CAMERA_MODES: ReadonlyArray<Mode> = [
  { kind: 'foto', label: 'Foto', disponible: true },
  { kind: 'video', label: 'Vídeo', disponible: true },
  { kind: 'pro', label: 'Pro', disponible: true },
  {
    kind: 'retrato',
    label: 'Retrato',
    disponible: false,
    aviso: 'El modo retrato todavía no está disponible.',
  },
  {
    kind: 'ultraHd',
    label: 'Ultra HD',
    disponible: false,
    aviso: 'La captura en Ultra HD todavía no está disponible.',
  },
];

import { useCameraStore } from './cameraStore';

describe('useCameraStore', () => {
  beforeEach(() => {
    useCameraStore.setState({
      guide: 'tercios',
      aspect: 'sensor',
      flash: 'off',
      timer: 0,
      levelOn: false,
      autoShutter: false,
      proMode: false,
      facing: 'back',
      zoom: 0,
      ghostUri: null,
      ghostOpacity: 0.4,
      lastPhotoUri: null,
    });
  });

  it('arranca con la regla de los tercios como guía', () => {
    expect(useCameraStore.getState().guide).toBe('tercios');
  });

  it('cambia guía, formato y flash', () => {
    const state = useCameraStore.getState();
    state.setGuide('espiral');
    state.setAspect('9:16');
    state.setFlash('auto');

    const next = useCameraStore.getState();
    expect(next.guide).toBe('espiral');
    expect(next.aspect).toBe('9:16');
    expect(next.flash).toBe('auto');
  });

  it('alterna cámara trasera/frontal', () => {
    useCameraStore.getState().toggleFacing();
    expect(useCameraStore.getState().facing).toBe('front');

    useCameraStore.getState().toggleFacing();
    expect(useCameraStore.getState().facing).toBe('back');
  });

  it('acota el zoom y la opacidad del fantasma a 0..1', () => {
    useCameraStore.getState().setZoom(1.7);
    expect(useCameraStore.getState().zoom).toBe(1);

    useCameraStore.getState().setZoom(-0.5);
    expect(useCameraStore.getState().zoom).toBe(0);

    useCameraStore.getState().setGhostOpacity(2);
    expect(useCameraStore.getState().ghostOpacity).toBe(1);
  });

  it('activa y desactiva las herramientas PRO', () => {
    const state = useCameraStore.getState();
    state.toggleLevel();
    state.toggleAutoShutter();
    state.toggleProMode();

    const next = useCameraStore.getState();
    expect(next.levelOn).toBe(true);
    expect(next.autoShutter).toBe(true);
    expect(next.proMode).toBe(true);
  });

  it('guarda la última foto y el fantasma', () => {
    useCameraStore.getState().setLastPhoto('file://foto.jpg');
    useCameraStore.getState().setGhost('file://foto.jpg');

    const next = useCameraStore.getState();
    expect(next.lastPhotoUri).toBe('file://foto.jpg');
    expect(next.ghostUri).toBe('file://foto.jpg');

    useCameraStore.getState().setGhost(null);
    expect(useCameraStore.getState().ghostUri).toBeNull();
  });
});

import { useCameraStore } from './cameraStore';

describe('useCameraStore', () => {
  beforeEach(() => {
    useCameraStore.setState({
      guide: 'tercios',
      mode: 'foto',
      aspect: 'sensor',
      flash: 'off',
      hdr: 'off',
      timer: 0,
      levelOn: false,
      autoShutter: false,
      facing: 'back',
      zoom: 1,
      ev: 0,
      manualExposure: null,
      manualWhiteBalance: null,
      ghostUri: null,
      ghostOpacity: 0.4,
      lastPhotoUri: null,
    });
  });

  it('arranca con la regla de los tercios como guía', () => {
    expect(useCameraStore.getState().guide).toBe('tercios');
  });

  it('cambia guía, formato, flash y HDR', () => {
    const state = useCameraStore.getState();
    state.setGuide('espiral');
    state.setAspect('9:16');
    state.setFlash('auto');
    state.setHdr('on');

    const next = useCameraStore.getState();
    expect(next.guide).toBe('espiral');
    expect(next.aspect).toBe('9:16');
    expect(next.flash).toBe('auto');
    expect(next.hdr).toBe('on');
  });

  it('arranca en modo foto y cambia de modo', () => {
    expect(useCameraStore.getState().mode).toBe('foto');

    useCameraStore.getState().setMode('pro');
    expect(useCameraStore.getState().mode).toBe('pro');
  });

  it('alterna cámara trasera/frontal y reinicia el zoom a 1×', () => {
    useCameraStore.getState().setZoom(3);
    useCameraStore.getState().toggleFacing();
    expect(useCameraStore.getState().facing).toBe('front');
    expect(useCameraStore.getState().zoom).toBe(1);

    useCameraStore.getState().toggleFacing();
    expect(useCameraStore.getState().facing).toBe('back');
  });

  it('el zoom es el factor real, con sólo un suelo de cordura', () => {
    useCameraStore.getState().setZoom(3.4);
    expect(useCameraStore.getState().zoom).toBe(3.4);

    useCameraStore.getState().setZoom(-0.5);
    expect(useCameraStore.getState().zoom).toBe(0.1);
  });

  it('acota la opacidad del fantasma a 0..1', () => {
    useCameraStore.getState().setGhostOpacity(2);
    expect(useCameraStore.getState().ghostOpacity).toBe(1);
  });

  it('activa y desactiva las herramientas PRO', () => {
    const state = useCameraStore.getState();
    state.toggleLevel();
    state.toggleAutoShutter();

    const next = useCameraStore.getState();
    expect(next.levelOn).toBe(true);
    expect(next.autoShutter).toBe(true);
  });

  it('el disparo automático enciende el nivel, del que depende', () => {
    useCameraStore.getState().toggleAutoShutter();

    const conAuto = useCameraStore.getState();
    expect(conAuto.autoShutter).toBe(true);
    expect(conAuto.levelOn).toBe(true);

    // Apagarlo no toca el nivel: puede seguir sirviendo por su cuenta.
    useCameraStore.getState().toggleAutoShutter();

    const sinAuto = useCameraStore.getState();
    expect(sinAuto.autoShutter).toBe(false);
    expect(sinAuto.levelOn).toBe(true);
  });

  it('fija y quita la exposición manual (ISO + velocidad juntos)', () => {
    useCameraStore.getState().setManualExposure(400, 1 / 125);
    expect(useCameraStore.getState().manualExposure).toEqual({
      iso: 400,
      shutterSeconds: 1 / 125,
    });

    useCameraStore.getState().disableManualExposure();
    expect(useCameraStore.getState().manualExposure).toBeNull();
  });

  it('activa el balance de blancos manual capturando las ganancias base', () => {
    const baseGains = { redGain: 1.8, blueGain: 2.2, greenGain: 1.0 };
    useCameraStore.getState().enableManualWhiteBalance(baseGains);
    expect(useCameraStore.getState().manualWhiteBalance).toEqual({
      shift: 0,
      baseGains,
    });

    useCameraStore.getState().disableManualWhiteBalance();
    expect(useCameraStore.getState().manualWhiteBalance).toBeNull();
  });

  it('ajustar el shift no toca las ganancias base capturadas', () => {
    const baseGains = { redGain: 1.8, blueGain: 2.2, greenGain: 1.0 };
    useCameraStore.getState().enableManualWhiteBalance(baseGains);
    useCameraStore.getState().setManualWhiteBalanceShift(2);

    expect(useCameraStore.getState().manualWhiteBalance).toEqual({
      shift: 2,
      baseGains,
    });
  });

  it('ajustar el shift sin estar en manual no hace nada', () => {
    useCameraStore.getState().setManualWhiteBalanceShift(2);
    expect(useCameraStore.getState().manualWhiteBalance).toBeNull();
  });

  it('alternar cámara también resetea la exposición y el balance manual', () => {
    useCameraStore.getState().setManualExposure(400, 1 / 125);
    useCameraStore
      .getState()
      .enableManualWhiteBalance({
        redGain: 1.8,
        blueGain: 2.2,
        greenGain: 1.0,
      });

    useCameraStore.getState().toggleFacing();

    const next = useCameraStore.getState();
    expect(next.manualExposure).toBeNull();
    expect(next.manualWhiteBalance).toBeNull();
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

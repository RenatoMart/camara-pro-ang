import { mapFriendlyEvToDeviceIndex } from './manualControls';

/**
 * `minExposureBias`/`maxExposureBias` de VisionCamera dicen ser "en
 * unidades EV" pero en Android son el índice crudo del sensor: si el
 * control tratara ese índice como si fueran EV, mover el control de punta a
 * punta podría no cambiar casi nada la exposición. El mapeo evita esto
 * estirando siempre -4..+4 al rango real del sensor.
 */
describe('mapFriendlyEvToDeviceIndex', () => {
  it('lleva los extremos -4/+4 a los extremos del rango del sensor', () => {
    const range = { min: -24, max: 24 };
    expect(mapFriendlyEvToDeviceIndex(-4, range)).toBe(-24);
    expect(mapFriendlyEvToDeviceIndex(4, range)).toBe(24);
  });

  it('el 0 siempre cae en el centro del rango', () => {
    expect(mapFriendlyEvToDeviceIndex(0, { min: -24, max: 24 })).toBe(0);
    expect(mapFriendlyEvToDeviceIndex(0, { min: -6, max: 6 })).toBe(0);
  });

  it('funciona igual con un rango pequeño (sensor con pocos pasos)', () => {
    const range = { min: -2, max: 2 };
    expect(mapFriendlyEvToDeviceIndex(-4, range)).toBe(-2);
    expect(mapFriendlyEvToDeviceIndex(2, range)).toBe(1);
    expect(mapFriendlyEvToDeviceIndex(4, range)).toBe(2);
  });

  it('funciona con un rango asimétrico', () => {
    const range = { min: -12, max: 4 };
    expect(mapFriendlyEvToDeviceIndex(-4, range)).toBe(-12);
    expect(mapFriendlyEvToDeviceIndex(4, range)).toBe(4);
    // Punto medio de -4..4 → punto medio de -12..4.
    expect(mapFriendlyEvToDeviceIndex(0, range)).toBe(-4);
  });

  it('devuelve 0 si el sensor no informa un rango real (min >= max)', () => {
    expect(mapFriendlyEvToDeviceIndex(2, { min: 0, max: 0 })).toBe(0);
    expect(mapFriendlyEvToDeviceIndex(-3, { min: 5, max: 5 })).toBe(0);
  });
});

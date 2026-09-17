import {
  applyWhiteBalanceShift,
  defaultIso,
  defaultShutterSeconds,
  formatIso,
  formatShutterSpeed,
  formatWhiteBalanceShift,
  ISO_REFERENCE,
  mapFriendlyEvToDeviceIndex,
  SHUTTER_REFERENCE_SECONDS,
  stopsToValue,
  valueToStops,
  WHITE_BALANCE_SHIFT_RANGE,
} from './manualControls';

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

describe('valueToStops / stopsToValue', () => {
  it('0 pasos es la propia referencia', () => {
    expect(valueToStops(100, 100)).toBe(0);
    expect(stopsToValue(0, 100)).toBe(100);
  });

  it('cada paso dobla el valor, ida y vuelta', () => {
    expect(valueToStops(200, 100)).toBe(1);
    expect(valueToStops(400, 100)).toBe(2);
    expect(valueToStops(50, 100)).toBe(-1);
    expect(stopsToValue(3, 100)).toBe(800);
    expect(stopsToValue(-2, 100)).toBe(25);
  });

  it('es la inversa exacta en todo el rango de ISO real', () => {
    for (const iso of [50, 100, 200, 400, 800, 1600, 3200, 6400]) {
      const stops = valueToStops(iso, ISO_REFERENCE);
      expect(stopsToValue(stops, ISO_REFERENCE)).toBeCloseTo(iso, 9);
    }
  });

  it('es la inversa exacta en todo el rango de velocidad real', () => {
    for (const seconds of [1 / 4000, 1 / 125, 1 / 30, 1, 8, 30]) {
      const stops = valueToStops(seconds, SHUTTER_REFERENCE_SECONDS);
      expect(stopsToValue(stops, SHUTTER_REFERENCE_SECONDS)).toBeCloseTo(
        seconds,
        9,
      );
    }
  });
});

describe('defaultIso / defaultShutterSeconds', () => {
  it('usa el valor habitual cuando el sensor lo admite', () => {
    const range = {
      minIso: 50,
      maxIso: 6400,
      minShutterSeconds: 1 / 4000,
      maxShutterSeconds: 30,
    };
    expect(defaultIso(range)).toBe(400);
    expect(defaultShutterSeconds(range)).toBeCloseTo(1 / 125, 9);
  });

  it('lo acota al rango real si el sensor no llega', () => {
    const range = {
      minIso: 100,
      maxIso: 200,
      minShutterSeconds: 1 / 60,
      maxShutterSeconds: 1 / 30,
    };
    expect(defaultIso(range)).toBe(200);
    expect(defaultShutterSeconds(range)).toBeCloseTo(1 / 60, 9);
  });
});

describe('formatIso / formatShutterSpeed', () => {
  it('redondea el ISO a entero', () => {
    expect(formatIso(399.6)).toBe('400');
  });

  it('muestra fracciones bajo 1s y segundos con comilla desde 1s', () => {
    expect(formatShutterSpeed(1 / 125)).toBe('1/125');
    expect(formatShutterSpeed(1 / 4000)).toBe('1/4000');
    expect(formatShutterSpeed(1)).toBe('1"');
    expect(formatShutterSpeed(2)).toBe('2"');
    expect(formatShutterSpeed(30)).toBe('30"');
  });
});

describe('applyWhiteBalanceShift', () => {
  const baseGains = { redGain: 1.8, blueGain: 2.4, greenGain: 1.0 };
  const maxGain = 4.0;

  it('con shift 0 devuelve exactamente las ganancias base — coincide con el automático', () => {
    expect(applyWhiteBalanceShift(baseGains, 0, maxGain)).toEqual(baseGains);
  });

  it('un shift positivo (más cálido) sube el rojo y baja el azul', () => {
    const warm = applyWhiteBalanceShift(baseGains, 2, maxGain);
    expect(warm.redGain).toBeGreaterThan(baseGains.redGain);
    expect(warm.blueGain).toBeLessThan(baseGains.blueGain);
    expect(warm.greenGain).toBe(baseGains.greenGain);
  });

  it('un shift negativo (más frío) baja el rojo y sube el azul', () => {
    const cool = applyWhiteBalanceShift(baseGains, -2, maxGain);
    expect(cool.redGain).toBeLessThan(baseGains.redGain);
    expect(cool.blueGain).toBeGreaterThan(baseGains.blueGain);
  });

  it('nunca sale del rango 1..maxGain, aunque la base ya esté cerca del límite', () => {
    const nearLimit = { redGain: 3.9, blueGain: 1.05, greenGain: 1.0 };
    const shifted = applyWhiteBalanceShift(nearLimit, 4, maxGain);
    expect(shifted.redGain).toBeLessThanOrEqual(maxGain);
    expect(shifted.blueGain).toBeGreaterThanOrEqual(1);
  });

  it('es simétrico: +N y -N son inversos el uno del otro', () => {
    const warm = applyWhiteBalanceShift(baseGains, 3, maxGain);
    const backToBase = applyWhiteBalanceShift(warm, -3, maxGain);
    expect(backToBase.redGain).toBeCloseTo(baseGains.redGain, 9);
    expect(backToBase.blueGain).toBeCloseTo(baseGains.blueGain, 9);
  });
});

describe('formatWhiteBalanceShift', () => {
  it('siempre lleva signo y un decimal, incluido el cero', () => {
    expect(formatWhiteBalanceShift(0)).toBe('0.0');
    expect(formatWhiteBalanceShift(2.44)).toBe('+2.4');
    expect(formatWhiteBalanceShift(-1.66)).toBe('-1.7');
  });

  it('el rango amigable es -4..+4, igual que el EV', () => {
    expect(WHITE_BALANCE_SHIFT_RANGE).toEqual({ min: -4, max: 4 });
  });
});

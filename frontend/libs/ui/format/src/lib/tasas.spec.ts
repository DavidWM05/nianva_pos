import { describe, expect, it } from 'vitest';
import { tasaANumero } from './tasas';

describe('tasaANumero', () => {
  it.each([
    ['16.0000', 16],
    ['8.0000', 8],
    ['0.0000', 0],
    ['0.0001', 0.0001],
    [16, 16],
  ])(
    'convierte %s para un control sin perder la escala D4',
    (entrada, esperado) => {
      expect(tasaANumero(entrada)).toBe(esperado);
    },
  );
  it.each(['abc', '1.00001', '9007199254740992.0000'])(
    'rechaza %s sin truncar ni perder precisión',
    (entrada) => {
      expect(() => tasaANumero(entrada)).toThrow();
    },
  );
});

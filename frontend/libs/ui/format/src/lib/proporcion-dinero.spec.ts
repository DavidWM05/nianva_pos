import { describe, expect, it } from 'vitest';
import { proporcionarDinero } from './centavos';
describe('Proporción del subtotal de una presentación', () => {
  it.each([['1.52', '3.000', '3.000', '1.52'], ['1.52', '1.000', '3.000', '0.51'], ['1.01', '0.500', '1.000', '0.51']])('prorratea %s por %s de %s sin perder centavos', (importe, cantidad, total, esperado) => {
    expect(proporcionarDinero(importe, cantidad, total)).toBe(esperado);
  });
  it('rechaza cantidades inválidas y un total cero', () => {
    expect(() => proporcionarDinero('1.00', '1.000', '0.000')).toThrow();
    expect(() => proporcionarDinero('1.00', '-1.000', '1.000')).toThrow();
  });
});

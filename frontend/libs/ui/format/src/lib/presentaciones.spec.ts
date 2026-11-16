import { describe, expect, it } from 'vitest';
import { multiplicarCantidades, maximoEnPresentaciones } from './cantidades';
describe('Cantidades de presentaciones', () => {
  it('convierte cantidades y factores decimales exactamente', () => { expect(multiplicarCantidades('2.000','6.000')).toBe('12.000'); expect(multiplicarCantidades('0.500','0.500')).toBe('0.250'); });
  it('rechaza pérdida de precisión y desbordamiento', () => { expect(() => multiplicarCantidades('0.001','0.001')).toThrow(); expect(() => multiplicarCantidades('99999999999.999','2.000')).toThrow(); });
  it('calcula el máximo disponible truncando hacia una milésima', () => { expect(maximoEnPresentaciones('20.000','6.000')).toBe(3.333); expect(maximoEnPresentaciones('0.000','6.000')).toBe(0); });
});

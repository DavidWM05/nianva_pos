import { aCentavos, desdeCentavos, sumarDinero, restarDinero, compararDinero, multiplicarDinero } from './centavos';

describe('dinero decimal de API-02', () => {
  it.each([
    ['0.00', 0], ['0.10', 10], ['1250.50', 125050], ['-0.05', -5],
    ['9999999999.99', 999999999999], [0.5, 50], ['1.005', 101], ['-1.005', -101],
  ])('convierte %s en centavos enteros', (valor, esperado) => {
    expect(aCentavos(valor)).toBe(esperado);
  });

  it('suma y resta sin perder centavos al encadenar operaciones', () => {
    expect(sumarDinero('0.10', '0.20')).toBe('0.30');
    expect(restarDinero('1.00', '0.90')).toBe('0.10');
    expect(sumarDinero('9999999999.90', '0.09')).toBe('9999999999.99');
    expect(sumarDinero(...Array.from({ length: 100 }, () => '0.01'))).toBe('1.00');
    expect(Number.isInteger(aCentavos('0.10') + aCentavos('0.20'))).toBe(true);
  });

  it('compara importes decimales y conserva el signo al serializar', () => {
    expect(compararDinero('2.00', '10.00')).toBe(-1);
    expect(compararDinero('0.10', 0.1)).toBe(0);
    expect(desdeCentavos(-5)).toBe('-0.05');
  });

  it.each(['', 'NaN', '1,000.00', '1e3'])('rechaza el decimal no canonico %s', valor => {
    expect(() => aCentavos(valor)).toThrow();
  });
});

describe('subtotal decimal por linea', () => {
  it.each([['1.00', '0.005', '0.01'], ['33.33', '0.500', '16.67'], ['-1.00', '0.005', '-0.01']])('multiplica %s por %s y redondea por linea', (precio, cantidad, esperado) => {
    expect(multiplicarDinero(precio, cantidad)).toBe(esperado);
  });
});

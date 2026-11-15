import { aMilesimas, cantidadANumero, sumarCantidades, compararCantidades } from './cantidades';

describe('cantidades decimales de API-02', () => {
  it.each([['0.000', 0], ['0.500', 500], ['12.345', 12345], ['-0.001', -1], [1, 1000]])('convierte %s sin perder milesimas', (valor, esperado) => {
    expect(aMilesimas(valor)).toBe(esperado);
  });
  it('suma y compara cantidades por milesimas, nunca como texto', () => {
    expect(sumarCantidades('0.100', '0.200')).toBe('0.300');
    expect(sumarCantidades('3.000', 1)).toBe('4.000');
    expect(compararCantidades('2.000', '10.000')).toBe(-1);
    expect(cantidadANumero('0.500')).toBe(0.5);
  });
  it.each(['1.0001', 'NaN', '', '1,000'])('rechaza cantidad no D3: %s', valor => {
    expect(() => aMilesimas(valor)).toThrow();
  });
});

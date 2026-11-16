export type CantidadDecimal = string | number;

export function aMilesimas(valor: CantidadDecimal): number {
  const partes = /^([+-]?)(\d+)(?:\.(\d{1,3}))?$/.exec(String(valor));
  if (!partes) {
    throw new Error('La cantidad debe ser un decimal con hasta tres decimales.');
  }
  const absoluto = BigInt(partes[2]) * 1000n + BigInt((partes[3] ?? '').padEnd(3, '0'));
  const resultado = Number(partes[1] === '-' ? -absoluto : absoluto);
  if (!Number.isSafeInteger(resultado)) {
    throw new Error('La cantidad excede las milesimas representables.');
  }
  return resultado;
}

export function cantidadANumero(valor: CantidadDecimal): number {
  return aMilesimas(valor) / 1000;
}

export function sumarCantidades(...cantidades: CantidadDecimal[]): string {
  const milesimas = cantidades.reduce((suma, valor) => suma + BigInt(aMilesimas(valor)), 0n);
  const absoluto = milesimas < 0n ? -milesimas : milesimas;
  return `${milesimas < 0n ? '-' : ''}${absoluto / 1000n}.${String(absoluto % 1000n).padStart(3, '0')}`;
}

export function compararCantidades(a: CantidadDecimal, b: CantidadDecimal): number {
  return Math.sign(aMilesimas(a) - aMilesimas(b));
}

export function multiplicarCantidades(a: CantidadDecimal, b: CantidadDecimal): string {
  const producto = BigInt(aMilesimas(a)) * BigInt(aMilesimas(b));
  if (producto % 1000n !== 0n) throw new Error('La cantidad base admite hasta tres decimales.');
  const resultado = producto / 1000n;
  const absoluto = resultado < 0n ? -resultado : resultado;
  if (absoluto > 99999999999999n) throw new Error('La cantidad base excede decimal(14,3).');
  return (resultado < 0n ? '-' : '') + String(absoluto / 1000n) + '.' + String(absoluto % 1000n).padStart(3, '0');
}
export function maximoEnPresentaciones(stock: CantidadDecimal, factor: CantidadDecimal): number {
  const divisor = BigInt(aMilesimas(factor));
  if (divisor <= 0n) throw new Error('El factor debe ser positivo.');
  return Math.max(0, Number(BigInt(aMilesimas(stock)) * 1000n / divisor) / 1000);
}

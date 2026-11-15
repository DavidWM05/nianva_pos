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

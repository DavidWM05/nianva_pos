export type ImporteDecimal = string | number;

export function aCentavos(valor: ImporteDecimal): number {
  const partes = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(String(valor));
  if (!partes) {
    throw new Error('El importe debe ser un decimal sin separadores.');
  }
  const fraccion = (partes[3] ?? '').padEnd(3, '0');
  const absoluto = BigInt(partes[2]) * 100n + BigInt(fraccion.slice(0, 2)) + (fraccion[2] >= '5' ? 1n : 0n);
  const centavos = Number(partes[1] === '-' ? -absoluto : absoluto);
  if (!Number.isSafeInteger(centavos)) {
    throw new Error('El importe excede los centavos representables.');
  }
  return centavos;
}

export function desdeCentavos(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error('Los centavos deben ser un entero seguro.');
  }
  const absoluto = BigInt(centavos < 0 ? -centavos : centavos);
  return `${centavos < 0 ? '-' : ''}${absoluto / 100n}.${String(absoluto % 100n).padStart(2, '0')}`;
}

export function sumarDinero(...importes: ImporteDecimal[]): string {
  return desdeCentavos(importes.reduce<number>((suma, importe) => suma + aCentavos(importe), 0));
}

export function restarDinero(importe: ImporteDecimal, descuento: ImporteDecimal): string {
  return desdeCentavos(aCentavos(importe) - aCentavos(descuento));
}

export function compararDinero(a: ImporteDecimal, b: ImporteDecimal): number {
  return Math.sign(aCentavos(a) - aCentavos(b));
}

export function multiplicarDinero(
  importe: ImporteDecimal,
  cantidad: string | number,
  descuento: ImporteDecimal = 0,
): string {
  const partes = /^(\d+)(?:\.(\d{1,3}))?$/.exec(String(cantidad));
  if (!partes) {
    throw new Error('La cantidad debe ser no negativa y tener hasta tres decimales.');
  }
  const milesimas = BigInt(partes[1]) * 1000n + BigInt((partes[2] ?? '').padEnd(3, '0'));
  const producto = BigInt(aCentavos(importe)) * milesimas - BigInt(aCentavos(descuento)) * 1000n;
  const absoluto = producto < 0n ? -producto : producto;
  const redondeado = (absoluto + 500n) / 1000n;
  return desdeCentavos(Number(producto < 0n ? -redondeado : redondeado));
}

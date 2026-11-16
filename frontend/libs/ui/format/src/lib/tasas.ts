/** Conversión al borde de los controles; conserva cuatro decimales antes de exponer un número. */
export function tasaANumero(valor: string | number): number {
  const partes = /^([+-]?)(\d+)(?:\.(\d{1,4}))?$/.exec(String(valor));
  if (!partes) throw new Error('La tasa debe tener hasta cuatro decimales.');
  const unidades =
    BigInt(partes[2]) * 10000n + BigInt((partes[3] ?? '').padEnd(4, '0'));
  const resultado = Number(partes[1] === '-' ? -unidades : unidades);
  if (!Number.isSafeInteger(resultado))
    throw new Error('La tasa excede las unidades representables.');
  return resultado / 10000;
}

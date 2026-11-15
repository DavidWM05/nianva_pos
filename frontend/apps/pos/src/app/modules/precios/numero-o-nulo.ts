/** Cadena decimal del contrato o numero del formulario, como numero; vacio es null. */
export function numeroONulo(valor: unknown): number | null {
  return valor === null || valor === undefined || valor === '' ? null : Number(valor);
}

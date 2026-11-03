export function contenidoEquivalente(enDisco, esperado) {
  return enDisco.replace(/\r\n/g, '\n') === esperado.replace(/\r\n/g, '\n');
}

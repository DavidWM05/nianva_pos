/**
 * DAT-08: un ULID válido y determinista para los fixtures de los specs. Las entidades
 * transaccionales se identifican por el ulid que publica la API; un spec que antes usaba `id: 7`
 * usa `id: ulidDePrueba(7)`, y el mismo número da siempre el mismo ulid (las URLs esperadas se
 * arman igual). Solo dígitos: son válidos en Crockford base32 y el primer carácter queda en 0.
 */
export function ulidDePrueba(numero: number): string {
  return '01' + String(numero).padStart(24, '0');
}

const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Genera una llave al iniciar la operación. Reutilízala si se reintenta el mismo envío. */
export function generarLlaveIdempotencia(): string {
  let valor = BigInt(Date.now());
  for (const byte of globalThis.crypto.getRandomValues(new Uint8Array(10))) {
    valor = (valor << 8n) | BigInt(byte);
  }

  let llave = '';
  for (let indice = 0; indice < 26; indice += 1) {
    llave = ALFABETO[Number(valor & 31n)] + llave;
    valor >>= 5n;
  }

  return llave;
}

export function opcionesIdempotencia(llave?: string): { headers: Record<string, string> } | undefined {
  return llave === undefined ? undefined : { headers: { 'Idempotency-Key': llave } };
}

export function opcionesOperacionSupervisada(llave?: string, token?: string): { headers: Record<string, string> } | undefined {
  if (token === undefined) {
    return opcionesIdempotencia(llave);
  }

  return { headers: { ...opcionesIdempotencia(llave)?.headers, 'X-Autorizacion-Supervisor': token } };
}

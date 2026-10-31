import { describe, expect, it } from 'vitest';

import { baseApiActual, configurarBaseApi } from './api-config';
import { cargarBaseApi } from './runtime-config';

function fetchConConfiguracion(config: unknown): typeof fetch {
  return (async () => ({
    ok: true,
    json: async () => config,
  })) as unknown as typeof fetch;
}

describe('runtime-config', () => {
  it('lee apiBaseUrl de config.json y la fija una sola vez', async () => {
    const base = await cargarBaseApi(fetchConConfiguracion({ apiBaseUrl: 'http://x' }));

    expect(base).toBe('http://x');
    expect(baseApiActual()).toBe('http://x');
  });

  it('si config.json no se puede leer usa el mismo origen', async () => {
    configurarBaseApi('http://previo');

    const base = await cargarBaseApi((async () => {
      throw new Error('sin config');
    }) as unknown as typeof fetch);

    expect(base).toBe('');
    expect(baseApiActual()).toBe('');
  });

  it('si falta apiBaseUrl usa el mismo origen', async () => {
    const base = await cargarBaseApi(fetchConConfiguracion({}));

    expect(base).toBe('');
    expect(baseApiActual()).toBe('');
  });
});

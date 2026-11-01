import { describe, expect, it } from 'vitest';

import { baseApiActual, configurarBaseApi, urlApi, urlSesion } from './api-config';
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

  it('el mismo build resuelve dos configuraciones distintas', async () => {
    const baseLan = await cargarBaseApi(fetchConConfiguracion({ apiBaseUrl: 'http://servidor-lan:8080' }));

    expect(baseLan).toBe('http://servidor-lan:8080');
    expect(urlApi('/ventas')).toBe('http://servidor-lan:8080/api/v1/ventas');
    expect(urlSesion('/login')).toBe('http://servidor-lan:8080/login');

    const baseMismoOrigen = await cargarBaseApi(fetchConConfiguracion({ apiBaseUrl: '' }));

    expect(baseMismoOrigen).toBe('');
    expect(urlApi('/ventas')).toBe('/api/v1/ventas');
    expect(urlSesion('/login')).toBe('/login');
  });
});

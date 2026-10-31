import { afterEach, describe, expect, it } from 'vitest';

import { configurarBaseApi, urlApi, urlSesion } from './api-config';

describe('api-config', () => {
  afterEach(() => {
    configurarBaseApi('');
  });

  it('urlApi agrega la version al path con una base absoluta', () => {
    configurarBaseApi('http://x');

    expect(urlApi('/ventas')).toBe('http://x/api/v1/ventas');
  });

  it('urlSesion no versiona las rutas de sesion', () => {
    configurarBaseApi('http://x');

    expect(urlSesion('/login')).toBe('http://x/login');
  });

  it('con base vacia devuelve rutas relativas', () => {
    configurarBaseApi('');

    expect(urlApi('/ventas')).toBe('/api/v1/ventas');
    expect(urlSesion('/login')).toBe('/login');
  });
});

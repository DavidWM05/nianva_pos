import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TemaService, TemaPreferido } from './tema.service';

const CLASE = 'nv-tema-oscuro';

function prepararSistema(oscuro: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches: oscuro }),
  });
}

describe('TemaService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(CLASE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin preferencia guardada usa claro aunque el sistema prefiera oscuro', () => {
    prepararSistema(true);
    const servicio = new TemaService();

    servicio.inicializar();

    expect(servicio.preferencia()).toBe('claro');
    expect(document.documentElement.classList.contains(CLASE)).toBe(false);
  });

  it('con la preferencia sistema guardada sigue al sistema', () => {
    prepararSistema(true);
    localStorage.setItem('nv-tema', 'sistema');

    new TemaService().inicializar();

    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
  });

  it('si localStorage no esta disponible no falla y usa claro', () => {
    prepararSistema(true);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const servicio = new TemaService();

    expect(() => servicio.inicializar()).not.toThrow();
    expect(() => servicio.establecer('oscuro')).not.toThrow();
    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
    expect(servicio.preferencia()).toBe('claro');
  });

  it('respeta una preferencia guardada por encima del sistema', () => {
    prepararSistema(true);
    localStorage.setItem('nv-tema', 'claro');

    new TemaService().inicializar();

    expect(document.documentElement.classList.contains(CLASE)).toBe(false);
  });

  it('permite guardar una preferencia y la aplica de inmediato', () => {
    prepararSistema(false);
    const servicio = new TemaService();
    const preferencia: TemaPreferido = 'oscuro';

    servicio.establecer(preferencia);

    expect(servicio.preferencia()).toBe('oscuro');
    expect(localStorage.getItem('nv-tema')).toBe('oscuro');
    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
  });

  it('usa claro cuando la preferencia es sistema y el sistema no prefiere oscuro', () => {
    prepararSistema(false);

    new TemaService().inicializar();

    expect(document.documentElement.classList.contains(CLASE)).toBe(false);
  });
});

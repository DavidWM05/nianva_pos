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

  it('sin preferencia guardada usa sistema y sigue la preferencia oscura', () => {
    prepararSistema(true);
    const servicio = new TemaService();

    servicio.inicializar();

    expect(servicio.preferencia()).toBe('sistema');
    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
  });

  it('con la preferencia sistema guardada sigue al sistema', () => {
    prepararSistema(true);
    localStorage.setItem('nv-tema', 'sistema');

    new TemaService().inicializar();

    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
  });

  it('si localStorage no esta disponible no falla y usa sistema', () => {
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
    expect(servicio.preferencia()).toBe('sistema');
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

  // 50i: el tema sigue al sistema operativo en vivo cuando la preferencia es 'sistema'.
  function prepararSistemaConCambios(oscuro: boolean): (oscuroAhora: boolean) => void {
    const oyentes: ((evento: { matches: boolean }) => void)[] = [];
    const consulta = {
      matches: oscuro,
      addEventListener: (_tipo: string, oyente: (evento: { matches: boolean }) => void) => oyentes.push(oyente),
      removeEventListener: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue(consulta),
    });

    return (oscuroAhora: boolean) => {
      consulta.matches = oscuroAhora;
      oyentes.forEach((oyente) => oyente({ matches: oscuroAhora }));
    };
  }

  it('con la preferencia sistema, vuelve a aplicar el tema cuando el sistema operativo cambia', () => {
    const cambiarSistema = prepararSistemaConCambios(false);
    localStorage.setItem('nv-tema', 'sistema');
    new TemaService().inicializar();
    expect(document.documentElement.classList.contains(CLASE)).toBe(false);

    cambiarSistema(true);
    expect(document.documentElement.classList.contains(CLASE)).toBe(true);

    cambiarSistema(false);
    expect(document.documentElement.classList.contains(CLASE)).toBe(false);
  });

  it('con claro u oscuro elegidos a mano, un cambio del sistema operativo no toca el tema', () => {
    const cambiarSistema = prepararSistemaConCambios(false);
    const servicio = new TemaService();
    servicio.inicializar();

    servicio.establecer('claro');
    cambiarSistema(true);
    expect(document.documentElement.classList.contains(CLASE)).toBe(false);

    servicio.establecer('oscuro');
    cambiarSistema(false);
    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
  });

  it('al pasar a sistema despues de arrancar, sigue al sistema operativo desde ese momento', () => {
    const cambiarSistema = prepararSistemaConCambios(false);
    const servicio = new TemaService();
    servicio.inicializar();

    servicio.establecer('sistema');
    cambiarSistema(true);

    expect(document.documentElement.classList.contains(CLASE)).toBe(true);
  });

  it('expone la preferencia elegida como signal, para que el interruptor la marque', () => {
    prepararSistema(false);
    const servicio = new TemaService();
    servicio.inicializar();
    expect(servicio.preferenciaActual()).toBe('sistema');

    servicio.establecer('sistema');

    expect(servicio.preferenciaActual()).toBe('sistema');
  });
});

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthStateService } from './auth-state.service';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

describe('SesionEntrePestanasService', () => {
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let authState: { clear: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { url: '/nucleo', navigate: vi.fn().mockResolvedValue(true) };
    authState = { clear: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthStateService, useValue: authState },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(SesionEntrePestanasService).ngOnDestroy();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  function crear(): SesionEntrePestanasService {
    return TestBed.inject(SesionEntrePestanasService);
  }

  it('cierra localmente, navega y avisa con una marca de tiempo', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const servicio = crear();
    servicio.inicializar();

    servicio.cerrarSesion();

    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledOnce();
    expect(localStorage.getItem('nianva-sesion')).toMatch(/^\d+$/);
  });

  it('no navega si ya esta en una ruta publica de sesion', () => {
    router.url = '/login';
    const servicio = crear();
    servicio.inicializar();

    servicio.cerrarSesion();

    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('varios 401 seguidos producen una sola navegacion', () => {
    router.navigate = vi.fn().mockReturnValue(new Promise(() => undefined));
    const servicio = crear();
    servicio.inicializar();

    servicio.cerrarSesion();
    servicio.cerrarSesion();

    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it('recibe el aviso por storage cuando no hay BroadcastChannel', () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const servicio = crear();
    servicio.inicializar();

    window.dispatchEvent(new StorageEvent('storage', { key: 'nianva-sesion', newValue: '123' }));

    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledOnce();
  });

  it('usa BroadcastChannel cuando esta disponible', async () => {
    class CanalFalso {
      static ultimo: CanalFalso | null = null;
      onmessage: ((evento: MessageEvent) => void) | null = null;
      readonly postMessage = vi.fn();

      constructor() {
        CanalFalso.ultimo = this;
      }
    }

    vi.stubGlobal('BroadcastChannel', CanalFalso as unknown as typeof BroadcastChannel);
    const servicio = crear();
    servicio.inicializar();

    servicio.cerrarSesion();
    await Promise.resolve();

    expect(CanalFalso.ultimo?.postMessage).toHaveBeenCalledOnce();
    CanalFalso.ultimo?.onmessage?.({ data: '123' } as MessageEvent);
    expect(authState.clear).toHaveBeenCalledTimes(2);
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });
});

import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configurarBaseApi, urlApi } from '../core/api-config';
import { AuthStateService } from './auth-state.service';
import { authInterceptor } from './auth.interceptor';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

describe('authInterceptor con sesion_inactiva', () => {
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let authState: { clear: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    configurarBaseApi('http://x');
    vi.stubGlobal('BroadcastChannel', undefined);
    localStorage.clear();
    router = { url: '/nucleo', navigate: vi.fn().mockResolvedValue(true) };
    authState = { clear: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AuthStateService, useValue: authState },
      ],
    });

    TestBed.inject(SesionEntrePestanasService).inicializar();
  });

  afterEach(() => {
    TestBed.inject(SesionEntrePestanasService).ngOnDestroy();
    vi.unstubAllGlobals();
  });

  async function ejecutarConCuerpo(cuerpo: Record<string, unknown>): Promise<HttpErrorResponse> {
    const request = new HttpRequest('GET', urlApi('/roles'));
    const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status: 401, error: cuerpo })));

    try {
      await firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)));
      throw new Error('La peticion no debio completarse');
    } catch (error) {
      return error as HttpErrorResponse;
    }
  }

  it('navega al login con el aviso cuando el 401 es sesion_inactiva', async () => {
    const error = await ejecutarConCuerpo({
      error_code: 'sesion_inactiva',
      message: 'Tu sesión se cerró por inactividad.',
    });

    expect(error.status).toBe(401);
    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { aviso: 'inactividad' } });
  });

  it('navega al login sin aviso cuando el 401 no es sesion_inactiva', async () => {
    await ejecutarConCuerpo({ error_code: 'no_autenticado' });

    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(router.navigate).not.toHaveBeenCalledWith(['/login'], { queryParams: { aviso: 'inactividad' } });
  });
});

import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configurarBaseApi, urlApi } from '../core/api-config';
import { AuthStateService } from './auth-state.service';
import { authInterceptor } from './auth.interceptor';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

describe('authInterceptor', () => {
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

  async function ejecutar(url: string, status: number): Promise<HttpErrorResponse> {
    const request = new HttpRequest('GET', url);
    const next = vi.fn(() => throwError(() => new HttpErrorResponse({ status })));

    try {
      await firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)));
      throw new Error('La peticion no debio completarse');
    } catch (error) {
      return error as HttpErrorResponse;
    }
  }

  it('un 401 limpia el estado, navega al login y propaga el error', async () => {
    const error = await ejecutar(urlApi('/roles'), 401);

    expect(error.status).toBe(401);
    expect(authState.clear).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('el 401 de GET /user no navega ni limpia el estado', async () => {
    const error = await ejecutar(urlApi('/user'), 401);

    expect(error.status).toBe(401);
    expect(authState.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un error distinto de 401 no hace nada', async () => {
    const error = await ejecutar(urlApi('/roles'), 500);

    expect(error.status).toBe(500);
    expect(authState.clear).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('varios 401 seguidos producen una sola navegacion', async () => {
    router.navigate = vi.fn().mockReturnValue(new Promise(() => undefined));

    await ejecutar(urlApi('/roles'), 401);
    await ejecutar(urlApi('/clientes'), 401);

    expect(router.navigate).toHaveBeenCalledOnce();
  });
});

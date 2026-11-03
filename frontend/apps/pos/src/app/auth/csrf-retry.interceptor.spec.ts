import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configurarBaseApi, urlApi, urlSesion } from '../core/api-config';
import { authInterceptor } from './auth.interceptor';
import { credentialsInterceptor } from './credentials.interceptor';
import { csrfRetryInterceptor } from './csrf-retry.interceptor';
import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';
import { xsrfInterceptor } from './xsrf.interceptor';

describe('csrfRetryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    configurarBaseApi('http://x');
    document.cookie = 'XSRF-TOKEN=viejo; path=/';

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([credentialsInterceptor, xsrfInterceptor, csrfRetryInterceptor, authInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: SesionEntrePestanasService, useValue: { cerrarSesion: vi.fn() } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/';
  });

  it('ante 419 pide csrf-cookie y reintenta una vez con el token nuevo', () => {
    let resultado: unknown = null;
    let error: HttpErrorResponse | null = null;

    http.post(urlApi('/ventas'), {}).subscribe({
      next: (valor) => { resultado = valor; },
      error: (fallo: HttpErrorResponse) => { error = fallo; },
    });

    const original = httpMock.expectOne(urlApi('/ventas'));
    expect(original.request.headers.get('X-XSRF-TOKEN')).toBe('viejo');
    original.flush({}, { status: 419, statusText: 'CSRF' });

    const csrf = httpMock.expectOne(urlSesion('/sanctum/csrf-cookie'));
    expect(csrf.request.method).toBe('GET');
    document.cookie = 'XSRF-TOKEN=nuevo; path=/';
    csrf.flush({});

    const reintento = httpMock.expectOne(urlApi('/ventas'));
    expect(reintento.request.headers.get('X-XSRF-TOKEN')).toBe('nuevo');
    expect(reintento.request.withCredentials).toBe(true);
    reintento.flush({ ok: true }, { status: 201, statusText: 'Created' });

    expect(error).toBeNull();
    expect(resultado).toEqual({ ok: true });
  });

  it('si el reintento vuelve a fallar con 419, propaga y no repite', () => {
    let errorStatus: number | null = null;

    http.post(urlApi('/ventas'), {}).subscribe({ error: (fallo: HttpErrorResponse) => { errorStatus = fallo.status; } });

    httpMock.expectOne(urlApi('/ventas')).flush({}, { status: 419, statusText: 'CSRF' });
    const csrf = httpMock.expectOne(urlSesion('/sanctum/csrf-cookie'));
    document.cookie = 'XSRF-TOKEN=nuevo; path=/';
    csrf.flush({});

    httpMock.expectOne(urlApi('/ventas')).flush({}, { status: 419, statusText: 'CSRF' });

    expect(errorStatus).toBe(419);
    httpMock.expectNone(urlSesion('/sanctum/csrf-cookie'));
  });

  it('un GET con 419 no intenta renovar CSRF', () => {
    let errorStatus: number | null = null;

    http.get(urlApi('/reporte')).subscribe({ error: (fallo: HttpErrorResponse) => { errorStatus = fallo.status; } });

    httpMock.expectOne(urlApi('/reporte')).flush({}, { status: 419, statusText: 'CSRF' });

    expect(errorStatus).toBe(419);
    httpMock.expectNone(urlSesion('/sanctum/csrf-cookie'));
  });
});

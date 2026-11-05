import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ToastService } from '@nianva/ui-feedback';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { configurarBaseApi, urlApi } from './api-config';
import { ERROR_EN_PANTALLA, erroresInterceptor } from './errores.interceptor';

describe('erroresInterceptor comportamiento visible', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    configurarBaseApi('http://x');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroresInterceptor])),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  async function errorDe(status: number, contexto?: HttpContext): Promise<HttpErrorResponse> {
    try {
      const promesa = firstValueFrom(http.get(urlApi('/recurso'), contexto ? { context: contexto } : {}));
      httpMock.expectOne(urlApi('/recurso')).flush(
        status >= 500 ? { message: `Fallo ${status}`, correlation_id: 'corr-1' } : {},
        { status, statusText: 'Error' },
      );
      await promesa;

      throw new Error('La peticion debio fallar');
    } catch (error) {
      return error as HttpErrorResponse;
    }
  }

  it('un 500 muestra texto visible y un solo toast', async () => {
    const error = await errorDe(500);
    await Promise.resolve();

    expect(error.status).toBe(500);
    expect(document.body.textContent).toContain('Fallo 500');
    expect(document.querySelectorAll('ui-toast-content')).toHaveLength(1);
  });

  it('401, 419, 404 y 422 no muestran toast', async () => {
    for (const status of [401, 419, 404, 422]) {
      await errorDe(status);
    }
    await Promise.resolve();

    expect(document.querySelectorAll('ui-toast-content')).toHaveLength(0);
  });

  it('ERROR_EN_PANTALLA no muestra toast', async () => {
    await errorDe(500, new HttpContext().set(ERROR_EN_PANTALLA, true));
    await Promise.resolve();

    expect(document.querySelectorAll('ui-toast-content')).toHaveLength(0);
  });

  it('un 500 mas un error de pantalla producen un solo toast', async () => {
    const toast = TestBed.inject(ToastService);

    await errorDe(500);
    toast.error('No se pudo guardar el recurso.');
    await Promise.resolve();

    expect(document.querySelectorAll('ui-toast-content')).toHaveLength(1);
  });
});

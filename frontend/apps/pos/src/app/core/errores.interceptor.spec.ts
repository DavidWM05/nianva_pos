import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastService } from '@nianva/ui-feedback';
import { configurarBaseApi, urlApi } from './api-config';
import { ERROR_EN_PANTALLA, erroresInterceptor } from './errores.interceptor';

describe('erroresInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let add: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    configurarBaseApi('http://x');
    add = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroresInterceptor])),
        provideHttpClientTesting(),
        { provide: MessageService, useValue: { add } },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  async function errorDe(status: number, url = urlApi('/recurso'), contexto?: HttpContext): Promise<HttpErrorResponse> {
    let promesa: Promise<unknown>;

    try {
      promesa = firstValueFrom(http.get(url, contexto ? { context: contexto } : {}));
      const peticion = httpMock.expectOne(url);
      peticion.flush(
        status >= 500 ? { message: 'Fallo ' + status, correlation_id: 'corr-1' } : {},
        { status, statusText: 'Error' },
      );
      await promesa;
    } catch (error) {
      return error as HttpErrorResponse;
    }

    throw new Error('La peticion debio fallar');
  }

  it('status 0 muestra el mensaje de conexion y propaga', async () => {
    const error = await errorDe(0);

    expect(error.status).toBe(0);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({
      severity: 'error',
      detail: 'No hay conexión con el servidor. Revisa tu red e intenta de nuevo.',
    }));
  });

  it('403 muestra el mensaje del backend y propaga', async () => {
    let promesa: Promise<unknown>;
    let error: HttpErrorResponse | null = null;

    try {
      promesa = firstValueFrom(http.get(urlApi('/recurso')));
      httpMock.expectOne(urlApi('/recurso')).flush(
        { message: 'Sin permiso especial' },
        { status: 403, statusText: 'Forbidden' },
      );
      await promesa;
    } catch (fallo) {
      error = fallo as HttpErrorResponse;
    }

    expect(error?.status).toBe(403);
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Sin permiso especial' }));
  });

  it('500 y 503 muestran un toast; el 500 incluye correlation_id', async () => {
    await errorDe(500);
    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0][0].detail).toContain('Código de soporte: corr-1');

    add.mockClear();
    await errorDe(503);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('401, 419, 404 y 422 no producen toast', async () => {
    for (const status of [401, 419, 404, 422]) {
      await errorDe(status);
    }

    expect(add).not.toHaveBeenCalled();
  });

  it('ERROR_EN_PANTALLA y URLs ajenas no producen toast', async () => {
    await errorDe(500, urlApi('/recurso'), new HttpContext().set(ERROR_EN_PANTALLA, true));
    await errorDe(500, 'https://otro.test/api/v1/recurso');

    expect(add).not.toHaveBeenCalled();
  });

  it('UI-13: 500 + error de pantalla producen un solo toast', async () => {
    const toast = TestBed.inject(ToastService);

    await errorDe(500);
    toast.error('No se pudo guardar el recurso.');

    expect(add).toHaveBeenCalledTimes(1);
  });
});

import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { configurarBaseApi, urlApi } from './api-config';
import { erroresInterceptor } from './errores.interceptor';

// Casos de errores.interceptor.spec.ts (retirado en el 49b porque observaba MessageService de
// PrimeNG) que el spec de comportamiento nuevo no cubria.
describe('erroresInterceptor: casos por status', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let abrir: ReturnType<typeof vi.fn>;

  const detalles = (): string[] => abrir.mock.calls.map(([, config]) => config.data.detail);

  beforeEach(() => {
    configurarBaseApi('http://x');
    abrir = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([erroresInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: { openFromComponent: abrir } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  async function errorDe(status: number, cuerpo: object, url = urlApi('/recurso'), contexto?: HttpContext) {
    const promesa = firstValueFrom(http.get(url, contexto ? { context: contexto } : {}));
    httpMock.expectOne(url).flush(cuerpo, { status, statusText: 'Error' });

    return promesa.then(
      () => {
        throw new Error('La peticion debio fallar');
      },
      (error: HttpErrorResponse) => error,
    );
  }

  it('status 0 muestra el mensaje de conexion y propaga', async () => {
    const error = await errorDe(0, {});

    expect(error.status).toBe(0);
    expect(detalles()).toEqual(['No hay conexión con el servidor. Revisa tu red e intenta de nuevo.']);
  });

  it('403 muestra el mensaje del backend y propaga', async () => {
    const error = await errorDe(403, { message: 'Sin permiso especial' });

    expect(error.status).toBe(403);
    expect(detalles()).toEqual(['Sin permiso especial']);
  });

  it('500 incluye el correlation_id y 503 tambien muestra un toast', async () => {
    await errorDe(500, { message: 'Fallo 500', correlation_id: 'corr-1' });
    await errorDe(503, { message: 'Fallo 503' }, urlApi('/otro'));

    expect(detalles()).toHaveLength(2);
    expect(detalles()[0]).toContain('corr-1');
  });

  it('una URL ajena a la API no produce toast', async () => {
    await errorDe(500, { message: 'Fallo' }, 'https://otro.test/recurso');

    expect(abrir).not.toHaveBeenCalled();
  });
});

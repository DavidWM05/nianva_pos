import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { configurarBaseApi, urlApi } from './api-config';
import { erroresInterceptor } from './errores.interceptor';

// SEG-05 y SEG-12: `supervisor_requerido` abre el dialogo del supervisor y `sesion_bloqueada` la
// pantalla de bloqueo. Esos flujos son la respuesta: un toast encima ("No tienes permiso", "La
// sesion esta bloqueada") sobra y tapa el dialogo.

describe('erroresInterceptor: codigos que atiende un flujo global', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    configurarBaseApi('http://x');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([erroresInterceptor])), provideHttpClientTesting(), provideAnimationsAsync()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  async function fallar(metodo: 'GET' | 'POST' | 'PATCH', status: number, codigo: string): Promise<HttpErrorResponse> {
    const promesa = firstValueFrom(http.request(metodo, urlApi('/recurso'), { body: metodo === 'GET' ? undefined : {} })).catch(
      (error: HttpErrorResponse) => error,
    );
    httpMock.expectOne(urlApi('/recurso')).flush({ message: 'Rechazo.', error_code: codigo }, { status, statusText: 'Error' });
    const error = await promesa;
    await Promise.resolve();

    return error as HttpErrorResponse;
  }

  const toasts = () => [...document.querySelectorAll('ui-toast-content')].map((toast) => toast.textContent ?? '');

  it('un 403 supervisor_requerido no muestra toast y llega a la pantalla', async () => {
    const error = await fallar('PATCH', 403, 'supervisor_requerido');

    expect(error.status).toBe(403);
    expect(toasts()).toEqual([]);
  });

  it('un 423 sesion_bloqueada no muestra toast, ni en un POST ni en un GET', async () => {
    await fallar('POST', 423, 'sesion_bloqueada');
    await fallar('GET', 423, 'sesion_bloqueada');

    expect(toasts()).toEqual([]);
  });

  it('otro 403 sigue mostrando su toast', async () => {
    await fallar('POST', 403, 'supervisor_invalido');

    expect(toasts()).toHaveLength(1);
  });
});

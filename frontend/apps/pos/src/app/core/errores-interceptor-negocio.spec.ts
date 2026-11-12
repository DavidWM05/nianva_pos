import { HttpClient, HttpContext, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ToastService } from '@nianva/ui-feedback';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { configurarBaseApi, urlApi } from './api-config';
import { CODIGOS_EN_PANTALLA, ERROR_EN_PANTALLA, erroresInterceptor } from './errores.interceptor';

// ARQ-12 y UI-13: un error de negocio (4xx con error_code) en una peticion que modifica lo
// muestra el interceptor con el message del backend; la pantalla solo reacciona al codigo que
// espera. Las cargas (GET), las validaciones de Laravel, 401 y 419 siguen su flujo.
const RECHAZO = { message: 'No puedes eliminar un rol con usuarios asignados.', error_code: 'conflicto' };
const VALIDACION = { message: 'El nombre es obligatorio.', errors: { nombre: ['El nombre es obligatorio.'] } };

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

describe('erroresInterceptor: errores de negocio', () => {
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

  async function fallar(
    metodo: Metodo,
    status: number,
    cuerpo: object,
    contexto?: HttpContext,
  ): Promise<HttpErrorResponse> {
    const opciones = { body: metodo === 'GET' ? undefined : {}, context: contexto };

    try {
      const promesa = firstValueFrom(http.request(metodo, urlApi('/recurso'), opciones));
      httpMock.expectOne({ method: metodo, url: urlApi('/recurso') }).flush(cuerpo, { status, statusText: 'Error' });
      await promesa;

      throw new Error('La peticion debio fallar');
    } catch (error) {
      return error as HttpErrorResponse;
    }
  }

  const toasts = () => [...document.querySelectorAll('ui-toast-content')].map((toast) => toast.textContent ?? '');

  it('un 409 con error_code en un POST muestra un toast con el message y propaga el error', async () => {
    const error = await fallar('POST', 409, RECHAZO);
    await Promise.resolve();

    expect(error.status).toBe(409);
    expect(error.error).toEqual(RECHAZO);
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toContain(RECHAZO.message);
  });

  // MatSnackBar abre uno a la vez: un caso por prueba. El 422 con error_code es una ExcepcionNegocio.
  it.each<[Metodo, number, string]>([
    ['PUT', 409, 'conflicto'],
    ['PATCH', 422, 'cuota_ya_pagada'],
    ['DELETE', 404, 'no_encontrado'],
  ])('un %s con %i y error_code tambien muestra el message', async (metodo, status, codigo) => {
    await fallar(metodo, status, { message: `Rechazo ${metodo}.`, error_code: codigo });
    await Promise.resolve();

    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toContain(`Rechazo ${metodo}.`);
  });

  it('el mismo error en un GET no muestra toast: la carga fallida la muestra la pantalla', async () => {
    await fallar('GET', 409, RECHAZO);
    await Promise.resolve();

    expect(toasts()).toEqual([]);
  });

  it('un 422 de validacion de Laravel (errors, sin error_code) no muestra toast: va a los campos', async () => {
    await fallar('POST', 422, VALIDACION);
    await Promise.resolve();

    expect(toasts()).toEqual([]);
  });

  it('401 y 419 con error_code siguen su flujo, sin toast', async () => {
    await fallar('POST', 401, { message: 'No autenticado.', error_code: 'no_autenticado' });
    await fallar('POST', 419, { message: 'Sesion expirada.', error_code: 'sesion_expirada' });
    await Promise.resolve();

    expect(toasts()).toEqual([]);
  });

  it('una peticion marcada con ERROR_EN_PANTALLA no muestra toast', async () => {
    await fallar('POST', 409, RECHAZO, new HttpContext().set(ERROR_EN_PANTALLA, true));
    await Promise.resolve();

    expect(toasts()).toEqual([]);
  });

  it('CODIGOS_EN_PANTALLA calla solo los codigos que la pantalla espera', async () => {
    const contexto = new HttpContext().set(CODIGOS_EN_PANTALLA, ['sucursal_requerida']);

    await fallar('POST', 422, { message: 'Requiere sucursal.', error_code: 'sucursal_requerida' }, contexto);
    await Promise.resolve();
    expect(toasts()).toEqual([]);

    await fallar('POST', 409, RECHAZO, contexto);
    await Promise.resolve();
    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toContain(RECHAZO.message);
  });

  it('con el toast del interceptor, el toast.error que la pantalla dispara despues se descarta', async () => {
    const toast = TestBed.inject(ToastService);

    await fallar('DELETE', 409, RECHAZO);
    toast.error('No se pudo eliminar el rol.');
    await Promise.resolve();

    expect(toasts()).toHaveLength(1);
    expect(toasts()[0]).toContain(RECHAZO.message);
  });
});

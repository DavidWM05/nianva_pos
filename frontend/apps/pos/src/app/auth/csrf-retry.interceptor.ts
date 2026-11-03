import { HttpClient, HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { esUrlBackend, urlSesion } from '../core/api-config';
import { conTokenXsrf } from './xsrf.interceptor';

const METODOS_MUTANTES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REINTENTO_CSRF = new HttpContextToken<boolean>(() => false);

/**
 * Un 419 en una peticion mutante (token CSRF vencido o sesion renovada)
 * pide una cookie CSRF nueva y reintenta UNA vez con el token renovado. La
 * peticion de la cookie y el reintento van marcados con REINTENTO_CSRF para
 * no volver a reintentar. Va antes de authInterceptor: un 401 del reintento
 * sigue cerrando la sesion (SEG-06).
 */
export const csrfRetryInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse)
        || error.status !== 419
        || !METODOS_MUTANTES.has(req.method)
        || !esUrlBackend(req.url)
        || req.context.get(REINTENTO_CSRF)
      ) {
        return throwError(() => error);
      }

      const contexto = new HttpContext().set(REINTENTO_CSRF, true);

      return http.get<void>(urlSesion('/sanctum/csrf-cookie'), { context: contexto }).pipe(
        switchMap(() => next(conTokenXsrf(req.clone({ context: req.context.set(REINTENTO_CSRF, true) })))),
      );
    }),
  );
};

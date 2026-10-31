import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from './auth-state.service';

/**
 * Maneja 401 de forma centralizada (sesion expirada/invalida) -- ningun
 * componente tiene que revisar esto por su cuenta en cada llamada.
 *
 * Excepcion: GET /api/v1/user. AuthStateService.initialize() ya lo llama al
 * arrancar la app para saber si hay una sesion existente, y un 401 ahi es
 * un resultado normal (invitado), no una sesion que "expiro" -- dejarlo
 * pasar evita un redirect a /login disparado antes de que el router
 * siquiera haya hecho su primera navegacion.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !req.url.endsWith('/api/v1/user')) {
        authState.clear();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    }),
  );
};

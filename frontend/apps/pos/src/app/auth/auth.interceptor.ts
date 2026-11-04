import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { esErrorNegocio } from '@nianva/ui-shared';
import { catchError, throwError } from 'rxjs';

import { SesionEntrePestanasService } from './sesion-entre-pestanas.service';

/**
 * Maneja 401 de forma centralizada (sesion expirada/invalida) -- ningun
 * componente tiene que revisar esto por su cuenta en cada llamada.
 *
 * Excepcion: GET /api/v1/user. AuthStateService.initialize() ya lo llama al
 * arrancar la app para saber si hay una sesion existente, y un 401 ahi es
 * un resultado normal (invitado), no una sesion que "expiro" -- dejarlo
 * pasar evita un redirect a /login disparado antes de que el router
 * siquiera haya hecho su primera navegacion.
 *
 * Desde API-09 el arranque pide GET /api/v1/sesion; queda en la misma
 * excepcion, igual que /user, que sigue existiendo.
 */
const CHEQUEOS_DE_SESION = ['/api/v1/user', '/api/v1/sesion'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sesion = inject(SesionEntrePestanasService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const esChequeo = CHEQUEOS_DE_SESION.some((ruta) => req.url.endsWith(ruta));

      if (error instanceof HttpErrorResponse && error.status === 401 && !esChequeo) {
        const motivo = esErrorNegocio(error, 'sesion_inactiva') ? 'inactividad' : undefined;
        sesion.cerrarSesion(motivo);
      }

      return throwError(() => error);
    }),
  );
};

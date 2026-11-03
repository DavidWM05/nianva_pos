import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '@nianva/ui-feedback';
import { mensajeError } from '@nianva/ui-shared';
import { catchError, throwError } from 'rxjs';

import { esUrlBackend } from './api-config';

/** Marca una peticion cuyos errores tecnicos maneja la pantalla. */
export const ERROR_EN_PANTALLA = new HttpContextToken<boolean>(() => false);

/**
 * Errores tecnicos (red, permisos y 5xx) que ninguna pantalla maneja bien:
 * un unico toast con el mensaje y, en 5xx, el correlation_id del backend
 * (SEG-11). Los 4xx de negocio/validacion, 401 y 419 siguen en su flujo
 * habitual. Siempre propaga el error al llamador.
 */
export const erroresInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse
        && esUrlBackend(req.url)
        && ! req.context.get(ERROR_EN_PANTALLA)
      ) {
        if (error.status === 0) {
          toast.errorTecnico('No hay conexión con el servidor. Revisa tu red e intenta de nuevo.');
        } else if (error.status === 403) {
          toast.errorTecnico(mensajeError(error, 'No tienes permiso para esta acción.'));
        } else if (error.status >= 500 && error.status < 600) {
          toast.errorTecnico(
            mensajeError(error, 'Ocurrió un error inesperado.'),
            correlationId(error),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};

function correlationId(error: HttpErrorResponse): string | undefined {
  const cuerpo = error.error;

  if (cuerpo !== null && typeof cuerpo === 'object' && 'correlation_id' in cuerpo) {
    const id = (cuerpo as Record<string, unknown>)['correlation_id'];

    return typeof id === 'string' ? id : undefined;
  }

  return undefined;
}

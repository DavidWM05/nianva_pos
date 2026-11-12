import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastService } from '@nianva/ui-feedback';
import { CodigoError, leerErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { catchError, throwError } from 'rxjs';

import { esUrlBackend } from './api-config';

/** Marca una peticion cuyos errores tecnicos maneja la pantalla. */
export const ERROR_EN_PANTALLA = new HttpContextToken<boolean>(() => false);
// Tambien calla el toast de negocio: la pantalla muestra todos los errores de esa peticion.

/**
 * Codigos de negocio que la pantalla maneja con su propio mensaje: el interceptor no muestra
 * esos, y si los demas y los tecnicos. Mas estrecho que ERROR_EN_PANTALLA, que lo calla todo.
 */
export const CODIGOS_EN_PANTALLA = new HttpContextToken<readonly CodigoError[]>(() => []);

/** Las peticiones cuyo error de negocio es el resultado de una accion (UI-13). */
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Errores tecnicos (red, permisos y 5xx) que ninguna pantalla maneja bien:
 * un unico toast con el mensaje y, en 5xx, el correlation_id del backend
 * (SEG-11). Los 4xx de negocio/validacion, 401 y 419 siguen en su flujo
 * habitual. Siempre propaga el error al llamador.
 *
 * ARQ-12 y UI-13: un 4xx de negocio (con `error_code`: ExcepcionNegocio o el mapa generico de
 * MapaErroresHttp) en una peticion que modifica tambien es un toast, con el `message` del
 * backend. Quedan fuera los GET (la carga fallida la muestra la pantalla con ui-page), 401 y
 * 419, las validaciones de Laravel (`errors` sin `error_code`, van a los campos) y lo marcado
 * con ERROR_EN_PANTALLA o CODIGOS_EN_PANTALLA. Usa la supresion del toast tecnico: el
 * `toast.error` que la pantalla dispara despues por el mismo fallo se descarta.
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
        } else if (esRechazoDeNegocio(req.method, error, req.context.get(CODIGOS_EN_PANTALLA))) {
          toast.errorTecnico(mensajeError(error, 'No se pudo completar la acción.'));
        }
      }

      return throwError(() => error);
    }),
  );
};

function esRechazoDeNegocio(
  metodo: string,
  error: HttpErrorResponse,
  codigosEnPantalla: readonly CodigoError[],
): boolean {
  if (! METODOS_QUE_MODIFICAN.has(metodo.toUpperCase())) {
    return false;
  }

  if (error.status < 400 || error.status >= 500 || error.status === 401 || error.status === 419) {
    return false;
  }

  const negocio = leerErrorNegocio(error);

  return negocio !== null && ! codigosEnPantalla.includes(negocio.codigo);
}

function correlationId(error: HttpErrorResponse): string | undefined {
  const cuerpo = error.error;

  if (cuerpo !== null && typeof cuerpo === 'object' && 'correlation_id' in cuerpo) {
    const id = (cuerpo as Record<string, unknown>)['correlation_id'];

    return typeof id === 'string' ? id : undefined;
  }

  return undefined;
}

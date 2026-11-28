import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { CODIGOS_EN_PANTALLA, ERROR_EN_PANTALLA } from '@nianva/core-http';
import { ToastService } from '@nianva/ui-feedback';
import { esErrorNegocio, leerErrorNegocio, mensajeError } from '@nianva/ui-shared';
import { catchError, throwError } from 'rxjs';

import { AuthStateService } from '../auth/auth-state.service';
import { SesionEntrePestanasService } from '../auth/sesion-entre-pestanas.service';
import { esUrlBackend, urlApi } from './api-config';

// ERROR_EN_PANTALLA (marca una peticion cuyos errores maneja la pantalla, tambien los de
// negocio) vive en @nianva/core-http para que la usen los servicios de libs/domain/* (ARQ-12b).
// CODIGOS_EN_PANTALLA (solo los codigos que la pantalla maneja) tambien, desde ARQ-12c.
export { CODIGOS_EN_PANTALLA, ERROR_EN_PANTALLA };

/** Las peticiones cuyo error de negocio es el resultado de una accion (UI-13). */
const METODOS_QUE_MODIFICAN = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Codigos que atiende un flujo global y no un toast: el dialogo del supervisor (SEG-05) y la
 * pantalla de bloqueo (SEG-12). El toast taparia el dialogo que ya pide lo que falta.
 */
const CODIGOS_DE_FLUJO_GLOBAL = new Set(['supervisor_requerido', 'sesion_bloqueada']);

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
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (esUrlBackend(req.url) && req.url !== urlApi('/sesion') && invalidaCapacidades(error)
        && injector.get(AuthStateService).refrescarCapacidades()) {
        injector.get(SesionEntrePestanasService).notificarCapacidades();
      }

      if (
        error instanceof HttpErrorResponse
        && esUrlBackend(req.url)
        && ! req.context.get(ERROR_EN_PANTALLA)
        && ! CODIGOS_DE_FLUJO_GLOBAL.has(leerErrorNegocio(error)?.codigo ?? '')
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

function invalidaCapacidades(error: unknown): boolean {
  return esErrorNegocio(error, 'feature_no_concedida')
    || esErrorNegocio(error, 'limite_plan_excedido')
    || esErrorNegocio(error, 'licencia_solo_lectura')
    || esErrorNegocio(error, 'modulo_no_activo');
}

function esRechazoDeNegocio(
  metodo: string,
  error: HttpErrorResponse,
  codigosEnPantalla: readonly string[],
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

import { Injectable, signal } from '@angular/core';
import type { AccionSupervisor } from '@nianva/api-contrato';
import { esErrorNegocio } from '@nianva/ui-shared';
import { EMPTY, Observable, catchError, defer, switchMap, tap, throwError } from 'rxjs';

import { IntentoOperacion } from '../operaciones/intento-operacion';

/** Lo que el supervisor autoriza (SEG-05): la accion, el documento y el cuerpo exacto. */
export interface SolicitudSupervisor {
  accion: AccionSupervisor;
  /** ulid del documento; sin documento en `ventas.descuento`, que autoriza una venta nueva. */
  recurso?: string;
  /** El cuerpo que se envia a la operacion: el servidor compara su huella con la autorizada. */
  datos: Record<string, unknown>;
  /** Para el dialogo, por ejemplo "Anular la venta #12". */
  descripcion: string;
}

/** La solicitud que el dialogo muestra y como contestarla: el token, o null si se cancela. */
export interface PeticionSupervisor {
  solicitud: SolicitudSupervisor;
  resolver: (token: string | null) => void;
}

/**
 * Autorizacion de supervisor de las operaciones de dinero (SEG-05, F4-7). La pantalla no decide
 * cuando hace falta: el servidor conoce los umbrales y responde 403 `supervisor_requerido`. Ahi se
 * abre el dialogo (AutorizacionSupervisorHostComponent, montado una vez en la raiz) y, con el
 * token, se reintenta el mismo cuerpo con la misma `Idempotency-Key`.
 */
@Injectable({ providedIn: 'root' })
export class AutorizacionSupervisorService {
  readonly pendiente = signal<PeticionSupervisor | null>(null);

  /** Abre el dialogo y emite el token, o null si el cajero cancela. */
  pedir(solicitud: SolicitudSupervisor): Observable<string | null> {
    return new Observable<string | null>((suscriptor) => {
      const peticion: PeticionSupervisor = {
        solicitud,
        resolver: (token) => {
          this.pendiente.set(null);
          suscriptor.next(token);
          suscriptor.complete();
        },
      };
      this.pendiente.set(peticion);

      return () => {
        if (this.pendiente() === peticion) {
          this.pendiente.set(null);
        }
      };
    });
  }

  /**
   * Ejecuta la operacion con la llave del intento (y su token, si ya se autorizo este cuerpo). Si
   * el servidor pide supervisor, abre el dialogo y reintenta; si el cajero cancela, termina sin
   * emitir. La pantalla restablece su estado de envio al terminar, no solo al emitir.
   */
  ejecutar<T>(
    intento: IntentoOperacion,
    solicitud: SolicitudSupervisor,
    operacion: (llave: string, token?: string) => Observable<T>,
  ): Observable<T> {
    return defer(() => {
      const llave = intento.preparar({ recurso: solicitud.recurso ?? null, datos: solicitud.datos });

      return operacion(llave, intento.token).pipe(
        catchError((error: unknown) =>
          esErrorNegocio(error, 'supervisor_requerido')
            ? this.pedir(solicitud).pipe(
                switchMap((token) => {
                  if (token === null) {
                    return EMPTY;
                  }
                  intento.autorizar(token);

                  return operacion(llave, token);
                }),
              )
            : throwError(() => error),
        ),
      );
    }).pipe(tap(() => intento.confirmar()));
  }
}

import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { urlApi, opcionesIdempotencia, opcionesOperacionSupervisada } from '@nianva/core-http';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { CajaActual, CajaConteo, CajaDesglose, CajaSesion } from './caja.types';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);

  /** sesion=null = no hay caja abierta para la sucursal del usuario actual. */
  actual(): Observable<CajaActual> {
    return this.http
      .get<RespuestaDe<'/caja/actual', 'get'>>(urlApi(`/caja/actual`))
      .pipe(map((r) => ({ sesion: r.data, resumen: r.meta.resumen, permisos: r.meta.permisos })));
  }

  abrir(montoApertura: number, llaveIdempotencia?: string): Observable<CajaSesion> {
    const cuerpo: CuerpoDe<'/caja/abrir', 'post'> = { monto_apertura: montoApertura };

    return this.http
      .post<RespuestaDe<'/caja/abrir', 'post'>>(urlApi(`/caja/abrir`), cuerpo, opcionesIdempotencia(llaveIdempotencia))
      .pipe(map((r) => r.data));
  }

  /**
   * `total_gastos` ya no se manda: CajaController::cerrar() lo calcula
   * siempre en el servidor (junto con abonos CxC, recargas de Gift Card y
   * pagos CxP) para que nadie pueda cerrar la caja con una diferencia
   * manipulada -- ver el docblock del Controller.
   */
  cerrar(id: string, conteos: CajaConteo[], llaveIdempotencia?: string, tokenSupervisor?: string): Observable<{ sesion: CajaSesion; desglose: CajaDesglose }> {
    const cuerpo: CuerpoDe<'/caja/{cajaSesion}/cerrar', 'patch'> = { conteos };

    return this.http
      .patch<RespuestaDe<'/caja/{cajaSesion}/cerrar', 'patch'>>(urlApi(`/caja/${id}/cerrar`), cuerpo, opcionesOperacionSupervisada(llaveIdempotencia, tokenSupervisor))
      .pipe(map((r) => ({ sesion: r.data, desglose: r.desglose })));
  }

  impreso(cajaSesion: string): Observable<RespuestaDe<'/caja/{cajaSesion}/impreso', 'get'>['data']> {
    return this.http.get<RespuestaDe<'/caja/{cajaSesion}/impreso', 'get'>>(urlApi(`/caja/${cajaSesion}/impreso`))
      .pipe(map((respuesta) => respuesta.data));
  }
}

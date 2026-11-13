import { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { CajaActual, CajaDesglose, CajaSesion } from './caja.types';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);

  /** sesion=null = no hay caja abierta para la sucursal del usuario actual. */
  actual(): Observable<CajaActual> {
    return this.http
      .get<RespuestaDe<'/caja/actual', 'get'>>(urlApi(`/caja/actual`))
      .pipe(map((r) => ({ sesion: r.data as CajaSesion | null, resumen: r.meta.resumen, permisos: r.meta.permisos })));
  }

  abrir(montoApertura: number): Observable<CajaSesion> {
    const cuerpo: CuerpoDe<'/caja/abrir', 'post'> = { monto_apertura: montoApertura };

    return this.http
      .post<RespuestaDe<'/caja/abrir', 'post'>>(urlApi(`/caja/abrir`), cuerpo)
      .pipe(map((r) => r.data as CajaSesion));
  }

  /**
   * `total_gastos` ya no se manda: CajaController::cerrar() lo calcula
   * siempre en el servidor (junto con abonos CxC, recargas de Gift Card y
   * pagos CxP) para que nadie pueda cerrar la caja con una diferencia
   * manipulada -- ver el docblock del Controller.
   */
  cerrar(id: number, montoFisico: number): Observable<{ sesion: CajaSesion; desglose: CajaDesglose }> {
    const cuerpo: CuerpoDe<'/caja/{cajaSesion}/cerrar', 'patch'> = { monto_fisico: montoFisico };

    return this.http
      .patch<RespuestaDe<'/caja/{cajaSesion}/cerrar', 'patch'>>(urlApi(`/caja/${id}/cerrar`), cuerpo)
      .pipe(map((r) => ({ sesion: r.data as CajaSesion, desglose: r.desglose })));
  }
}

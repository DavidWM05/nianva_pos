import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { CajaActual, CajaDesglose, CajaPermisos, CajaResumen, CajaSesion } from './caja.types';

@Injectable({ providedIn: 'root' })
export class CajaService {
  private readonly http = inject(HttpClient);

  /** sesion=null = no hay caja abierta para la sucursal del usuario actual. */
  actual(): Observable<CajaActual> {
    return this.http
      .get<{ data: CajaSesion | null; meta: { resumen: CajaResumen | null; permisos: CajaPermisos } }>(
        `${API_BASE_URL}/api/caja/actual`,
      )
      .pipe(map((r) => ({ sesion: r.data, resumen: r.meta.resumen, permisos: r.meta.permisos })));
  }

  abrir(montoApertura: number): Observable<CajaSesion> {
    return this.http
      .post<{ data: CajaSesion }>(`${API_BASE_URL}/api/caja/abrir`, { monto_apertura: montoApertura })
      .pipe(map((r) => r.data));
  }

  /**
   * `total_gastos` ya no se manda: CajaController::cerrar() lo calcula
   * siempre en el servidor (junto con abonos CxC, recargas de Gift Card y
   * pagos CxP) para que nadie pueda cerrar la caja con una diferencia
   * manipulada -- ver el docblock del Controller.
   */
  cerrar(id: number, montoFisico: number): Observable<{ sesion: CajaSesion; desglose: CajaDesglose }> {
    return this.http
      .patch<{ data: CajaSesion; desglose: CajaDesglose }>(`${API_BASE_URL}/api/caja/${id}/cerrar`, {
        monto_fisico: montoFisico,
      })
      .pipe(map((r) => ({ sesion: r.data, desglose: r.desglose })));
  }
}

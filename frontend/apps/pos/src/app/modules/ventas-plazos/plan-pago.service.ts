import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  PagarCuotaPayload,
  PlanPago,
  PlanPagoCrearPayload,
  PlanPagoCuota,
} from './plan-pago.types';

export interface PlanesPagoPermisos {
  crear: boolean;
}

export interface PlanesPagoPagina {
  data: PlanPago[];
  total: number;
  permisos: PlanesPagoPermisos;
}

@Injectable({ providedIn: 'root' })
export class PlanPagoService {
  private readonly http = inject(HttpClient);

  listar(evento: DataTableLazyEvent): Observable<PlanesPagoPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<RespuestaDe<'/planes-pago-cliente', 'get'>>(
        urlApi(`/planes-pago-cliente`),
        { params },
      )
      .pipe(
        map((r) => ({
          data: r.data as PlanPago[],
          total: r.meta.total,
          permisos: r.meta.permisos,
        })),
      );
  }

  obtener(id: number): Observable<PlanPago> {
    return this.http
      .get<RespuestaDe<'/planes-pago-cliente/{plan}', 'get'>>(
        urlApi(`/planes-pago-cliente/${id}`),
      )
      .pipe(map((r) => r.data as PlanPago));
  }

  crearPlan(
    ventaId: number,
    payload: PlanPagoCrearPayload,
  ): Observable<PlanPago> {
    const cuerpo: CuerpoDe<'/ventas/{venta}/plan-pago', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/ventas/{venta}/plan-pago', 'post'>>(
        urlApi(`/ventas/${ventaId}/plan-pago`),
        cuerpo,
      )
      .pipe(map((r) => r.data as PlanPago));
  }

  pagarCuota(
    planId: number,
    payload: PagarCuotaPayload,
  ): Observable<PlanPagoCuota> {
    const cuerpo: CuerpoDe<'/planes-pago-cliente/{plan}/pagar-cuota', 'post'> =
      payload;

    return this.http
      .post<RespuestaDe<'/planes-pago-cliente/{plan}/pagar-cuota', 'post'>>(
        urlApi(`/planes-pago-cliente/${planId}/pagar-cuota`),
        cuerpo,
      )
      .pipe(map((r) => r.data as PlanPagoCuota));
  }
}

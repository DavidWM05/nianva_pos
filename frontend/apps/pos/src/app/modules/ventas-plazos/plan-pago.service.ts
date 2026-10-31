import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nianva/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { PagarCuotaPayload, PlanPago, PlanPagoCrearPayload, PlanPagoCuota } from './plan-pago.types';

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
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }

    return this.http
      .get<{ data: PlanPago[]; meta: { total: number; permisos: PlanesPagoPermisos } }>(urlApi(`/planes-pago-cliente`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total, permisos: r.meta.permisos })));
  }

  obtener(id: number): Observable<PlanPago> {
    return this.http.get<{ data: PlanPago }>(urlApi(`/planes-pago-cliente/${id}`)).pipe(map((r) => r.data));
  }

  crearPlan(ventaId: number, payload: PlanPagoCrearPayload): Observable<PlanPago> {
    return this.http
      .post<{ data: PlanPago }>(urlApi(`/ventas/${ventaId}/plan-pago`), payload)
      .pipe(map((r) => r.data));
  }

  pagarCuota(planId: number, payload: PagarCuotaPayload): Observable<PlanPagoCuota> {
    return this.http
      .post<{ data: PlanPagoCuota }>(urlApi(`/planes-pago-cliente/${planId}/pagar-cuota`), payload)
      .pipe(map((r) => r.data));
  }
}

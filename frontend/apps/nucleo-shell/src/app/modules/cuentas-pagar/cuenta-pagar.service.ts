import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { API_BASE_URL } from '../../core/api-config';
import { CuentaPagar, EstadoCuentaPagar, RegistrarPagoPayload, ReporteCuentasPagar } from './cuenta-pagar.types';

export interface CuentasPagarPagina {
  data: CuentaPagar[];
  total: number;
}

export interface RegistrarPagoRespuesta {
  saldoPendiente: string;
  estado: EstadoCuentaPagar;
}

/**
 * CuentaPagarController no tiene store(): las cuentas se crean
 * automaticamente desde una Compra (ver CuentasPagarService::crearDesdeCompra()).
 * Solo se exponen lectura + registrar pago + anular.
 */
@Injectable({ providedIn: 'root' })
export class CuentaPagarService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    filtros: { proveedorNombre?: string; estado?: EstadoCuentaPagar | null } = {},
  ): Observable<CuentasPagarPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.proveedorNombre?.trim()) {
      params = params.set('filtro_proveedor', filtros.proveedorNombre.trim());
    }
    if (filtros.estado) {
      params = params.set('filtro_estado', filtros.estado);
    }

    return this.http
      .get<{ data: CuentaPagar[]; meta: { total: number } }>(`${API_BASE_URL}/api/cuentas-pagar`, { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total })));
  }

  obtener(id: number): Observable<CuentaPagar> {
    return this.http.get<{ data: CuentaPagar }>(`${API_BASE_URL}/api/cuentas-pagar/${id}`).pipe(map((r) => r.data));
  }

  registrarPago(id: number, payload: RegistrarPagoPayload): Observable<RegistrarPagoRespuesta> {
    return this.http
      .post<{ data: { cuenta: { saldo_pendiente: string; estado: EstadoCuentaPagar } } }>(
        `${API_BASE_URL}/api/cuentas-pagar/${id}/pagos`,
        payload,
      )
      .pipe(map((r) => ({ saldoPendiente: r.data.cuenta.saldo_pendiente, estado: r.data.cuenta.estado })));
  }

  anular(id: number): Observable<void> {
    return this.http.post<void>(`${API_BASE_URL}/api/cuentas-pagar/${id}/anular`, {});
  }

  /** limite: top-N proveedores por saldo pendiente en `por_proveedor` (backend acepta 1-50, default 10). */
  reporte(limite = 10): Observable<ReporteCuentasPagar> {
    const params = new HttpParams().set('limite', limite);

    return this.http
      .get<{ data: ReporteCuentasPagar }>(`${API_BASE_URL}/api/cuentas-pagar/reporte`, { params })
      .pipe(map((r) => r.data));
  }
}

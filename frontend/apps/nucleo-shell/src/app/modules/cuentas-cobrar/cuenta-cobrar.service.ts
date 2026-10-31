import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { DataTableLazyEvent } from '@nucleo/ui-shared';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import { CuentaCobrar, EstadoCuentaCobrar, RegistrarAbonoPayload, ReporteCuentasCobrar } from './cuenta-cobrar.types';

export interface CuentasCobrarPagina {
  data: CuentaCobrar[];
  total: number;
}

export interface RegistrarAbonoRespuesta {
  saldoPendiente: string;
  estado: EstadoCuentaCobrar;
}

/**
 * CuentaCobrarController no tiene store(): las cuentas se crean
 * automaticamente desde VentaController::store() cuando tipo_pago =
 * 'credito' (ver CuentasCobrarService::crearDesdeVenta()). Solo se exponen
 * lectura + registrar abono + anular.
 */
@Injectable({ providedIn: 'root' })
export class CuentaCobrarService {
  private readonly http = inject(HttpClient);

  listar(
    evento: DataTableLazyEvent,
    filtros: { clienteNombre?: string; estado?: EstadoCuentaCobrar | null; vencidas?: boolean } = {},
  ): Observable<CuentasCobrarPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params.set('sort_field', evento.sortField).set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.clienteNombre?.trim()) {
      params = params.set('filtro_cliente', filtros.clienteNombre.trim());
    }
    if (filtros.estado) {
      params = params.set('filtro_estado', filtros.estado);
    }
    if (filtros.vencidas) {
      params = params.set('vencidas', '1');
    }

    return this.http
      .get<{ data: CuentaCobrar[]; meta: { total: number } }>(urlApi(`/cuentas-cobrar`), { params })
      .pipe(map((r) => ({ data: r.data, total: r.meta.total })));
  }

  obtener(id: number): Observable<CuentaCobrar> {
    return this.http.get<{ data: CuentaCobrar }>(urlApi(`/cuentas-cobrar/${id}`)).pipe(map((r) => r.data));
  }

  registrarAbono(id: number, payload: RegistrarAbonoPayload): Observable<RegistrarAbonoRespuesta> {
    return this.http
      .post<{ data: { cuenta: { saldo_pendiente: string; estado: EstadoCuentaCobrar } } }>(
        urlApi(`/cuentas-cobrar/${id}/abonos`),
        payload,
      )
      .pipe(map((r) => ({ saldoPendiente: r.data.cuenta.saldo_pendiente, estado: r.data.cuenta.estado })));
  }

  anular(id: number): Observable<void> {
    return this.http.post<void>(urlApi(`/cuentas-cobrar/${id}/anular`), {});
  }

  /** limite: top-N clientes por saldo pendiente en `por_cliente` (backend acepta 1-50, default 10). */
  reporte(limite = 10): Observable<ReporteCuentasCobrar> {
    const params = new HttpParams().set('limite', limite);

    return this.http
      .get<{ data: ReporteCuentasCobrar }>(urlApi(`/cuentas-cobrar/reporte`), { params })
      .pipe(map((r) => r.data));
  }
}

import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi } from '@nianva/core-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  CuentaPagar,
  EstadoCuentaPagar,
  RegistrarPagoPayload,
  ReporteCuentasPagar,
} from './cuenta-pagar.types';

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
    evento: ConsultaPagina,
    filtros: {
      proveedorNombre?: string;
      estado?: EstadoCuentaPagar | null;
    } = {},
  ): Observable<CuentasPagarPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
    }
    if (filtros.proveedorNombre?.trim()) {
      params = params.set('filtro_proveedor', filtros.proveedorNombre.trim());
    }
    if (filtros.estado) {
      params = params.set('filtro_estado', filtros.estado);
    }

    return this.http
      .get<RespuestaDe<'/cuentas-pagar', 'get'>>(urlApi(`/cuentas-pagar`), {
        params,
      })
      .pipe(
        map((r) => ({ data: r.data, total: r.meta.total })),
      );
  }

  obtener(id: string): Observable<CuentaPagar> {
    return this.http
      .get<RespuestaDe<'/cuentas-pagar/{cuentaPagar}', 'get'>>(
        urlApi(`/cuentas-pagar/${id}`),
      )
      .pipe(map((r) => r.data));
  }

  registrarPago(
    id: string,
    payload: RegistrarPagoPayload,
  ): Observable<RegistrarPagoRespuesta> {
    const cuerpo: CuerpoDe<'/cuentas-pagar/{cuentaPagar}/pagos', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/cuentas-pagar/{cuentaPagar}/pagos', 'post'>>(
        urlApi(`/cuentas-pagar/${id}/pagos`),
        cuerpo,
      )
      .pipe(
        map((r) => {
          const cuenta = r.data.cuenta;
          return {
            saldoPendiente: cuenta.saldo_pendiente,
            estado: cuenta.estado,
          };
        }),
      );
  }

  anular(id: string): Observable<void> {
    return this.http
      .post<RespuestaDe<'/cuentas-pagar/{cuentaPagar}/anular', 'post'>>(
        urlApi(`/cuentas-pagar/${id}/anular`),
        {},
      )
      .pipe(map(() => undefined));
  }

  /** limite: top-N proveedores por saldo pendiente en `por_proveedor` (backend acepta 1-50, default 10). */
  reporte(limite = 10): Observable<ReporteCuentasPagar> {
    const params = new HttpParams().set('limite', limite);

    return this.http
      .get<RespuestaDe<'/cuentas-pagar/reporte', 'get'>>(
        urlApi(`/cuentas-pagar/reporte`),
        { params },
      )
      .pipe(map((r) => r.data));
  }
}

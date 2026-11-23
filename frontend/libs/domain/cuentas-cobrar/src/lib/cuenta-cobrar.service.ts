import { RespuestaDe, CuerpoDe } from '@nianva/api-contrato';
import { ConsultaPagina, urlApi, opcionesIdempotencia } from '@nianva/core-http';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  CuentaCobrar,
  EstadoCuentaCobrar,
  RegistrarAbonoPayload,
  ReporteCuentasCobrar,
} from './cuenta-cobrar.types';

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
    evento: ConsultaPagina,
    filtros: {
      clienteNombre?: string;
      estado?: EstadoCuentaCobrar | null;
      vencidas?: boolean;
    } = {},
  ): Observable<CuentasCobrarPagina> {
    const rows = evento.rows || 25;
    const page = Math.floor(evento.first / rows) + 1;

    let params = new HttpParams().set('page', page).set('rows', rows);

    if (evento.sortField) {
      params = params
        .set('sort_field', evento.sortField)
        .set('sort_order', evento.sortOrder === -1 ? 'desc' : 'asc');
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
      .get<RespuestaDe<'/cuentas-cobrar', 'get'>>(urlApi(`/cuentas-cobrar`), {
        params,
      })
      .pipe(
        map((r) => ({ data: r.data, total: r.meta.total })),
      );
  }

  obtener(id: string): Observable<CuentaCobrar> {
    return this.http
      .get<RespuestaDe<'/cuentas-cobrar/{cuentaCobrar}', 'get'>>(
        urlApi(`/cuentas-cobrar/${id}`),
      )
      .pipe(map((r) => r.data));
  }

  registrarAbono(
    id: string,
    payload: RegistrarAbonoPayload,
    llaveIdempotencia?: string,
  ): Observable<RegistrarAbonoRespuesta> {
    const cuerpo: CuerpoDe<'/cuentas-cobrar/{cuentaCobrar}/abonos', 'post'> = payload;

    return this.http
      .post<RespuestaDe<'/cuentas-cobrar/{cuentaCobrar}/abonos', 'post'>>(
        urlApi(`/cuentas-cobrar/${id}/abonos`),
        cuerpo,
        opcionesIdempotencia(llaveIdempotencia),
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

  anular(id: string, llaveIdempotencia?: string): Observable<void> {
    return this.http
      .post<RespuestaDe<'/cuentas-cobrar/{cuentaCobrar}/anular', 'post'>>(
        urlApi(`/cuentas-cobrar/${id}/anular`),
        {},
        opcionesIdempotencia(llaveIdempotencia),
      )
      .pipe(map(() => undefined));
  }

  /** limite: top-N clientes por saldo pendiente en `por_cliente` (backend acepta 1-50, default 10). */
  reporte(limite = 10): Observable<ReporteCuentasCobrar> {
    return this.reportePaginado(limite).pipe(map((r) => r.data));
  }

  reportePaginado(limite = 10, page?: number, rows?: number): Observable<RespuestaDe<'/cuentas-cobrar/reporte', 'get'>> {
    let params = new HttpParams().set('limite', limite);
    if (page !== undefined) params = params.set('page', page);
    if (rows !== undefined) params = params.set('rows', rows);

    return this.http
      .get<RespuestaDe<'/cuentas-cobrar/reporte', 'get'>>(
        urlApi(`/cuentas-cobrar/reporte`),
        { params },
      );
  }
}

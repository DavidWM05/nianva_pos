import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { CuerpoDe, RespuestaDe } from '@nianva/api-contrato';
import { Observable, map } from 'rxjs';

import { urlApi } from '../../core/api-config';
import {
  AjustarPuntosPayload,
  CrmInteraccion,
  InteraccionFormPayload,
  LoyaltyResumen,
  LoyaltyTransaccion,
  ReporteCrm,
} from './crm-avanzado.types';

@Injectable({ providedIn: 'root' })
export class CrmAvanzadoService {
  private readonly http = inject(HttpClient);

  /** Sin paginacion: CrmAvanzadoController::interacciones() devuelve la lista completa, no un paginador. */
  interacciones(clienteId: number): Observable<CrmInteraccion[]> {
    return this.http
      .get<RespuestaDe<'/clientes/{cliente}/interacciones', 'get'>>(
        urlApi(`/clientes/${clienteId}/interacciones`),
      )
      .pipe(map((r) => r.data as CrmInteraccion[]));
  }

  crearInteraccion(
    clienteId: number,
    payload: InteraccionFormPayload,
  ): Observable<CrmInteraccion> {
    const cuerpo: CuerpoDe<'/clientes/{cliente}/interacciones', 'post'> =
      payload;

    return this.http
      .post<RespuestaDe<'/clientes/{cliente}/interacciones', 'post'>>(
        urlApi(`/clientes/${clienteId}/interacciones`),
        cuerpo,
      )
      .pipe(map((r) => r.data as CrmInteraccion));
  }

  loyalty(clienteId: number): Observable<LoyaltyResumen> {
    return this.http
      .get<RespuestaDe<'/clientes/{cliente}/loyalty', 'get'>>(urlApi(`/clientes/${clienteId}/loyalty`))
      .pipe(map((r) => r.data as LoyaltyResumen));
  }

  ajustarPuntos(
    clienteId: number,
    payload: AjustarPuntosPayload,
  ): Observable<LoyaltyTransaccion> {
    const cuerpo: CuerpoDe<'/clientes/{cliente}/loyalty/ajustar', 'post'> =
      payload;

    return this.http
      .post<RespuestaDe<'/clientes/{cliente}/loyalty/ajustar', 'post'>>(
        urlApi(`/clientes/${clienteId}/loyalty/ajustar`),
        cuerpo,
      )
      .pipe(map((r) => r.data as LoyaltyTransaccion));
  }

  reporte(): Observable<ReporteCrm> {
    return this.http
      .get<RespuestaDe<'/crm/reporte', 'get'>>(urlApi(`/crm/reporte`))
      .pipe(map((r) => r.data as ReporteCrm));
  }
}
